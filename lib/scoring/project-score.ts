// lib/scoring/project-score.ts
// §11 — project evidence score from the facts the LLM extracted.

import type { Project } from '@/lib/llm/schemas';
import {
  PROJECT_ARCHITECTURE_TABLE,
  PROJECT_COMPONENTS_TABLE,
  PROJECT_DIMENSION_WEIGHTS,
  PROJECT_DOCUMENTATION,
  PROJECT_FEATURES_TABLE,
  PROJECT_QUANTIFIED_OUTCOME_BONUS,
  PROJECT_TECH_TABLE,
  TOP_PROJECT_WEIGHTS,
  type ProjectDimensionKey,
} from './config';
import { clamp, piecewise, round1 } from './normalize';
import { canonicalizeSkill, findSkillsInText } from './skill-taxonomy';
import type { RepoSignals } from './evidence-inputs';

export type ProjectDimension = {
  key: ProjectDimensionKey;
  label: string;
  raw: string;
  normalized: number;
  weight: number;
  weighted: number;
};

export type ProjectScore = {
  index: number;
  name: string;
  score: number;
  dimensions: ProjectDimension[];
  skills: string[];
  linkedRepo: string | null;
  /** How the repo was matched to the resume project. */
  linkedVia: RepoMatch['via'] | null;
};

const LABEL: Record<ProjectDimensionKey, string> = {
  complexity: 'Complexity',
  implementationDepth: 'Implementation Depth',
  technologyUsage: 'Technology Usage',
  testing: 'Testing',
  documentation: 'Documentation',
  deployment: 'Deployment',
  architecture: 'Architecture',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Words that say nothing about which project a name refers to.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'of', 'for', 'with', 'using', 'based', 'to', 'in', 'on', 'by', 'vs', 'via',
  'app', 'application', 'project', 'system', 'website', 'web', 'site', 'platform', 'tool', 'api', 'my',
]);

/** Name tokens: splits on punctuation and camelCase ("SpyDrone_v2" -> spy, drone, v2). */
function tokens(text: string): Set<string> {
  return new Set(
    text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

/** Same word, or one is a prefix of the other ("detect" / "detection", "spy" / "spyware"). */
const sameWord = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a)));

export type RepoMatch = { repo: RepoSignals; via: 'url' | 'name' | 'similarity'; similarity: number };

/** How well a resume project matches a repo, 0–1: name words first, then the repo description and shared tech. */
function similarity(project: Project, skills: Set<string>, repo: RepoSignals): number {
  const pn = norm(project.name);
  const rn = norm(repo.name);
  if (pn.length >= 4 && (pn === rn || (rn.length >= 6 && pn.includes(rn)) || (pn.length >= 6 && rn.includes(pn)))) return 1;

  const p = tokens(project.name);
  const r = tokens(repo.name);
  if (p.size === 0) return 0;
  const techOverlap = skills.size ? [...skills].filter((s) => s !== 'git' && repo.skills.has(s)).length / skills.size : 0;

  const shared = [...r].filter((t) => [...p].some((w) => sameWord(w, t))).length;
  const nameScore = r.size ? shared / Math.min(p.size, r.size) : 0;
  // A single shared word between multi-word names is too weak on its own.
  const strongName = shared >= 2 || (shared === 1 && Math.min(p.size, r.size) === 1);
  if (strongName) return Math.min(1, nameScore * 0.85 + techOverlap * 0.15);

  // Otherwise the repo description must name most of the project and share its tech.
  const inDesc = [...p].filter((w) => repo.matchText.includes(w)).length / p.size;
  return inDesc >= 0.6 && techOverlap >= 0.3 ? 0.6 : nameScore * 0.5;
}

const MATCH_THRESHOLD = 0.6;

/**
 * Match each resume project to at most one of the candidate's repos (and each
 * repo to at most one project): a GitHub URL on the resume wins, then the best
 * name/description similarity above the threshold.
 */
export function linkProjectsToRepos(projects: Project[], repos: RepoSignals[]): (RepoMatch | null)[] {
  const links: (RepoMatch | null)[] = projects.map(() => null);
  const taken = new Set<string>();

  projects.forEach((project, i) => {
    const m = project.repoUrl?.match(/github\.com\/[^/\s]+\/([^/\s#?]+)/i);
    const repo = m ? repos.find((r) => norm(r.name) === norm(m[1].replace(/\.git$/, ''))) : undefined;
    if (repo && !taken.has(repo.name)) {
      links[i] = { repo, via: 'url', similarity: 1 };
      taken.add(repo.name);
    }
  });

  const candidates: { i: number; repo: RepoSignals; sim: number }[] = [];
  projects.forEach((project, i) => {
    if (links[i]) return;
    const skills = projectSkillIds(project);
    for (const repo of repos) {
      const sim = similarity(project, skills, repo);
      if (sim >= MATCH_THRESHOLD) candidates.push({ i, repo, sim });
    }
  });
  for (const c of candidates.sort((a, b) => b.sim - a.sim)) {
    if (links[c.i] || taken.has(c.repo.name)) continue;
    links[c.i] = { repo: c.repo, via: c.sim === 1 ? 'name' : 'similarity', similarity: Math.round(c.sim * 100) / 100 };
    taken.add(c.repo.name);
  }
  return links;
}

/** Canonical skills a project demonstrates (declared + mentioned in its description). */
export function projectSkillIds(project: Project): Set<string> {
  const ids = new Set(project.skills.map((s) => canonicalizeSkill(s).id));
  for (const id of findSkillsInText(project.description)) ids.add(id);
  return ids;
}

export function scoreProject(project: Project, index: number, link: RepoMatch | null): ProjectScore {
  const repo = link?.repo ?? null;
  // Technologies the resume names plus what the linked repo shows (languages, config files, topics).
  const skills = projectSkillIds(project);
  if (repo) for (const id of repo.skills) if (id !== 'git') skills.add(id);
  const techCount = skills.size;

  const testing = repo?.hasTestConfig && repo.hasCi ? { v: 100, raw: `Tests + CI in ${repo.name}` }
    : repo?.hasTestConfig ? { v: 90, raw: `Test setup found in ${repo.name}` }
    : project.mentionsTesting ? { v: 60, raw: 'Testing described on resume' }
    : { v: 0, raw: 'No testing mentioned' };

  const documentation = repo?.hasReadme ? { v: PROJECT_DOCUMENTATION.documented, raw: `README in ${repo.name}` }
    : project.mentionsDocumentation ? { v: PROJECT_DOCUMENTATION.documented, raw: 'Documentation described' }
    : repo?.hasDescription || project.repoUrl ? { v: PROJECT_DOCUMENTATION.repoOnly, raw: 'Public repository' }
    : { v: PROJECT_DOCUMENTATION.none, raw: 'No documentation or repo' };

  const deployed = project.isDeployed || !!project.liveUrl || !!repo?.hasDeployConfig;
  const depth = clamp(piecewise(project.featureCount, PROJECT_FEATURES_TABLE) + (project.hasQuantifiedOutcome ? PROJECT_QUANTIFIED_OUTCOME_BONUS : 0));

  const values: Record<ProjectDimensionKey, { v: number; raw: string }> = {
    complexity: { v: piecewise(project.components.length, PROJECT_COMPONENTS_TABLE), raw: project.components.length ? `${project.components.length} components: ${project.components.join(', ')}` : 'No components described' },
    implementationDepth: { v: depth, raw: `${project.featureCount} features${project.hasQuantifiedOutcome ? ' + measurable outcome' : ''}` },
    technologyUsage: { v: piecewise(techCount, PROJECT_TECH_TABLE), raw: `${techCount} technologies${repo ? ' (resume + repo)' : ''}` },
    testing,
    documentation,
    deployment: { v: deployed ? 100 : 0, raw: deployed ? (project.liveUrl ? 'Live URL' : repo?.hasDeployConfig ? `Deploy config / homepage in ${repo.name}` : 'Deployed') : 'Not deployed' },
    architecture: { v: piecewise(project.architecturePatterns.length, PROJECT_ARCHITECTURE_TABLE), raw: project.architecturePatterns.length ? project.architecturePatterns.join(', ') : 'No patterns named' },
  };

  const dimensions: ProjectDimension[] = (Object.keys(PROJECT_DIMENSION_WEIGHTS) as ProjectDimensionKey[]).map((key) => {
    const weight = PROJECT_DIMENSION_WEIGHTS[key];
    const normalized = round1(values[key].v);
    return { key, label: LABEL[key], raw: values[key].raw, normalized, weight, weighted: round1(normalized * weight) };
  });

  const score = round1(dimensions.reduce((a, d) => a + d.normalized * d.weight, 0));
  return { index, name: project.name, score, dimensions, skills: Array.from(skills), linkedRepo: repo?.name ?? null, linkedVia: link?.via ?? null };
}

/** Project Evidence dimension: weighted top-3 project scores, missing slots = 0. */
export function projectEvidenceScore(projects: ProjectScore[]): { score: number; used: ProjectScore[] } {
  const top = [...projects].sort((a, b) => b.score - a.score).slice(0, TOP_PROJECT_WEIGHTS.length);
  const score = TOP_PROJECT_WEIGHTS.reduce((acc, w, i) => acc + (top[i]?.score ?? 0) * w, 0);
  return { score: round1(score), used: top };
}
