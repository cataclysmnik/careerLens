// lib/github/analyzer.ts
import { GithubRepo } from './api';

export type GithubSkillEvidence = {
  skill: string;
  repoCount: number;
  recentProjects: number;
  isDeployed: boolean;
  hasTests: boolean;
  hasDocker: boolean;
  confidence: number;
  strength: 'Strong' | 'Moderate' | 'Weak';
};

export function analyzeGithubProfile(repos: GithubRepo[]): GithubSkillEvidence[] {
  const skillMap = new Map<string, GithubSkillEvidence>();

  const initializeSkill = (skill: string) => {
    if (!skillMap.has(skill)) {
      skillMap.set(skill, {
        skill,
        repoCount: 0,
        recentProjects: 0,
        isDeployed: false,
        hasTests: false,
        hasDocker: false,
        confidence: 0,
        strength: 'Weak'
      });
    }
    return skillMap.get(skill)!;
  };

  const sixMonthsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);

  repos.forEach(repo => {
    const isRecent = new Date(repo.updated_at) > sixMonthsAgo;
    
    // Extract skills from language and topics
    const repoSkills = new Set<string>();
    if (repo.language) repoSkills.add(repo.language);
    repo.topics.forEach(topic => repoSkills.add(topic));

    // Analyze infrastructure evidence
    const hasDocker = repo.topics.includes('docker') || repo.name.includes('docker');
    const hasTests = repo.topics.includes('jest') || repo.topics.includes('testing') || repo.name.includes('test');
    const isDeployed = repo.topics.includes('vercel') || repo.topics.includes('aws') || repo.description?.toLowerCase().includes('deployed');

    repoSkills.forEach(skillStr => {
      // Normalize common skill names
      let skill = skillStr.toLowerCase();
      if (skill === 'javascript' || skill === 'nodejs') skill = 'JavaScript/Node';
      if (skill === 'typescript' || skill === 'react' || skill === 'nextjs') skill = 'React/TypeScript';

      const evidence = initializeSkill(skill);
      evidence.repoCount += 1;
      if (isRecent) evidence.recentProjects += 1;
      if (isDeployed) evidence.isDeployed = true;
      if (hasTests) evidence.hasTests = true;
      if (hasDocker) evidence.hasDocker = true;
    });
  });

  // Calculate confidence and strength
  const results = Array.from(skillMap.values()).map(evidence => {
    let score = 0;
    if (evidence.repoCount >= 3) score += 30;
    else if (evidence.repoCount > 0) score += 15;

    if (evidence.recentProjects >= 1) score += 20;
    if (evidence.isDeployed) score += 20;
    if (evidence.hasTests) score += 15;
    if (evidence.hasDocker) score += 15;

    evidence.confidence = Math.min(Math.round(score) / 100, 0.95);
    
    if (evidence.confidence > 0.8) evidence.strength = 'Strong';
    else if (evidence.confidence > 0.5) evidence.strength = 'Moderate';
    else evidence.strength = 'Weak';

    return evidence;
  });

  // Return top 5 strongest signals
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
