// Server-only: fetches public stats from each coding platform. LeetCode,
// HackerRank and GeeksforGeeks have no official API, so these use the same
// endpoints their own websites call; CodeChef stats are read from the
// profile page HTML. Any of these can change without notice, so every
// fetcher fails soft with a CodingProfileError instead of crashing.
import { ipv4Fetch } from '@/lib/ipv4Fetch';
import { PLATFORM_INFO, type CodingPlatform } from './handles';
import { scorePlatform, type CodingPlatformStats } from './analyzer';

export class CodingProfileError extends Error {
  constructor(public kind: 'not_found' | 'unavailable', message: string) {
    super(message);
  }
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json, text/html;q=0.9',
};
const TIMEOUT_MS = 12000;

async function get(url: string, init: RequestInit = {}) {
  try {
    return await ipv4Fetch(url, {
      ...init,
      headers: { ...HEADERS, ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new CodingProfileError('unavailable', 'Platform did not respond. Try again in a minute.');
  }
}

const notFound = (platform: CodingPlatform, handle: string) =>
  new CodingProfileError('not_found', `No ${PLATFORM_INFO[platform].label} user named "${handle}".`);
const unavailable = (platform: CodingPlatform, status: number) =>
  new CodingProfileError('unavailable', `${PLATFORM_INFO[platform].label} returned an error (${status}).`);

function topN<T>(items: T[], key: (t: T) => string, n: number) {
  const counts = new Map<string, number>();
  items.forEach((i) => counts.set(key(i), (counts.get(key(i)) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

const blank = (platform: CodingPlatform, handle: string) => ({
  platform,
  handle,
  profileUrl: PLATFORM_INFO[platform].profileUrl(handle),
  problemsSolved: null,
  difficulty: null,
  rating: null,
  maxRating: null,
  rank: null,
  contests: null,
  languages: [] as string[],
  topics: [] as string[],
  badges: [] as { name: string; stars: number }[],
  certificates: [] as string[],
});

async function leetcode(handle: string): Promise<Omit<CodingPlatformStats, 'score'>> {
  const res = await get('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({
      query: `query($u: String!) {
        matchedUser(username: $u) {
          username
          submitStatsGlobal { acSubmissionNum { difficulty count } }
          languageProblemCount { languageName problemsSolved }
          tagProblemCounts { advanced { tagName problemsSolved } intermediate { tagName problemsSolved } fundamental { tagName problemsSolved } }
        }
        userContestRanking(username: $u) { rating attendedContestsCount topPercentage }
      }`,
      variables: { u: handle },
    }),
  });
  if (!res.ok) throw unavailable('leetcode', res.status);
  const { data } = await res.json();
  const user = data?.matchedUser;
  if (!user) throw notFound('leetcode', handle);

  const ac = Object.fromEntries(
    (user.submitStatsGlobal?.acSubmissionNum ?? []).map((a: { difficulty: string; count: number }) => [a.difficulty, a.count])
  );
  const tags = Object.values(user.tagProblemCounts ?? {}).flat() as { tagName: string; problemsSolved: number }[];
  const contest = data.userContestRanking;

  return {
    ...blank('leetcode', user.username),
    problemsSolved: ac.All ?? null,
    difficulty: { easy: ac.Easy ?? 0, medium: ac.Medium ?? 0, hard: ac.Hard ?? 0 },
    rating: contest?.attendedContestsCount ? Math.round(contest.rating) : null,
    rank: contest?.attendedContestsCount ? `Top ${contest.topPercentage}%` : null,
    contests: contest?.attendedContestsCount ?? 0,
    languages: [...(user.languageProblemCount ?? [])]
      .sort((a: { problemsSolved: number }, b: { problemsSolved: number }) => b.problemsSolved - a.problemsSolved)
      .slice(0, 3)
      .map((l: { languageName: string }) => l.languageName),
    topics: tags.sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 6).map((t) => t.tagName),
  };
}

async function codeforces(handle: string): Promise<Omit<CodingPlatformStats, 'score'>> {
  const infoRes = await get(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
  const info = await infoRes.json().catch(() => null);
  if (info?.status === 'FAILED' && /not found/i.test(info.comment ?? '')) throw notFound('codeforces', handle);
  if (!infoRes.ok || info?.status !== 'OK') throw unavailable('codeforces', infoRes.status);
  const user = info.result[0];

  const [ratingRes, statusRes] = await Promise.all([
    get(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(user.handle)}`),
    get(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(user.handle)}&from=1&count=5000`),
  ]);
  const contests = ratingRes.ok ? ((await ratingRes.json()).result?.length ?? null) : null;

  type Submission = { verdict: string; programmingLanguage: string; problem: { contestId?: number; problemsetName?: string; index: string; tags: string[] } };
  const submissions: Submission[] = statusRes.ok ? ((await statusRes.json()).result ?? []) : [];
  const solved = new Map<string, Submission>();
  submissions
    .filter((s) => s.verdict === 'OK')
    .forEach((s) => solved.set(`${s.problem.contestId ?? s.problem.problemsetName}-${s.problem.index}`, s));
  const solvedList = [...solved.values()];

  return {
    ...blank('codeforces', user.handle),
    problemsSolved: statusRes.ok ? solvedList.length : null,
    rating: user.rating ?? null,
    maxRating: user.maxRating ?? null,
    rank: user.rank ? user.rank.replace(/\b\w/g, (c: string) => c.toUpperCase()) : null,
    contests,
    // "GNU C++17 (64)" -> "C++", "Python 3" -> "Python"
    languages: topN(solvedList, (s) => s.programmingLanguage.replace(/^GNU\s+|^MS\s+/, '').replace(/[\s\d(].*$/, '').replace(/^G?C\+\+.*/, 'C++'), 3),
    topics: topN(solvedList.flatMap((s) => s.problem.tags.map((tag) => ({ tag }))), (t) => t.tag, 6),
  };
}

async function codechef(handle: string): Promise<Omit<CodingPlatformStats, 'score'>> {
  const res = await get(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);
  // Unknown users are redirected to the homepage.
  if (res.status >= 300 && res.status < 400) throw notFound('codechef', handle);
  if (!res.ok) throw unavailable('codechef', res.status);
  const html = await res.text();

  const num = (re: RegExp) => {
    const m = html.match(re);
    return m ? Number(m[1]) : null;
  };
  const rating = num(/<div class="rating-number">\s*(\d+)/);
  if (rating === null && !/Total Problems Solved/.test(html)) {
    throw new CodingProfileError('unavailable', "Couldn't read the CodeChef profile page.");
  }
  const stars = (html.match(/<div class="rating-star">([\s\S]*?)<\/div>/)?.[1].match(/&#9733;|★/g) ?? []).length;

  return {
    ...blank('codechef', handle),
    problemsSolved: num(/Total Problems Solved:\s*(\d+)/),
    rating,
    maxRating: num(/Highest Rating\s*(\d+)/),
    rank: stars ? `${stars}★` : null,
    contests: num(/No\. of Contests Participated:\s*<b>(\d+)/),
  };
}

async function hackerrank(handle: string): Promise<Omit<CodingPlatformStats, 'score'>> {
  const res = await get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(handle)}/badges`);
  if (res.status === 404) throw notFound('hackerrank', handle);
  if (!res.ok) throw unavailable('hackerrank', res.status);
  type Badge = { badge_name: string; stars: number; solved: number };
  const badges: Badge[] = (await res.json()).models ?? [];

  let certificates: string[] = [];
  try {
    const certRes = await get(`https://www.hackerrank.com/community/v1/test_results/hacker_certificate?username=${encodeURIComponent(handle)}`);
    if (certRes.ok) {
      type Cert = { attributes: { status: string; certificate?: { label?: string; level?: string } } };
      certificates = ((await certRes.json()).data ?? [])
        .filter((c: Cert) => c.attributes.status === 'test_passed' && c.attributes.certificate?.label)
        .map((c: Cert) => `${c.attributes.certificate!.label}${c.attributes.certificate!.level ? ` (${c.attributes.certificate!.level})` : ''}`);
    }
  } catch {
    // Certificates are a bonus; badges alone are enough to score.
  }

  const earned = badges.filter((b) => b.stars > 0).sort((a, b) => b.stars - a.stars);
  return {
    ...blank('hackerrank', handle),
    problemsSolved: badges.reduce((sum, b) => sum + (b.solved ?? 0), 0),
    languages: earned.filter((b) => /^(Python|Java|C\+\+|C|Ruby|JavaScript|Go|Kotlin|SQL)$/i.test(b.badge_name)).slice(0, 3).map((b) => b.badge_name),
    badges: earned.map((b) => ({ name: b.badge_name, stars: b.stars })),
    certificates,
  };
}

async function gfg(handle: string): Promise<Omit<CodingPlatformStats, 'score'>> {
  const res = await get(`https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${encodeURIComponent(handle)}&article_count=false&redirect=true`);
  const json = await res.json().catch(() => null);
  if (res.status === 400 && /not found/i.test(json?.message ?? '')) throw notFound('gfg', handle);
  if (!res.ok || !json?.data) throw unavailable('gfg', res.status);
  const d = json.data;

  return {
    ...blank('gfg', handle),
    problemsSolved: d.total_problems_solved ?? null,
    rating: d.score ?? null, // GfG "coding score"
    rank: d.institute_rank ? `Institute rank ${d.institute_rank}` : null,
  };
}

const FETCHERS: Record<CodingPlatform, (handle: string) => Promise<Omit<CodingPlatformStats, 'score'>>> = {
  leetcode,
  codeforces,
  codechef,
  hackerrank,
  gfg,
};

export async function fetchCodingProfile(platform: CodingPlatform, handle: string): Promise<CodingPlatformStats> {
  const stats = await FETCHERS[platform](handle);
  return { ...stats, score: scorePlatform(stats) };
}
