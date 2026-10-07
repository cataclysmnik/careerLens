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
};

export async function fetchUserRepositories(username: string): Promise<GithubRepo[]> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}` // Uncomment in production
      },
      next: { revalidate: 3600 } // Cache for 1 hour to respect rate limits
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.warn("GitHub API rate limit exceeded. Using fallback mock data.");
        return getMockRepos();
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
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
