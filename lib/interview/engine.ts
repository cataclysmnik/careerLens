// lib/interview/engine.ts
// AI mock-interview engine tailored to the student's own projects and GitHub work,
// providing real-time technical probing, holistic scoring, and resume rewrite suggestions.

import { z } from 'zod';
import { callAnyJSON, isAnyLLMEnabled } from '@/lib/llm/any';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

export type InterviewerType = 'tech_lead' | 'bar_raiser' | 'friendly';
export type InterviewFocus = 'project_deep_dive' | 'system_design' | 'behavioral';

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
  highlights?: string[];
};

export type InterviewMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  critique?: string | null;
};

export type ResumeRewriteSuggestion = {
  originalPoint: string;
  suggestedRewrite: string;
  impactMetric: string;
  reasoning: string;
  tags: string[];
};

export type InterviewMetrics = {
  technicalDepth: number;
  clarity: number;
  architecture: number;
  problemSolving: number;
};

export type InterviewFeedback = {
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  keyTakeaways: string[];
};

export type InterviewEvaluation = {
  overallScore: number;
  metrics: InterviewMetrics;
  feedback: InterviewFeedback;
  resumeRewrites: ResumeRewriteSuggestion[];
};

// ---------------------------------------------------------------------------
// Schemas for LLM Structured Outputs
// ---------------------------------------------------------------------------

const OpeningTurnSchema = z.object({
  greeting: z.string(),
  question: z.string(),
  suggestedFocusAreas: z.array(z.string()),
});

const NextTurnSchema = z.object({
  answerCritique: z.string().nullable(),
  followUpQuestion: z.string(),
  quickTip: z.string().nullable(),
});

const EvaluationSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  technicalDepth: z.number().int().min(0).max(100),
  clarity: z.number().int().min(0).max(100),
  architecture: z.number().int().min(0).max(100),
  problemSolving: z.number().int().min(0).max(100),
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
// Project Extraction from Student Evidence
// ---------------------------------------------------------------------------

export function extractStudentProjects(stored: StoredEvidence | null): InterviewProject[] {
  const projects: InterviewProject[] = [];
  const seenTitles = new Set<string>();

  // 1. Resume projects
  if (stored?.inputs?.profile?.projects) {
    for (const p of stored.inputs.profile.projects) {
      if (!p.name || seenTitles.has(p.name.toLowerCase())) continue;
      seenTitles.add(p.name.toLowerCase());
      projects.push({
        id: `resume-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: p.name,
        description: p.description || 'Personal software engineering project.',
        skills: p.skills || [],
        components: p.components || [],
        architecturePatterns: p.architecturePatterns || [],
        source: 'resume',
        liveUrl: p.liveUrl || null,
        repoUrl: p.repoUrl || null,
        highlights: [
          p.mentionsTesting ? 'Includes testing' : null,
          p.isDeployed ? 'Deployed in production' : null,
          p.hasQuantifiedOutcome ? 'Quantified impact metrics' : null,
        ].filter(Boolean) as string[],
      });
    }
  }

  // 2. GitHub repositories
  const githubRepos = stored?.githubSnapshot?.repositories || stored?.inputs?.github?.repositories || [];
  for (const repo of githubRepos) {
    if (!repo.name || seenTitles.has(repo.name.toLowerCase())) continue;
    seenTitles.add(repo.name.toLowerCase());
    projects.push({
      id: `gh-${repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title: repo.name,
      description: repo.description || `Repository built with ${repo.language || 'modern technologies'}.`,
      skills: repo.language ? [repo.language, ...(repo.topics || [])] : (repo.topics || []),
      components: ['Repository Codebase', ...(repo.rootFiles || []).slice(0, 3)],
      architecturePatterns: [],
      source: 'github',
      liveUrl: repo.homepage || null,
      repoUrl: `https://github.com/${stored?.githubSnapshot?.username || 'repo'}/${repo.name}`,
      highlights: repo.language ? [`Built with ${repo.language}`] : [],
    });
  }

  // 3. Fallback if candidate hasn't uploaded or parsed any projects yet
  if (projects.length === 0) {
    projects.push({
      id: 'demo-fullstack-app',
      title: 'Full-Stack Web Platform',
      description: 'Distributed web application with authentication, REST API endpoints, relational database, and responsive frontend.',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
      components: ['Frontend UI', 'REST Backend', 'PostgreSQL DB', 'JWT Auth'],
      architecturePatterns: ['REST API', 'Client-Server Architecture'],
      source: 'resume',
      highlights: ['Full-stack CRUD workflows', 'Relational database schema'],
    });
  }

  return projects;
}

// ---------------------------------------------------------------------------
// Personas & System Instructions
// ---------------------------------------------------------------------------

function getPersonaPrompt(type: InterviewerType): string {
  switch (type) {
    case 'bar_raiser':
      return 'You are an exacting FAANG Bar Raiser interviewer. You look for deep technical rigor, performance trade-offs, edge-case handling, scalability, concurrency bottlenecks, and data integrity. You challenge vague buzzwords and demand concrete architectural rationales.';
    case 'friendly':
      return 'You are an encouraging Senior Engineering Mentor. You are warm, positive, and inquisitive. You guide the candidate to explain their thought process, celebrate good architectural reasoning, and prompt them gently on how they solved difficult bugs.';
    case 'tech_lead':
    default:
      return 'You are a pragmatic Tech Lead conducting a technical project interview. You balance system architecture, clean code practices, maintainability, technology trade-offs, and practical execution. You want to understand how the candidate actually built the system and why they made specific technical choices.';
  }
}

function getFocusPrompt(focus: InterviewFocus): string {
  switch (focus) {
    case 'system_design':
      return 'Focus on system design and scalability: how components interact, data flows, caching strategies, scaling to 50k+ users, reliability, failure handling, and API contracts.';
    case 'behavioral':
      return 'Focus on technical ownership, STAR methodology, hardest debugging battles, engineering trade-offs, handling changing requirements, and learning from mistakes.';
    case 'project_deep_dive':
    default:
      return 'Focus on technical deep dive into this specific project: core architecture, choice of stack/libraries, schema design, state management, security, test coverage, and key implementation hurdles.';
  }
}

// ---------------------------------------------------------------------------
// 1. Generate Opening Question
// ---------------------------------------------------------------------------

export async function generateOpeningQuestion(params: {
  project: InterviewProject;
  focus: InterviewFocus;
  interviewerType: InterviewerType;
  targetRole?: string | null;
}): Promise<{ message: string; suggestedFocusAreas: string[] }> {
  const { project, focus, interviewerType, targetRole } = params;

  if (isAnyLLMEnabled()) {
    try {
      const system = `${getPersonaPrompt(interviewerType)}
You are interviewing a candidate for a ${targetRole || 'Software Engineering'} role based specifically on their own project: "${project.title}".
${getFocusPrompt(focus)}

Instructions:
- Welcome the candidate briefly (1-2 sentences) in character.
- Ask an engaging, direct opening question that references the project's actual stack (${project.skills.join(', ') || 'their technologies'}) or architecture.
- Do NOT ask a generic "tell me about yourself". Ground the question directly in "${project.title}".
- Provide 2-3 bullet suggested focus areas they might touch upon in their answer.`;

      const user = `Project: "${project.title}"
Description: ${project.description}
Technologies: ${project.skills.join(', ')}
Components: ${project.components.join(', ')}
Architecture Patterns: ${project.architecturePatterns.join(', ')}

Please generate the opening interview turn.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: OpeningTurnSchema,
        schemaName: 'OpeningTurn',
        maxTokens: 500,
      });

      const fullMessage = `${res.data.greeting} ${res.data.question}`;
      return {
        message: fullMessage,
        suggestedFocusAreas: res.data.suggestedFocusAreas,
      };
    } catch (err) {
      console.warn('LLM opening question fallback:', err);
    }
  }

  // Deterministic Fallback
  const techList = project.skills.length ? project.skills.slice(0, 3).join(', ') : 'the core stack';
  return {
    message: `Welcome! I'm excited to dive into your project, **${project.title}**. You noted using ${techList}. Could you walk me through the high-level architecture of this system and why you chose these technologies for your core requirements?`,
    suggestedFocusAreas: [
      'High-level architecture & component interaction',
      `Reasons for choosing ${techList}`,
      'The primary technical challenge you solved',
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. Generate Next Turn / Probing Follow-Up
// ---------------------------------------------------------------------------

export async function generateNextTurn(params: {
  project: InterviewProject;
  focus: InterviewFocus;
  interviewerType: InterviewerType;
  messages: InterviewMessage[];
  targetRole?: string | null;
}): Promise<{ message: string; critique: string | null }> {
  const { project, focus, interviewerType, messages, targetRole } = params;

  if (isAnyLLMEnabled()) {
    try {
      const system = `${getPersonaPrompt(interviewerType)}
You are interviewing a candidate for ${targetRole || 'Software Engineering'} on their project: "${project.title}".
${getFocusPrompt(focus)}

Interview Guidelines:
- Look at the candidate's last answer.
- Provide a concise critique/feedback (1 short sentence noting strengths or what was missing, e.g. "Good explanation of your schema, but let's explore concurrency").
- Ask a sharp, relevant follow-up question that drills deeper into technical specifics, architecture trade-offs, edge cases, failure states, or quantifiable outcomes.
- Keep the tone professional, conversational, and focused on the candidate's actual statements.`;

      const transcript = messages
        .slice(-8)
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const user = `Project: "${project.title}"
Stack: ${project.skills.join(', ')}
Components: ${project.components.join(', ')}

Recent Transcript:
${transcript}

Evaluate the candidate's latest response and ask the next technical follow-up question.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: NextTurnSchema,
        schemaName: 'NextTurn',
        maxTokens: 600,
      });

      return {
        message: res.data.followUpQuestion,
        critique: res.data.answerCritique,
      };
    } catch (err) {
      console.warn('LLM next turn fallback:', err);
    }
  }

  // Fallback follow-ups based on turn count
  const turnIndex = messages.filter((m) => m.role === 'user').length;
  const fallbacks = [
    {
      critique: 'Clear initial overview.',
      question: `That makes sense. In **${project.title}**, how did you handle state management and data consistency across client requests? What happens if a network call fails midway?`,
    },
    {
      critique: 'Good breakdown of the flow.',
      question: `Interesting approach. If this service experienced a 10x traffic surge tomorrow, what would be the very first bottleneck in your architecture, and how would you mitigate it?`,
    },
    {
      critique: 'Solid engineering insight.',
      question: `Let's talk about testing and observability. How did you verify the edge cases of this implementation, and what metrics or logs did you rely on to debug production issues?`,
    },
    {
      critique: 'Comprehensive explanation.',
      question: `Looking back, if you were to re-architect **${project.title}** from scratch with what you know today, what major design decision would you change and why?`,
    },
  ];

  const picked = fallbacks[turnIndex % fallbacks.length];
  return {
    message: picked.question,
    critique: picked.critique,
  };
}

// ---------------------------------------------------------------------------
// 3. Evaluate Session & Generate Resume Rewrite Suggestions
// ---------------------------------------------------------------------------

export async function evaluateInterviewSession(params: {
  project: InterviewProject;
  messages: InterviewMessage[];
  targetRole?: string | null;
}): Promise<InterviewEvaluation> {
  const { project, messages, targetRole } = params;
  const candidateTurns = messages.filter((m) => m.role === 'user');

  if (isAnyLLMEnabled() && candidateTurns.length >= 1) {
    try {
      const system = `You are a Principal Engineer and FAANG hiring manager reviewing a technical mock interview session.
Candidate was interviewed for ${targetRole || 'Software Engineer'} on their project: "${project.title}".

Task:
1. Provide objective scores (0-100) for:
   - overallScore: Holistic evaluation
   - technicalDepth: Depth of explanations, knowledge of underlying mechanics, database, protocols
   - clarity: Articulation, structure, avoiding fluff
   - architecture: System understanding, trade-off awareness, scalability, failure handling
   - problemSolving: Ability to handle follow-up scenarios and debugging questions
2. Identify 3 key strengths and 3 actionable areas for improvement.
3. Write 2-3 **Resume Rewrite Suggestions**:
   - Compare the student's initial project description/bullets with the technical depth and metrics they explained during the interview!
   - Rewrite their resume bullet points using the Google XYZ Formula: "Accomplished [X] as measured by [Y], by doing [Z]".
   - Include high-impact action verbs (e.g., "Architected", "Engineered", "Optimized", "Spearheaded") and quantifiable metrics.
   - Explain why the rewrite stands out to recruiters and ATS systems.`;

      const transcript = messages
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n\n');

      const user = `Project: "${project.title}"
Original Description: ${project.description}
Technologies: ${project.skills.join(', ')}

Interview Transcript:
${transcript}

Produce the final comprehensive evaluation and tailored resume rewrites.`;

      const res = await callAnyJSON({
        system,
        user,
        schema: EvaluationSchema,
        schemaName: 'InterviewEvaluation',
        maxTokens: 2000,
      });

      return {
        overallScore: res.data.overallScore,
        metrics: {
          technicalDepth: res.data.technicalDepth,
          clarity: res.data.clarity,
          architecture: res.data.architecture,
          problemSolving: res.data.problemSolving,
        },
        feedback: {
          summary: res.data.summary,
          strengths: res.data.strengths,
          areasToImprove: res.data.areasToImprove,
          keyTakeaways: res.data.keyTakeaways,
        },
        resumeRewrites: res.data.resumeRewrites,
      };
    } catch (err) {
      console.warn('LLM evaluation fallback:', err);
    }
  }

  // Fallback Evaluation
  const wordCount = candidateTurns.reduce((acc, t) => acc + t.content.split(/\s+/).length, 0);
  const baseScore = Math.min(88, Math.max(65, 60 + Math.round(wordCount / 15)));

  const techStackString = project.skills.slice(0, 3).join(', ') || 'modern stacks';

  return {
    overallScore: baseScore,
    metrics: {
      technicalDepth: Math.min(92, baseScore + 2),
      clarity: Math.min(90, baseScore - 1),
      architecture: Math.min(88, baseScore - 3),
      problemSolving: Math.min(85, baseScore + 1),
    },
    feedback: {
      summary: `You demonstrated a solid understanding of ${project.title}. You were able to articulate the tech stack (${techStackString}) and discuss your implementation workflows. Elevating discussions of trade-offs and latency metrics will further distinguish your candidacy.`,
      strengths: [
        `Clear grasp of the core tech stack (${techStackString}) and component boundaries.`,
        'Good honesty about design choices and project motivations.',
        'Logical response flow when answering technical follow-up questions.',
      ],
      areasToImprove: [
        'Incorporate more quantified metrics (e.g. latency, query reduction, RPS, user capacity).',
        'Elaborate more on failure scenarios and how error states are recovered.',
        'Adopt the STAR methodology more strictly when recounting difficult debugging challenges.',
      ],
      keyTakeaways: [
        'Always quantify the impact of your architecture in interviews.',
        'Be ready to defend why you chose your specific database and state-management pattern.',
        'Discuss testing and CI/CD pipelines unprompted to showcase production readiness.',
      ],
    },
    resumeRewrites: [
      {
        originalPoint: project.description || `Built ${project.title} using ${techStackString}.`,
        suggestedRewrite: `Architected and deployed ${project.title} leveraging ${techStackString}, decoupling core services to achieve sub-100ms API response times.`,
        impactMetric: 'Sub-100ms API latency & clean modular architecture',
        reasoning: 'Replaces passive descriptive language with active engineering verbs ("Architected and deployed") and adds performance criteria.',
        tags: ['Architecture', 'Performance', 'Quantified Impact'],
      },
      {
        originalPoint: `Handled user authentication, database operations, and application features.`,
        suggestedRewrite: `Implemented resilient data access layer with optimized database schema and secure session management, mitigating data integrity bottlenecks.`,
        impactMetric: 'Zero downtime & secure state management',
        reasoning: 'Frames standard CRUD work as deliberate systems engineering focused on data integrity and security.',
        tags: ['Security', 'Database Design', 'Best Practices'],
      },
    ],
  };
}
