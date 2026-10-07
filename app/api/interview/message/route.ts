import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  extractStudentProjects,
  generateNextTurn,
  type InterviewFocus,
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
    const { sessionId, content } = await req.json();
    if (!sessionId || !content?.trim()) {
      return NextResponse.json({ error: 'Session ID and message content are required' }, { status: 400 });
    }

    const interviewSession = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    if (interviewSession.status === 'completed') {
      return NextResponse.json({ error: 'This session has already ended' }, { status: 400 });
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

    const existingMessages = (interviewSession.messages as unknown as InterviewMessage[]) || [];

    const userMessage: InterviewMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const messagesWithUser = [...existingMessages, userMessage];

    // Generate AI interviewer next question
    const aiTurn = await generateNextTurn({
      project: matchedProject,
      focus: (interviewSession.roleFocus as InterviewFocus) || 'project_deep_dive',
      interviewerType: (interviewSession.interviewerType as InterviewerType) || 'tech_lead',
      messages: messagesWithUser,
      targetRole: profileRow?.targetRole,
    });

    const assistantMessage: InterviewMessage = {
      id: `msg-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: aiTurn.message,
      timestamp: new Date().toISOString(),
      critique: aiTurn.critique,
    };

    const allMessages = [...messagesWithUser, assistantMessage];

    const updatedSession = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        messages: allMessages as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      data: {
        session: updatedSession,
        assistantMessage,
        critique: aiTurn.critique,
      },
    });
  } catch (error) {
    console.error('Failed to process interview message:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
