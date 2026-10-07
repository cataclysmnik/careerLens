// lib/scoring/skill-score.ts
// §8–§10, §29–§31 — per-skill evidence score with a full component trace.

import {
  ACTIVE_MONTHS_TABLE,
  CONSISTENCY_WEIGHTS,
  CONTINUATION_MIN_DAYS,
  EXPERIENCE_MONTHS_TABLE,
  GITHUB_REPO_TABLE,
  IMPLIED_SKILL_CREDIT,
  INSUFFICIENT_EVIDENCE_CONFIDENCE,
  PROJECT_BREADTH_BONUS,
  SKILL_COMPONENT_WEIGHTS,
  SOURCE_COUNT_TABLE,
  UNOFFERED_SKILL_COMPONENTS,
  type SkillComponentKey,
  type VerificationLevel,
} from './config';
import { clamp, daysBetween, piecewise, recencyScore, round1, verificationLevel, weightedScore } from './normalize';
import { canonicalizeSkill, findSkillsInText, impliedSkills, skillLabel, type SkillCategory } from './skill-taxonomy';
import { dockerMilestone, repoSignals, testingMilestone, type EvidenceInputs, type RepoSignals } from './evidence-inputs';
import type { ProjectScore } from './project-score';
import { experienceMonths, parseResumeDate } from '@/lib/profile/academics';

export type ComponentStatus =
  | 'measured' // evidence found and normalized
  | 'none_found' // the source was checked and shows nothing for this skill
  | 'source_unavailable' // the candidate didn't provide the source (no GitHub, no portfolio)
  | 'not_offered'; // CareerLens can't measure this yet — excluded from the weights

export type ScoreComponent = {
  key: SkillComponentKey;
  label: string;
  /** Human-readable raw measurement, e.g. "3 repos", "Dockerfile + Compose", "20 days ago". */
  raw: string;
  /** 0–100, or null when there's no data. */
  normalized: number | null;
  /** Handoff weight (§8). */
  weight: number;
  /** Weight after re-normalizing over components with an available source. */
  effectiveWeight: number;
  weighted: number;
  status: ComponentStatus;
  source: string;
};

export type SkillScore = {
  id: string;
  label: string;
  category: SkillCategory;
  /** Counts toward Technical Competency and role fit; soft/domain skills are reported but not scored as technical. */
  technical: boolean;
  /** Rounded 0–100 evidence score. */
  score: number;
  exactScore: number;
  verification: VerificationLevel;
  /** Low score *and* low coverage — report as "not enough evidence", not "lacks skill" (§30). */
  insufficientEvidence: boolean;
  /** Share of the scoring weight backed by an available source, 0–1 (§31). */
  confidence: number;
  claimed: boolean;
  /** Claimed on the resume but weakly evidenced (§10). */
  claimGap: boolean;
  components: ScoreComponent[];
  sources: string[];
  evidence: { projects: string[]; roles: string[]; repos: string[] };
};

const COMPONENT_LABEL: Record<SkillComponentKey, string> = {
  resumeClaim: 'Resume Claim',
  project: 'Project Evidence',
  github: 'GitHub / Code Evidence',
  assessment: 'Assessment',
  recency: 'Recency',
  consistency: 'Consistency',
  portfolio: 'Portfolio',
};

const OFFERED_WEIGHT_SUM = (Object.keys(SKILL_COMPONENT_WEIGHTS) as SkillComponentKey[])
  .filter((k) => !UNOFFERED_SKILL_COMPONENTS.includes(k))
  .reduce((a, k) => a + SKILL_COMPONENT_WEIGHTS[k], 0);

type Ctx = {
  inputs: EvidenceInputs;
  asOf: Date;
  repos: RepoSignals[];
  projectScores: ProjectScore[];
  projectSkills: Set<string>[];
  roleSkills: Set<string>[];
  claimed: Map<string, { listed: boolean; name: string; kind: 'technical' | 'soft' | 'domain' | null }>;
  portfolioSkills: Set<string> | null;
};

export function buildContext(inputs: EvidenceInputs, projectScores: ProjectScore[]): Ctx {
  const { profile } = inputs;
  const repos = (inputs.github?.repositories ?? []).filter((r) => !r.fork).map(repoSignals);
  const claimed = new Map<string, { listed: boolean; name: string; kind: 'technical' | 'soft' | 'domain' | null }>();
  for (const s of profile.skills) {
    const id = canonicalizeSkill(s.name).id;
    const prev = claimed.get(id);
    // `kind` is missing on profiles extracted before v1.2.
    claimed.set(id, { listed: s.listedInSkillsSection || !!prev?.listed, name: prev?.name ?? s.name, kind: s.kind ?? prev?.kind ?? null });
  }
  return {
    inputs,
    asOf: new Date(inputs.asOf),
    repos,
    projectScores,
    projectSkills: projectScores.map((p) => new Set(p.skills)),
    roleSkills: profile.experience.map((x) => {
      const ids = new Set(x.skills.map((s) => canonicalizeSkill(s).id));
      for (const id of findSkillsInText(x.description)) ids.add(id);
      return ids;
    }),
    claimed,
    portfolioSkills: inputs.portfolio
      ? new Set(inputs.portfolio.detectedFrameworks.map((f) => canonicalizeSkill(f).id))
      : null,
  };
}

/** Every skill with any evidence anywhere. */
export function candidateSkillIds(ctx: Ctx): Set<string> {
  const ids = new Set<string>(ctx.claimed.keys());
  ctx.projectSkills.forEach((s) => s.forEach((id) => ids.add(id)));
  ctx.roleSkills.forEach((s) => s.forEach((id) => ids.add(id)));
  ctx.repos.forEach((r) => r.skills.forEach((id) => ids.add(id)));
  ctx.portfolioSkills?.forEach((id) => ids.add(id));
  return ids;
}

export function scoreSkill(id: string, ctx: Ctx): SkillScore {
  const { inputs, asOf } = ctx;
  const profile = inputs.profile;
  const canon = canonicalizeSkill(skillLabel(id));
  const claim = ctx.claimed.get(id);

  const projIdx = ctx.projectSkills.map((s, i) => (s.has(id) ? i : -1)).filter((i) => i >= 0);
  const roleIdx = ctx.roleSkills.map((s, i) => (s.has(id) ? i : -1)).filter((i) => i >= 0);
  const repos = ctx.repos.filter((r) => r.skills.has(id));

  const components = {} as Record<SkillComponentKey, Omit<ScoreComponent, 'key' | 'label' | 'weight' | 'effectiveWeight' | 'weighted'>>;

  // Resume claim (5%) — a claim is a claim, not verification (§10).
  const onResume = !!claim || projIdx.length > 0 || roleIdx.length > 0;
  components.resumeClaim = {
    raw: claim?.listed ? 'Listed in skills section' : onResume ? 'Mentioned in projects/experience' : 'Not on resume',
    normalized: onResume ? 100 : 0,
    status: onResume ? 'measured' : 'none_found',
    source: 'resume',
  };

  // Project evidence (25%) — best project using the skill, best role by duration, plus breadth.
  if (profile.source === 'fallback') {
    components.project = { raw: 'Projects not readable without AI extraction', normalized: null, status: 'source_unavailable', source: 'resume' };
  } else {
    const bestProject = projIdx.reduce<{ score: number; name: string } | null>((best, i) => {
      const p = ctx.projectScores[i];
      return !best || p.score > best.score ? { score: p.score, name: p.name } : best;
    }, null);
    const roleMonths = roleIdx.reduce((acc, i) => acc + (experienceMonths(profile.experience[i], asOf) ?? 0), 0);
    const expScore = piecewise(roleMonths, EXPERIENCE_MONTHS_TABLE);
    const pieces = projIdx.length + roleIdx.length;
    const breadth = Math.min(PROJECT_BREADTH_BONUS.max, Math.max(0, pieces - 1) * PROJECT_BREADTH_BONUS.perExtra);
    const base = Math.max(bestProject?.score ?? 0, expScore);
    const value = pieces > 0 ? clamp(base + breadth) : 0;
    const parts = [
      bestProject ? `best project "${bestProject.name}" ${Math.round(bestProject.score)}` : null,
      roleMonths > 0 ? `${roleMonths} mo in roles → ${Math.round(expScore)}` : null,
      breadth > 0 ? `+${breadth} breadth (${pieces} uses)` : null,
    ].filter(Boolean);
    components.project = {
      raw: parts.length ? parts.join(', ') : 'No project or role uses it',
      normalized: round1(value),
      status: pieces > 0 ? 'measured' : 'none_found',
      source: 'resume projects & experience',
    };
  }

  // GitHub / code evidence (30%) — capped repo curve, or milestones for Docker/testing (§4, §7).
  if (!inputs.github) {
    components.github = { raw: 'No GitHub linked', normalized: null, status: 'source_unavailable', source: 'github' };
  } else if (id === 'docker' || id === 'testing') {
    const m = id === 'docker' ? dockerMilestone(ctx.repos, false) : testingMilestone(ctx.repos, false);
    components.github = {
      raw: m.label,
      normalized: m.score,
      status: m.score > 0 ? 'measured' : 'none_found',
      source: `github @${inputs.github.username}`,
    };
  } else {
    const value = piecewise(repos.length, GITHUB_REPO_TABLE);
    components.github = {
      raw: repos.length ? `${repos.length} repo${repos.length > 1 ? 's' : ''}: ${repos.slice(0, 4).map((r) => r.name).join(', ')}${repos.length > 4 ? '…' : ''}` : 'No repos use it',
      normalized: round1(value),
      status: repos.length ? 'measured' : 'none_found',
      source: `github @${inputs.github.username}`,
    };
  }

  // Assessment (15%) — no assessment module yet.
  components.assessment = { raw: 'No assessments on CareerLens yet', normalized: null, status: 'not_offered', source: 'assessment' };

  // Recency (10%) — most recent dated activity using the skill (§6).
  const activityDates: Date[] = [];
  repos.forEach((r) => r.lastActivity && activityDates.push(r.lastActivity));
  roleIdx.forEach((i) => {
    const x = profile.experience[i];
    const d = x.isCurrent ? asOf : parseResumeDate(x.endDate, true);
    if (d) activityDates.push(d);
  });
  projIdx.forEach((i) => {
    const d = parseResumeDate(profile.projects[i].endDate, true);
    if (d) activityDates.push(d);
  });
  const latest = activityDates.length ? new Date(Math.max(...activityDates.map((d) => d.getTime()))) : null;
  const days = latest ? Math.round(daysBetween(latest, asOf)) : null;
  components.recency = days === null
    ? { raw: 'No dated activity', normalized: null, status: 'none_found', source: 'github & resume dates' }
    : { raw: days <= 1 ? 'Active now' : `${days} days ago`, normalized: recencyScore(days), status: 'measured', source: 'github & resume dates' };

  // Consistency (10%) — §15 sub-model, per skill.
  const sources = [onResume, repos.length > 0, !!ctx.portfolioSkills?.has(id)].filter(Boolean).length;
  if (days === null) {
    components.consistency = { raw: 'Needs dated activity', normalized: null, status: 'none_found', source: 'github & resume dates' };
  } else {
    const continued = repos.filter((r) => r.createdAt && r.lastActivity && daysBetween(r.createdAt, r.lastActivity) >= CONTINUATION_MIN_DAYS).length;
    const longRoles = roleIdx.filter((i) => (experienceMonths(profile.experience[i], asOf) ?? 0) >= 2).length;
    const continuation = repos.length + roleIdx.length > 0 ? ((continued + longRoles) / (repos.length + roleIdx.length)) * 100 : null;
    const months = activeMonths(repos, roleIdx.map((i) => profile.experience[i]), asOf);
    const value = weightedScore([
      { value: recencyScore(days), weight: CONSISTENCY_WEIGHTS.recentActivity },
      { value: continuation, weight: CONSISTENCY_WEIGHTS.projectContinuation },
      { value: piecewise(months, ACTIVE_MONTHS_TABLE), weight: CONSISTENCY_WEIGHTS.activityRegularity },
      { value: piecewise(sources, SOURCE_COUNT_TABLE), weight: CONSISTENCY_WEIGHTS.skillConsistency },
    ]) ?? 0;
    components.consistency = {
      raw: `${months} active month${months === 1 ? '' : 's'} (12 mo), ${sources} source${sources === 1 ? '' : 's'}`,
      normalized: round1(value),
      status: 'measured',
      source: 'github & resume dates',
    };
  }

  // Portfolio (5%).
  components.portfolio = !ctx.portfolioSkills
    ? { raw: 'No portfolio site', normalized: null, status: 'source_unavailable', source: 'portfolio' }
    : ctx.portfolioSkills.has(id)
      ? { raw: 'Detected on portfolio site', normalized: 100, status: 'measured', source: inputs.portfolio!.url }
      : { raw: 'Not detected on portfolio site', normalized: 0, status: 'none_found', source: inputs.portfolio!.url };

  // Weighted sum (§8) with the missing-evidence rule (§29–31): components we
  // can't measure (not offered) or whose source the candidate didn't provide
  // (no GitHub, no portfolio) leave the denominator, so absence of a source is
  // never scored as 0. That missing coverage shows up as lower confidence.
  // A source that *was* checked and shows nothing ('none_found') counts as 0.
  const keys = Object.keys(SKILL_COMPONENT_WEIGHTS) as SkillComponentKey[];
  const counts = (k: SkillComponentKey) => components[k].status === 'measured' || components[k].status === 'none_found';
  const availableWeight = keys.filter(counts).reduce((a, k) => a + SKILL_COMPONENT_WEIGHTS[k], 0);
  let num = 0;
  const list: ScoreComponent[] = keys.map((key) => {
    const c = components[key];
    const weight = SKILL_COMPONENT_WEIGHTS[key];
    const effectiveWeight = counts(key) && availableWeight > 0 ? weight / availableWeight : 0;
    const weighted = (c.normalized ?? 0) * effectiveWeight;
    num += weighted;
    return { key, label: COMPONENT_LABEL[key], ...c, weight, effectiveWeight: Math.round(effectiveWeight * 1000) / 1000, weighted: round1(weighted) };
  });

  // Dictionary skills are technical (except Agile, a process). Others follow the
  // AI's label; without one, only skills a project or repo actually uses count.
  const technical = canon.known
    ? id !== 'agile'
    : claim?.kind
      ? claim.kind === 'technical'
      : projIdx.length > 0 || repos.length > 0;

  const exactScore = round1(clamp(num));
  const score = Math.round(exactScore);
  const confidence = Math.round((availableWeight / OFFERED_WEIGHT_SUM) * 100) / 100;
  const insufficientEvidence = confidence < INSUFFICIENT_EVIDENCE_CONFIDENCE && score <= 40;

  return {
    id,
    label: canon.known ? canon.label : claim?.name.trim() || skillLabel(id),
    category: canon.category,
    technical,
    score,
    exactScore,
    verification: verificationLevel(score),
    insufficientEvidence,
    confidence,
    claimed: onResume,
    claimGap: onResume && score <= 40,
    components: list,
    sources: [onResume && 'resume', repos.length > 0 && 'github', ctx.portfolioSkills?.has(id) && 'portfolio'].filter(Boolean) as string[],
    evidence: {
      projects: projIdx.map((i) => profile.projects[i].name),
      roles: roleIdx.map((i) => [profile.experience[i].title, profile.experience[i].organization].filter(Boolean).join(' @ ')),
      repos: repos.map((r) => r.name),
    },
  };
}

function activeMonths(repos: RepoSignals[], roles: EvidenceInputs['profile']['experience'], asOf: Date): number {
  const cutoff = new Date(asOf);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);
  const months = new Set<string>();
  const add = (d: Date | null) => { if (d && d >= cutoff && d <= asOf) months.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`); };
  repos.forEach((r) => { add(r.lastActivity); add(r.createdAt); });
  for (const x of roles) {
    const start = parseResumeDate(x.startDate);
    const end = x.isCurrent ? asOf : parseResumeDate(x.endDate, true);
    if (!start || !end) continue;
    const d = new Date(Math.max(start.getTime(), cutoff.getTime()));
    while (d <= end && d <= asOf) { add(new Date(d)); d.setUTCMonth(d.getUTCMonth() + 1); }
  }
  return months.size;
}

/** Look up a skill score, falling back to implied credit (e.g. Next.js ⇒ React at 80%). */
export function resolveSkillScore(
  id: string,
  scores: Map<string, SkillScore>
): { score: number; via: 'direct' | 'implied' | 'none'; viaSkill: SkillScore | null; skill: SkillScore | null } {
  const direct = scores.get(id) ?? null;
  let implied: { score: number; skill: SkillScore } | null = null;
  for (const s of scores.values()) {
    if (s.id === id || !impliedSkills(s.id).includes(id)) continue;
    const credit = s.exactScore * IMPLIED_SKILL_CREDIT;
    if (!implied || credit > implied.score) implied = { score: credit, skill: s };
  }
  if (direct && (!implied || direct.exactScore >= implied.score)) {
    return { score: direct.exactScore, via: 'direct', viaSkill: null, skill: direct };
  }
  if (implied) return { score: round1(implied.score), via: 'implied', viaSkill: implied.skill, skill: direct };
  return { score: 0, via: 'none', viaSkill: null, skill: null };
}
