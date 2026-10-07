// Pure scoring for coding-platform stats. No server-only imports: onboarding
// runs the readiness engine in the browser.
import type { CodingPlatform } from './handles';

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
  score: number; // 0-100, this platform's problem-solving signal
};

export type CodingProfileSummary = {
  platforms: CodingPlatformStats[];
  totalSolved: number;
  bestRating: { platform: CodingPlatform; rating: number } | null;
  totalContests: number;
  overallScore: number; // 0-100
  strength: 'Strong' | 'Moderate' | 'Weak';
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const scale = (value: number, from: number, to: number, points: number) =>
  clamp(((value - from) / (to - from)) * points, 0, points);

/** Platform-specific 0-100 score, tuned so ~top-quartile college students land at 70+. */
export function scorePlatform(s: Omit<CodingPlatformStats, 'score'>): number {
  const solved = s.problemsSolved ?? 0;
  const rating = s.maxRating ?? s.rating;
  switch (s.platform) {
    case 'leetcode': {
      const d = s.difficulty;
      const weighted = d ? d.easy + d.medium * 2 + d.hard * 3 : solved;
      // Difficulty-weighted: ~300 solved with a typical medium-heavy mix is "Strong".
      return Math.round(scale(weighted, 0, 400, 75) + (s.rating ? scale(s.rating, 1400, 2200, 25) : 0));
    }
    case 'codeforces':
      return Math.round((rating ? scale(rating, 800, 2100, 80) : 0) + scale(solved, 0, 300, 20));
    case 'codechef':
      return Math.round((rating ? scale(rating, 1200, 2200, 70) : 0) + scale(solved, 0, 300, 30));
    case 'hackerrank': {
      const stars = s.badges.reduce((sum, b) => sum + b.stars, 0);
      return Math.round(scale(stars, 0, 20, 70) + scale(s.certificates.length, 0, 3, 30));
    }
    case 'gfg':
      return Math.round(scale(solved, 0, 400, 100));
  }
}

export function summarizeCodingProfiles(platforms: CodingPlatformStats[]): CodingProfileSummary | null {
  if (platforms.length === 0) return null;

  const best = Math.max(...platforms.map((p) => p.score));
  // Being active on several platforms adds a little on top of the strongest one.
  const overallScore = Math.round(clamp(best + (platforms.filter((p) => p.score >= 20).length - 1) * 5));

  const rated = platforms
    .filter((p) => (p.maxRating ?? p.rating) != null && p.platform !== 'hackerrank' && p.platform !== 'gfg')
    .map((p) => ({ platform: p.platform, rating: (p.maxRating ?? p.rating)! }))
    .sort((a, b) => b.rating - a.rating);

  return {
    platforms,
    totalSolved: platforms.reduce((sum, p) => sum + (p.problemsSolved ?? 0), 0),
    bestRating: rated[0] ?? null,
    totalContests: platforms.reduce((sum, p) => sum + (p.contests ?? 0), 0),
    overallScore,
    strength: overallScore >= 70 ? 'Strong' : overallScore >= 40 ? 'Moderate' : 'Weak',
  };
}
