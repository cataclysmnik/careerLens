import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  evaluateRoleInterviewSession,
  matchProjectsToRole,
  type SeniorityLevel,
  type InterviewMessage,
  type InterviewProject,
} from '@/lib/interview/engine';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const targetRole = interviewSession.roleTitle || 'Software Engineer';
    const seniority = (interviewSession.seniority as SeniorityLevel) || 'entry';
    const rawRelevant = (interviewSession.relevantProjects as unknown as InterviewProject[]) || [];
    const roleSetup = matchProjectsToRole(targetRole, rawRelevant, interviewSession.jobDescription);

    const messages = (interviewSession.messages as unknown as InterviewMessage[]) || [];

    const evaluation = await evaluateRoleInterviewSession({
      targetRole,
      seniority,
      relevantProjects: roleSetup.relevantProjects,
      messages,
      jobDescription: interviewSession.jobDescription,
    });

    const updatedSession = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        overallScore: evaluation.overallScore,
        metrics: evaluation.metrics as unknown as Prisma.InputJsonValue,
        feedback: evaluation.feedback as unknown as Prisma.InputJsonValue,
        resumeRewrites: evaluation.resumeRewrites as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      data: {
        session: updatedSession,
        evaluation,
      },
    });
  } catch (error) {
    console.error('Failed to evaluate role interview session:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: detail || 'Failed to evaluate interview session' }, { status: 500 });
  }
}
