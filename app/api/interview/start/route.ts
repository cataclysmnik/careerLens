import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  extractAllProjects,
  matchProjectsToRole,
  generateJobInterviewOpening,
  type SeniorityLevel,
  type InterviewerType,
  type InterviewMessage,
} from '@/lib/interview/engine';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      targetRole = 'Full Stack Developer',
      seniority = 'entry',
      interviewerType = 'tech_lead',
    } = body;

    const evidenceRow = await prisma.studentEvidence.findUnique({
      where: { userId: session.user.id },
    });

    const storedEvidence = (evidenceRow?.evidence as unknown as StoredEvidence) || null;
    const allProjects = extractAllProjects(storedEvidence);

    // Automatically match the student's relevant projects and skills for this role
    const { relevantProjects, matchedRoleSkills, expectedTopics } = matchProjectsToRole(
      targetRole,
      allProjects
    );

    const opening = await generateJobInterviewOpening({
      targetRole,
      seniority: seniority as SeniorityLevel,
      interviewerType: interviewerType as InterviewerType,
      relevantProjects,
      matchedRoleSkills,
    });

    const initialMessage: InterviewMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: opening.message,
      timestamp: new Date().toISOString(),
      critique: null,
      topicType: 'intro',
    };

    const newSession = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        roleTitle: targetRole,
        seniority: seniority as string,
        projectTitle: relevantProjects[0]?.title || null,
        relevantProjects: relevantProjects as unknown as Prisma.InputJsonValue,
        roleFocus: 'job_mock_interview',
        interviewerType,
        status: 'in_progress',
        messages: [initialMessage] as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      data: {
        session: newSession,
        targetRole,
        seniority,
        relevantProjects,
        matchedRoleSkills,
        expectedTopics,
        suggestedFocusAreas: opening.suggestedFocusAreas,
      },
    });
  } catch (error) {
    console.error('Failed to start real-life job mock interview:', error);
    return NextResponse.json({ error: 'Failed to start interview session' }, { status: 500 });
  }
}
