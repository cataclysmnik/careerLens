// lib/github/api.ts

export type GithubRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  topics: string[];
  has_issues: boolean;
  default_branch: string;
  rootFiles?: string[];
};

export async function fetchUserRepositories(username: string): Promise<GithubRepo[]> {
  console.log(`\n--- GITHUB API SCAN INIT: @${username} ---`);
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (process.env.GITHUB_TOKEN) {
      console.log(`Using Authenticated GitHub Token for @${username}`);
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    } else {
      console.log(`WARNING: Fetching unauthenticated. Rate limit is 60 req/hr.`);
    }

    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
      headers,
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(`GitHub API Error for @${username}: ${response.status} ${response.statusText}`);
      const resetTime = response.headers.get('x-ratelimit-reset');
      if (resetTime) {
        console.error(`Rate limit resets at: ${new Date(Number(resetTime) * 1000).toLocaleString()}`);
      }

      if (response.status === 403 || response.status === 429) {
        console.warn("Using fallback mock data to prevent app crash.");
        return getMockRepos();
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repos: GithubRepo[] = await response.json();
    console.log(`Successfully fetched ${repos.length} public repositories for @${username}.`);
    
    // Phase 6 Expansion: Actually scrape the file tree of the top 5 most recent repos
    // to look for hard evidence of Docker, CI/CD, and Testing.
    const topRepos = repos.slice(0, 5);
    
    await Promise.all(topRepos.map(async (repo) => {
      try {
        const contentRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/contents`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
          next: { revalidate: 3600 }
        });
        
        if (contentRes.ok) {
          const contents = await contentRes.json();
          if (Array.isArray(contents)) {
            repo.rootFiles = contents.map((c: any) => c.name);
          }
        }
      } catch (e) {
        // Silently fail root file fetch, keep base repo data
      }
    }));

    return repos;
  } catch (error) {
    console.error("Failed to fetch GitHub repos, using mock data.", error);
    return getMockRepos();
  }
}

function getMockRepos(): GithubRepo[] {
  return [
    {
      name: "careerlens-app",
      description: "AI-powered employability platform",
      language: "TypeScript",
      stargazers_count: 12,
      updated_at: new Date().toISOString(),
      topics: ["react", "nextjs", "docker", "ai"],
      has_issues: true,
      default_branch: "main"
    },
    {
      name: "node-express-backend",
      description: "REST API with PostgreSQL",
      language: "JavaScript",
      stargazers_count: 5,
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      topics: ["nodejs", "express", "postgres", "jest"],
      has_issues: false,
      default_branch: "master"
    },
    {
      name: "old-school-project",
      description: "Homework assignment",
      language: "Python",
      stargazers_count: 0,
      updated_at: new Date(Date.now() - 86400000 * 365).toISOString(),
      topics: [],
      has_issues: false,
      default_branch: "main"
    }
  ];
}
