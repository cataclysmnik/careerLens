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
import { SCORING_VERSION } from '@/lib/scoring/config';
import { skillLabel, canonicalizeSkill } from '@/lib/scoring/skill-taxonomy';
import { findRoleByTarget } from '@/lib/scoring/roles-catalog';

/** The last GitHub analysis, kept so the GitHub Analyzer reopens with it. */
export type GithubSnapshot = GithubAnalyzeData & { analyzedAt: string };

export type HistoryEvent = {
  id: string;
  date: string;
  type: 'RESUME_UPLOAD' | 'GITHUB_SYNC' | 'PORTFOLIO_SYNC' | 'PROFILE_EDIT';
  title: string;
  description: string;
  score: number;
  skillsAdded?: string[];
};

export type StoredEvidence = UnifiedEvidence & { 
  inputs: EvidenceInputs; 
  githubSnapshot?: GithubSnapshot | null;
  history?: HistoryEvent[];
};

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
  targetRole: string | null,
  previousHistory: HistoryEvent[] = []
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
    evidence: { ...unified, inputs, githubSnapshot: toGithubSnapshot(github), history: previousHistory },
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
  const scoring = calculateReadiness(inputs, { targetRole });
  const newHistory = [
    ...(stored.history ?? []),
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'PROFILE_EDIT',
      title: 'Coding Profile Synced',
      description: 'Updated coding platform statistics.',
      score: scoring.overallScore,
    } as HistoryEvent
  ];
  return {
    evidence: { ...stored, coding, inputs, history: newHistory },
    scoring,
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
  const scoring = calculateReadiness(inputs, { targetRole });
  const newHistory = [
    ...(stored.history ?? []),
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'GITHUB_SYNC',
      title: 'GitHub Profile Analyzed',
      description: 'Synced repositories and extracted technical skills.',
      score: scoring.overallScore,
    } as HistoryEvent
  ];
  return {
    evidence: { ...stored, ...unified, inputs, githubSnapshot: toGithubSnapshot(github), history: newHistory },
    scoring,
  };
}

/** Pull the scoring inputs back out of a stored row; null for rows saved before inputs were stored. */
export function readInputs(evidence: unknown): EvidenceInputs | null {
  const inputs = (evidence as Partial<StoredEvidence> | null)?.inputs;
  if (!inputs?.profile || !inputs.asOf) return null;
  return inputs;
}

/**
 * The report's scoring, recomputed from its stored inputs when it was produced
 * by an older SCORING_VERSION. `changed` tells the caller to save it back.
 */
export function currentScoring(
  evidence: unknown,
  scoring: unknown,
  targetRole: string | null
): { scoring: ScoringResult | null; changed: boolean } {
  const stored = scoring as Partial<ScoringResult> | null;
  const inputs = readInputs(evidence);
  
  let roleChanged = false;
  if (targetRole) {
     const roleDef = findRoleByTarget(targetRole);
     if (roleDef && stored?.roleAlignment?.roleId !== roleDef.id) {
         roleChanged = true;
     }
  } else {
     if (stored?.roleAlignment?.matchedBy === 'target_role') {
         roleChanged = true;
     }
  }

  if (!inputs || (stored?.scoringVersion === SCORING_VERSION && !roleChanged)) {
    return { scoring: (stored as ScoringResult | null) ?? null, changed: false };
  }
  // Keep the original asOf so recency is measured from when the evidence was collected.
  return { scoring: calculateReadiness(inputs, { targetRole }), changed: true };
}
