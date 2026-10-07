// lib/jobs/role-research.ts
//
// "What does a <role> need?" answered from live job postings, not from an LLM.
//   1. Fetch current postings from free public job-board APIs.
//   2. Keep the ones whose title is this role (preferring non-senior titles).
//   3. Detect skills in each description with the skill dictionary.
//   4. Turn each skill's share of postings into an importance weight (fixed table).
// The same postings always give the same requirements. With too few matching
// postings, the curated role catalog is used instead.

import { z } from 'zod';
import { JobRequirementsSchema, type JobRequirements } from '@/lib/llm/schemas';
import { callAnyJSON, isAnyLLMEnabled } from '@/lib/llm/any';
import { canonicalizeSkill, findSkillsInText, skillLabel } from '@/lib/scoring/skill-taxonomy';
import { findRoleByTarget } from '@/lib/scoring/roles-catalog';

export type Posting = { title: string; company: string | null; url: string; source: string; description: string };

export type RoleResearch = {
  role: string;
  /** job_postings: counted from postings; role_catalog: built-in profile; ai_estimate: AI's general knowledge (no postings). */
  method: 'job_postings' | 'role_catalog' | 'ai_estimate';
  /** Fewer than MIN_POSTINGS matched; still counted, but a small sample. */
  smallSample: boolean;
  /** Skills were read from the postings by AI as well as the skill dictionary. */
  aiReadPostings: boolean;
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
/** Below this, postings aren't counted at all. */
const MIN_POSTINGS_TO_COUNT = 3;
/** Postings the AI reads in one call, and how much of each. */
const AI_READ_POSTINGS = 18;
const AI_READ_CHARS = 1200;
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
  ml: ['machine learning', 'ml', 'ml engineer', 'ai engineer', 'mlops'],
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
        getJSON(`https://www.themuse.com/api/public/jobs?page=${page}&level=Entry%20Level&level=Internship`).catch(() => ({ results: [] }))
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

/** Whole-word (or whole-phrase) match, so "ux" doesn't match "linux". */
const hasWord = (text: string, word: string) =>
  new RegExp(`(^|[^a-z0-9])${word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(text);

function titleMatches(title: string, keywordGroups: string[][], role: string, loose = false): boolean {
  const t = ` ${title.toLowerCase()} `;
  // Strict: every distinguishing word of the role appears (in any of its spellings).
  // Loose (rare roles of 3+ words): all but one do, so "Digital Marketing Executive"
  // takes "Digital Marketing Manager" but not "Sales Executive".
  if (keywordGroups.length > 0) {
    const hit = (group: string[]) => group.some((k) => hasWord(t, k));
    const hits = keywordGroups.filter(hit).length;
    return loose && keywordGroups.length >= 3 ? hits >= keywordGroups.length - 1 : hits === keywordGroups.length;
  }
  // Roles made only of generic words ("Software Engineer"): match the phrase.
  return hasWord(t, role.toLowerCase());
}

const PostingSkillsSchema = z.object({
  postings: z.array(z.object({
    index: z.number().int(),
    skills: z.array(z.object({ name: z.string(), kind: z.enum(['technical', 'domain', 'soft']) })),
  })),
});

const READ_POSTINGS_SYSTEM = `You read job postings and list the skills each one asks the candidate to have. You do not judge or rank anything.
- For each posting (by its index) list the hard skills it requires or prefers: tools, languages, software, methods, certifications and domain knowledge (e.g. "SQL", "Excel", "Financial Modeling", "AutoCAD", "SEO", "Tally", "GAAP", "Figma", "Market Research").
- Use short, common, canonical names; the same skill must get the same name in every posting ("Microsoft Excel" -> "Excel", "ReactJS" -> "React").
- kind: "technical" for tools/languages/software/technical methods, "domain" for field knowledge, "soft" for interpersonal traits.
- Only what the candidate is asked to know: skip the company's own product/stack descriptions, perks and benefits.
- Never list the job title itself as a skill. A qualification (CA, CPA, PMP) is listed once, under its short name.
- At most 15 per posting.`;

// Where postings list what they want; the company blurb usually comes first.
const REQUIREMENTS_HEADING = /\b(requirements|qualifications|what you(?:'|’)ll need|what you bring|what we(?:'|’)re looking for|you have|you will have|must have|skills|experience with|about you|who you are|ideal candidate)\b/i;

/** The part of a posting that states requirements: from its first requirements heading, else the start. */
function requirementsWindow(description: string, size = AI_READ_CHARS): string {
  const at = description.slice(150).search(REQUIREMENTS_HEADING);
  const start = at >= 0 ? at + 150 : 0;
  return description.slice(start, start + size);
}

/** Per posting, the canonical skill ids it asks for (soft skills excluded) and their display names. */
async function postingSkillSets(postings: Posting[]): Promise<{ sets: Set<string>[]; names: Map<string, string>; aiRead: boolean }> {
  const names = new Map<string, string>();
  // Without AI: the skill dictionary (tech skills only). It also picks up the
  // company's own stack ("our app is built with…"), which the AI reading avoids.
  const dictionary = () => postings.map((p) => findSkillsInText(`${p.title} ${p.description}`));
  // Dictionary hits inside the requirements section only: real asks, not the company's stack.
  const dictionaryInRequirements = (p: Posting) => findSkillsInText(requirementsWindow(p.description, 2500));
  if (!isAnyLLMEnabled()) return { sets: dictionary(), names, aiRead: false };

  // The AI reads what each posting asks the candidate to know, in any field.
  try {
    const batch = postings.slice(0, AI_READ_POSTINGS);
    const { data } = await callAnyJSON({
      system: READ_POSTINGS_SYSTEM,
      user: batch.map((p, i) => `### Posting ${i}: ${p.title}\n${requirementsWindow(p.description)}`).join('\n\n'),
      schema: PostingSkillsSchema,
      schemaName: 'posting_skills',
      maxTokens: 8192,
    });
    const sets = batch.map((p) => dictionaryInRequirements(p));
    for (const entry of data.postings) {
      const set = sets[entry.index];
      if (!set) continue;
      for (const s of entry.skills) {
        if (s.kind === 'soft' || !s.name.trim() || s.name.length > 50) continue;
        const c = canonicalizeSkill(s.name);
        set.add(c.id);
        if (!c.known && !names.has(c.id)) names.set(c.id, s.name.trim());
      }
    }
    // Postings the AI returned nothing for are dropped rather than counted as asking for nothing.
    const read = sets.filter((s) => s.size > 0);
    if (read.length >= MIN_POSTINGS_TO_COUNT) return { sets: read, names, aiRead: true };
    return { sets: dictionary(), names: new Map(), aiRead: false };
  } catch (e) {
    console.warn('[role-research] AI posting read failed, using the skill dictionary only:', e instanceof Error ? e.message : e);
    return { sets: dictionary(), names, aiRead: false };
  }
}

/** Build JobRequirements from the share of postings that mention each skill. */
function requirementsFromPostings(role: string, sets: Set<string>[], names: Map<string, string>) {
  const counts = new Map<string, number>();
  for (const set of sets) for (const id of set) counts.set(id, (counts.get(id) ?? 0) + 1);
  const label = (id: string) => names.get(id) ?? skillLabel(id);
  const frequencies = [...counts.entries()]
    .map(([id, count]) => ({ id, label: label(id), count, share: count / sets.length }))
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
      quote: `In ${f.count} of ${sets.length} ${role} postings (${Math.round(f.share * 100)}%)`,
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

type ResearchBase = Omit<RoleResearch, 'method' | 'requirements' | 'frequencies' | 'smallSample' | 'aiReadPostings'>;

function catalogFallback(role: string, base: ResearchBase): RoleResearch | null {
  const preset = findRoleByTarget(role);
  if (!preset) return null;
  return {
    ...base,
    method: 'role_catalog',
    smallSample: false,
    aiReadPostings: false,
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

  const all = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).filter((p) => p.title && p.description.length > 200);
  const pick = (loose: boolean) => {
    const seen = new Set<string>();
    return all
      .filter((p) => titleMatches(p.title, keywords, role, loose))
      .filter((p) => {
        const k = `${p.title.toLowerCase()}|${(p.company ?? '').toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  };
  // Strict title match first; rare roles fall back to matching any distinguishing word.
  let matched = pick(false);
  if (matched.length < MIN_POSTINGS && keywords.length >= 3) {
    const loose = pick(true);
    if (loose.length > matched.length) matched = loose;
  }
  // Students apply to entry-level roles: drop senior titles when enough others remain.
  const junior = matched.filter((p) => !SENIOR_TITLE.test(p.title));
  const postings = (junior.length >= MIN_POSTINGS ? junior : matched).slice(0, MAX_POSTINGS);

  const base: ResearchBase = {
    role,
    postingCount: postings.length,
    postings: postings.map(({ title, company, url, source }) => ({ title, company, url, source })),
    sourcesTried,
    fetchedAt: new Date().toISOString(),
  };

  let result: RoleResearch | null = null;
  if (postings.length >= MIN_POSTINGS_TO_COUNT) {
    const { sets, names, aiRead } = await postingSkillSets(postings);
    const { frequencies, skills } = requirementsFromPostings(role, sets, names);
    if (skills.length > 0) {
      result = {
        ...base,
        postingCount: sets.length,
        method: 'job_postings',
        smallSample: sets.length < MIN_POSTINGS,
        aiReadPostings: aiRead,
        frequencies: frequencies.slice(0, 25),
        requirements: { title: role, company: null, seniority: junior.length >= MIN_POSTINGS ? 'entry' : 'unspecified', skills, eligibility: emptyEligibility(), responsibilities: [] },
      };
    }
  }
  result ??= catalogFallback(role, base);
  result ??= await aiEstimate(role, base);
  if (!result) {
    throw new Error(`Couldn't find requirements for "${role}". Check the spelling, or try a more common name for the role.`);
  }
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), value: result });
  return result;
}

const ESTIMATE_SYSTEM = `You describe what employers typically require for a job role, for a campus-placement platform. Fill the JSON schema.
- skills: the hard skills (tools, software, methods, domain knowledge) an entry-level candidate for this role is typically expected to have, 6 to 15 of them. Use short canonical names. No soft skills.
- importance 1-5: 5 = expected in nearly every posting for this role, 4 = most postings, 3 = many, 2 = some (nice to have), 1 = occasionally.
- requirement: "required" for importance 3+, else "preferred". anyOfGroup: same label for interchangeable options (e.g. "Java|Python"), else null.
- quote: one short reason, e.g. "core tool for the role".
- eligibility: all null / empty (it varies by company). seniority: "entry". responsibilities: up to 6 typical duties. title: the role name. company: null.
If the input is not a real job role, return an empty skills list.`;

/** Last resort for roles with no postings or built-in profile: the AI's general knowledge, labelled as such. */
async function aiEstimate(role: string, base: ResearchBase): Promise<RoleResearch | null> {
  if (!isAnyLLMEnabled()) return null;
  try {
    const { data } = await callAnyJSON({
      system: ESTIMATE_SYSTEM,
      user: `Job role: ${role}`,
      schema: JobRequirementsSchema,
      schemaName: 'role_requirements',
      maxTokens: 4096,
    });
    const skills = data.skills
      .filter((s) => s.name.trim())
      .slice(0, MAX_REQUIREMENTS)
      .map((s) => ({ ...s, importance: Math.min(5, Math.max(1, Math.round(s.importance))), quote: `AI estimate: ${s.quote}` }));
    if (skills.length === 0) return null;
    return {
      ...base,
      method: 'ai_estimate',
      smallSample: false,
      aiReadPostings: false,
      frequencies: [],
      requirements: { ...data, title: role, company: null, seniority: 'entry', skills, eligibility: emptyEligibility(), responsibilities: data.responsibilities.slice(0, 6) },
    };
  } catch (e) {
    console.warn('[role-research] AI estimate failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** A plain-text brief of the researched requirements, for the AI explanation step. */
export function researchBrief(r: RoleResearch): string {
  const lines = r.requirements.skills.map((s) => `- ${s.name} (importance ${s.importance}/5, ${s.requirement}): ${s.quote}`);
  const from = r.method === 'job_postings' ? `${r.postingCount} current job postings` : r.method === 'role_catalog' ? 'the CareerLens role profile' : "the AI's general knowledge of the role (no postings found)";
  return `Role: ${r.role}\nRequirements from ${from}:\n${lines.join('\n')}`;
}
