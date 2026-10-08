// lib/scoring/skill-score.ts
// §8–§10, §29–§31 — per-skill evidence score with a full component trace.

import {
  ACTIVE_MONTHS_TABLE,
  CERTIFICATE_LEVEL_SCORE,
  CODING_LANGUAGE_MIN_SOLVED,
  CODING_LANGUAGE_SOLVED_TABLE,
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
  UNPROVEN_SKILL,
  type SkillComponentKey,
  type VerificationLevel,
} from './config';
import { clamp, daysBetween, piecewise, recencyScore, round1, verificationLevel, weightedScore } from './normalize';
import { canonicalizeSkill, findSkillsInText, impliedSkills, skillLabel, type SkillCategory } from './skill-taxonomy';
import { dockerMilestone, repoSignals, testingMilestone, type EvidenceInputs, type RepoSignals } from './evidence-inputs';
import type { ProjectScore } from './project-score';
import { experienceMonths, parseResumeDate } from '@/lib/profile/academics';
import { PLATFORM_INFO, type CodingPlatform } from '@/lib/coding/handles';

export type ComponentStatus =
  | 'measured' // evidence found and normalized
  | 'none_found' // the source was checked and shows nothing for this skill
  | 'source_unavailable' // the candidate didn't provide the source (no GitHub, no portfolio) — counts as 0
  | 'not_offered'; // CareerLens can't measure this yet — excluded from the weights

/** An external, checkable source that shows the skill. Resume text is a claim, not proof. */
export type ProofSource = {
  kind: 'github' | 'portfolio' | 'coding' | 'certificate';
  /** e.g. "GitHub", "LeetCode", "HackerRank certificate". */
  label: string;
  /** e.g. "3 repos: api, web", "120 problems in Python", "Python (Basic)". */
  detail: string;
  url: string | null;
};

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
  /** External sources that prove the skill; empty means "No proof". */
  proof: ProofSource[];
  proven: boolean;
  /** Set when the score was scaled down for having no proof: the weighted sum before the adjustment. */
  unprovenFrom: number | null;
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

type CodingLanguageEvidence = { platform: CodingPlatform; handle: string; url: string; name: string; solved: number; lastActiveAt: Date | null };
type CertificateEvidence = { name: string; level: keyof typeof CERTIFICATE_LEVEL_SCORE; url: string };

type Ctx = {
  inputs: EvidenceInputs;
  asOf: Date;
  repos: RepoSignals[];
  projectScores: ProjectScore[];
  projectSkills: Set<string>[];
  roleSkills: Set<string>[];
  claimed: Map<string, { listed: boolean; name: string; kind: 'technical' | 'soft' | 'domain' | null }>;
  portfolioSkills: Set<string> | null;
  /** Problems solved per skill on coding platforms (languages, SQL tracks…). */
  codingLanguages: Map<string, CodingLanguageEvidence[]>;
  /** Verified HackerRank certificates per skill. */
  certificates: Map<string, CertificateEvidence[]>;
};

// HackerRank names its general certificate "Problem Solving".
const CERTIFICATE_SKILL_ALIASES: Record<string, string> = { 'problem solving': 'dsa' };

function codingEvidence(inputs: EvidenceInputs) {
  const languages = new Map<string, CodingLanguageEvidence[]>();
  const certificates = new Map<string, CertificateEvidence[]>();
  for (const p of inputs.coding?.platforms ?? []) {
    const lastActiveAt = p.lastActiveAt ? new Date(p.lastActiveAt) : null;
    for (const l of p.languageStats ?? []) {
      const canon = canonicalizeSkill(l.name);
      // Only dictionary skills: badge tracks like "30 Days of Code" aren't skills.
      if (!canon.known || l.solved < CODING_LANGUAGE_MIN_SOLVED) continue;
      const list = languages.get(canon.id) ?? [];
      list.push({ platform: p.platform, handle: p.handle, url: p.profileUrl, name: canon.label, solved: l.solved, lastActiveAt });
      languages.set(canon.id, list);
    }
    for (const c of p.certificates) {
      // "Python (Basic)" -> Python, basic
      const m = c.match(/^(.*?)\s*(?:\((basic|intermediate|advanced)\))?$/i);
      const name = (m?.[1] ?? c).trim();
      const level = (m?.[2]?.toLowerCase() ?? 'unspecified') as CertificateEvidence['level'];
      const id = CERTIFICATE_SKILL_ALIASES[name.toLowerCase()] ?? (canonicalizeSkill(name).known ? canonicalizeSkill(name).id : null);
      if (!id) continue;
      const list = certificates.get(id) ?? [];
      list.push({ name: c, level, url: p.profileUrl });
      certificates.set(id, list);
    }
  }
  return { languages, certificates };
}

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
    ...(() => {
      const { languages, certificates } = codingEvidence(inputs);
      return { codingLanguages: languages, certificates };
    })(),
  };
}

/** Every skill with any evidence anywhere. */
export function candidateSkillIds(ctx: Ctx): Set<string> {
  const ids = new Set<string>(ctx.claimed.keys());
  ctx.projectSkills.forEach((s) => s.forEach((id) => ids.add(id)));
  ctx.roleSkills.forEach((s) => s.forEach((id) => ids.add(id)));
  ctx.repos.forEach((r) => r.skills.forEach((id) => ids.add(id)));
  ctx.portfolioSkills?.forEach((id) => ids.add(id));
  ctx.codingLanguages.forEach((_, id) => ids.add(id));
  ctx.certificates.forEach((_, id) => ids.add(id));
  if (ctx.inputs.coding) ids.add('dsa');
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
  if (id === 'dsa' && inputs.coding) {
    // Problem-solving practice on coding platforms is DSA's applied evidence, not resume projects.
    components.project = {
      raw: `${inputs.coding.totalSolved} problems solved across ${inputs.coding.platforms.length} platform${inputs.coding.platforms.length > 1 ? 's' : ''}`,
      normalized: inputs.coding.overallScore,
      status: 'measured',
      source: 'coding platforms',
    };
  } else if (profile.source === 'fallback') {
    // Not the student's missing evidence — the resume just couldn't be read — so leave it out.
    components.project = { raw: 'Projects not readable without AI extraction', normalized: null, status: 'not_offered', source: 'resume' };
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
  // Code solved on coding platforms is code evidence too: problems solved in a
  // language, and the §15 coding score for DSA. The stronger source counts.
  const codingLangs = ctx.codingLanguages.get(id) ?? [];
  const codingSolved = codingLangs.reduce((a, l) => a + l.solved, 0);
  const coding = inputs.coding ?? null;
  const codingCode: { value: number; raw: string; source: string } | null =
    id === 'dsa' && coding
      ? { value: coding.overallScore, raw: `Coding score ${coding.overallScore} (${coding.totalSolved} solved)`, source: 'coding platforms' }
      : codingSolved > 0
        ? {
            value: piecewise(codingSolved, CODING_LANGUAGE_SOLVED_TABLE),
            raw: codingLangs.map((l) => `${l.solved} solved on ${PLATFORM_INFO[l.platform].label}`).join(', '),
            source: 'coding platforms',
          }
        : null;

  if (!inputs.github) {
    components.github = codingCode
      ? { raw: codingCode.raw, normalized: round1(codingCode.value), status: 'measured', source: codingCode.source }
      : { raw: 'No GitHub linked', normalized: 0, status: 'source_unavailable', source: 'github' };
  } else if (id === 'docker' || id === 'testing') {
    const m = id === 'docker' ? dockerMilestone(ctx.repos, false) : testingMilestone(ctx.repos, false);
    components.github = {
      raw: m.label,
      normalized: m.score,
      status: m.score > 0 ? 'measured' : 'none_found',
      source: `github @${inputs.github.username}`,
    };
  } else {
    const repoValue = piecewise(repos.length, GITHUB_REPO_TABLE);
    const repoRaw = repos.length ? `${repos.length} repo${repos.length > 1 ? 's' : ''}: ${repos.slice(0, 4).map((r) => r.name).join(', ')}${repos.length > 4 ? '…' : ''}` : 'No repos use it';
    const useCoding = !!codingCode && codingCode.value > repoValue;
    components.github = {
      raw: useCoding ? codingCode!.raw : repoRaw,
      normalized: round1(useCoding ? codingCode!.value : repoValue),
      status: repos.length || codingCode ? 'measured' : 'none_found',
      source: useCoding ? codingCode!.source : `github @${inputs.github.username}`,
    };
  }

  // Assessment (15%) — a verified HackerRank skill certificate is a controlled
  // assessment; without one the component is left out (no assessment module yet).
  const certs = ctx.certificates.get(id) ?? [];
  const bestCert = certs.reduce<CertificateEvidence | null>(
    (best, c) => (!best || CERTIFICATE_LEVEL_SCORE[c.level] > CERTIFICATE_LEVEL_SCORE[best.level] ? c : best),
    null
  );
  components.assessment = bestCert
    ? { raw: `HackerRank certificate: ${bestCert.name}`, normalized: CERTIFICATE_LEVEL_SCORE[bestCert.level], status: 'measured', source: 'hackerrank certificate' }
    : { raw: 'No verified certificate', normalized: null, status: 'not_offered', source: 'assessment' };

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
  codingLangs.forEach((l) => l.lastActiveAt && activityDates.push(l.lastActiveAt));
  if (id === 'dsa') {
    for (const p of coding?.platforms ?? []) if (p.lastActiveAt) activityDates.push(new Date(p.lastActiveAt));
  }
  const latest = activityDates.length ? new Date(Math.max(...activityDates.map((d) => d.getTime()))) : null;
  const days = latest ? Math.round(daysBetween(latest, asOf)) : null;
  components.recency = days === null
    ? { raw: 'No dated activity', normalized: 0, status: 'none_found', source: 'github & resume dates' }
    : { raw: days <= 1 ? 'Active now' : `${days} days ago`, normalized: recencyScore(days), status: 'measured', source: 'github & resume dates' };

  // Consistency (10%) — §15 sub-model, per skill.
  const codingProof = codingLangs.length > 0 || (id === 'dsa' && !!coding);
  const sources = [onResume, repos.length > 0, !!ctx.portfolioSkills?.has(id), codingProof, certs.length > 0].filter(Boolean).length;
  if (days === null) {
    components.consistency = { raw: 'Needs dated activity', normalized: 0, status: 'none_found', source: 'github & resume dates' };
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
    ? { raw: 'No portfolio site', normalized: 0, status: 'source_unavailable', source: 'portfolio' }
    : ctx.portfolioSkills.has(id)
      ? { raw: 'Detected on portfolio site', normalized: 100, status: 'measured', source: inputs.portfolio!.url }
      : { raw: 'Not detected on portfolio site', normalized: 0, status: 'none_found', source: inputs.portfolio!.url };

  // Weighted sum (§8). Only components CareerLens can't measure yet ('not_offered',
  // i.e. Assessment without a certificate) leave the denominator. A proof source
  // the student didn't link (no GitHub, no portfolio) counts as 0 — proof is
  // what the score rewards. Linked sources still drive confidence.
  const keys = Object.keys(SKILL_COMPONENT_WEIGHTS) as SkillComponentKey[];
  const counts = (k: SkillComponentKey) => components[k].status !== 'not_offered';
  const provided = (k: SkillComponentKey) => components[k].status === 'measured' || components[k].status === 'none_found';
  const scoringWeight = keys.filter(counts).reduce((a, k) => a + SKILL_COMPONENT_WEIGHTS[k], 0);
  const availableWeight = keys.filter((k) => provided(k) && !UNOFFERED_SKILL_COMPONENTS.includes(k)).reduce((a, k) => a + SKILL_COMPONENT_WEIGHTS[k], 0);
  let num = 0;
  const list: ScoreComponent[] = keys.map((key) => {
    const c = components[key];
    const weight = SKILL_COMPONENT_WEIGHTS[key];
    const effectiveWeight = counts(key) && scoringWeight > 0 ? weight / scoringWeight : 0;
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

  // Proof: external sources that show the skill.
  const proof: ProofSource[] = [];
  const githubUrl = inputs.github ? `https://github.com/${inputs.github.username}` : null;
  const linkedRepos = projIdx.map((i) => ctx.projectScores[i].linkedRepo).filter((r): r is string => !!r);
  const proofRepos = Array.from(new Set([...repos.map((r) => r.name), ...linkedRepos]));
  if (id === 'docker' || id === 'testing') {
    const m = id === 'docker' ? dockerMilestone(ctx.repos, false) : testingMilestone(ctx.repos, false);
    // A topic or description mention isn't proof; a Dockerfile / test config is.
    if (m.score >= (id === 'docker' ? 50 : 60) && githubUrl) proof.push({ kind: 'github', label: 'GitHub', detail: m.label, url: githubUrl });
  } else if (proofRepos.length && githubUrl) {
    proof.push({
      kind: 'github',
      label: 'GitHub',
      detail: `${proofRepos.length} repo${proofRepos.length > 1 ? 's' : ''}: ${proofRepos.slice(0, 3).join(', ')}${proofRepos.length > 3 ? '…' : ''}`,
      url: proofRepos.length === 1 ? `${githubUrl}/${proofRepos[0]}` : githubUrl,
    });
  }
  if (ctx.portfolioSkills?.has(id)) {
    proof.push({ kind: 'portfolio', label: 'Portfolio', detail: 'Used on the live site', url: inputs.portfolio!.url });
  }
  for (const l of codingLangs) {
    proof.push({ kind: 'coding', label: PLATFORM_INFO[l.platform].label, detail: `${l.solved} problem${l.solved === 1 ? '' : 's'} in ${l.name}`, url: l.url });
  }
  if (id === 'dsa') {
    for (const p of coding?.platforms ?? []) {
      if ((p.problemsSolved ?? 0) > 0 || (p.contests ?? 0) > 0) {
        const bits = [p.problemsSolved ? `${p.problemsSolved} solved` : null, p.rank].filter(Boolean).join(', ');
        proof.push({ kind: 'coding', label: PLATFORM_INFO[p.platform].label, detail: bits || 'Active profile', url: p.profileUrl });
      }
    }
  }
  for (const c of certs) proof.push({ kind: 'certificate', label: 'HackerRank certificate', detail: c.name, url: c.url });
  const proven = proof.length > 0;

  const weightedSum = round1(clamp(num));
  // Without proof the score is scaled down and capped below "Emerging" (§8):
  // a claim alone shouldn't count much toward competency or role fit.
  const exactScore = proven ? weightedSum : round1(Math.min(weightedSum * UNPROVEN_SKILL.factor, UNPROVEN_SKILL.cap));
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
    claimGap: onResume && (!proven || score <= 40),
    proof,
    proven,
    unprovenFrom: proven ? null : weightedSum,
    components: list,
    sources: [
      onResume && 'resume',
      proofRepos.length > 0 && 'github',
      ctx.portfolioSkills?.has(id) && 'portfolio',
      codingProof && 'coding',
      certs.length > 0 && 'certificate',
    ].filter(Boolean) as string[],
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
  repos.forEach((r) => { 
    add(r.lastActivity); 
    add(r.createdAt); 
    r.commitDates.forEach(add);
  });
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
