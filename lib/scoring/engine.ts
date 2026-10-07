// lib/scoring/engine.ts
import { UnifiedEvidence, UnifiedSkill } from '../evidence/aggregator';

export type ScoringResult = {
  overallScore: number;
  categories: {
    title: string;
    score: number;
  }[];
  evidenceStrength: number;
  strengths: { title: string; description: string }[];
  gaps: { title: string; description: string }[];
  actions: { title: string; description: string; impact: string }[];
};

export function calculateReadiness(evidence: UnifiedEvidence): ScoringResult {
  let technicalScore = 0;
  let projectQuality = 0;
  let problemSolving = 0;
  let engineeringPractices = 0;
  let portfolioStrength = 0;
  let professionalPresence = 0;
  let experience = 0;

  const strengths: { title: string; description: string }[] = [];
  const gaps: { title: string; description: string }[] = [];
  const actions: { title: string; description: string; impact: string }[] = [];

  // --- Scoring Logic ---

  // Technical Skills
  const strongSkills = evidence.skills.filter(s => s.strength === 'Strong');
  if (strongSkills.length >= 3) technicalScore = 90;
  else if (strongSkills.length > 0) technicalScore = 75;
  else if (evidence.skills.length > 0) technicalScore = 50;
  else technicalScore = 20;

  // Engineering Practices (Tests & Docker)
  const testedSkills = evidence.skills.filter(s => s.hasGithubTests);
  const dockerSkills = evidence.skills.filter(s => s.hasGithubDocker);
  if (testedSkills.length > 0) engineeringPractices += 50;
  if (dockerSkills.length > 0) engineeringPractices += 30;
  if (evidence.hasGithub && testedSkills.length === 0) engineeringPractices += 10; // Baseline

  // Portfolio & Projects
  if (evidence.hasPortfolio) {
    portfolioStrength += 50;
    if (evidence.hasCaseStudies) portfolioStrength += 50;
    else portfolioStrength += 20;
  }
  
  const deployedSkills = evidence.skills.filter(s => s.isDeployed);
  if (deployedSkills.length >= 2) projectQuality = 90;
  else if (deployedSkills.length === 1) projectQuality = 60;
  else projectQuality = 30;

  // Professional Presence
  if (evidence.hasGithub) professionalPresence += 40;
  if (evidence.hasPortfolio) professionalPresence += 40;
  if (evidence.contactInfo.links.length > 0) professionalPresence += 20;

  // Experience & Problem Solving (Heuristics based on total repo volume and case studies)
  experience = Math.min(evidence.totalGithubRepos * 5, 80) + (evidence.hasCaseStudies ? 20 : 0);
  problemSolving = evidence.hasCaseStudies ? 95 : 60;

  // Overall Score
  const categories = [
    { title: "Technical Skills", score: technicalScore },
    { title: "Project Quality", score: projectQuality },
    { title: "Problem Solving", score: problemSolving },
    { title: "Engineering Practices", score: engineeringPractices },
    { title: "Portfolio Strength", score: portfolioStrength },
    { title: "Professional Presence", score: professionalPresence },
    { title: "Experience", score: experience },
  ];

  const overallScore = Math.round(
    categories.reduce((acc, cat) => acc + cat.score, 0) / categories.length
  );

  // --- Dynamic Strengths, Gaps, and Actions ---
  if (strongSkills.length > 0) {
    strengths.push({
      title: "Strong Technical Foundation",
      description: `Verified deep experience in ${strongSkills.map(s => s.name).join(', ')}.`
    });
  }

  if (deployedSkills.length > 0) {
    strengths.push({
      title: "Proven Deployment Ability",
      description: "You have live, deployed projects demonstrating full-cycle development."
    });
  }

  if (!evidence.hasPortfolio) {
    gaps.push({ title: "No Portfolio Website", description: "Missing a centralized hub to showcase your work." });
    actions.push({ title: "Build a Portfolio Site", description: "Create a simple Next.js or HTML/CSS site to showcase your top 3 projects.", impact: "High Impact" });
  } else if (!evidence.hasCaseStudies) {
    gaps.push({ title: "Lacking Case Studies", description: "Portfolio lacks detailed explanations of your technical decisions." });
    actions.push({ title: "Write a Technical Case Study", description: "Add a 'Problem/Solution' breakdown to your best portfolio project.", impact: "High Impact" });
  }

  if (testedSkills.length === 0) {
    gaps.push({ title: "No Verifiable Testing", description: "Could not detect Jest, Cypress, or other testing frameworks in your public code." });
    actions.push({ title: "Add Automated Tests", description: "Write basic unit tests for one of your main GitHub repositories.", impact: "Medium Impact" });
  }

  if (evidence.totalGithubRepos < 3) {
    gaps.push({ title: "Light GitHub Activity", description: "Not enough public repositories to confidently verify skills." });
    actions.push({ title: "Publish More Code", description: "Open source some of your local projects or contribute to public repos.", impact: "Medium Impact" });
  }

  // Evidence Strength (How much data did we have to work with?)
  let evidenceStrength = 20;
  if (evidence.skills.length > 0) evidenceStrength += 30;
  if (evidence.hasGithub) evidenceStrength += 30;
  if (evidence.hasPortfolio) evidenceStrength += 20;

  return {
    overallScore,
    categories,
    evidenceStrength,
    strengths,
    gaps,
    actions
  };
}
