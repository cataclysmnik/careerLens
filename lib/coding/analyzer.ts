// Pure scoring for coding-platform stats (§15). No server-only imports: the
// coding page and the readiness engine both use it.
//
//   CodingScore = Solved × 0.30 + Difficulty × 0.25 + Contests × 0.20
//               + Recent activity × 0.15 + Accuracy × 0.10
//
// Each component is normalized to 0–100 with the tables in lib/scoring/config.
// A component with no data (e.g. HackerRank has no contests or accuracy) is
// left out and the remaining weights are re-normalized.
import type { CodingPlatform } from './handles';
import {
  CODING_ACCURACY_TABLE,
  CODING_DEPTH_TABLE,
  CODING_SOLVED_TABLE,
  CODING_STRENGTH_THRESHOLDS,
  CODING_WEIGHTS,
  CONTEST_RATING_TABLES,
} from '@/lib/scoring/config';
import { daysBetween, piecewise, recencyScore, round1, weightedScore } from '@/lib/scoring/normalize';

export type CodingPlatformStats = {
  platform: CodingPlatform;
  handle: string;
  profileUrl: string;
  problemsSolved: number | null;
  difficulty: { easy: number; medium: number; hard: number } | null;
  rating: number | null;
  maxRating: number | null;
  rank: string | null; // e.g. "Expert", "4★", "Top 12%"
  contests: number | null;
  languages: string[];
  topics: string[];
  badges: { name: string; stars: number }[];
  certificates: string[];
  /** Problems solved per language/track. Optional: missing on results saved before v1.3. */
  languageStats?: { name: string; solved: number }[];
  /** Accepted ÷ total submissions, 0–1. */
  acceptanceRate?: number | null;
  /** ISO date of the latest submission. */
  lastActiveAt?: string | null;
  score: number; // 0-100, this platform's §15 coding score
  breakdown?: CodingComponent[];
};

export type CodingComponentKey = keyof typeof CODING_WEIGHTS;

export type CodingComponent = {
  key: CodingComponentKey;
  label: string;
  raw: string;
  normalized: number | null;
  weight: number;
};

export type CodingProfileSummary = {
  platforms: CodingPlatformStats[];
  totalSolved: number;
  bestRating: { platform: CodingPlatform; rating: number } | null;
  totalContests: number;
  overallScore: number; // 0-100
  strength: 'Strong' | 'Moderate' | 'Weak';
  breakdown?: CodingComponent[];
};

const LABEL: Record<CodingComponentKey, string> = {
  problemsSolved: 'Problems Solved',
  difficultyDepth: 'Difficulty Depth',
  contestPerformance: 'Contest Performance',
  recentActivity: 'Recent Activity',
  accuracy: 'Acceptance / Accuracy',
};

const CONTEST_PLATFORMS = ['leetcode', 'codeforces', 'codechef'] as const;
type ContestPlatform = (typeof CONTEST_PLATFORMS)[number];
const isContestPlatform = (p: CodingPlatform): p is ContestPlatform => (CONTEST_PLATFORMS as readonly string[]).includes(p);

type Stats = Omit<CodingPlatformStats, 'score' | 'breakdown'>;

/** Raw measurements across one or more platforms -> the five §15 components. */
function codingComponents(platforms: Stats[], asOf: Date): CodingComponent[] {
  const solved = platforms.reduce((sum, p) => sum + (p.problemsSolved ?? 0), 0);

  const withDifficulty = platforms.filter((p) => p.difficulty);
  const harder = withDifficulty.reduce((sum, p) => sum + p.difficulty!.medium + 2 * p.difficulty!.hard, 0);

  // Contest rating on the best platform. Linked contest platforms with no rated
  // contests count as 0; with only HackerRank / GfG linked there's nothing to measure.
  const contestPlatforms = platforms.filter((p) => isContestPlatform(p.platform));
  const rated = contestPlatforms
    .map((p) => ({ p, rating: (p.contests ?? 0) > 0 ? p.maxRating ?? p.rating : null }))
    .filter((x): x is { p: Stats; rating: number } => x.rating != null)
    .map((x) => ({ ...x, score: piecewise(x.rating, CONTEST_RATING_TABLES[x.p.platform as ContestPlatform]) }))
    .sort((a, b) => b.score - a.score);
  const contest = contestPlatforms.length === 0 ? null : rated[0]?.score ?? 0;

  const lastDates = platforms.map((p) => (p.lastActiveAt ? new Date(p.lastActiveAt) : null)).filter((d): d is Date => !!d && !isNaN(d.getTime()));
  const latest = lastDates.length ? new Date(Math.max(...lastDates.map((d) => d.getTime()))) : null;
  const days = latest ? Math.round(daysBetween(latest, asOf)) : null;

  // Submission-weighted accuracy isn't available per platform, so average the platforms that report it.
  const rates = platforms.map((p) => p.acceptanceRate).filter((r): r is number => typeof r === 'number');
  const accuracy = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  const component = (key: CodingComponentKey, raw: string, normalized: number | null): CodingComponent => ({
    key,
    label: LABEL[key],
    raw,
    normalized: normalized === null ? null : round1(normalized),
    weight: CODING_WEIGHTS[key],
  });

  return [
    component('problemsSolved', `${solved} solved`, piecewise(solved, CODING_SOLVED_TABLE)),
    component(
      'difficultyDepth',
      withDifficulty.length ? `${harder} (medium + 2 × hard)` : 'No difficulty data',
      withDifficulty.length ? piecewise(harder, CODING_DEPTH_TABLE) : null
    ),
    component(
      'contestPerformance',
      contest === null ? 'No contest platform linked' : rated[0] ? `Best rating ${rated[0].rating} (${rated[0].p.platform})` : 'No rated contests',
      contest
    ),
    component('recentActivity', days === null ? 'No dated submissions' : days <= 1 ? 'Active today' : `${days} days ago`, days === null ? null : recencyScore(days)),
    component('accuracy', accuracy === null ? 'Not reported' : `${Math.round(accuracy * 100)}% accepted`, accuracy === null ? null : piecewise(accuracy, CODING_ACCURACY_TABLE)),
  ];
}

const scoreOf = (components: CodingComponent[]) =>
  Math.round(weightedScore(components.map((c) => ({ value: c.normalized, weight: c.weight }))) ?? 0);

/** One platform's §15 score. */
export function scorePlatform(s: Stats, asOf: Date = new Date()): { score: number; breakdown: CodingComponent[] } {
  const breakdown = codingComponents([s], asOf);
  return { score: scoreOf(breakdown), breakdown };
}

export function codingStrength(score: number): CodingProfileSummary['strength'] {
  return score >= CODING_STRENGTH_THRESHOLDS.strong ? 'Strong' : score >= CODING_STRENGTH_THRESHOLDS.moderate ? 'Moderate' : 'Weak';
}

/** Combined §15 score across every linked platform (solved and depth add up; best contest rating counts). */
export function summarizeCodingProfiles(platforms: CodingPlatformStats[], asOf: Date = new Date()): CodingProfileSummary | null {
  if (platforms.length === 0) return null;

  const breakdown = codingComponents(platforms, asOf);
  const overallScore = scoreOf(breakdown);

  const rated = platforms
    .filter((p) => (p.maxRating ?? p.rating) != null && isContestPlatform(p.platform))
    .map((p) => ({ platform: p.platform, rating: (p.maxRating ?? p.rating)! }))
    .sort((a, b) => b.rating - a.rating);

  return {
    platforms,
    totalSolved: platforms.reduce((sum, p) => sum + (p.problemsSolved ?? 0), 0),
    bestRating: rated[0] ?? null,
    totalContests: platforms.reduce((sum, p) => sum + (p.contests ?? 0), 0),
    overallScore,
    strength: codingStrength(overallScore),
    breakdown,
  };
}
