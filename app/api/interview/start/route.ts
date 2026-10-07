import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  extractStudentProjects,
  generateOpeningQuestion,
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
    const body = await req.json();
    const {
      projectId,
      focus = 'project_deep_dive',
      interviewerType = 'tech_lead',
    } = body;

    const [evidenceRow, profileRow] = await Promise.all([
      prisma.studentEvidence.findUnique({ where: { userId: session.user.id } }),
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { targetRole: true },
      }),
    ]);

    const storedEvidence = (evidenceRow?.evidence as unknown as StoredEvidence) || null;
    const allProjects = extractStudentProjects(storedEvidence);
    const selectedProject =
      allProjects.find((p) => p.id === projectId) || allProjects[0];

    const opening = await generateOpeningQuestion({
      project: selectedProject,
      focus: focus as InterviewFocus,
      interviewerType: interviewerType as InterviewerType,
      targetRole: profileRow?.targetRole,
    });

    const initialMessage: InterviewMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: opening.message,
      timestamp: new Date().toISOString(),
      critique: null,
    };

    const newSession = await prisma.interviewSession.create({
      data: {
        userId: session.user.id,
        projectTitle: selectedProject.title,
        roleFocus: focus,
        interviewerType,
        status: 'in_progress',
        messages: [initialMessage] as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      data: {
        session: newSession,
        project: selectedProject,
        suggestedFocusAreas: opening.suggestedFocusAreas,
      },
    });
  } catch (error) {
    console.error('Failed to start interview session:', error);
    return NextResponse.json({ error: 'Failed to start interview session' }, { status: 500 });
  }
}
