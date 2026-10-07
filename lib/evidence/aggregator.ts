// lib/evidence/aggregator.ts
import type { ParsedResume } from './parsers/resume-parser';
import type { GithubSkillEvidence } from '../github/analyzer';
import type { PortfolioEvidence } from '../portfolio/analyzer';
import type { CodingProfileSummary } from '../coding/analyzer';

export type UnifiedSkill = {
  name: string;
  mentionedInResume: boolean;
  githubRepoCount: number;
  hasGithubTests: boolean;
  hasGithubDocker: boolean;
  isDeployed: boolean;
  confidenceScore: number; // 0 to 1
  strength: 'Strong' | 'Moderate' | 'Weak';
  githubRepositories: { name: string; description: string | null }[];
};

export type UnifiedEvidence = {
  skills: UnifiedSkill[];
  hasPortfolio: boolean;
  hasCaseStudies: boolean;
  hasGithub: boolean;
  totalGithubRepos: number;
  contactInfo: {
    emails: string[];
    links: string[];
  };
  // Optional so evidence saved before coding profiles existed still parses.
  coding?: CodingProfileSummary | null;
};

export function aggregateEvidence(
  resume: ParsedResume | null,
  github: { totalRepos: number, evidence: GithubSkillEvidence[] } | null,
  portfolio: PortfolioEvidence | null,
  coding: CodingProfileSummary | null = null
): UnifiedEvidence {
  const skillMap = new Map<string, UnifiedSkill>();

  // 1. Process Resume Skills
  if (resume?.skills) {
    resume.skills.forEach(skill => {
      skillMap.set(skill.toLowerCase(), {
        name: skill,
        mentionedInResume: true,
        githubRepoCount: 0,
        hasGithubTests: false,
        hasGithubDocker: false,
        isDeployed: false,
        confidenceScore: 0.3, // Baseline for just being on resume
        strength: 'Weak',
        githubRepositories: []
      });
    });
  }

  // 2. Process GitHub Evidence
  if (github?.evidence) {
    github.evidence.forEach(ghSkill => {
      const key = ghSkill.skill.toLowerCase();
      const existing = skillMap.get(key) || {
        name: ghSkill.skill,
        mentionedInResume: false,
        githubRepoCount: 0,
        hasGithubTests: false,
        hasGithubDocker: false,
        isDeployed: false,
        confidenceScore: 0,
        strength: 'Weak',
        githubRepositories: []
      };

      existing.githubRepoCount = ghSkill.repoCount;
      // Deduplicate by name
      const allRepos = [...existing.githubRepositories, ...(ghSkill.repositories || [])];
      existing.githubRepositories = allRepos.filter((r, idx, self) => 
        idx === self.findIndex((t) => t.name === r.name)
      );
      existing.hasGithubTests = ghSkill.hasTests;
      existing.hasGithubDocker = ghSkill.hasDocker;
      existing.isDeployed = ghSkill.isDeployed || existing.isDeployed;
      
      // Calculate unified confidence
      let confidence = existing.mentionedInResume ? 0.3 : 0.0;
      confidence += (ghSkill.repoCount * 0.1);
      if (ghSkill.hasTests) confidence += 0.2;
      if (ghSkill.isDeployed) confidence += 0.2;
      
      existing.confidenceScore = Math.min(confidence, 1.0);
      
      if (existing.confidenceScore >= 0.8) existing.strength = 'Strong';
      else if (existing.confidenceScore >= 0.5) existing.strength = 'Moderate';
      else existing.strength = 'Weak';

      skillMap.set(key, existing);
    });
  }

  // 3. Process Portfolio
  if (portfolio?.detectedFrameworks) {
    portfolio.detectedFrameworks.forEach(fw => {
      const key = fw.toLowerCase();
      const existing = skillMap.get(key) || {
        name: fw,
        mentionedInResume: false,
        githubRepoCount: 0,
        hasGithubTests: false,
        hasGithubDocker: false,
        isDeployed: true, // If it's on their live portfolio, it's deployed
        confidenceScore: 0.5, 
        strength: 'Moderate',
        githubRepositories: []
      };
      
      existing.isDeployed = true;
      existing.confidenceScore = Math.min(existing.confidenceScore + 0.3, 1.0);
      if (existing.confidenceScore >= 0.8) existing.strength = 'Strong';
      else if (existing.confidenceScore >= 0.5) existing.strength = 'Moderate';
      
      skillMap.set(key, existing);
    });
  }

  return {
    skills: Array.from(skillMap.values()).sort((a, b) => b.confidenceScore - a.confidenceScore),
    hasPortfolio: !!portfolio,
    hasCaseStudies: portfolio?.hasCaseStudies || false,
    hasGithub: !!github,
    totalGithubRepos: github?.totalRepos || 0,
    contactInfo: {
      emails: resume?.emails || [],
      links: resume?.links || []
    },
    coding
  };
}
