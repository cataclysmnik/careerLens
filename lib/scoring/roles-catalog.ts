// lib/scoring/roles-catalog.ts
// §12 — preset role definitions (skill -> importance 1–5). Used for the
// "Role Alignment" readiness dimension when no job description is given.

export type RoleSkill = { id: string; importance: 1 | 2 | 3 | 4 | 5; alternatives?: string[] };

export type RoleDefinition = {
  id: string;
  title: string;
  /** Lowercase phrases that map a free-text target role onto this preset. */
  aliases: string[];
  skills: RoleSkill[];
};

export const ROLE_CATALOG: RoleDefinition[] = [
  {
    "id": "backend_developer",
    "title": "Backend Developer",
    "aliases": [
      "backend",
      "back end",
      "back-end",
      "api developer",
      "server side"
    ],
    "skills": [
      {
        "id": "python",
        "importance": 5,
        "alternatives": [
          "java",
          "nodejs",
          "go",
          "csharp"
        ]
      },
      {
        "id": "sql",
        "importance": 5
      },
      {
        "id": "rest-api",
        "importance": 5
      },
      {
        "id": "git",
        "importance": 3
      },
      {
        "id": "docker",
        "importance": 3
      },
      {
        "id": "aws",
        "importance": 2
      },
      {
        "id": "testing",
        "importance": 3
      },
      {
        "id": "dsa",
        "importance": 3
      }
    ]
  },
  {
    "id": "frontend_developer",
    "title": "Frontend Developer",
    "aliases": [
      "frontend",
      "front end",
      "front-end",
      "ui developer",
      "react developer",
      "web developer"
    ],
    "skills": [
      {
        "id": "javascript",
        "importance": 5
      },
      {
        "id": "typescript",
        "importance": 4
      },
      {
        "id": "react",
        "importance": 5
      },
      {
        "id": "html",
        "importance": 4
      },
      {
        "id": "css",
        "importance": 4
      },
      {
        "id": "nextjs",
        "importance": 3
      },
      {
        "id": "git",
        "importance": 3
      },
      {
        "id": "testing",
        "importance": 2
      },
      {
        "id": "rest-api",
        "importance": 3
      }
    ]
  },
  {
    "id": "fullstack_developer",
    "title": "Full Stack Developer",
    "aliases": [
      "full stack",
      "fullstack",
      "full-stack",
      "mern",
      "software engineer",
      "software developer",
      "sde"
    ],
    "skills": [
      {
        "id": "javascript",
        "importance": 5
      },
      {
        "id": "react",
        "importance": 4,
        "alternatives": [
          "vue",
          "angular"
        ]
      },
      {
        "id": "nodejs",
        "importance": 4,
        "alternatives": [
          "python",
          "java"
        ]
      },
      {
        "id": "sql",
        "importance": 4
      },
      {
        "id": "rest-api",
        "importance": 5
      },
      {
        "id": "typescript",
        "importance": 3
      },
      {
        "id": "git",
        "importance": 3
      },
      {
        "id": "docker",
        "importance": 2
      },
      {
        "id": "mongodb",
        "importance": 2
      },
      {
        "id": "dsa",
        "importance": 3
      }
    ]
  },
  {
    "id": "data_scientist",
    "title": "Data Scientist / ML Engineer",
    "aliases": [
      "data scientist",
      "machine learning",
      "ml engineer",
      "ai engineer",
      "data science",
      "deep learning"
    ],
    "skills": [
      {
        "id": "python",
        "importance": 5
      },
      {
        "id": "machine-learning",
        "importance": 5
      },
      {
        "id": "pandas",
        "importance": 4
      },
      {
        "id": "numpy",
        "importance": 3
      },
      {
        "id": "scikit-learn",
        "importance": 4
      },
      {
        "id": "sql",
        "importance": 4
      },
      {
        "id": "deep-learning",
        "importance": 3
      },
      {
        "id": "git",
        "importance": 2
      },
      {
        "id": "data-analysis",
        "importance": 3
      }
    ]
  },
  {
    "id": "data_analyst",
    "title": "Data Analyst",
    "aliases": [
      "data analyst",
      "business analyst",
      "analytics"
    ],
    "skills": [
      {
        "id": "sql",
        "importance": 5
      },
      {
        "id": "data-analysis",
        "importance": 5
      },
      {
        "id": "python",
        "importance": 4
      },
      {
        "id": "pandas",
        "importance": 4
      },
      {
        "id": "git",
        "importance": 1
      }
    ]
  },
  {
    "id": "devops_engineer",
    "title": "DevOps / Cloud Engineer",
    "aliases": [
      "devops",
      "cloud engineer",
      "sre",
      "site reliability",
      "platform engineer"
    ],
    "skills": [
      {
        "id": "linux",
        "importance": 5
      },
      {
        "id": "docker",
        "importance": 5
      },
      {
        "id": "kubernetes",
        "importance": 4
      },
      {
        "id": "aws",
        "importance": 4
      },
      {
        "id": "ci-cd",
        "importance": 5
      },
      {
        "id": "terraform",
        "importance": 3
      },
      {
        "id": "bash",
        "importance": 4
      },
      {
        "id": "git",
        "importance": 3
      },
      {
        "id": "python",
        "importance": 2
      }
    ]
  },
  {
    "id": "mobile_developer",
    "title": "Mobile Developer",
    "aliases": [
      "mobile",
      "android",
      "ios",
      "flutter",
      "react native",
      "app developer"
    ],
    "skills": [
      {
        "id": "kotlin",
        "importance": 5,
        "alternatives": [
          "flutter",
          "react-native",
          "swift",
          "java"
        ]
      },
      {
        "id": "android",
        "importance": 3,
        "alternatives": [
          "ios"
        ]
      },
      {
        "id": "rest-api",
        "importance": 4
      },
      {
        "id": "git",
        "importance": 3
      },
      {
        "id": "firebase",
        "importance": 2
      }
    ]
  }
];

export function findRoleByTarget(target: string | null | undefined): RoleDefinition | null {
  if (!target) return null;
  const t = target.toLowerCase();
  return (
    ROLE_CATALOG.find((r) => r.title.toLowerCase() === t) ??
    ROLE_CATALOG.find((r) => r.aliases.some((a) => t.includes(a))) ??
    null
  );
}
