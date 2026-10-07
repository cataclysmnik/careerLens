import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  evaluateInterviewSession,
  extractStudentProjects,
  type InterviewMessage,
} from '@/lib/interview/engine';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

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

    const [evidenceRow, profileRow] = await Promise.all([
      prisma.studentEvidence.findUnique({ where: { userId: session.user.id } }),
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { targetRole: true },
      }),
    ]);

    const storedEvidence = (evidenceRow?.evidence as unknown as StoredEvidence) || null;
    const allProjects = extractStudentProjects(storedEvidence);
    const matchedProject =
      allProjects.find(
        (p) => p.title.toLowerCase() === interviewSession.projectTitle.toLowerCase()
      ) ||
      allProjects[0] || {
        id: 'generic',
        title: interviewSession.projectTitle,
        description: 'Engineering project',
        skills: [],
        components: [],
        architecturePatterns: [],
        source: 'resume' as const,
      };

    const messages = (interviewSession.messages as unknown as InterviewMessage[]) || [];

    const evaluation = await evaluateInterviewSession({
      project: matchedProject,
      messages,
      targetRole: profileRow?.targetRole,
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
    console.error('Failed to evaluate and conclude session:', error);
    return NextResponse.json({ error: 'Failed to evaluate interview session' }, { status: 500 });
  }
}
