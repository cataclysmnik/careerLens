// lib/scoring/skill-taxonomy.ts
//
// Canonical skill ids. The LLM maps free text ("Postgres", "ReactJS",
// "relational databases") to names; this table turns those names into stable
// ids deterministically, so the same skill always scores against the same key.

export type SkillCategory =
  | 'language'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'data'
  | 'ml'
  | 'mobile'
  | 'testing'
  | 'tool'
  | 'concept'
  | 'other';

type SkillDef = {
  id: string;
  label: string;
  category: SkillCategory;
  aliases?: string[];
  /** Skills that demonstrating this one also partially demonstrates. */
  implies?: string[];
};

const SKILLS: SkillDef[] = [
  // Languages
  { id: 'javascript', label: 'JavaScript', category: 'language', aliases: ['js', 'es6', 'ecmascript', 'javascript/node'] },
  { id: 'typescript', label: 'TypeScript', category: 'language', aliases: ['ts'], implies: ['javascript'] },
  { id: 'python', label: 'Python', category: 'language', aliases: ['python3', 'py'] },
  { id: 'java', label: 'Java', category: 'language', aliases: ['core java', 'java se'] },
  { id: 'cpp', label: 'C++', category: 'language', aliases: ['c++', 'cplusplus', 'cpp'] },
  { id: 'c', label: 'C', category: 'language', aliases: ['c language', 'c programming'] },
  { id: 'csharp', label: 'C#', category: 'language', aliases: ['c#', 'c sharp', 'csharp'] },
  { id: 'go', label: 'Go', category: 'language', aliases: ['golang'] },
  { id: 'rust', label: 'Rust', category: 'language' },
  { id: 'ruby', label: 'Ruby', category: 'language' },
  { id: 'php', label: 'PHP', category: 'language' },
  { id: 'kotlin', label: 'Kotlin', category: 'language' },
  { id: 'swift', label: 'Swift', category: 'language' },
  { id: 'dart', label: 'Dart', category: 'language' },
  { id: 'scala', label: 'Scala', category: 'language' },
  { id: 'r', label: 'R', category: 'language', aliases: ['r language', 'r programming'] },
  { id: 'html', label: 'HTML', category: 'frontend', aliases: ['html5'] },
  { id: 'css', label: 'CSS', category: 'frontend', aliases: ['css3'] },
  { id: 'bash', label: 'Bash / Shell', category: 'tool', aliases: ['bash', 'shell', 'shell scripting', 'sh', 'zsh'] },

  // Frontend
  { id: 'react', label: 'React', category: 'frontend', aliases: ['react.js', 'reactjs', 'react js'], implies: ['javascript'] },
  { id: 'react-typescript', label: 'React/TypeScript', category: 'frontend', aliases: ['react/typescript', 'react / typescript', 'react/ts', 'react + ts', 'react+ts'], implies: ['react', 'typescript'] },
  { id: 'nextjs', label: 'Next.js', category: 'frontend', aliases: ['next.js', 'next', 'next js'], implies: ['react', 'javascript'] },
  { id: 'vue', label: 'Vue', category: 'frontend', aliases: ['vue.js', 'vuejs'], implies: ['javascript'] },
  { id: 'nuxt', label: 'Nuxt.js', category: 'frontend', aliases: ['nuxt.js', 'nuxtjs'], implies: ['vue'] },
  { id: 'angular', label: 'Angular', category: 'frontend', aliases: ['angularjs', 'angular.js'], implies: ['typescript'] },
  { id: 'svelte', label: 'Svelte', category: 'frontend', aliases: ['sveltekit'] },
  { id: 'redux', label: 'Redux', category: 'frontend', aliases: ['redux toolkit'], implies: ['react'] },
  { id: 'tailwind', label: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind', 'tailwindcss'], implies: ['css'] },
  { id: 'sass', label: 'Sass', category: 'frontend', aliases: ['scss'], implies: ['css'] },
  { id: 'bootstrap', label: 'Bootstrap', category: 'frontend', implies: ['css'] },
  { id: 'material-ui', label: 'Material UI', category: 'frontend', aliases: ['mui', 'material-ui'] },
  { id: 'vite', label: 'Vite', category: 'tool' },
  { id: 'webpack', label: 'Webpack', category: 'tool' },

  // Backend
  { id: 'nodejs', label: 'Node.js', category: 'backend', aliases: ['node', 'node.js', 'nodejs', 'node js'], implies: ['javascript'] },
  { id: 'express', label: 'Express', category: 'backend', aliases: ['express.js', 'expressjs'], implies: ['nodejs', 'rest-api'] },
  { id: 'nestjs', label: 'NestJS', category: 'backend', aliases: ['nest.js', 'nest'], implies: ['nodejs', 'typescript', 'rest-api'] },
  { id: 'django', label: 'Django', category: 'backend', aliases: ['django rest framework', 'drf'], implies: ['python', 'rest-api'] },
  { id: 'flask', label: 'Flask', category: 'backend', implies: ['python', 'rest-api'] },
  { id: 'fastapi', label: 'FastAPI', category: 'backend', aliases: ['fast api'], implies: ['python', 'rest-api'] },
  { id: 'spring-boot', label: 'Spring Boot', category: 'backend', aliases: ['spring', 'springboot', 'spring framework'], implies: ['java', 'rest-api'] },
  { id: 'rails', label: 'Ruby on Rails', category: 'backend', aliases: ['rails', 'ror'], implies: ['ruby'] },
  { id: 'dotnet', label: '.NET', category: 'backend', aliases: ['asp.net', '.net', 'dotnet', '.net core', 'asp.net core'], implies: ['csharp'] },
  { id: 'laravel', label: 'Laravel', category: 'backend', implies: ['php'] },
  { id: 'rest-api', label: 'REST APIs', category: 'backend', aliases: ['rest', 'rest api', 'restful', 'restful api', 'restful apis', 'rest apis', 'api development'] },
  { id: 'graphql', label: 'GraphQL', category: 'backend', aliases: ['apollo', 'apollo graphql'] },
  { id: 'microservices', label: 'Microservices', category: 'concept', aliases: ['microservice architecture'] },
  { id: 'websockets', label: 'WebSockets', category: 'backend', aliases: ['socket.io', 'websocket'] },

  // Databases
  { id: 'sql', label: 'SQL', category: 'database', aliases: ['relational databases', 'rdbms', 'sql databases'] },
  { id: 'postgresql', label: 'PostgreSQL', category: 'database', aliases: ['postgres', 'postgresql', 'psql'], implies: ['sql'] },
  { id: 'mysql', label: 'MySQL', category: 'database', implies: ['sql'] },
  { id: 'sqlite', label: 'SQLite', category: 'database', implies: ['sql'] },
  { id: 'mariadb', label: 'MariaDB', category: 'database', implies: ['sql'] },
  { id: 'mongodb', label: 'MongoDB', category: 'database', aliases: ['mongo', 'mongoose'], implies: ['nosql'] },
  { id: 'nosql', label: 'NoSQL', category: 'database', aliases: ['nosql databases'] },
  { id: 'redis', label: 'Redis', category: 'database' },
  { id: 'elasticsearch', label: 'Elasticsearch', category: 'database', aliases: ['elastic search', 'elk'] },
  { id: 'dynamodb', label: 'DynamoDB', category: 'database', implies: ['nosql', 'aws'] },
  { id: 'firebase', label: 'Firebase', category: 'cloud', aliases: ['firestore'] },
  { id: 'supabase', label: 'Supabase', category: 'cloud', implies: ['postgresql'] },
  { id: 'prisma', label: 'Prisma', category: 'database', aliases: ['prisma orm'] },

  // Cloud & DevOps
  { id: 'aws', label: 'AWS', category: 'cloud', aliases: ['amazon web services', 'ec2', 's3', 'aws lambda', 'lambda'] },
  { id: 'azure', label: 'Azure', category: 'cloud', aliases: ['microsoft azure'] },
  { id: 'gcp', label: 'Google Cloud', category: 'cloud', aliases: ['gcp', 'google cloud platform', 'google cloud'] },
  { id: 'docker', label: 'Docker', category: 'devops', aliases: ['docker compose', 'docker-compose', 'containers', 'containerization'] },
  { id: 'kubernetes', label: 'Kubernetes', category: 'devops', aliases: ['k8s'], implies: ['docker'] },
  { id: 'terraform', label: 'Terraform', category: 'devops' },
  { id: 'ansible', label: 'Ansible', category: 'devops' },
  { id: 'ci-cd', label: 'CI/CD', category: 'devops', aliases: ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'gitlab ci', 'circleci'] },
  { id: 'github-actions', label: 'GitHub Actions', category: 'devops', implies: ['ci-cd'] },
  { id: 'linux', label: 'Linux', category: 'tool', aliases: ['unix', 'ubuntu'] },
  { id: 'nginx', label: 'Nginx', category: 'devops' },
  { id: 'vercel', label: 'Vercel', category: 'cloud' },

  // Data / ML
  { id: 'machine-learning', label: 'Machine Learning', category: 'ml', aliases: ['ml', 'machine learning'] },
  { id: 'deep-learning', label: 'Deep Learning', category: 'ml', aliases: ['dl', 'neural networks'], implies: ['machine-learning'] },
  { id: 'pytorch', label: 'PyTorch', category: 'ml', aliases: ['torch'], implies: ['python', 'deep-learning'] },
  { id: 'tensorflow', label: 'TensorFlow', category: 'ml', aliases: ['tf'], implies: ['python', 'deep-learning'] },
  { id: 'keras', label: 'Keras', category: 'ml', implies: ['python', 'deep-learning'] },
  { id: 'scikit-learn', label: 'scikit-learn', category: 'ml', aliases: ['sklearn', 'scikit learn'], implies: ['python', 'machine-learning'] },
  { id: 'pandas', label: 'Pandas', category: 'data', implies: ['python'] },
  { id: 'numpy', label: 'NumPy', category: 'data', implies: ['python'] },
  { id: 'computer-vision', label: 'Computer Vision', category: 'ml', aliases: ['cv', 'opencv'], implies: ['machine-learning'] },
  { id: 'nlp', label: 'NLP', category: 'ml', aliases: ['natural language processing'], implies: ['machine-learning'] },
  { id: 'llm', label: 'LLMs / GenAI', category: 'ml', aliases: ['llm', 'llms', 'generative ai', 'genai', 'openai', 'langchain', 'rag'] },
  { id: 'data-analysis', label: 'Data Analysis', category: 'data', aliases: ['data analytics', 'power bi', 'tableau'] },
  // Its own skill: accountants, marketers and engineers list Excel without doing data analysis.
  { id: 'excel', label: 'Excel', category: 'data', aliases: ['microsoft excel', 'ms excel', 'advanced excel'] },
  { id: 'spark', label: 'Apache Spark', category: 'data', aliases: ['spark', 'pyspark'] },

  // Mobile
  { id: 'react-native', label: 'React Native', category: 'mobile', implies: ['react', 'javascript'] },
  { id: 'flutter', label: 'Flutter', category: 'mobile', implies: ['dart'] },
  { id: 'android', label: 'Android', category: 'mobile', aliases: ['android development'] },
  { id: 'ios', label: 'iOS', category: 'mobile', aliases: ['ios development'] },

  // Testing
  { id: 'testing', label: 'Automated Testing', category: 'testing', aliases: ['unit testing', 'testing', 'test automation', 'tdd', 'integration testing'] },
  { id: 'jest', label: 'Jest', category: 'testing', implies: ['testing'] },
  { id: 'vitest', label: 'Vitest', category: 'testing', implies: ['testing'] },
  { id: 'pytest', label: 'PyTest', category: 'testing', implies: ['testing', 'python'] },
  { id: 'cypress', label: 'Cypress', category: 'testing', implies: ['testing'] },
  { id: 'selenium', label: 'Selenium', category: 'testing', implies: ['testing'] },
  { id: 'junit', label: 'JUnit', category: 'testing', implies: ['testing', 'java'] },

  // Tools / concepts
  { id: 'git', label: 'Git', category: 'tool', aliases: ['github', 'gitlab', 'version control', 'bitbucket'] },
  { id: 'figma', label: 'Figma', category: 'tool' },
  { id: 'agile', label: 'Agile / Scrum', category: 'concept', aliases: ['agile', 'scrum', 'kanban', 'jira'] },
  { id: 'dsa', label: 'Data Structures & Algorithms', category: 'concept', aliases: ['dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'competitive programming'] },
  { id: 'oop', label: 'OOP', category: 'concept', aliases: ['object oriented programming', 'object-oriented programming', 'oops'] },
  { id: 'system-design', label: 'System Design', category: 'concept', aliases: ['low level design', 'high level design', 'lld', 'hld'] },
  { id: 'dbms', label: 'DBMS', category: 'concept', aliases: ['database management systems'] },
  { id: 'operating-systems', label: 'Operating Systems', category: 'concept', aliases: ['os'] },
  { id: 'computer-networks', label: 'Computer Networks', category: 'concept', aliases: ['networking', 'cn'] },
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
const ALIAS_TO_ID = new Map<string, string>();
for (const s of SKILLS) {
  ALIAS_TO_ID.set(normalizeKey(s.id), s.id);
  ALIAS_TO_ID.set(normalizeKey(s.label), s.id);
  for (const a of s.aliases ?? []) ALIAS_TO_ID.set(normalizeKey(a), s.id);
}

function normalizeKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function slugify(name: string): string {
  return normalizeKey(name).replace(/[^a-z0-9+#.]+/g, '-').replace(/^-+|-+$/g, '');
}

export type CanonicalSkill = { id: string; label: string; category: SkillCategory; known: boolean };

/**
 * Map any skill name to its canonical id. Unknown skills keep a stable slug so
 * they still match themselves across resume, GitHub and the JD.
 */
export function canonicalizeSkill(name: string): CanonicalSkill {
  const key = normalizeKey(name);
  const id = ALIAS_TO_ID.get(key) ?? ALIAS_TO_ID.get(key.replace(/\.js$/, '')) ?? ALIAS_TO_ID.get(key.replace(/js$/, '.js'));
  if (id) {
    const def = BY_ID.get(id)!;
    return { id, label: def.label, category: def.category, known: true };
  }
  return { id: slugify(name) || key, label: name.trim(), category: 'other', known: false };
}

export function skillLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** Skills directly implied by `id` (one level — implication isn't chained, to keep credit honest). */
export function impliedSkills(id: string): string[] {
  return BY_ID.get(id)?.implies ?? [];
}

/** Every canonical label + alias, used to find skill mentions in free text. */
export function allSkillSurfaceForms(): { id: string; form: string }[] {
  const out: { id: string; form: string }[] = [];
  for (const s of SKILLS) {
    out.push({ id: s.id, form: s.label });
    for (const a of s.aliases ?? []) {
      // Very short aliases ("c", "r", "os", "ml", "cv", "tf") false-positive in prose.
      if (a.length >= 3) out.push({ id: s.id, form: a });
    }
  }
  return out;
}

// Aliases that are ordinary English words. In free text they only count in the
// tech spelling ("REST API" yes, "the rest of" no) or not at all.
// "testing" alone is A/B testing, equipment testing… ("unit testing", "test automation" still count).
const PROSE_SKIP = new Set(['next', 'networking', 'containers', 'nest', 'torch', 'rag', 'shell', 'testing']);
const PROSE_EXACT_CASE: Record<string, string> = {
  rest: 'REST', react: 'React', express: 'Express', spring: 'Spring', rails: 'Rails', spark: 'Spark',
  excel: 'Excel', node: 'Node', lambda: 'Lambda', angular: 'Angular', swift: 'Swift', rust: 'Rust', unix: 'Unix',
};

/** Find canonical skills mentioned in a block of text (word-boundary match). */
export function findSkillsInText(text: string): Set<string> {
  const found = new Set<string>();
  if (!text) return found;
  for (const { id, form } of allSkillSurfaceForms()) {
    // "Go", "C", "R" are ordinary words in prose; only the LLM/skills list can claim them.
    if (form.length < 3 && /^[a-z]+$/i.test(form)) continue;
    const lower = form.toLowerCase();
    if (PROSE_SKIP.has(lower)) continue;
    const exact = PROSE_EXACT_CASE[lower];
    const escaped = (exact ?? form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Treat + # . as word characters so "C++" / "C#" / "Node.js" match whole.
    const re = new RegExp(`(^|[^a-zA-Z0-9+#.])${escaped}(?=$|[^a-zA-Z0-9+#]|\\.(?:\\s|$))`, exact ? '' : 'i');
    if (re.test(text)) found.add(id);
  }
  return found;
}
