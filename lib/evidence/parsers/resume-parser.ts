// lib/evidence/parsers/resume-parser.ts

export type ParsedResume = {
  skills: string[];
  links: string[];
  emails: string[];
  rawText: string;
  confidence: number;
  aiDetectedClaims: {
    skill: string;
    context: string;
    confidence: 'High' | 'Medium' | 'Low';
  }[];
};

// Expanded, robust tech stack dictionary
export const techDictionary = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Golang', 'Rust', 'PHP', 'Swift', 'Kotlin', 'R', 'Scala', 'Dart', 'HTML', 'CSS', 'Bash', 'Shell',
  // Frontend
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Redux', 'Tailwind', 'Tailwind CSS', 'Sass', 'LESS', 'Material UI', 'Bootstrap', 'Webpack', 'Vite',
  // Backend
  'Node.js', 'Node', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails', 'ASP.NET', 'Laravel', 'GraphQL', 'REST API', 'Apollo',
  // Databases
  'SQL', 'MySQL', 'PostgreSQL', 'Postgres', 'MongoDB', 'Mongo', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'SQLite', 'MariaDB', 'Supabase', 'Firebase', 'Prisma', 'TypeORM',
  // DevOps & Cloud
  'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Linux', 'Nginx',
  // AI / ML / Data
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Computer Vision', 'NLP', 'OpenAI', 'LLM',
  // Tools / Methodologies
  'Git', 'Jira', 'Agile', 'Scrum', 'Figma', 'Jest', 'Cypress', 'Mocha', 'Selenium', 'CI/CD', 'Microservices', 'System Design'
];

// Bare email-provider domains are never a candidate's link.
const EMAIL_PROVIDERS = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|protonmail|proton|rediffmail|ymail|aol|zoho)\.(com|me|in|co\.in)$/i;

/** host + path, lower-cased, without protocol, "www." or a trailing slash: the identity of a link. */
function linkKey(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/#?]+$/, '');
}

/**
 * Normalize links to https://, strip punctuation picked up from the text, drop
 * email-provider domains, duplicates (www / no www, trailing slash) and links
 * that are only a cut-off start of another link.
 */
export function cleanLinks(raw: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const link of raw) {
    let url = link.trim().replace(/^[<(["']+/, '').replace(/[)\]>"'.,;:!]+$/, '');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const key = linkKey(url);
    if (!key.includes('.') || EMAIL_PROVIDERS.test(key)) continue;
    if (!byKey.has(key)) byKey.set(key, url);
  }
  const keys = [...byKey.keys()];
  return keys
    .filter((k) => !keys.some((other) => k.includes('/') && other.length > k.length && other.startsWith(k) && other[k.length] !== '/'))
    .map((k) => byKey.get(k)!);
}

export function parseResumeDeterministic(text: string): ParsedResume {
  // Deterministic extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Catch http(s) links, raw github/linkedin, AND standard custom domains with subdomains (e.g., sagnik.vercel.app, sagnik.dev)
  const linkRegex = /https?:\/\/[^\s]+|(?:www\.)?github\.com\/[^\s]+|(?:www\.)?linkedin\.com\/in\/[^\s]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|me|co|app)\b(?:\/[^\s]*)?|[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|me|co|app)\b(?:\/[^\s]*)?/gi;
  
  const emails = Array.from(new Set(text.match(emailRegex) || []));

  // Emails out first, or "name@gmail.com" yields a "gmail.com" link. Then rejoin
  // links that PDF text extraction split across lines ("linkedin.com/in/abhiram-\nanil-123").
  const linkText = text
    .replace(emailRegex, ' ')
    .replace(/((?:https?:\/\/|github\.com\/|linkedin\.com\/)\S*[-_])\s*\n\s*(?=[A-Za-z0-9])/gi, '$1');
  const links = cleanLinks(linkText.match(linkRegex) || []);

  const detectedSkills = new Set<string>();

  techDictionary.forEach(skill => {
    // Handle variations (e.g., node vs node.js, react vs react.js)
    let searchPattern = skill;
    if (skill.toLowerCase() === 'node' || skill.toLowerCase() === 'node.js') searchPattern = 'Node\\.?js|Node';
    else if (skill.toLowerCase() === 'react' || skill.toLowerCase() === 'react.js') searchPattern = 'React\\.?js|React';
    else if (skill.toLowerCase() === 'vue' || skill.toLowerCase() === 'vue.js') searchPattern = 'Vue\\.?js|Vue';
    else {
      // Escape special chars for standard words
      searchPattern = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Word boundaries to prevent "Go" matching inside "Google"
    const regex = new RegExp(`\\b(${searchPattern})\\b`, 'i');
    if (regex.test(text)) {
      // Normalize output to the standard dictionary name
      if (skill.toLowerCase() === 'node') detectedSkills.add('Node.js');
      else if (skill.toLowerCase() === 'react') detectedSkills.add('React');
      else if (skill.toLowerCase() === 'vue') detectedSkills.add('Vue');
      else if (skill.toLowerCase() === 'postgres') detectedSkills.add('PostgreSQL');
      else if (skill.toLowerCase() === 'golang') detectedSkills.add('Go');
      else detectedSkills.add(skill);
    }
  });

  const finalSkills = Array.from(detectedSkills);

  // Semantic extraction (experience, projects, academics) is done by the LLM in
  // lib/llm/extract-resume.ts; this deterministic pass makes no AI claims.
  const aiDetectedClaims: ParsedResume['aiDetectedClaims'] = [];

  return {
    skills: finalSkills,
    links,
    emails,
    rawText: text.substring(0, 500) + '...', // Store a snippet or the full text
    confidence: 0.85,
    aiDetectedClaims,
  };
}
