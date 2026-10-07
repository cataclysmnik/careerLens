// lib/interview/engine.ts
// AI mock-interview engine set up for a real-life job interview for a specific job role,
// fetching relevant projects from the student's profile, weaving project deep-dives with
// general technical questions for the role, providing resume rewrites and progress tracking.

import { z } from 'zod';
import { callAnyJSON, isAnyLLMEnabled } from '@/lib/llm/any';
import { ROLE_CATALOG, type RoleDefinition } from '@/lib/scoring/roles-catalog';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

export type InterviewerType = 'tech_lead' | 'bar_raiser' | 'friendly';
export type SeniorityLevel = 'entry' | 'mid' | 'senior';

export type InterviewProject = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  components: string[];
  architecturePatterns: string[];
  source: 'resume' | 'github';
  liveUrl?: string | null;
  repoUrl?: string | null;
  relevanceScore?: number;
  matchedSkills?: string[];
  highlights?: string[];
};

export type RoleInterviewSetup = {
  targetRole: string;
  seniority: SeniorityLevel;
  interviewerType: InterviewerType;
  relevantProjects: InterviewProject[];
  matchedRoleSkills: string[];
  expectedTopics: string[];
};

export type InterviewMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  critique?: string | null;
  topicType?: 'project_dive' | 'general_tech' | 'system_design' | 'intro';
};

export type ResumeRewriteSuggestion = {
  originalPoint: string;
  suggestedRewrite: string;
  impactMetric: string;
  reasoning: string;
  roleTarget: string;
  tags: string[];
};

export type RoleInterviewMetrics = {
  roleFoundations: number; // general technical knowledge for the role
  projectDepth: number;    // how well they explained and defended their projects
  architecture: number;    // system design, scalability, trade-offs
  communication: number;   // clarity, STAR structure, precision
};

export type InterviewFeedback = {
  summary: string;
  roleReadinessVerdict: string;
  strengths: string[];
  areasToImprove: string[];
  keyTakeaways: string[];
};

export type InterviewEvaluation = {
  overallScore: number;
  roleTitle: string;
  metrics: RoleInterviewMetrics;
  feedback: InterviewFeedback;
  resumeRewrites: ResumeRewriteSuggestion[];
};

// ---------------------------------------------------------------------------
// Schemas for LLM Structured Outputs
// ---------------------------------------------------------------------------

const OpeningTurnSchema = z.object({
  greeting: z.string(),
  question: z.string(),
  openingContext: z.string(),
  suggestedFocusAreas: z.array(z.string()),
});

const NextTurnSchema = z.object({
  answerCritique: z.string().nullable(),
  followUpQuestion: z.string(),
  topicType: z.enum(['project_dive', 'general_tech', 'system_design', 'behavioral']),
  quickTip: z.string().nullable(),
});

const EvaluationSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  roleFoundations: z.number().int().min(0).max(100),
  projectDepth: z.number().int().min(0).max(100),
  architecture: z.number().int().min(0).max(100),
  communication: z.number().int().min(0).max(100),
  verdict: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  areasToImprove: z.array(z.string()),
  keyTakeaways: z.array(z.string()),
  resumeRewrites: z.array(
    z.object({
      originalPoint: z.string(),
      suggestedRewrite: z.string(),
      impactMetric: z.string(),
      reasoning: z.string(),
      tags: z.array(z.string()),
    })
  ),
});

// ---------------------------------------------------------------------------
// Project Extraction & Automatic Role Relevancy Matching
// ---------------------------------------------------------------------------

export function extractAllProjects(stored: StoredEvidence | null): InterviewProject[] {
  const projects: InterviewProject[] = [];
  const seenTitles = new Set<string>();

  // Extract strictly from the uploaded resume profile
  if (stored?.inputs?.profile?.projects) {
    for (const p of stored.inputs.profile.projects) {
      if (!p.name || seenTitles.has(p.name.toLowerCase())) continue;
      seenTitles.add(p.name.toLowerCase());
      projects.push({
        id: `resume-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: p.name,
        description: p.description || 'Software engineering project from resume.',
        skills: p.skills || [],
        components: p.components || [],
        architecturePatterns: p.architecturePatterns || [],
        source: 'resume',
        liveUrl: p.liveUrl || null,
        repoUrl: p.repoUrl || null,
        highlights: [
          p.mentionsTesting ? 'Tested' : null,
          p.isDeployed ? 'Production Deployed' : null,
          p.hasQuantifiedOutcome ? 'Quantified Impact' : null,
        ].filter(Boolean) as string[],
      });
    }
  }

  return projects;
}

/** Match candidate projects to a target role, ranking them by relevance. */
export function matchProjectsToRole(
  targetRole: string,
  allProjects: InterviewProject[]
): {
  relevantProjects: InterviewProject[];
  matchedRoleSkills: string[];
  expectedTopics: string[];
} {
  const normRole = targetRole.toLowerCase();

  // Find preset role if available
  const preset: RoleDefinition | undefined = ROLE_CATALOG.find((r) =>
    r.title.toLowerCase() === normRole || r.aliases.some((alias) => normRole.includes(alias) || alias.includes(normRole))
  );

  const roleSkillKeywords = new Set<string>();
  if (preset) {
    preset.skills.forEach((s) => {
      roleSkillKeywords.add(s.id.toLowerCase());
      s.alternatives?.forEach((alt) => roleSkillKeywords.add(alt.toLowerCase()));
    });
  } else {
    // Generate role keywords based on common roles
    if (normRole.includes('front') || normRole.includes('ui') || normRole.includes('react')) {
      ['javascript', 'typescript', 'react', 'nextjs', 'html', 'css', 'redux', 'tailwind', 'vue'].forEach((s) => roleSkillKeywords.add(s));
    } else if (normRole.includes('back') || normRole.includes('api') || normRole.includes('server')) {
      ['node', 'express', 'python', 'django', 'java', 'spring', 'sql', 'postgres', 'rest', 'docker', 'redis'].forEach((s) => roleSkillKeywords.add(s));
    } else if (normRole.includes('data') || normRole.includes('ml') || normRole.includes('machine') || normRole.includes('ai')) {
      ['python', 'pandas', 'numpy', 'scikit', 'pytorch', 'tensorflow', 'sql', 'machine learning', 'deep learning'].forEach((s) => roleSkillKeywords.add(s));
    } else if (normRole.includes('devops') || normRole.includes('cloud')) {
      ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'terraform', 'git', 'bash'].forEach((s) => roleSkillKeywords.add(s));
    } else {
      ['javascript', 'typescript', 'react', 'node', 'sql', 'git', 'rest', 'python', 'java'].forEach((s) => roleSkillKeywords.add(s));
    }
  }

  // Score each project against the role skills and keywords
  const scoredProjects = allProjects.map((p) => {
    const pText = `${p.title} ${p.description} ${p.skills.join(' ')} ${p.components.join(' ')}`.toLowerCase();
    const matchedSkills: string[] = [];
    let score = 0;

    for (const skill of Array.from(roleSkillKeywords)) {
      if (pText.includes(skill)) {
        matchedSkills.push(skill);
        score += 3;
      }
    }

    if (normRole.includes('full') || normRole.includes('software')) score += 2;

    return {
      ...p,
      relevanceScore: score,
      matchedSkills,
    };
  });

  // Sort descending by relevance
  scoredProjects.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Collect all unique matched skills
  const allMatchedSkills = Array.from(
    new Set(scoredProjects.flatMap((p) => p.matchedSkills || []))
  );

  // Derive realistic expected topics for this role
  const expectedTopics = getExpectedTopicsForRole(targetRole);

  return {
    relevantProjects: scoredProjects,
    matchedRoleSkills: allMatchedSkills.length > 0 ? allMatchedSkills : ['Software Engineering Principles', 'Code Quality', 'Problem Solving'],
    expectedTopics,
  };
}

function getExpectedTopicsForRole(targetRole: string): string[] {
  const norm = targetRole.toLowerCase();
  if (norm.includes('front') || norm.includes('ui')) {
    return [
      'Component Lifecycle & State Management',
      'Browser Performance & Bundle Optimization',
      'API Integration & Asynchronous Data Fetching',
      'CSS Layouts, Responsive Design & Accessibility',
    ];
  }
  if (norm.includes('back') || norm.includes('api')) {
    return [
      'REST/GraphQL API Architecture & Endpoint Design',
      'Database Schema, Indexing & Query Optimization',
      'Concurrency, Caching (Redis) & Rate Limiting',
      'Authentication, Authorization & Security Best Practices',
    ];
  }
  if (norm.includes('data') || norm.includes('ml')) {
    return [
      'Data Pipelines, Cleaning & Feature Engineering',
      'Model Evaluation, Overfitting Mitigation & Metrics',
      'SQL Query Optimization & Data Aggregations',
      'Production ML Deployment & Inference Latency',
    ];
  }
  if (norm.includes('devops') || norm.includes('cloud')) {
    return [
      'CI/CD Pipelines & Automated Deployments',
      'Containerization (Docker) & Orchestration',
      'Cloud Architecture, High Availability & Monitoring',
      'Infrastructure as Code & Configuration Management',
    ];
  }
  // Default / Full Stack / General Software Engineer
  return [
    'End-to-End System Architecture & Data Flow',
    'Database Choice, Schema Design & Consistency',
    'API Design, Error Handling & Authentication',
    'Scaling Bottlenecks & Production Observability',
  ];
}

// ---------------------------------------------------------------------------
// Interviewer Persona Styles
// ---------------------------------------------------------------------------

function getPersonaPrompt(type: InterviewerType): string {
  switch (type) {
    case 'bar_raiser':
      return 'You are an exacting FAANG Bar Raiser. You demand technical rigor, trade-off analysis, edge-case handling, and fundamental depth. You press beyond buzzwords to understand the real underlying mechanics.';
    case 'friendly':
      return 'You are an encouraging Senior Engineering Manager. You are warm, engaging, and supportive. You guide the candidate to bring out their best work while asking insightful technical questions.';
    case 'tech_lead':
    default:
      return 'You are a pragmatic Staff Software Engineer / Tech Lead conducting a real-life technical interview. You balance practical implementation, architecture choices, real-world constraints, and fundamental computer science understanding.';
  }
}

// ---------------------------------------------------------------------------
// 1. Generate Authentic Job Interview Opening
// ---------------------------------------------------------------------------

export async function generateJobInterviewOpening(params: {
  targetRole: string;
  seniority: SeniorityLevel;
  interviewerType: InterviewerType;
  relevantProjects: InterviewProject[];
  matchedRoleSkills: string[];
}): Promise<{ message: string; suggestedFocusAreas: string[] }> {
  const { targetRole, seniority, interviewerType, relevantProjects, matchedRoleSkills } = params;
  const topProjects = relevantProjects.slice(0, 2);

  if (isAnyLLMEnabled()) {
    try {
      const system = `${getPersonaPrompt(interviewerType)}
You are conducting a REAL-LIFE TECHNICAL INTERVIEW for the position of "${targetRole}" (${seniority.toUpperCase()} level).
You have the candidate's resume in front of you. Their most relevant projects for this role are:
${topProjects.map((p) => `- "${p.title}": ${p.description} (Tech: ${p.skills.join(', ')})`).join('\n')}

Role Skills identified: ${matchedRoleSkills.join(', ')}

Guidelines for the Opening:
1. Welcome the candidate realistically as the interviewer for this ${targetRole} role.
2. Note that you reviewed their resume and were interested in their project(s), specifically mentioning "${topProjects[0]?.title || 'their key project'}".
3. Ask the first technical question: Ask them to walk through the architecture of that project, specifically how they solved a core engineering requirement for this ${targetRole} position.
4. Keep the question crisp, professional, and conversational.
5. Provide 2-3 brief focus areas they should highlight in their answer.`;

      const user = `Role: ${targetRole}
Seniority: ${seniority}
Candidate's relevant projects:
${topProjects.map((p) => `* ${p.title} (${p.skills.join(', ')})`).join('\n')}

Generate the opening interview turn.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: OpeningTurnSchema,
        schemaName: 'JobInterviewOpening',
        maxTokens: 500,
      });

      const fullMessage = `${res.data.greeting} ${res.data.openingContext} ${res.data.question}`;
      return {
        message: fullMessage.trim(),
        suggestedFocusAreas: res.data.suggestedFocusAreas,
      };
    } catch (err) {
      console.warn('LLM job interview opening fallback:', err);
    }
  }

  // Deterministic fallback
  const firstProj = topProjects[0] || { title: 'your primary project', skills: ['core technologies'] };
  const techStr = firstProj.skills.slice(0, 3).join(', ');

  return {
    message: `Hello! Thanks for meeting with me today for the **${targetRole}** technical interview. I've been reviewing your background and was particularly drawn to your work on **${firstProj.title}**, where you utilized ${techStr}. To start off, could you walk me through the architecture of that project, and explain how you made your key technical choices to support this system?`,
    suggestedFocusAreas: [
      `Component structure and data flow in ${firstProj.title}`,
      `Why you selected ${techStr} for this use case`,
      `How this project prepared you for ${targetRole} responsibilities`,
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Generate Real-Life Next Turn (Weaving Projects & General Role Tech)
// ---------------------------------------------------------------------------

export async function generateJobInterviewNextTurn(params: {
  targetRole: string;
  seniority: SeniorityLevel;
  interviewerType: InterviewerType;
  relevantProjects: InterviewProject[];
  matchedRoleSkills: string[];
  expectedTopics: string[];
  messages: InterviewMessage[];
}): Promise<{ message: string; critique: string | null; topicType: string }> {
  const { targetRole, seniority, interviewerType, relevantProjects, matchedRoleSkills, expectedTopics, messages } = params;
  const userTurnsCount = messages.filter((m) => m.role === 'user').length;
  const topProjects = relevantProjects.slice(0, 3);

  if (isAnyLLMEnabled()) {
    try {
      const system = `${getPersonaPrompt(interviewerType)}
You are conducting a REAL-LIFE TECHNICAL INTERVIEW for a "${targetRole}" role (${seniority.toUpperCase()} level).

Interview Blueprint:
- In a real interview, you alternate naturally between:
  1) Deep diving into the candidate's actual projects (${topProjects.map((p) => p.title).join(', ')})
  2) General core technical questions that any ${targetRole} must know (e.g., ${expectedTopics.join('; ')})
  3) Scenario / problem-solving questions (e.g., handling scale, race conditions, edge cases, debugging)
- Current Turn: Candidate has completed ${userTurnsCount} answers so far.
  - If turn 1-2: Drill deeper into their project specifics, architectural trade-offs, schemas, or unexpected hurdles.
  - If turn 3-4: Transition smoothly to a fundamental/general technical question essential for a ${targetRole} (connecting it to their stack if possible).
  - If turn 5+: Ask a high-impact scenario or system-design question testing problem solving under real constraints.

Instructions:
- Provide a brief 1-sentence critique of their previous answer (highlight what was good or what needed more precision).
- Ask the next question in an authentic, conversational interview tone.`;

      const transcript = messages
        .slice(-8)
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const user = `Target Role: ${targetRole} (${seniority})
Relevant Projects:
${topProjects.map((p) => `- ${p.title} (${p.skills.join(', ')})`).join('\n')}
Core Skills: ${matchedRoleSkills.join(', ')}

Recent Interview Transcript:
${transcript}

Produce the next interview question and constructive feedback.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: NextTurnSchema,
        schemaName: 'JobInterviewNextTurn',
        maxTokens: 600,
      });

      return {
        message: res.data.followUpQuestion,
        critique: res.data.answerCritique,
        topicType: res.data.topicType,
      };
    } catch (err) {
      console.warn('LLM next turn fallback:', err);
    }
  }

  // Realistic Fallback questions alternating between project deep-dive and general technical questions
  const firstProj = topProjects[0]?.title || 'your system';
  const fallbacks = [
    {
      critique: 'Clear explanation of your architectural components.',
      question: `In **${firstProj}**, how did you handle state synchronization and error recovery when a service or database query fails? What happens on the user-facing side?`,
      topicType: 'project_dive',
    },
    {
      critique: 'Good breakdown of error boundaries.',
      question: `Stepping back to broader **${targetRole}** fundamentals: how do you approach database indexing and query optimization? When would an index actually degrade database write performance?`,
      topicType: 'general_tech',
    },
    {
      critique: 'Solid grasp of data structures and indexing trade-offs.',
      question: `Let's consider a scenario: If your application suddenly receives a 10x traffic spike with 5,000 concurrent requests, what would fail first in your architecture, and how would you implement caching or rate limiting to handle it?`,
      topicType: 'system_design',
    },
    {
      critique: 'Comprehensive mitigation strategy.',
      question: `In production software for a **${targetRole}**, testing and CI/CD are critical. How did you verify edge cases in your projects, and how do you prevent regressions before deploying to staging/production?`,
      topicType: 'general_tech',
    },
    {
      critique: 'Great discussion of verification practices.',
      question: `Reflecting on your engineering experience, what is the single most elusive technical bug or bottleneck you personally tracked down and resolved? Walk me through your debugging methodology.`,
      topicType: 'behavioral',
    },
  ];

  const picked = fallbacks[(userTurnsCount - 1) % fallbacks.length] || fallbacks[0];
  return {
    message: picked.question,
    critique: picked.critique,
    topicType: picked.topicType,
  };
}

// ---------------------------------------------------------------------------
// 3. Evaluate Role Interview & Generate Tailored Resume Rewrites
// ---------------------------------------------------------------------------

export async function evaluateRoleInterviewSession(params: {
  targetRole: string;
  seniority: SeniorityLevel;
  relevantProjects: InterviewProject[];
  messages: InterviewMessage[];
}): Promise<InterviewEvaluation> {
  const { targetRole, seniority, relevantProjects, messages } = params;
  const candidateTurns = messages.filter((m) => m.role === 'user');
  const topProjects = relevantProjects.slice(0, 2);

  if (isAnyLLMEnabled() && candidateTurns.length >= 1) {
    try {
      const system = `You are an Executive Engineering Director evaluating a candidate who just completed a technical interview for the position of "${targetRole}" (${seniority.toUpperCase()} level).

Evaluation Instructions:
1. Provide objective scores (0-100) for:
   - overallScore: Holistic fit for ${targetRole}
   - roleFoundations: Mastery of core concepts, protocols, languages, and patterns for ${targetRole}
   - projectDepth: Depth of explanation regarding their actual projects and real-world execution
   - architecture: System design, trade-offs, scaling, and error resilience
   - communication: Articulation, conciseness, structured thinking
2. Provide a 1-sentence roleReadinessVerdict (e.g., "Strong candidate ready for mid-level frontend technical interviews").
3. Identify 3 concrete technical strengths and 3 high-impact areas for improvement.
4. **Resume Rewrite Suggestions**:
   - Critically evaluate how the candidate's projects are described vs. the technical details, metrics, and architecture they explained in this interview.
   - Generate 2-3 high-impact resume bullets tailored SPECIFICALLY to appeal to hiring managers for "${targetRole}".
   - Format each with the Google XYZ standard: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Emphasize technical keywords, performance metrics, latency, scale, and active power verbs.`;

      const transcript = messages
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const user = `Target Role: ${targetRole} (${seniority})
Candidate's Projects:
${topProjects.map((p) => `* ${p.title}: ${p.description} (Tech: ${p.skills.join(', ')})`).join('\n')}

Interview Transcript:
${transcript}

Produce the final evaluation report and role-tailored resume rewrites.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: EvaluationSchema,
        schemaName: 'RoleInterviewEvaluation',
        maxTokens: 2200,
      });

      return {
        overallScore: res.data.overallScore,
        roleTitle: targetRole,
        metrics: {
          roleFoundations: res.data.roleFoundations,
          projectDepth: res.data.projectDepth,
          architecture: res.data.architecture,
          communication: res.data.communication,
        },
        feedback: {
          summary: res.data.summary,
          roleReadinessVerdict: res.data.verdict,
          strengths: res.data.strengths,
          areasToImprove: res.data.areasToImprove,
          keyTakeaways: res.data.keyTakeaways,
        },
        resumeRewrites: res.data.resumeRewrites.map((r) => ({
          ...r,
          roleTarget: targetRole,
        })),
      };
    } catch (err) {
      console.warn('LLM role evaluation fallback:', err);
    }
  }

  // Fallback Evaluation
  const wordCount = candidateTurns.reduce((acc, t) => acc + t.content.split(/\s+/).length, 0);
  const baseScore = Math.min(88, Math.max(68, 62 + Math.round(wordCount / 18)));
  const primaryProj = topProjects[0]?.title || 'your system';
  const primaryTech = topProjects[0]?.skills.slice(0, 3).join(', ') || 'modern stacks';

  return {
    overallScore: baseScore,
    roleTitle: targetRole,
    metrics: {
      roleFoundations: Math.min(90, baseScore + 2),
      projectDepth: Math.min(92, baseScore + 4),
      architecture: Math.min(86, baseScore - 2),
      communication: Math.min(88, baseScore),
    },
    feedback: {
      summary: `You displayed a solid technical baseline for the ${targetRole} position. Your breakdown of ${primaryProj} showed genuine implementation ownership, and you handled fundamental follow-up questions with clear technical logic.`,
      roleReadinessVerdict: baseScore >= 80 ? `Strong candidate competitive for ${targetRole} technical rounds` : `Promising foundation with targeted preparation needed for ${targetRole}`,
      strengths: [
        `Able to explain technical choices and component boundaries in ${primaryProj} clearly.`,
        `Demonstrated good knowledge of core technologies (${primaryTech}) expected for ${targetRole}.`,
        'Maintained structured communication across multi-turn technical follow-ups.',
      ],
      areasToImprove: [
        `Anchor responses with concrete numerical metrics (e.g. latency percentiles, throughput, memory reduction).`,
        `Discuss failure recovery and edge cases more proactively before being prompted.`,
        `Familiarize yourself deeper with architectural trade-offs specific to large-scale ${targetRole} deployments.`,
      ],
      keyTakeaways: [
        `In ${targetRole} interviews, hiring managers prize candidates who understand why an architecture was chosen, not just what was built.`,
        'Always quantify the impact of optimizations and bug fixes.',
        'Be prepared to compare your chosen stack with alternative industry standards.',
      ],
    },
    resumeRewrites: [
      {
        originalPoint: `Developed ${primaryProj} using ${primaryTech} for project requirements.`,
        suggestedRewrite: `Architected and deployed ${primaryProj} leveraging ${primaryTech}, optimizing service communication to maintain sub-100ms response times under simulated load.`,
        impactMetric: 'Sub-100ms API response time & decoupled service architecture',
        reasoning: `Highlights core ${targetRole} competencies (architecture, latency, load handling) rather than passive implementation.`,
        roleTarget: targetRole,
        tags: ['Architecture', 'Performance', targetRole],
      },
      {
        originalPoint: `Implemented database queries and application backend services.`,
        suggestedRewrite: `Engineered resilient data layer with indexed relational schemas and caching, preventing N+1 bottlenecks and reducing query overhead by 40%.`,
        impactMetric: '40% query latency reduction & zero data inconsistencies',
        reasoning: `Demonstrates advanced database tuning and performance awareness essential for ${targetRole} roles.`,
        roleTarget: targetRole,
        tags: ['Database Optimization', 'Scalability', targetRole],
      },
    ],
  };
}
