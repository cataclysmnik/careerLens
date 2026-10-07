import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import {
  extractAllProjects,
  matchProjectsToRole,
} from '@/lib/interview/engine';
import { ROLE_CATALOG } from '@/lib/scoring/roles-catalog';
import type { StoredEvidence } from '@/lib/evidence/student-evidence';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedRole = searchParams.get('role');

  try {
    const [evidenceRow, profileRow] = await Promise.all([
      prisma.studentEvidence.findUnique({ where: { userId: session.user.id } }),
      prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { targetRole: true },
      }),
    ]);

    const storedEvidence = (evidenceRow?.evidence as unknown as StoredEvidence) || null;
    const allProjects = extractAllProjects(storedEvidence);

    const defaultRole = requestedRole || profileRow?.targetRole || 'Full Stack Developer';
    const roleMatch = matchProjectsToRole(defaultRole, allProjects);

    const presetRoles = ROLE_CATALOG.map((r) => r.title);
    const popularRoles = [
      ...presetRoles,
      'Software Engineer',
      'Android Developer',
      'Cloud Engineer',
      'Machine Learning Engineer',
    ].filter((r, idx, self) => self.indexOf(r) === idx);

    return NextResponse.json({
      data: {
        allProjects,
        relevantProjects: roleMatch.relevantProjects,
        matchedRoleSkills: roleMatch.matchedRoleSkills,
        expectedTopics: roleMatch.expectedTopics,
        targetRole: profileRow?.targetRole || defaultRole,
        availableRoles: popularRoles,
        hasEvidence: Boolean(evidenceRow),
      },
    });
  } catch (error) {
    console.error('Error fetching interview role and projects:', error);
    return NextResponse.json({ error: 'Failed to fetch setup data' }, { status: 500 });
  }
}
