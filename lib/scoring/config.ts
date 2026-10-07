// lib/scoring/config.ts
//
// Every weight, threshold and lookup table the scoring engine uses lives here,
// so the numbers are auditable in one place and versioned together.
// Bump SCORING_VERSION whenever any value in this file changes — stored scores
// carry the version they were produced with, so old results stay reproducible.

export const SCORING_VERSION = 'v1.2';

/** A piecewise-linear lookup: [rawValue, normalizedScore] pairs, ascending by rawValue. */
export type PiecewiseTable = readonly (readonly [number, number])[];

// ---------------------------------------------------------------------------
// Level 1 — normalization tables (handoff §4, §6, §7)
// ---------------------------------------------------------------------------

/**
 * GitHub repositories that use a skill -> score. Stands in for "relevant commits"
 * (§4): the public repo listing has no per-skill commit counts, and the capped
 * curve keeps a large repo count from dominating, which is the point of §4.
 */
export const GITHUB_REPO_TABLE: PiecewiseTable = [
  [0, 0], [1, 40], [2, 55], [3, 70], [5, 85], [8, 100],
];

/** Days since last relevant activity -> score (§6). Upper bound of each bucket. */
export const RECENCY_BUCKETS: readonly { maxDays: number; score: number }[] = [
  { maxDays: 30, score: 100 },
  { maxDays: 90, score: 85 },
  { maxDays: 180, score: 70 },
  { maxDays: 365, score: 50 },
  { maxDays: 730, score: 30 },
  { maxDays: Infinity, score: 10 },
];

/** Docker evidence depth (§7). Highest milestone reached wins. */
export const DOCKER_MILESTONES = {
  none: 0,
  mentioned: 30, // topic / description / resume project mention
  dockerfile: 50,
  compose: 70,
  deployed: 85, // Dockerfile + hosting/deploy config in the same repo
  ciCd: 100, // Dockerfile + CI workflow in the same repo
} as const;

/** Testing evidence depth, scored the same milestone way as Docker. */
export const TESTING_MILESTONES = {
  none: 0,
  mentioned: 30,
  testConfig: 60, // jest/vitest/pytest/cypress config in a repo
  testConfigWithCi: 85,
} as const;

/** Months of professional experience using a skill -> score. */
export const EXPERIENCE_MONTHS_TABLE: PiecewiseTable = [
  [0, 0], [1, 40], [3, 60], [6, 75], [12, 90], [24, 100],
];

// ---------------------------------------------------------------------------
// Level 2 — skill evidence score (§8)
// ---------------------------------------------------------------------------

export type SkillComponentKey =
  | 'resumeClaim'
  | 'project'
  | 'github'
  | 'assessment'
  | 'recency'
  | 'consistency'
  | 'portfolio';

export const SKILL_COMPONENT_WEIGHTS: Record<SkillComponentKey, number> = {
  resumeClaim: 0.05,
  project: 0.25,
  github: 0.30,
  assessment: 0.15,
  recency: 0.10,
  consistency: 0.10,
  portfolio: 0.05,
};

/**
 * Components CareerLens has no way to measure yet. Like components whose source
 * the student didn't provide (no GitHub, no portfolio), they are left out of the
 * denominator — weights re-normalized over the rest — instead of counting as 0
 * (§29–30: missing evidence is not proof of no skill). Unlike those, they don't
 * lower confidence, since no student can supply them yet.
 */
export const UNOFFERED_SKILL_COMPONENTS: readonly SkillComponentKey[] = ['assessment'];

/** Breadth bonus for each extra project/role that uses a skill, capped. */
export const PROJECT_BREADTH_BONUS = { perExtra: 5, max: 15 } as const;

/** Credit given to a skill that is implied by another (e.g. Next.js ⇒ React). */
export const IMPLIED_SKILL_CREDIT = 0.8;

// ---------------------------------------------------------------------------
// Verification bands (§9) and confidence (§31)
// ---------------------------------------------------------------------------

export type VerificationLevel =
  | 'UNVERIFIED'
  | 'WEAK'
  | 'EMERGING'
  | 'DEMONSTRATED'
  | 'STRONGLY_VERIFIED';

export const VERIFICATION_BANDS: readonly { max: number; level: VerificationLevel }[] = [
  { max: 20, level: 'UNVERIFIED' },
  { max: 40, level: 'WEAK' },
  { max: 60, level: 'EMERGING' },
  { max: 80, level: 'DEMONSTRATED' },
  { max: 100, level: 'STRONGLY_VERIFIED' },
];

/** Below this confidence a low score is reported as "insufficient evidence", not "no skill" (§30). */
export const INSUFFICIENT_EVIDENCE_CONFIDENCE = 0.4;

// ---------------------------------------------------------------------------
// Project evidence score (§11)
// ---------------------------------------------------------------------------

export type ProjectDimensionKey =
  | 'complexity'
  | 'implementationDepth'
  | 'technologyUsage'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'architecture';

export const PROJECT_DIMENSION_WEIGHTS: Record<ProjectDimensionKey, number> = {
  complexity: 0.20,
  implementationDepth: 0.25,
  technologyUsage: 0.15,
  testing: 0.10,
  documentation: 0.10,
  deployment: 0.10,
  architecture: 0.10,
};

/** Distinct system components (frontend, backend, db, auth, …) -> complexity. */
export const PROJECT_COMPONENTS_TABLE: PiecewiseTable = [
  [0, 10], [1, 30], [2, 50], [3, 70], [4, 85], [5, 100],
];
/** Distinct features described -> implementation depth. */
export const PROJECT_FEATURES_TABLE: PiecewiseTable = [
  [0, 10], [1, 30], [3, 55], [5, 75], [8, 100],
];
/** Bonus to implementation depth when the project reports a measurable outcome. */
export const PROJECT_QUANTIFIED_OUTCOME_BONUS = 10;
/** Technologies used -> technology usage. */
export const PROJECT_TECH_TABLE: PiecewiseTable = [
  [0, 0], [1, 30], [2, 50], [3, 70], [5, 90], [7, 100],
];
/** Architecture patterns named (REST, MVC, microservices, caching…) -> architecture. */
export const PROJECT_ARCHITECTURE_TABLE: PiecewiseTable = [
  [0, 20], [1, 60], [2, 80], [3, 100],
];
/** Documentation: README/docs mentioned = full, only a repo link = partial. */
export const PROJECT_DOCUMENTATION = { documented: 100, repoOnly: 50, none: 0 } as const;

/** Project Evidence dimension = weighted top-3 projects (missing slots count as 0). */
export const TOP_PROJECT_WEIGHTS = [0.5, 0.3, 0.2] as const;

// ---------------------------------------------------------------------------
// Readiness dimensions (§14–§17)
// ---------------------------------------------------------------------------

/** Technical Competency without a target role: mean of this many strongest skills, missing = 0. */
export const TECHNICAL_TOP_SKILLS = 6;

/** Consistency sub-weights (§15). */
export const CONSISTENCY_WEIGHTS = {
  recentActivity: 0.40,
  projectContinuation: 0.20,
  activityRegularity: 0.20,
  skillConsistency: 0.20,
} as const;

/** A repo counts as "continued" when it was pushed to at least this long after creation. */
export const CONTINUATION_MIN_DAYS = 30;

/** Distinct active months in the last 12 -> regularity. */
export const ACTIVE_MONTHS_TABLE: PiecewiseTable = [
  [0, 0], [1, 30], [2, 50], [3, 70], [4, 85], [6, 100],
];

/** Number of independent sources demonstrating a skill -> skill consistency. */
export const SOURCE_COUNT_TABLE: PiecewiseTable = [
  [0, 0], [1, 40], [2, 75], [3, 100],
];

/** Interview readiness sub-weights (§16). No interview module exists yet. */
export const INTERVIEW_WEIGHTS = {
  technicalQuestions: 0.35,
  projectDefense: 0.30,
  problemSolving: 0.20,
  communication: 0.15,
} as const;

export type ReadinessDimensionKey =
  | 'technical'
  | 'project'
  | 'roleAlignment'
  | 'interview'
  | 'consistency'
  | 'problemSolving';

// Problem Solving (coding platforms) takes 10%; the others keep their v1.0
// proportions (×0.9), so a profile without coding platforms scores the same.
export const READINESS_WEIGHTS: Record<ReadinessDimensionKey, number> = {
  technical: 0.315,
  project: 0.225,
  roleAlignment: 0.18,
  interview: 0.09,
  consistency: 0.09,
  problemSolving: 0.10,
};

export const READINESS_DIMENSION_LABEL: Record<ReadinessDimensionKey, string> = {
  technical: 'Technical Competency',
  project: 'Project Evidence',
  roleAlignment: 'Role Alignment',
  interview: 'Interview Readiness',
  consistency: 'Consistency',
  problemSolving: 'Problem Solving',
};

// ---------------------------------------------------------------------------
// Role fit, gaps and priority (§12, §13, §18, §19)
// ---------------------------------------------------------------------------

/** Default target score for a skill, by its role importance (1–5). */
export const TARGET_BY_IMPORTANCE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 55,
  2: 60,
  3: 65,
  4: 70,
  5: 70,
};

/** Job-fit verdict thresholds on the deterministic role-fit score. */
export const FIT_VERDICT_THRESHOLDS = {
  strong: 75,
  good: 60,
  stretch: 45,
} as const;

/** A must-have (importance 5) skill gap larger than this caps the verdict at "stretch". */
export const CRITICAL_GAP_LIMIT = 25;

// ---------------------------------------------------------------------------
// Next best action / ROI (§20)
// ---------------------------------------------------------------------------

/** Relative effort units for each kind of evidence-building action. */
export const ACTION_EFFORT = {
  addToResume: 1,
  deploy: 3,
  addTests: 3,
  dockerize: 3,
  githubProject: 5,
  portfolioCaseStudy: 4,
  continueProject: 2,
} as const;

/** What a component is expected to reach once the action is done. */
export const ACTION_TARGET_COMPONENT_VALUE = 75;

// ---------------------------------------------------------------------------
// Academic conversions
// ---------------------------------------------------------------------------

/**
 * CGPA (10-point) <-> percentage. 9.5 is the CBSE / most-Indian-university
 * convention. Conversions are only used when a JD states a criterion in the
 * other unit, and the result is flagged as converted.
 */
export const CGPA_TO_PERCENT_FACTOR = 9.5;

// ---------------------------------------------------------------------------
// Validation (§29) — fail loudly in development if a table drifts.
// ---------------------------------------------------------------------------

function assertWeightsSumToOne(name: string, weights: Record<string, number>) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`[scoring ${SCORING_VERSION}] ${name} weights sum to ${sum}, expected 1`);
  }
  for (const [k, w] of Object.entries(weights)) {
    if (w < 0 || w > 1) throw new Error(`[scoring ${SCORING_VERSION}] ${name}.${k} weight ${w} out of [0,1]`);
  }
}

assertWeightsSumToOne('SKILL_COMPONENT', SKILL_COMPONENT_WEIGHTS);
assertWeightsSumToOne('PROJECT_DIMENSION', PROJECT_DIMENSION_WEIGHTS);
assertWeightsSumToOne('CONSISTENCY', CONSISTENCY_WEIGHTS);
assertWeightsSumToOne('INTERVIEW', INTERVIEW_WEIGHTS);
assertWeightsSumToOne('READINESS', READINESS_WEIGHTS);
assertWeightsSumToOne('TOP_PROJECT', Object.fromEntries(TOP_PROJECT_WEIGHTS.map((w, i) => [String(i), w])));
