// lib/evidence/student-evidence.ts
// Server-side helpers for the StudentEvidence row. The row stores the raw
// scoring inputs next to the legacy UnifiedEvidence summary, so scores can be
// recomputed from source (e.g. after a SCORING_VERSION bump) without re-uploading.

import { z } from 'zod';
import { aggregateEvidence, type UnifiedEvidence } from './aggregator';
import type { ParsedResume } from './parsers/resume-parser';
import type { GithubSkillEvidence } from '@/lib/github/analyzer';
import type { GithubRepo } from '@/lib/github/api';
import type { PortfolioEvidence } from '@/lib/portfolio/analyzer';
import type { CodingProfileSummary } from '@/lib/coding/analyzer';
import { CandidateExtractionSchema } from '@/lib/llm/schemas';
import type { CandidateProfile } from '@/lib/profile/candidate';
import { toGithubInput, type EvidenceInputs } from '@/lib/scoring/evidence-inputs';
import { calculateReadiness, type ScoringResult } from '@/lib/scoring/engine';
import { skillLabel, canonicalizeSkill } from '@/lib/scoring/skill-taxonomy';

/** The last GitHub analysis, kept so the GitHub Analyzer reopens with it. */
export type GithubSnapshot = GithubAnalyzeData & { analyzedAt: string };

export type StoredEvidence = UnifiedEvidence & { inputs: EvidenceInputs; githubSnapshot?: GithubSnapshot | null };

export const CandidateProfileSchema = CandidateExtractionSchema.extend({
  source: z.enum(['llm', 'fallback']),
  extractedAt: z.string(),
  warnings: z.array(z.string()),
});

export type GithubAnalyzeData = {
  username: string;
  totalRepos: number;
  evidence: GithubSkillEvidence[];
  repositories?: GithubRepo[];
};

/** Keep only the repo fields the analyzer page and scoring read; the raw API payload is large. */
export function toGithubSnapshot(github: GithubAnalyzeData | null): GithubSnapshot | null {
  if (!github) return null;
  return {
    username: github.username,
    totalRepos: github.totalRepos,
    evidence: github.evidence,
    repositories: (github.repositories ?? []).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      fork: r.fork,
      homepage: r.homepage,
      topics: r.topics ?? [],
      has_issues: r.has_issues,
      default_branch: r.default_branch,
      rootFiles: r.rootFiles,
    })),
    analyzedAt: new Date().toISOString(),
  };
}

/** The keyword-parser shape the legacy aggregator expects, built from the profile. */
function parsedFromProfile(profile: CandidateProfile): ParsedResume {
  const links = [profile.links.github, profile.links.linkedin, profile.links.portfolio, ...profile.links.other].filter((l): l is string => !!l);
  return {
    skills: profile.skills.map((s) => skillLabel(canonicalizeSkill(s.name).id)),
    links,
    emails: profile.email ? [profile.email] : [],
    rawText: '',
    confidence: profile.source === 'llm' ? 0.9 : 0.6,
    aiDetectedClaims: [],
  };
}

export function buildStudentEvidence(
  profile: CandidateProfile,
  github: GithubAnalyzeData | null,
  portfolio: PortfolioEvidence | null,
  coding: CodingProfileSummary | null,
  targetRole: string | null
): { evidence: StoredEvidence; scoring: ScoringResult } {
  const inputs: EvidenceInputs = {
    profile,
    github: toGithubInput(github),
    portfolio,
    coding,
    asOf: new Date().toISOString(),
  };
  const unified = aggregateEvidence(parsedFromProfile(profile), github, portfolio, coding);
  return {
    evidence: { ...unified, inputs, githubSnapshot: toGithubSnapshot(github) },
    scoring: calculateReadiness(inputs, { targetRole }),
  };
}

/** Swap the coding-platform results into a stored row and re-score it from its stored inputs. */
export function withCodingProfile(
  stored: StoredEvidence,
  coding: CodingProfileSummary | null,
  targetRole: string | null
): { evidence: StoredEvidence; scoring: ScoringResult } {
  const inputs: EvidenceInputs = { ...stored.inputs, coding, asOf: new Date().toISOString() };
  return {
    evidence: { ...stored, coding, inputs },
    scoring: calculateReadiness(inputs, { targetRole }),
  };
}

/** Swap a new GitHub analysis into a stored row and re-score it from its stored inputs. */
export function withGithubProfile(
  stored: StoredEvidence,
  github: GithubAnalyzeData,
  targetRole: string | null
): { evidence: StoredEvidence; scoring: ScoringResult } {
  const inputs: EvidenceInputs = { ...stored.inputs, github: toGithubInput(github), asOf: new Date().toISOString() };
  const unified = aggregateEvidence(parsedFromProfile(inputs.profile), github, inputs.portfolio, inputs.coding ?? null);
  return {
    evidence: { ...stored, ...unified, inputs, githubSnapshot: toGithubSnapshot(github) },
    scoring: calculateReadiness(inputs, { targetRole }),
  };
}

/** Pull the scoring inputs back out of a stored row; null for rows saved before inputs were stored. */
export function readInputs(evidence: unknown): EvidenceInputs | null {
  const inputs = (evidence as Partial<StoredEvidence> | null)?.inputs;
  if (!inputs?.profile || !inputs.asOf) return null;
  return inputs;
}
