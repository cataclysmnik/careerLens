// lib/llm/cross-validate.ts
// LLM step 3: cross-validate the resume against the JD and explain the
// already-computed result. It receives the scores as fixed facts.

import { callGroqJSON, GROQ_MODELS } from './groq';
import { FitAssessmentSchema, type FitAssessment } from './schemas';
import type { CandidateProfile } from '@/lib/profile/candidate';
import type { JobFitResult } from '@/lib/scoring/jobMatch';
import { VERDICT_LABEL } from '@/lib/scoring/verdict';
import { VERIFICATION_LABEL } from '@/lib/scoring/normalize';

const MAX_JD_CHARS = 8_000;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

const SYSTEM = `You are CareerLens's placement analyst. You cross-validate a candidate's resume against a job description and explain the result to the candidate and the placement cell.

The numbers are already computed by a deterministic, auditable scoring engine. Treat every score, the verdict and the eligibility checks as fixed facts.
- Never output, invent or adjust a score, percentage or probability. Never contradict the verdict. You may quote the provided numbers.
- Do not predict hiring chances.
- A low evidence score is NOT proof the candidate lacks a skill. When evidence is thin, say the claim "is not yet verified by observable evidence" rather than "the candidate does not know X".
- Ground every point in the provided facts (projects, roles, repos, academics, JD quotes). Be specific — name the project or requirement.

Produce:
- summary: 2–4 sentences: the verdict in plain words and the main reasons.
- strengths: up to 5 points where the candidate's evidence matches what this JD needs.
- concerns: up to 5 points — unmet must-haves, eligibility problems, experience mismatch, weakly-evidenced claims.
- claimVsEvidence: for each JD-relevant skill the resume claims, compare the claim with the observed evidence (verification level, repos, projects). assessment: supported / partially_supported / unsupported.
- experienceRelevance: one entry per experience item (by index) — how relevant that role is to this JD and why.
- projectRelevance: one entry per project (by index) — how relevant it is to this JD and why.
- recommendations: up to 5 concrete evidence-building actions for this role (build/deploy/test something specific), most impactful first. Prefer the provided priority gaps. Not generic advice like "take a course".
- interviewFocus: up to 5 topics an interviewer for this role would probe, given the gaps and claims.`;

export async function generateFitAssessment(profile: CandidateProfile, jobDescription: string, fit: JobFitResult): Promise<FitAssessment> {
  const facts = {
    verdict: VERDICT_LABEL[fit.verdict],
    verdictReason: fit.verdictReason,
    roleFit: `${fit.roleFit}/100 = Σ(skill score × importance) / Σ(importance) = ${fit.formula.numerator} / ${fit.formula.denominator}`,
    eligibility: {
      status: fit.eligibility.status,
      checks: fit.eligibility.checks.map((c) => `${c.label}: needs ${c.required}, has ${c.actual} → ${c.status}${c.note ? ` (${c.note})` : ''}`),
    },
    requirements: fit.requirements.map((r) => {
      const s = fit.skillScores.find((x) => x.id === r.id);
      return {
        skill: r.label,
        importance: r.importance,
        requirement: r.requirement,
        jdQuote: r.quote,
        target: r.target,
        candidateScore: Math.round(r.score),
        verification: VERIFICATION_LABEL[r.verification],
        insufficientEvidence: r.insufficientEvidence,
        matchedVia: r.via === 'implied' ? `implied by ${r.viaSkill}` : r.via,
        claimedOnResume: r.claimed,
        gap: Math.round(r.gap),
        priority: Math.round(r.priority),
        evidence: s ? { repos: s.evidence.repos.slice(0, 5), projects: s.evidence.projects, roles: s.evidence.roles } : null,
      };
    }),
    otherStrongSkills: fit.bonusSkills.map((b) => `${b.label} (${b.score})`),
    academics: {
      graduation: fit.academics.graduation?.display ?? null,
      postgraduation: fit.academics.postgraduation?.display ?? null,
      class12: fit.academics.class12?.display ?? null,
      class10: fit.academics.class10?.display ?? null,
      degrees: fit.academics.degrees,
      fields: fit.academics.fields,
      graduationYear: fit.academics.graduationYear,
    },
    experience: {
      totalMonths: fit.experience.totalMonths,
      internshipMonths: fit.experience.internshipMonths,
      roles: profile.experience.map((x, index) => ({
        index,
        title: x.title,
        organization: x.organization,
        type: x.employmentType,
        months: fit.experience.roles[index]?.months ?? null,
        skills: x.skills,
        description: clip(x.description, 500),
      })),
    },
    projects: profile.projects.map((p, index) => ({
      index,
      name: p.name,
      skills: p.skills,
      deployed: p.isDeployed || !!p.liveUrl,
      description: clip(p.description, 400),
    })),
    topPriorityGaps: fit.gaps.slice(0, 5).map((g) => `${g.label}: score ${Math.round(g.score)} vs target ${g.target}, priority ${Math.round(g.priority)}`),
  };

  const result = await callGroqJSON({
    model: GROQ_MODELS.reasoning,
    system: SYSTEM,
    user: `JOB DESCRIPTION:\n"""\n${clip(jobDescription.trim(), MAX_JD_CHARS)}\n"""\n\nCOMPUTED FACTS (fixed — do not change):\n${JSON.stringify(facts, null, 1)}`,
    schema: FitAssessmentSchema,
    schemaName: 'fit_assessment',
    temperature: 0.2,
    maxTokens: 6144,
  });

  // Drop relevance entries that point at items that don't exist.
  return {
    ...result,
    experienceRelevance: result.experienceRelevance.filter((e) => e.index >= 0 && e.index < profile.experience.length),
    projectRelevance: result.projectRelevance.filter((e) => e.index >= 0 && e.index < profile.projects.length),
  };
}
