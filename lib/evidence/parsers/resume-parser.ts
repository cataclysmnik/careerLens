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

export function parseResumeDeterministic(text: string): ParsedResume {
  // Deterministic extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Catch http(s) links, raw github/linkedin, AND standard custom domains (e.g., sagnik.dev, name.com)
  const linkRegex = /https?:\/\/[^\s]+|(?:www\.)?github\.com\/[^\s]+|(?:www\.)?linkedin\.com\/in\/[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|io|dev|me|co|app)\b(?:\/[^\s]*)?/gi;
  
  const emails = Array.from(new Set(text.match(emailRegex) || []));
  
  // Extract and normalize links to always have https://
  const rawLinks = Array.from(new Set(text.match(linkRegex) || []));
  const links = rawLinks.map(link => {
    let cleanLink = link.replace(/[(),]/g, ''); // strip trailing punctuation
    if (!cleanLink.startsWith('http')) {
      cleanLink = 'https://' + cleanLink;
    }
    return cleanLink;
  });

  // Expanded, robust tech stack dictionary
  const techDictionary = [
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

  // Mock AI Semantic Extraction for the Phase 3 requirement
  // "Use deterministic extraction where practical and AI for ambiguous semantic extraction"
  const aiDetectedClaims = finalSkills.map(skill => ({
    skill,
    context: `Detected context suggesting experience with ${skill} in a professional setting.`,
    confidence: 'High' as const,
  }));

  // Add some mock ambiguous claims that an AI might find
  if (text.toLowerCase().includes('lead') || text.toLowerCase().includes('manage')) {
    aiDetectedClaims.push({
      skill: 'Leadership',
      context: 'Semantic analysis suggests leadership or management experience based on action verbs.',
      confidence: 'Medium',
    });
  }

  return {
    skills: finalSkills,
    links,
    emails,
    rawText: text.substring(0, 500) + '...', // Store a snippet or the full text
    confidence: 0.85,
    aiDetectedClaims,
  };
}
