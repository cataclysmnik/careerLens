// lib/evidence/run-analysis.ts
// Client-side pipeline run after the student confirms their parsed resume:
// analyze the GitHub, portfolio and coding profiles the resume links to, then
// let the server score everything and save the readiness report.

import { CODING_PLATFORMS, HANDLE_FIELD, PLATFORM_INFO, extractCodingHandles, type CodingHandles } from '@/lib/coding/handles';
import type { CodingProfileSummary } from '@/lib/coding/analyzer';
import type { CandidateProfile } from '@/lib/profile/candidate';
import type { GithubAnalyzeData } from './student-evidence';
import type { PortfolioEvidence } from '@/lib/portfolio/analyzer';

export type AnalysisStep = 'github' | 'portfolio' | 'coding' | 'scoring' | 'done';

export type AnalysisResult = {
  github: GithubAnalyzeData | null;
  portfolio: PortfolioEvidence | null;
  coding: CodingProfileSummary | null;
  /** Sources that were found but couldn't be analyzed, e.g. "GitHub @x: not found". */
  problems: string[];
};

// Platforms where the bare domain is never a portfolio, though a subdomain
// (e.g. name.vercel.app) is.
const NAKED_PLATFORMS = ['vercel.app', 'netlify.app', 'github.io', 'heroku.com', 'render.com', 'firebaseapp.com'];
// Domains that are never a portfolio, even as subdomains.
const IGNORE_DOMAINS = [
  'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'outlook.com', 'gmail.com',
  'google.com', 'yahoo.com', 'youtube.com', 'medium.com', 'dev.to', 'hashnode.com', 'github.com',
  ...CODING_PLATFORMS.map((p) => PLATFORM_INFO[p].host),
];

function hostnameOf(link: string): string {
  try {
    return new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return link.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/** GitHub username and portfolio URL: links the AI identified first, then the regex hits. */
export function findProfileLinks(profile: CandidateProfile, parsedLinks: string[]) {
  let githubUsername = profile.links.github?.match(/github\.com\/([^/\s?#]+)/i)?.[1] ?? null;
  let portfolioUrl = profile.links.portfolio ?? null;

  for (const link of parsedLinks) {
    if (link.includes('github.com')) {
      githubUsername ??= link.split('github.com/')[1]?.split('/')[0] || null;
      continue;
    }
    const host = hostnameOf(link);
    const isEmail = link.includes('@') || link.includes('mailto:');
    const ignored = IGNORE_DOMAINS.some((d) => host.includes(d)) || NAKED_PLATFORMS.includes(host);
    if (!isEmail && !ignored) portfolioUrl ??= link;
  }
  return { githubUsername, portfolioUrl };
}

async function postJSON<T>(url: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { data: json.data ?? null, error: null } : { data: null, error: json.error || `HTTP ${res.status}` };
  } catch (e) {
    console.error(`${url} failed during analysis`, e);
    return { data: null, error: 'network error' };
  }
}

export async function runFullAnalysis(
  profile: CandidateProfile,
  parsedLinks: string[],
  onStep: (step: AnalysisStep, detail: string) => void
): Promise<AnalysisResult> {
  // What the student saved on My Profile fills in anything the resume doesn't link.
  let saved: Record<string, string | null> | null = null;
  try {
    const res = await fetch('/api/me');
    saved = res.ok ? (await res.json()).data?.profile ?? null : null;
  } catch {
    // The saved profile is optional.
  }

  const found = findProfileLinks(profile, parsedLinks);
  // A username saved on the account (entered in the GitHub Analyzer or My Profile) wins over the resume link.
  const githubUsername = saved?.githubUsername ?? found.githubUsername ?? null;
  const portfolioUrl = found.portfolioUrl ?? saved?.portfolioUrl ?? null;
  const problems: string[] = [];

  let github: GithubAnalyzeData | null = null;
  if (githubUsername) {
    onStep('github', `Analyzing GitHub profile @${githubUsername}…`);
    const r = await postJSON<GithubAnalyzeData>('/api/github/analyze', { username: githubUsername });
    github = r.data;
    if (r.error) problems.push(`GitHub @${githubUsername}: ${r.error}`);
  }

  let portfolio: PortfolioEvidence | null = null;
  if (portfolioUrl) {
    onStep('portfolio', `Scanning portfolio ${portfolioUrl}…`);
    const r = await postJSON<PortfolioEvidence>('/api/portfolio/analyze', { url: portfolioUrl });
    portfolio = r.data;
    if (r.error) problems.push(`Portfolio ${portfolioUrl}: ${r.error}`);
  }

  // Coding profiles linked on the resume, falling back to handles saved on the profile.
  const handles: CodingHandles = {};
  for (const p of CODING_PLATFORMS) if (saved?.[HANDLE_FIELD[p]]) handles[p] = saved[HANDLE_FIELD[p]]!;
  Object.assign(handles, extractCodingHandles([...parsedLinks, ...profile.links.other]));

  let coding: CodingProfileSummary | null = null;
  const platforms = Object.keys(handles) as (keyof CodingHandles)[];
  if (platforms.length > 0) {
    onStep('coding', `Analyzing coding profiles: ${platforms.map((p) => PLATFORM_INFO[p].label).join(', ')}…`);
    const r = await postJSON<CodingProfileSummary>('/api/coding/analyze', { handles });
    coding = r.data;
    if (r.error) problems.push(`Coding profiles: ${r.error}`);
  }

  // The server computes every score from the raw evidence and saves it, so
  // the dashboard, job matcher and placement cell all see the same result.
  onStep('scoring', 'Calculating your evidence-based scores…');
  const res = await fetch('/api/students/evidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, github, portfolio, coding }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Could not save your analysis');
  }
  onStep('done', 'Your career readiness report is ready.');
  return { github, portfolio, coding, problems };
}
