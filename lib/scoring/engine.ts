// lib/scoring/engine.ts
//
// Readiness engine (§14–§17, §22). Deterministic: same EvidenceInputs + same
// SCORING_VERSION -> same numbers. The LLM never touches anything in here.

import {
  ACTIVE_MONTHS_TABLE,
  CONSISTENCY_WEIGHTS,
  CONTINUATION_MIN_DAYS,
  READINESS_DIMENSION_LABEL,
  READINESS_WEIGHTS,
  SCORING_VERSION,
  TECHNICAL_TOP_SKILLS,
  type ReadinessDimensionKey,
} from './config';
import { daysBetween, piecewise, recencyScore, round1, weightedScore, VERIFICATION_LABEL } from './normalize';
import { buildContext, candidateSkillIds, scoreSkill, type SkillScore } from './skill-score';
import { linkProjectsToRepos, projectEvidenceScore, scoreProject, type ProjectScore } from './project-score';
import { computeRoleFit, recommendActions, type NextAction, type RoleFitResult } from './role-fit';
import { ROLE_CATALOG, findRoleByTarget } from './roles-catalog';
import type { EvidenceInputs, RepoSignals } from './evidence-inputs';
import { repoSignals } from './evidence-inputs';
import { summarizeAcademics, summarizeExperience, type AcademicSummary, type ExperienceSummary } from '@/lib/profile/academics';

export type TraceNode = {
  label: string;
  score: number | null;
  /** Weight of this node inside its parent. */
  weight?: number;
  detail?: string;
  children?: TraceNode[];
};

export type DimensionStatus = 'measured' | 'insufficient' | 'not_offered';

export type DimensionResult = {
  key: ReadinessDimensionKey;
  label: string;
  score: number | null;
  weight: number;
  /** Weight after re-normalizing over measured dimensions. */
  effectiveWeight: number;
  status: DimensionStatus;
  detail: string;
};

export type RoleAlignment = {
  roleId: string;
  roleTitle: string;
  matchedBy: 'target_role' | 'best_fit' | 'job_description';
  fit: RoleFitResult;
  alternatives: { roleId: string; roleTitle: string; fit: number }[];
};

export type ScoringResult = {
  scoringVersion: string;
  computedAt: string;
  overallScore: number;
  exactOverallScore: number;
  /** Share of readiness weight backed by measured dimensions, 0–1. */
  confidence: number;
  /** Kept for existing consumers: measured dimensions as { title, score }. */
  categories: { title: string; score: number }[];
  dimensions: DimensionResult[];
  evidenceStrength: number;
  strengths: { title: string; description: string }[];
  gaps: { title: string; description: string }[];
  actions: { title: string; description: string; impact: string }[];
  nextActions: NextAction[];
  skillScores: SkillScore[];
  projectScores: ProjectScore[];
  roleAlignment: RoleAlignment | null;
  academics: AcademicSummary;
  experience: ExperienceSummary;
  profileSource: 'llm' | 'fallback';
  trace: TraceNode;
};

export type SkillProfile = {
  skills: SkillScore[];
  scoreMap: Map<string, SkillScore>;
  projects: ProjectScore[];
  repos: RepoSignals[];
};

/** Levels 1–2: normalize evidence and score every skill and project. */
export function computeSkillProfile(inputs: EvidenceInputs): SkillProfile {
  const repos = (inputs.github?.repositories ?? []).filter((r) => !r.fork).map(repoSignals);
  // Find each resume project's GitHub repo, so repo evidence backs the project.
  const links = linkProjectsToRepos(inputs.profile.projects, repos);
  const projects = inputs.profile.projects.map((p, i) => scoreProject(p, i, links[i]));
  const ctx = buildContext(inputs, projects);
  const skills = Array.from(candidateSkillIds(ctx))
    .map((id) => scoreSkill(id, ctx))
    .sort((a, b) => b.exactScore - a.exactScore || a.label.localeCompare(b.label));
  return { skills, scoreMap: new Map(skills.map((s) => [s.id, s])), projects, repos };
}

/** Technical Competency without a role: mean of the strongest N technical skills, empty slots = 0. */
function technicalCompetency(skills: SkillScore[]): { score: number; used: SkillScore[] } {
  const used = skills.filter((s) => s.technical).slice(0, TECHNICAL_TOP_SKILLS);
  const sum = used.reduce((a, s) => a + s.exactScore, 0);
  return { score: round1(sum / TECHNICAL_TOP_SKILLS), used };
}

/** §15 — profile-level consistency from public GitHub activity. */
function profileConsistency(repos: RepoSignals[], skills: SkillScore[], asOf: Date) {
  if (repos.length === 0) return null;
  const dated = repos.filter((r) => r.lastActivity);
  const latest = dated.length ? new Date(Math.max(...dated.map((r) => r.lastActivity!.getTime()))) : null;
  const recent = latest ? recencyScore(daysBetween(latest, asOf)) : 0;
  const continued = repos.filter((r) => r.createdAt && r.lastActivity && daysBetween(r.createdAt, r.lastActivity) >= CONTINUATION_MIN_DAYS).length;
  const withCreated = repos.filter((r) => r.createdAt).length;
  const continuation = withCreated > 0 ? (continued / withCreated) * 100 : null;

  const cutoff = new Date(asOf);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  const months = new Set<string>();
  for (const r of repos) {
    for (const d of [r.lastActivity, r.createdAt]) {
      if (d && d >= cutoff && d <= asOf) months.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    }
  }
  const regularity = piecewise(months.size, ACTIVE_MONTHS_TABLE);
  const top = skills.filter((s) => s.technical).slice(0, TECHNICAL_TOP_SKILLS);
  const multiSource = top.length ? (top.filter((s) => s.sources.length >= 2).length / top.length) * 100 : 0;

  const parts = [
    { label: 'Recent Activity', value: recent, weight: CONSISTENCY_WEIGHTS.recentActivity, detail: latest ? `last push ${Math.round(daysBetween(latest, asOf))} days ago` : 'no dated pushes' },
    { label: 'Project Continuation', value: continuation, weight: CONSISTENCY_WEIGHTS.projectContinuation, detail: `${continued}/${withCreated} repos worked on for ${CONTINUATION_MIN_DAYS}+ days` },
    { label: 'Activity Regularity', value: regularity, weight: CONSISTENCY_WEIGHTS.activityRegularity, detail: `${months.size} active months in the last 12` },
    { label: 'Skill Consistency', value: multiSource, weight: CONSISTENCY_WEIGHTS.skillConsistency, detail: 'top skills seen in 2+ sources' },
  ];
  const score = weightedScore(parts.map((p) => ({ value: p.value, weight: p.weight })));
  return score === null ? null : { score: round1(score), parts };
}

function pickRole(inputs: EvidenceInputs, targetRole: string | null | undefined, scoreMap: Map<string, SkillScore>) {
  const evaluated = ROLE_CATALOG.map((role) => ({ role, fit: computeRoleFit(role.skills, scoreMap) }))
    .sort((a, b) => b.fit.exactFit - a.fit.exactFit);
  const target = findRoleByTarget(targetRole);
  const chosen = target ? evaluated.find((e) => e.role.id === target.id)! : evaluated[0];
  return {
    roleId: chosen.role.id,
    roleTitle: chosen.role.title,
    matchedBy: target ? ('target_role' as const) : ('best_fit' as const),
    fit: chosen.fit,
    alternatives: evaluated.filter((e) => e.role.id !== chosen.role.id).slice(0, 3).map((e) => ({ roleId: e.role.id, roleTitle: e.role.title, fit: e.fit.fit })),
  };
}

export type ReadinessOptions = {
  /** Student's stated target role (Profile.targetRole). */
  targetRole?: string | null;
  /** Score role alignment against a specific JD instead of the preset catalog. */
  roleOverride?: { title: string; fit: RoleFitResult };
  skillProfile?: SkillProfile;
};

/** Levels 3–5: role fit, readiness dimensions, overall readiness, gaps and actions. */
export function calculateReadiness(inputs: EvidenceInputs, opts: ReadinessOptions = {}): ScoringResult {
  const asOf = new Date(inputs.asOf);
  const sp = opts.skillProfile ?? computeSkillProfile(inputs);
  const { skills, scoreMap, projects, repos } = sp;

  const technical = technicalCompetency(skills);
  const projectDim = inputs.profile.source === 'fallback' ? null : projectEvidenceScore(projects);
  const role: RoleAlignment | null = opts.roleOverride
    ? { roleId: 'job_description', roleTitle: opts.roleOverride.title, matchedBy: 'job_description', fit: opts.roleOverride.fit, alternatives: [] }
    : pickRole(inputs, opts.targetRole, scoreMap);
  const consistency = profileConsistency(repos, skills, asOf);
  const coding = inputs.coding ?? null;

  const raw: Record<ReadinessDimensionKey, { score: number | null; status: DimensionStatus; detail: string }> = {
    technical: {
      score: technical.score,
      status: 'measured',
      detail: `Mean of your ${TECHNICAL_TOP_SKILLS} strongest skill scores (empty slots count as 0).`,
    },
    project: projectDim
      ? { score: projectDim.score, status: 'measured', detail: projects.length ? 'Top 3 projects weighted 50% / 30% / 20%.' : 'No projects found on the resume.' }
      : { score: null, status: 'insufficient', detail: 'Projects can’t be read without AI extraction.' },
    roleAlignment: role
      ? { score: role.fit.exactFit, status: 'measured', detail: `Fit for ${role.roleTitle}${role.matchedBy === 'best_fit' ? ' (your best-fitting role)' : ''}.` }
      : { score: null, status: 'insufficient', detail: 'No role to compare against.' },
    interview: { score: null, status: 'not_offered', detail: 'Mock interviews aren’t available yet, so this dimension is left out rather than counted as 0.' },
    consistency: consistency
      ? { score: consistency.score, status: 'measured', detail: 'From your public GitHub activity.' }
      : { score: null, status: 'insufficient', detail: 'Link a GitHub profile to measure activity consistency.' },
    problemSolving: coding
      ? { score: coding.overallScore, status: 'measured', detail: `From ${coding.platforms.length} coding platform${coding.platforms.length > 1 ? 's' : ''}: strongest platform score plus 5 per extra active platform.` }
      : { score: null, status: 'insufficient', detail: 'Add a LeetCode, Codeforces, CodeChef, HackerRank or GeeksforGeeks profile to measure problem solving.' },
  };

  const measuredWeight = (Object.keys(READINESS_WEIGHTS) as ReadinessDimensionKey[])
    .filter((k) => raw[k].score !== null)
    .reduce((a, k) => a + READINESS_WEIGHTS[k], 0);

  const dimensions: DimensionResult[] = (Object.keys(READINESS_WEIGHTS) as ReadinessDimensionKey[]).map((key) => ({
    key,
    label: READINESS_DIMENSION_LABEL[key],
    score: raw[key].score === null ? null : Math.round(raw[key].score!),
    weight: READINESS_WEIGHTS[key],
    effectiveWeight: raw[key].score === null || measuredWeight === 0 ? 0 : round1((READINESS_WEIGHTS[key] / measuredWeight) * 1000) / 1000,
    status: raw[key].status,
    detail: raw[key].detail,
  }));

  const exactOverall = weightedScore(dimensions.map((d) => ({ value: d.score === null ? null : raw[d.key].score, weight: d.weight }))) ?? 0;
  const overallScore = Math.round(exactOverall);

  // Gaps, priority and actions come from the role alignment (§18–§20).
  const nextActions = role ? recommendActions(role.fit.gaps, scoreMap, role.fit.denominator) : [];

  const top = technical.used;
  const avgConfidence = top.length ? top.reduce((a, s) => a + s.confidence, 0) / top.length : 0;
  const evidenceStrength = Math.round(100 * (0.5 * measuredWeight + 0.5 * avgConfidence));

  const strengths = skills
    .filter((s) => s.technical && (s.verification === 'STRONGLY_VERIFIED' || s.verification === 'DEMONSTRATED'))
    .slice(0, 4)
    .map((s) => ({
      title: `${s.label} — ${VERIFICATION_LABEL[s.verification]} (${s.score})`,
      description: describeEvidence(s),
    }));
  if (projectDim && projectDim.used[0] && projectDim.used[0].score >= 70) {
    strengths.push({ title: `Strong project: ${projectDim.used[0].name}`, description: `Project evidence score ${Math.round(projectDim.used[0].score)}/100.` });
  }
  if (coding?.strength === 'Strong') {
    const rating = coding.bestRating ? `, best contest rating ${coding.bestRating.rating}` : '';
    strengths.push({ title: 'Strong Problem Solver', description: `${coding.totalSolved} problems solved across coding platforms${rating}.` });
  }

  const gaps: { title: string; description: string }[] = [];
  for (const g of role?.fit.gaps.slice(0, 4) ?? []) {
    gaps.push({
      title: `${g.label}: ${Math.round(g.score)} / target ${g.target}`,
      description: `Gap ${Math.round(g.gap)} × importance ${g.importance} = priority ${Math.round(g.priority)} for ${role!.roleTitle}.`,
    });
  }
  for (const s of skills.filter((x) => x.claimGap && x.technical).slice(0, 3)) {
    if (gaps.some((g) => g.title.startsWith(`${s.label}:`))) continue;
    gaps.push({
      title: `${s.label}: claimed, not yet verified`,
      description: `${s.label} is claimed on the resume, but currently insufficient observable evidence was found to strongly verify the claim.`,
    });
  }

  // Coding-platform gaps are added to the role-based actions, not ranked by ROI.
  const codingActions: { title: string; description: string; impact: string }[] = [];
  if (!coding) {
    gaps.push({ title: 'No Coding Profile', description: 'No LeetCode, Codeforces, CodeChef, HackerRank or GeeksforGeeks profile to verify problem-solving skills.' });
    codingActions.push({ title: 'Practice on a Coding Platform', description: 'Solve problems regularly on LeetCode or Codeforces and add the profile to CareerLens. Most placement tests are DSA-based.', impact: 'High Impact' });
  } else if (coding.strength !== 'Strong') {
    gaps.push({ title: 'Limited Problem-Solving Practice', description: `${coding.totalSolved} problems solved so far; placement tests usually need consistent DSA practice.` });
    codingActions.push({ title: 'Build a DSA Practice Habit', description: 'Aim for 3–5 medium problems a week and take part in rated contests.', impact: 'Medium Impact' });
  }

  const academics = summarizeAcademics(inputs.profile);
  const experience = summarizeExperience(inputs.profile, asOf);

  const trace: TraceNode = {
    label: 'Career Readiness',
    score: overallScore,
    detail: `Σ(dimension × weight), re-normalized over measured dimensions · ${SCORING_VERSION}`,
    children: dimensions.map((d) => ({
      label: d.label,
      score: d.score,
      weight: d.effectiveWeight,
      detail: d.detail,
      children:
        d.key === 'technical'
          ? technical.used.map((s) => ({ label: s.label, score: s.score, weight: round1(1000 / TECHNICAL_TOP_SKILLS) / 1000, detail: VERIFICATION_LABEL[s.verification] }))
          : d.key === 'project' && projectDim
            ? projectDim.used.map((p, i) => ({ label: p.name, score: Math.round(p.score), weight: [0.5, 0.3, 0.2][i], detail: p.linkedRepo ? `GitHub repo: ${p.linkedRepo}` : inputs.github ? 'No matching GitHub repo found' : 'Resume only (no GitHub linked)' }))
            : d.key === 'roleAlignment' && role
              ? role.fit.requirements.map((r) => ({ label: r.label, score: Math.round(r.score), weight: r.importance, detail: `importance ${r.importance}${r.via === 'implied' ? `, implied by ${r.viaSkill}` : ''}` }))
              : d.key === 'consistency' && consistency
                ? consistency.parts.map((p) => ({ label: p.label, score: p.value === null ? null : Math.round(p.value), weight: p.weight, detail: p.detail }))
                : d.key === 'problemSolving' && coding
                  ? coding.platforms.map((p) => ({ label: `${p.platform} (@${p.handle})`, score: p.score, detail: [p.problemsSolved != null ? `${p.problemsSolved} solved` : null, p.maxRating ?? p.rating ? `rating ${p.maxRating ?? p.rating}` : null].filter(Boolean).join(', ') || undefined }))
                  : undefined,
    })),
  };

  return {
    scoringVersion: SCORING_VERSION,
    computedAt: inputs.asOf,
    overallScore,
    exactOverallScore: round1(exactOverall),
    confidence: round1(measuredWeight * 100) / 100,
    categories: dimensions.filter((d) => d.score !== null).map((d) => ({ title: d.label, score: d.score! })),
    dimensions,
    evidenceStrength,
    strengths,
    gaps,
    actions: [
      ...nextActions.map((a) => ({
        title: a.title,
        description: `${a.description} Est. +${Math.round(a.expectedImprovement)} ${a.skill} points (ROI ${a.roi}).`,
        impact: a.impact,
      })),
      ...codingActions,
    ],
    nextActions,
    skillScores: skills,
    projectScores: projects,
    roleAlignment: role,
    academics,
    experience,
    profileSource: inputs.profile.source,
    trace,
  };
}

function describeEvidence(s: SkillScore): string {
  const parts = [
    s.evidence.repos.length ? `${s.evidence.repos.length} GitHub repo${s.evidence.repos.length > 1 ? 's' : ''}` : null,
    s.evidence.projects.length ? `${s.evidence.projects.length} project${s.evidence.projects.length > 1 ? 's' : ''}` : null,
    s.evidence.roles.length ? `${s.evidence.roles.length} role${s.evidence.roles.length > 1 ? 's' : ''}` : null,
    s.sources.includes('portfolio') ? 'portfolio' : null,
  ].filter(Boolean);
  return parts.length ? `Backed by ${parts.join(', ')}.` : 'Backed by resume evidence.';
}
