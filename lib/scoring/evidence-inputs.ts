// lib/scoring/evidence-inputs.ts
// Everything the scoring engine needs, in one serializable object. Stored as-is
// so any score can be recomputed later (same inputs + same version = same score).

import type { CandidateProfile } from '@/lib/profile/candidate';
import type { PortfolioEvidence } from '@/lib/portfolio/analyzer';
import type { GithubRepo } from '@/lib/github/api';
import type { CodingProfileSummary } from '@/lib/coding/analyzer';
import { canonicalizeSkill, findSkillsInText } from './skill-taxonomy';
import { DOCKER_MILESTONES, TESTING_MILESTONES } from './config';

export type GithubRepoLite = Pick<GithubRepo, 'name' | 'description' | 'language' | 'topics' | 'updated_at' | 'rootFiles' | 'fork' | 'homepage'> & {
  created_at?: string | null;
  pushed_at?: string | null;
};

export type GithubInput = {
  username: string;
  totalRepos: number;
  repositories: GithubRepoLite[];
};

export type EvidenceInputs = {
  profile: CandidateProfile;
  github: GithubInput | null;
  portfolio: PortfolioEvidence | null;
  /** Coding-platform results. Optional so inputs stored before v1.1 still parse. */
  coding?: CodingProfileSummary | null;
  /** Reference date for recency/experience maths. Stored so re-scoring is reproducible. */
  asOf: string;
};

/** Keep only the repo fields scoring uses — the raw API payload is large. */
export function toGithubInput(data: { username: string; totalRepos: number; repositories?: GithubRepo[] } | null): GithubInput | null {
  if (!data) return null;
  return {
    username: data.username,
    totalRepos: data.totalRepos,
    repositories: (data.repositories ?? []).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics ?? [],
      updated_at: r.updated_at,
      rootFiles: r.rootFiles,
      created_at: r.created_at ?? null,
      pushed_at: r.pushed_at ?? null,
      fork: r.fork ?? false,
      homepage: r.homepage ?? null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Per-repo signals
// ---------------------------------------------------------------------------

export type RepoSignals = {
  name: string;
  skills: Set<string>;
  hasDockerfile: boolean;
  hasCompose: boolean;
  hasCi: boolean;
  hasTestConfig: boolean;
  hasDeployConfig: boolean;
  hasDescription: boolean;
  hasReadme: boolean;
  /** Lower-cased name + description + topics, for matching resume projects to repos. */
  matchText: string;
  dockerMentioned: boolean;
  testingMentioned: boolean;
  lastActivity: Date | null;
  createdAt: Date | null;
};

const ROOT_FILE_SKILLS: [RegExp, string[]][] = [
  [/^tsconfig\.json$/, ['typescript']],
  [/^next\.config\./, ['nextjs']],
  [/^tailwind\.config\./, ['tailwind']],
  [/^vite\.config\./, ['vite']],
  [/^angular\.json$/, ['angular']],
  [/^nuxt\.config\./, ['nuxt']],
  [/^svelte\.config\./, ['svelte']],
  [/^requirements\.txt$|^pyproject\.toml$|^setup\.py$|^pipfile$/, ['python']],
  [/^manage\.py$/, ['django']],
  [/^pom\.xml$|^build\.gradle/, ['java']],
  [/^go\.mod$/, ['go']],
  [/^cargo\.toml$/, ['rust']],
  [/^gemfile$/, ['ruby']],
  [/^composer\.json$/, ['php']],
  [/^pubspec\.yaml$/, ['flutter']],
  [/^prisma$/, ['prisma']],
  [/^dockerfile$/, ['docker']],
  [/^docker-compose\.ya?ml$|^compose\.ya?ml$/, ['docker']],
  [/^\.github$/, ['github-actions', 'ci-cd']],
  [/^\.gitlab-ci\.yml$|^jenkinsfile$|^\.circleci$/, ['ci-cd']],
  [/^jest\.config\./, ['jest', 'testing']],
  [/^vitest\.config\./, ['vitest', 'testing']],
  [/^cypress(\.config\.|$)/, ['cypress', 'testing']],
  [/^pytest\.ini$|^conftest\.py$/, ['pytest', 'testing']],
  [/^vercel\.json$/, ['vercel']],
  [/^terraform$|\.tf$/, ['terraform']],
  [/^k8s$|^kubernetes$|^helm$/, ['kubernetes']],
];

const TEST_CONFIG = /^(jest|vitest|playwright|karma)\.config\.|^cypress|^pytest\.ini$|^conftest\.py$|^tests?$|^__tests__$|^spec$/;
const DEPLOY_CONFIG = /^(vercel\.json|netlify\.toml|fly\.toml|render\.yaml|procfile|app\.yaml|railway\.json|serverless\.yml)$/;

export function repoSignals(repo: GithubRepoLite): RepoSignals {
  const files = (repo.rootFiles ?? []).map((f) => f.toLowerCase());
  const skills = new Set<string>();

  if (repo.language) skills.add(canonicalizeSkill(repo.language).id);
  for (const t of repo.topics ?? []) skills.add(canonicalizeSkill(t.replace(/-/g, ' ')).id);
  for (const id of findSkillsInText(repo.description ?? '')) skills.add(id);
  for (const f of files) for (const [re, ids] of ROOT_FILE_SKILLS) if (re.test(f)) ids.forEach((id) => skills.add(id));
  // Any real repository is Git evidence.
  skills.add('git');

  const text = `${repo.name} ${repo.description ?? ''} ${(repo.topics ?? []).join(' ')}`.toLowerCase();
  const last = repo.pushed_at ?? repo.updated_at;
  return {
    name: repo.name,
    skills,
    hasDockerfile: files.includes('dockerfile'),
    hasCompose: files.some((f) => /^(docker-)?compose\.ya?ml$/.test(f)),
    hasCi: files.some((f) => /^\.github$|^\.gitlab-ci\.yml$|^jenkinsfile$|^\.circleci$/.test(f)),
    hasTestConfig: files.some((f) => TEST_CONFIG.test(f)),
    hasDeployConfig: files.some((f) => DEPLOY_CONFIG.test(f)) || !!repo.homepage,
    hasDescription: !!repo.description,
    hasReadme: files.some((f) => /^readme(\.|$)/.test(f)),
    matchText: text,
    dockerMentioned: /docker|container/.test(text),
    testingMentioned: /\btest|jest|pytest|cypress|vitest/.test(text),
    lastActivity: last ? new Date(last) : null,
    createdAt: repo.created_at ? new Date(repo.created_at) : null,
  };
}

/** §7 — highest Docker milestone across repos. */
export function dockerMilestone(repos: RepoSignals[], resumeMentions: boolean): { score: number; label: string } {
  let best: { score: number; label: string } = resumeMentions
    ? { score: DOCKER_MILESTONES.mentioned, label: 'Mentioned on resume' }
    : { score: DOCKER_MILESTONES.none, label: 'No Docker evidence' };
  const consider = (score: number, label: string) => { if (score > best.score) best = { score, label }; };
  for (const r of repos) {
    if (r.dockerMentioned) consider(DOCKER_MILESTONES.mentioned, `Docker mentioned in ${r.name}`);
    if (r.hasDockerfile) consider(DOCKER_MILESTONES.dockerfile, `Dockerfile in ${r.name}`);
    if (r.hasCompose) consider(DOCKER_MILESTONES.compose, `Docker Compose in ${r.name}`);
    if ((r.hasDockerfile || r.hasCompose) && r.hasDeployConfig) consider(DOCKER_MILESTONES.deployed, `Deployed container (${r.name})`);
    if ((r.hasDockerfile || r.hasCompose) && r.hasCi) consider(DOCKER_MILESTONES.ciCd, `Container + CI/CD pipeline (${r.name})`);
  }
  return best;
}

/** Testing evidence depth across repos. */
export function testingMilestone(repos: RepoSignals[], resumeMentions: boolean): { score: number; label: string } {
  let best: { score: number; label: string } = resumeMentions
    ? { score: TESTING_MILESTONES.mentioned, label: 'Testing mentioned on resume' }
    : { score: TESTING_MILESTONES.none, label: 'No testing evidence' };
  const consider = (score: number, label: string) => { if (score > best.score) best = { score, label }; };
  for (const r of repos) {
    if (r.testingMentioned) consider(TESTING_MILESTONES.mentioned, `Testing mentioned in ${r.name}`);
    if (r.hasTestConfig) consider(TESTING_MILESTONES.testConfig, `Test setup in ${r.name}`);
    if (r.hasTestConfig && r.hasCi) consider(TESTING_MILESTONES.testConfigWithCi, `Tests + CI in ${r.name}`);
  }
  return best;
}
