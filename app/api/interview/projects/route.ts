import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { extractStudentProjects } from '@/lib/interview/engine';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [evidenceRow, profileRow] = await Promise.all([
      prisma.studentEvidence.findUnique({ where: { userId: session.user.id } }),
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { targetRole: true },
      }),
    ]);

    const storedEvidence = (evidenceRow?.evidence as unknown as StoredEvidence) || null;
    const projects = extractStudentProjects(storedEvidence);

    return NextResponse.json({
      data: {
        projects,
        targetRole: profileRow?.targetRole || null,
        hasEvidence: Boolean(evidenceRow),
      },
    });
  } catch (error) {
    console.error('Error fetching interview projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
