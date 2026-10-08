import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  generateJobInterviewNextTurn,
  matchProjectsToRole,
  type SeniorityLevel,
  type InterviewerType,
  type InterviewMessage,
  type InterviewProject,
} from '@/lib/interview/engine';

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

    const targetRole = interviewSession.roleTitle || 'Software Engineer';
    const seniority = (interviewSession.seniority as SeniorityLevel) || 'entry';
    const interviewerType = (interviewSession.interviewerType as InterviewerType) || 'tech_lead';

    const rawRelevant = (interviewSession.relevantProjects as unknown as InterviewProject[]) || [];
    const roleSetup = matchProjectsToRole(targetRole, rawRelevant, interviewSession.jobDescription);

    const existingMessages = (interviewSession.messages as unknown as InterviewMessage[]) || [];

    const userMessage: InterviewMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const messagesWithUser = [...existingMessages, userMessage];

    // Generate real-life next question (alternating project deep dive & general role tech questions)
    const aiTurn = await generateJobInterviewNextTurn({
      targetRole,
      seniority,
      interviewerType,
      relevantProjects: roleSetup.relevantProjects,
      matchedRoleSkills: roleSetup.matchedRoleSkills,
      expectedTopics: roleSetup.expectedTopics,
      messages: messagesWithUser,
      jobDescription: interviewSession.jobDescription,
    });

    const assistantMessage: InterviewMessage = {
      id: `msg-${Date.now() + 1}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: aiTurn.message,
      timestamp: new Date().toISOString(),
      critique: aiTurn.critique,
      topicType: aiTurn.topicType as any,
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
        topicType: aiTurn.topicType,
      },
    });
  } catch (error) {
    console.error('Failed to process interview message:', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: detail || 'Failed to process message' }, { status: 500 });
  }
}
