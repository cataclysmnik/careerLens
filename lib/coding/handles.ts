// Shared between client and server: platform metadata and handle parsing.

export const CODING_PLATFORMS = ['leetcode', 'codeforces', 'codechef', 'hackerrank', 'gfg'] as const;
export type CodingPlatform = (typeof CODING_PLATFORMS)[number];

export type CodingHandles = Partial<Record<CodingPlatform, string>>;

// Profile column that stores each platform's handle.
export const HANDLE_FIELD = {
  leetcode: 'leetcodeUsername',
  codeforces: 'codeforcesHandle',
  codechef: 'codechefUsername',
  hackerrank: 'hackerrankUsername',
  gfg: 'gfgUsername',
} as const satisfies Record<CodingPlatform, string>;

export const PLATFORM_INFO: Record<CodingPlatform, { label: string; host: string; profileUrl: (h: string) => string }> = {
  leetcode: { label: 'LeetCode', host: 'leetcode.com', profileUrl: (h) => `https://leetcode.com/u/${h}/` },
  codeforces: { label: 'Codeforces', host: 'codeforces.com', profileUrl: (h) => `https://codeforces.com/profile/${h}` },
  codechef: { label: 'CodeChef', host: 'codechef.com', profileUrl: (h) => `https://www.codechef.com/users/${h}` },
  hackerrank: { label: 'HackerRank', host: 'hackerrank.com', profileUrl: (h) => `https://www.hackerrank.com/profile/${h}` },
  gfg: { label: 'GeeksforGeeks', host: 'geeksforgeeks.org', profileUrl: (h) => `https://www.geeksforgeeks.org/user/${h}/` },
};

const HANDLE_RE = /^[A-Za-z0-9_.-]{1,40}$/;

// Path segments that precede the handle in each platform's profile URLs,
// e.g. leetcode.com/u/<handle>, codeforces.com/profile/<handle>.
const PROFILE_PATH_PREFIXES: Record<CodingPlatform, string[]> = {
  leetcode: ['u', ''],
  codeforces: ['profile'],
  codechef: ['users'],
  hackerrank: ['profile', ''],
  gfg: ['user', 'profile'],
};

const RESERVED_SEGMENTS = new Set([
  'problems', 'problemset', 'contest', 'contests', 'discuss', 'explore', 'blog', 'challenges',
  'domains', 'practice', 'login', 'signup', 'dashboard', 'certificates', 'jobs', 'courses',
]);

/**
 * Accepts either a bare handle or a profile URL and returns the handle, or
 * null if the input doesn't look like one for this platform.
 */
export function parseCodingHandle(platform: CodingPlatform, input: string): string | null {
  const value = input.trim().replace(/^@/, '');
  if (!value) return null;

  if (!/[/:]/.test(value)) return HANDLE_RE.test(value) ? value : null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!url.hostname.replace(/^www\./, '').endsWith(PLATFORM_INFO[platform].host)) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  for (const prefix of PROFILE_PATH_PREFIXES[platform]) {
    const handle = prefix === '' ? segments[0] : segments[0] === prefix ? segments[1] : undefined;
    if (handle && !RESERVED_SEGMENTS.has(handle.toLowerCase()) && HANDLE_RE.test(handle)) return handle;
  }
  return null;
}

/** Finds coding-platform handles in a list of links (e.g. from a resume). */
export function extractCodingHandles(links: string[]): CodingHandles {
  const found: CodingHandles = {};
  for (const link of links) {
    for (const platform of CODING_PLATFORMS) {
      if (found[platform] || !link.toLowerCase().includes(PLATFORM_INFO[platform].host)) continue;
      const handle = parseCodingHandle(platform, link);
      if (handle) found[platform] = handle;
    }
  }
  return found;
}
