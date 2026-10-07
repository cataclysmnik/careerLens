// lib/scoring/jobMatch.ts
//
// Resume × job description cross-validation:
//   1. LLM interprets the JD   -> weighted skill requirements + eligibility
//   2. Engine measures/calculates -> role fit, gaps, priority, eligibility, verdict
//   3. LLM explains             -> narrative grounded in the numbers from step 2
// The verdict and every number come from step 2 only.

import { extractJobRequirements } from '@/lib/llm/extract-jd';
import { researchBrief, type RoleResearch } from '@/lib/jobs/role-research';
import { generateFitAssessment } from '@/lib/llm/cross-validate';
import type { FitAssessment, JobRequirements } from '@/lib/llm/schemas';
import { canonicalizeSkill } from './skill-taxonomy';
import { computeRoleFit, recommendActions, type NextAction, type RequirementResult, type RoleFitResult } from './role-fit';
import { calculateReadiness, computeSkillProfile, type ScoringResult } from './engine';
import { checkEligibility, type EligibilityResult } from './eligibility';
import { CRITICAL_GAP_LIMIT, FIT_VERDICT_THRESHOLDS, SCORING_VERSION } from './config';
import type { EvidenceInputs } from './evidence-inputs';
import type { SkillScore } from './skill-score';
import type { FitVerdict } from './verdict';

export { VERDICT_LABEL, type FitVerdict } from './verdict';

export type JobFitResult = {
  scoringVersion: string;
  job: { title: string | null; company: string | null; seniority: JobRequirements['seniority']; responsibilities: string[] };
  roleFit: number;
  exactRoleFit: number;
  formula: { numerator: number; denominator: number };
  verdict: FitVerdict;
  verdictReason: string;
  eligibility: EligibilityResult;
  requirements: RequirementResult[];
  gaps: RequirementResult[];
  nextActions: NextAction[];
  bonusSkills: { id: string; label: string; score: number }[];
  coverage: { required: number; requiredMet: number; preferred: number; preferredMet: number };
  /** Overall readiness with this JD as the role-alignment dimension (§17). */
  readinessForRole: Pick<ScoringResult, 'overallScore' | 'dimensions' | 'confidence'>;
  academics: ScoringResult['academics'];
  experience: ScoringResult['experience'];
  projectNames: string[];
  skillScores: SkillScore[];
  assessment: FitAssessment | null;
  /** Set when requirements came from researching a role rather than a pasted JD. */
  research: Pick<RoleResearch, 'role' | 'method' | 'postingCount' | 'frequencies' | 'sourcesTried' | 'fetchedAt' | 'smallSample' | 'aiReadPostings'> & {
    postings: RoleResearch['postings'];
  } | null;
  ai: {
    enabled: boolean;
    jdParsedBy: 'llm' | 'keywords' | 'job_postings' | 'role_catalog' | 'ai_estimate';
    assessment: 'llm' | 'unavailable';
    profileSource: 'llm' | 'fallback';
    errors: string[];
  };
};

/** One uploaded resume in the company bulk matcher. */
export type CompanyMatchRow =
  | { fileName: string; candidateName: string | null; result: JobFitResult }
  | { fileName: string; error: string };

type Req = { id: string; label: string; alternatives: string[]; importance: 1 | 2 | 3 | 4 | 5; requirement: 'required' | 'preferred'; quote: string };

function toRoleRequirements(req: JobRequirements): Req[] {
  // Collapse "X or Y" groups into one requirement, and merge duplicates that
  // canonicalize to the same skill, keeping the highest importance.
  const byKey = new Map<string, Req>();
  for (const s of req.skills) {
    const c = canonicalizeSkill(s.name);
    const importance = Math.min(5, Math.max(1, s.importance)) as Req['importance'];
    const label = c.known ? c.label : s.name;
    const key = s.anyOfGroup ? `group:${s.anyOfGroup.toLowerCase()}` : c.id;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { id: c.id, label, alternatives: [], importance, requirement: s.requirement, quote: s.quote });
    } else if (s.anyOfGroup) {
      if (prev.id !== c.id && !prev.alternatives.includes(c.id)) {
        prev.alternatives.push(c.id);
        prev.label = `${prev.label} / ${label}`;
      }
      prev.importance = Math.max(prev.importance, importance) as Req['importance'];
    } else if (importance > prev.importance) {
      byKey.set(key, { ...prev, importance, requirement: s.requirement, quote: s.quote });
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.importance - a.importance);
}

function decideVerdict(fit: RoleFitResult, eligibility: EligibilityResult): { verdict: FitVerdict; reason: string } {
  const failed = eligibility.checks.filter((c) => c.status === 'fail');
  if (failed.length > 0) {
    return { verdict: 'not_eligible', reason: `Does not meet: ${failed.map((c) => `${c.label} (${c.required}, has ${c.actual})`).join('; ')}.` };
  }
  if (fit.requirements.length === 0) {
    return { verdict: 'not_a_fit', reason: 'No technical requirements could be identified in this job description.' };
  }
  const critical = fit.gaps.filter((g) => g.importance === 5 && g.gap > CRITICAL_GAP_LIMIT);
  const f = fit.exactFit;
  let verdict: FitVerdict = f >= FIT_VERDICT_THRESHOLDS.strong ? 'strong_fit' : f >= FIT_VERDICT_THRESHOLDS.good ? 'good_fit' : f >= FIT_VERDICT_THRESHOLDS.stretch ? 'stretch' : 'not_a_fit';
  let reason = `Role fit ${Math.round(f)}/100 (strong ≥ ${FIT_VERDICT_THRESHOLDS.strong}, good ≥ ${FIT_VERDICT_THRESHOLDS.good}, stretch ≥ ${FIT_VERDICT_THRESHOLDS.stretch}).`;
  if (critical.length > 0 && (verdict === 'strong_fit' || verdict === 'good_fit')) {
    verdict = 'stretch';
    reason += ` Capped at Stretch: must-have ${critical.map((g) => g.label).join(', ')} ${critical.length > 1 ? 'are' : 'is'} more than ${CRITICAL_GAP_LIMIT} points below target.`;
  }
  return { verdict, reason };
}

export async function analyzeJobFit(
  inputs: EvidenceInputs,
  jobDescription: string,
  opts: { explain?: boolean } = {}
): Promise<JobFitResult> {
  // 1. Interpret the JD.
  const jd = await extractJobRequirements(jobDescription);
  return scoreJobFit(inputs, jd.requirements, {
    explain: opts.explain ?? true,
    explainText: jobDescription,
    aiEnabled: jd.ai.enabled,
    parsedBy: jd.ai.used ? 'llm' : 'keywords',
    errors: jd.ai.error ? [`JD parsing: ${jd.ai.error}`] : [],
    research: null,
  });
}

/** Fit against a role's requirements measured from current job postings (lib/jobs/role-research). */
export async function analyzeRoleFit(inputs: EvidenceInputs, research: RoleResearch, opts: { explain?: boolean } = {}): Promise<JobFitResult> {
  return scoreJobFit(inputs, research.requirements, {
    explain: opts.explain ?? true,
    explainText: researchBrief(research),
    aiEnabled: true,
    parsedBy: research.method,
    errors: [],
    research: {
      role: research.role,
      method: research.method,
      postingCount: research.postingCount,
      frequencies: research.frequencies,
      sourcesTried: research.sourcesTried,
      fetchedAt: research.fetchedAt,
      smallSample: research.smallSample,
      aiReadPostings: research.aiReadPostings,
      postings: research.postings.slice(0, 12),
    },
  });
}

async function scoreJobFit(
  inputs: EvidenceInputs,
  requirements: JobRequirements,
  opts: {
    explain: boolean;
    /** What the explanation step reads as "the job": the JD, or a research brief. */
    explainText: string;
    aiEnabled: boolean;
    parsedBy: JobFitResult['ai']['jdParsedBy'];
    errors: string[];
    research: JobFitResult['research'];
  }
): Promise<JobFitResult> {
  const { explain, errors } = opts;
  const jd = { requirements };
  const reqs = toRoleRequirements(requirements);

  // 2. Measure + calculate.
  const sp = computeSkillProfile(inputs);
  const fit = computeRoleFit(reqs, sp.scoreMap);
  const readiness = calculateReadiness(inputs, {
    skillProfile: sp,
    roleOverride: { title: jd.requirements.title ?? 'this role', fit },
  });
  const eligibility = checkEligibility(jd.requirements.eligibility, readiness.academics, readiness.experience, inputs.profile.activeBacklogs);
  const { verdict, reason } = decideVerdict(fit, eligibility);
  const nextActions = recommendActions(fit.gaps, sp.scoreMap, fit.denominator);

  const reqIds = new Set(reqs.flatMap((r) => [r.id, ...r.alternatives]));
  const bonusSkills = sp.skills
    .filter((s) => !reqIds.has(s.id) && s.score > 60)
    .slice(0, 8)
    .map((s) => ({ id: s.id, label: s.label, score: s.score }));

  const required = fit.requirements.filter((r) => r.requirement === 'required');
  const preferred = fit.requirements.filter((r) => r.requirement === 'preferred');

  const result: JobFitResult = {
    scoringVersion: SCORING_VERSION,
    job: {
      title: jd.requirements.title,
      company: jd.requirements.company,
      seniority: jd.requirements.seniority,
      responsibilities: jd.requirements.responsibilities,
    },
    roleFit: fit.fit,
    exactRoleFit: fit.exactFit,
    formula: { numerator: fit.numerator, denominator: fit.denominator },
    verdict,
    verdictReason: reason,
    eligibility,
    requirements: fit.requirements,
    gaps: fit.gaps,
    nextActions,
    bonusSkills,
    coverage: {
      required: required.length,
      requiredMet: required.filter((r) => r.gap === 0).length,
      preferred: preferred.length,
      preferredMet: preferred.filter((r) => r.gap === 0).length,
    },
    readinessForRole: { overallScore: readiness.overallScore, dimensions: readiness.dimensions, confidence: readiness.confidence },
    academics: readiness.academics,
    experience: readiness.experience,
    projectNames: inputs.profile.projects.map((p) => p.name),
    skillScores: sp.skills,
    assessment: null,
    research: opts.research,
    ai: {
      enabled: opts.aiEnabled,
      jdParsedBy: opts.parsedBy,
      assessment: 'unavailable',
      profileSource: inputs.profile.source,
      errors,
    },
  };

  // 3. Explain. Runs after every number is fixed; its output can't change them.
  if (explain && opts.aiEnabled) {
    try {
      result.assessment = await generateFitAssessment(inputs.profile, opts.explainText, result);
      result.ai.assessment = 'llm';
    } catch (e) {
      errors.push(`Assessment: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  return result;
}
