import { UnifiedSkill } from "@/lib/evidence/aggregator";

const techDictionary = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Golang', 'Rust', 'PHP', 'Swift', 'Kotlin', 'R', 'Scala', 'Dart', 'HTML', 'CSS', 'Bash', 'Shell',
  'React', 'React.js', 'Next.js', 'Vue', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Redux', 'Tailwind', 'Tailwind CSS', 'Sass', 'LESS', 'Material UI', 'Bootstrap', 'Webpack', 'Vite',
  'Node.js', 'Node', 'Express', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails', 'ASP.NET', 'Laravel', 'GraphQL', 'REST API', 'Apollo',
  'SQL', 'MySQL', 'PostgreSQL', 'Postgres', 'MongoDB', 'Mongo', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'SQLite', 'MariaDB', 'Supabase', 'Firebase', 'Prisma', 'TypeORM',
  'AWS', 'Amazon Web Services', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'K8s', 'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'Linux', 'Nginx',
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Computer Vision', 'NLP', 'OpenAI', 'LLM',
  'Git', 'Jira', 'Agile', 'Scrum', 'Figma', 'Jest', 'Cypress', 'Mocha', 'Selenium', 'CI/CD', 'Microservices', 'System Design'
];

export type JobMatchResult = {
  matchScore: number;
  matchedSkills: { name: string; strength: string; confidenceScore: number }[];
  missingSkills: string[];
  bonusSkills: string[];
  feedback: string;
};

export function extractRequiredSkills(jobDescription: string): string[] {
  const requiredSkills = new Set<string>();
  const text = jobDescription.toLowerCase();

  techDictionary.forEach(skill => {
    let searchPattern = skill;
    if (skill.toLowerCase() === 'node' || skill.toLowerCase() === 'node.js') searchPattern = 'Node\\.?js|Node';
    else if (skill.toLowerCase() === 'react' || skill.toLowerCase() === 'react.js') searchPattern = 'React\\.?js|React';
    else if (skill.toLowerCase() === 'vue' || skill.toLowerCase() === 'vue.js') searchPattern = 'Vue\\.?js|Vue';
    else searchPattern = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`\\b(${searchPattern})\\b`, 'i');
    if (regex.test(text)) {
      if (skill.toLowerCase() === 'node') requiredSkills.add('Node.js');
      else if (skill.toLowerCase() === 'react') requiredSkills.add('React');
      else if (skill.toLowerCase() === 'vue') requiredSkills.add('Vue');
      else if (skill.toLowerCase() === 'postgres') requiredSkills.add('PostgreSQL');
      else if (skill.toLowerCase() === 'golang') requiredSkills.add('Go');
      else requiredSkills.add(skill);
    }
  });

  return Array.from(requiredSkills);
}

export function matchEvidenceAgainstJD(jobDescription: string, evidenceSkills: UnifiedSkill[]): JobMatchResult {
  const requiredArray = extractRequiredSkills(jobDescription);

  if (requiredArray.length === 0) {
    return {
      matchScore: 0,
      matchedSkills: [],
      missingSkills: [],
      bonusSkills: [],
      feedback: "We couldn't detect any specific technical skills in this job description. Try pasting a more detailed technical JD."
    };
  }

  const matchedSkills: { name: string, strength: string, confidenceScore: number }[] = [];
  const missingSkills: string[] = [];

  requiredArray.forEach(reqSkill => {
    const found = evidenceSkills.find(s => s.name.toLowerCase() === reqSkill.toLowerCase());
    if (found) {
      matchedSkills.push({
        name: found.name,
        strength: found.strength,
        confidenceScore: found.confidenceScore
      });
    } else {
      missingSkills.push(reqSkill);
    }
  });

  const bonusSkills = evidenceSkills
    .filter(s => !requiredArray.some(req => req.toLowerCase() === s.name.toLowerCase()))
    .filter(s => s.strength === 'Strong' || s.strength === 'Moderate')
    .map(s => s.name);

  let matchScore = (matchedSkills.length / requiredArray.length) * 70;

  let strengthBonus = 0;
  matchedSkills.forEach(skill => {
    if (skill.strength === 'Strong') strengthBonus += (30 / requiredArray.length);
    else if (skill.strength === 'Moderate') strengthBonus += (15 / requiredArray.length);
  });

  matchScore = Math.min(100, Math.round(matchScore + strengthBonus));

  let feedback = `You meet ${matchedSkills.length} out of ${requiredArray.length} technical requirements. `;
  if (matchScore >= 80) feedback += "You are a highly competitive candidate for this role!";
  else if (matchScore >= 60) feedback += "You are a strong match, but you may need to brush up on a few missing skills.";
  else feedback += "This role requires significant upskilling in several areas you haven't demonstrated yet.";

  return { matchScore, matchedSkills, missingSkills, bonusSkills, feedback };
}
