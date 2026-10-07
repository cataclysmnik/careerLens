// lib/jobs/role-research.ts
//
// "What does a <role> need?" answered from live job postings, not from an LLM.
//   1. Fetch current postings from free public job-board APIs.
//   2. Keep the ones whose title is this role (preferring non-senior titles).
//   3. Detect skills in each description with the skill dictionary.
//   4. Turn each skill's share of postings into an importance weight (fixed table).
// The same postings always give the same requirements. With too few matching
// postings, the curated role catalog is used instead.

import type { JobRequirements } from '@/lib/llm/schemas';
import { canonicalizeSkill, findSkillsInText, skillLabel } from '@/lib/scoring/skill-taxonomy';
import { findRoleByTarget } from '@/lib/scoring/roles-catalog';

export type Posting = { title: string; company: string | null; url: string; source: string; description: string };

export type RoleResearch = {
  role: string;
  method: 'job_postings' | 'role_catalog';
  /** Postings the requirements were counted from (title-matched). */
  postingCount: number;
  /** Matched postings, for the "sources" list. */
  postings: Pick<Posting, 'title' | 'company' | 'url' | 'source'>[];
  /** Share of postings mentioning each skill, highest first. */
  frequencies: { id: string; label: string; count: number; share: number }[];
  sourcesTried: { source: string; ok: boolean; fetched: number }[];
  fetchedAt: string;
  requirements: JobRequirements;
};

const FETCH_TIMEOUT_MS = 12_000;
const MIN_POSTINGS = 5;
const MAX_POSTINGS = 60;
const MAX_REQUIREMENTS = 15;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

/** Share of postings → importance. Below the last band a skill isn't a requirement. */
const IMPORTANCE_BY_SHARE: { min: number; importance: 1 | 2 | 3 | 4 | 5; requirement: 'required' | 'preferred' }[] = [
  { min: 0.6, importance: 5, requirement: 'required' },
  { min: 0.4, importance: 4, requirement: 'required' },
  { min: 0.25, importance: 3, requirement: 'required' },
  { min: 0.15, importance: 2, requirement: 'preferred' },
  { min: 0.1, importance: 1, requirement: 'preferred' },
];

const SENIOR_TITLE = /\b(senior|sr\.?|staff|principal|lead|head|director|manager|architect|vp|chief)\b/i;
const GENERIC_WORDS = new Set(['developer', 'engineer', 'engineering', 'software', 'specialist', 'role', 'job', 'jobs', 'remote', 'intern', 'internship', 'junior', 'fresher', 'entry', 'level', 'graduate', 'trainee', 'associate']);
const SYNONYMS: Record<string, string[]> = {
  backend: ['backend', 'back-end', 'back end', 'server-side', 'api'],
  frontend: ['frontend', 'front-end', 'front end', 'ui developer', 'react developer', 'web developer'],
  fullstack: ['full stack', 'full-stack', 'fullstack'],
  devops: ['devops', 'site reliability', 'sre', 'platform engineer', 'infrastructure'],
  data: ['data'],
  ml: ['machine learning', 'ml ', 'ml engineer', 'ai engineer', 'mlops'],
  android: ['android', 'mobile'],
  ios: ['ios', 'mobile'],
  qa: ['qa', 'quality assurance', 'test', 'sdet'],
};

const cache = new Map<string, { at: number; value: RoleResearch }>();

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

async function getJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CareerLens/1.0 (campus placement readiness)', Accept: 'application/json' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Search terms: the role as typed, plus its distinguishing word ("backend"). */
type Source = { name: string; fetch: (terms: string[]) => Promise<Posting[]> };

const forEachTerm = async (terms: string[], one: (term: string) => Promise<Posting[]>) =>
  (await Promise.allSettled(terms.map(one))).flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

// Free, keyless public job APIs. Each returns full posting descriptions.
const SOURCES: Source[] = [
  {
    name: 'Remotive',
    fetch: (terms) => forEachTerm(terms, async (term) => {
      const j = (await getJSON(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=100`)) as { jobs?: Record<string, string>[] };
      return (j.jobs ?? []).map((x) => ({ title: x.title, company: x.company_name ?? null, url: x.url, source: 'Remotive', description: stripHtml(x.description ?? '') }));
    }),
  },
  {
    name: 'Jobicy',
    fetch: (terms) => forEachTerm(terms, async (term) => {
      const j = (await getJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(term)}`)) as { jobs?: Record<string, string>[] };
      return (j.jobs ?? []).map((x) => ({ title: x.jobTitle, company: x.companyName ?? null, url: x.url, source: 'Jobicy', description: stripHtml(x.jobDescription ?? x.jobExcerpt ?? '') }));
    }),
  },
  {
    name: 'Himalayas',
    fetch: (terms) => forEachTerm(terms, async (term) => {
      const j = (await getJSON(`https://himalayas.app/jobs/api/search?q=${encodeURIComponent(term)}&limit=100`)) as { jobs?: Record<string, unknown>[] };
      return (j.jobs ?? []).map((x) => ({
        title: String(x.title ?? ''),
        company: (x.companyName as string) ?? null,
        url: String(x.applicationLink ?? x.guid ?? ''),
        source: 'Himalayas',
        description: stripHtml(String(x.description ?? x.excerpt ?? '')),
      }));
    }),
  },
  {
    name: 'Working Nomads',
    fetch: async () => {
      const j = (await getJSON('https://www.workingnomads.com/api/exposed_jobs/')) as Record<string, string>[];
      return (Array.isArray(j) ? j : []).map((x) => ({ title: x.title, company: x.company_name ?? null, url: x.url, source: 'Working Nomads', description: stripHtml(x.description ?? '') }));
    },
  },
  {
    name: 'Arbeitnow',
    fetch: async () => {
      const j = (await getJSON('https://www.arbeitnow.com/api/job-board-api')) as { data?: Record<string, string>[] };
      return (j.data ?? []).map((x) => ({ title: x.title, company: x.company_name ?? null, url: x.url, source: 'Arbeitnow', description: stripHtml(x.description ?? '') }));
    },
  },
  {
    name: 'The Muse',
    fetch: async () => {
      const pages = await Promise.all([0, 1, 2].map((page) =>
        getJSON(`https://www.themuse.com/api/public/jobs?page=${page}&category=Software%20Engineering&category=Data%20and%20Analytics&level=Entry%20Level&level=Internship`).catch(() => ({ results: [] }))
      ));
      return pages.flatMap((p) => ((p as { results?: Record<string, unknown>[] }).results ?? []).map((x) => ({
        title: String(x.name ?? ''),
        company: ((x.company as { name?: string } | undefined)?.name) ?? null,
        url: String((x.refs as { landing_page?: string } | undefined)?.landing_page ?? ''),
        source: 'The Muse',
        description: stripHtml(String(x.contents ?? '')),
      })));
    },
  },
];

/** Words of the role that identify it ("backend developer" → backend + its spellings). */
function roleKeywords(role: string): string[][] {
  const words = role.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !GENERIC_WORDS.has(w));
  const normalized = words.map((w) => w.replace(/-/g, ''));
  return normalized.map((w) => {
    const key = Object.keys(SYNONYMS).find((k) => w === k || w.startsWith(k));
    return key ? SYNONYMS[key] : [w];
  });
}

function titleMatches(title: string, keywordGroups: string[][], role: string): boolean {
  const t = ` ${title.toLowerCase()} `;
  // Every distinguishing word of the role must appear (in any of its spellings).
  if (keywordGroups.length > 0) return keywordGroups.every((group) => group.some((k) => t.includes(k)));
  // Roles made only of generic words ("Software Engineer"): match the phrase.
  return t.includes(role.toLowerCase());
}

/** Build JobRequirements from the share of postings that mention each skill. */
function requirementsFromPostings(role: string, postings: Posting[]) {
  const counts = new Map<string, number>();
  for (const p of postings) {
    for (const id of findSkillsInText(`${p.title} ${p.description}`)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const frequencies = [...counts.entries()]
    .map(([id, count]) => ({ id, label: skillLabel(id), count, share: count / postings.length }))
    .filter((f) => canonicalizeSkill(f.label).category !== 'other')
    .sort((a, b) => b.share - a.share || a.label.localeCompare(b.label));

  const banded = frequencies
    .map((f) => ({ f, band: IMPORTANCE_BY_SHARE.find((b) => f.share >= b.min) }))
    .filter((x): x is { f: typeof frequencies[number]; band: (typeof IMPORTANCE_BY_SHARE)[number] } => !!x.band)
    .slice(0, MAX_REQUIREMENTS);

  // Postings for one role ask for different languages ("Java, Python or Go"):
  // knowing any one of them meets the requirement, at the top language's weight.
  // Only languages in 15%+ of postings and at least a third as common as the top one
  // join the group, so a niche language (Python in 10% of frontend postings) can't
  // stand in for the main one.
  const allLanguages = banded.filter(({ f }) => canonicalizeSkill(f.label).category === 'language');
  const languages = allLanguages.filter(({ f }) => f.share >= 0.15 && f.share >= allLanguages[0].f.share / 3);
  const groupIds = new Set(languages.length >= 2 ? languages.map(({ f }) => f.id) : []);
  const languageBand = languages[0]?.band;

  const skills = banded.map(({ f, band }) => {
    const inGroup = groupIds.has(f.id);
    const b = inGroup ? languageBand! : band;
    return {
      name: f.label,
      importance: b.importance,
      requirement: b.requirement,
      anyOfGroup: inGroup ? 'programming-language' : null,
      quote: `In ${f.count} of ${postings.length} ${role} postings (${Math.round(f.share * 100)}%)`,
    };
  });
  return { frequencies, skills };
}

function emptyEligibility(): JobRequirements['eligibility'] {
  return {
    minCgpa: null, minClass10Percent: null, minClass12Percent: null, minGraduationPercent: null,
    minExperienceMonths: null, maxExperienceMonths: null, degrees: [], fields: [], graduationYears: [], maxActiveBacklogs: null,
  };
}

function catalogFallback(role: string, base: Omit<RoleResearch, 'method' | 'requirements' | 'frequencies'>): RoleResearch | null {
  const preset = findRoleByTarget(role);
  if (!preset) return null;
  return {
    ...base,
    method: 'role_catalog',
    frequencies: [],
    requirements: {
      title: preset.title,
      company: null,
      seniority: 'entry',
      skills: preset.skills.map((s) => ({
        name: skillLabel(s.id),
        importance: s.importance,
        requirement: s.importance >= 3 ? 'required' as const : 'preferred' as const,
        // Accepted alternatives ("Python or Java…") share a group, as a JD's "X or Y" would.
        anyOfGroup: s.alternatives?.length ? [s.id, ...s.alternatives].join('|') : null,
        quote: `CareerLens ${preset.title} profile`,
      })).flatMap((s, i) => {
        const alts = preset.skills[i].alternatives ?? [];
        return [s, ...alts.map((id) => ({ ...s, name: skillLabel(id) }))];
      }),
      eligibility: emptyEligibility(),
      responsibilities: [],
    },
  };
}

export async function researchRole(roleInput: string): Promise<RoleResearch> {
  const role = roleInput.trim().replace(/\s+/g, ' ').slice(0, 80);
  const key = role.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const keywords = roleKeywords(role);
  const terms = [...new Set([role, keywords[0]?.[0]].filter((t): t is string => !!t && t.length > 2))];
  const settled = await Promise.allSettled(SOURCES.map((s) => s.fetch(terms)));
  const sourcesTried = settled.map((r, i) => ({ source: SOURCES[i].name, ok: r.status === 'fulfilled', fetched: r.status === 'fulfilled' ? r.value.length : 0 }));
  settled.forEach((r, i) => { if (r.status === 'rejected') console.warn(`[role-research] ${SOURCES[i].name} failed:`, r.reason instanceof Error ? r.reason.message : r.reason); });

  const seen = new Set<string>();
  const matched = settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((p) => p.title && p.description.length > 200 && titleMatches(p.title, keywords, role))
    .filter((p) => {
      const k = `${p.title.toLowerCase()}|${(p.company ?? '').toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  // Students apply to entry-level roles: drop senior titles when enough others remain.
  const junior = matched.filter((p) => !SENIOR_TITLE.test(p.title));
  const postings = (junior.length >= MIN_POSTINGS ? junior : matched).slice(0, MAX_POSTINGS);

  const base = {
    role,
    postingCount: postings.length,
    postings: postings.map(({ title, company, url, source }) => ({ title, company, url, source })),
    sourcesTried,
    fetchedAt: new Date().toISOString(),
  };

  let result: RoleResearch | null = null;
  if (postings.length >= MIN_POSTINGS) {
    const { frequencies, skills } = requirementsFromPostings(role, postings);
    if (skills.length > 0) {
      result = {
        ...base,
        method: 'job_postings',
        frequencies: frequencies.slice(0, 25),
        requirements: { title: role, company: null, seniority: junior.length >= MIN_POSTINGS ? 'entry' : 'unspecified', skills, eligibility: emptyEligibility(), responsibilities: [] },
      };
    }
  }
  result ??= catalogFallback(role, base);
  if (!result) {
    throw new Error(
      postings.length > 0
        ? `Only ${postings.length} current posting${postings.length === 1 ? '' : 's'} found for "${role}" — not enough to measure its requirements. Try a broader role name (e.g. "Backend Developer").`
        : `No current postings found for "${role}". Try a common role name such as "Backend Developer", "Data Analyst" or "Frontend Developer".`
    );
  }
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), value: result });
  return result;
}

/** A plain-text brief of the researched requirements, for the AI explanation step. */
export function researchBrief(r: RoleResearch): string {
  const lines = r.requirements.skills.map((s) => `- ${s.name} (importance ${s.importance}/5, ${s.requirement}): ${s.quote}`);
  return `Role: ${r.role}\nRequirements measured from ${r.method === 'job_postings' ? `${r.postingCount} current job postings` : 'the CareerLens role profile'}:\n${lines.join('\n')}`;
}
