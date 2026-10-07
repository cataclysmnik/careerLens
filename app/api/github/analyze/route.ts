import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { fetchUserRepositories } from '@/lib/github/api';
import { analyzeGithubProfile } from '@/lib/github/analyzer';
import { readInputs, withGithubProfile, type GithubAnalyzeData, type StoredEvidence } from '@/lib/evidence/student-evidence';

const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/** The student's saved GitHub username and last analysis, so the analyzer reopens with them. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [profile, row] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id }, select: { githubUsername: true } }),
    prisma.studentEvidence.findUnique({ where: { userId: session.user.id }, select: { evidence: true } }),
  ]);
  const snapshot = (row?.evidence as Partial<StoredEvidence> | null)?.githubSnapshot ?? null;
  const username = profile?.githubUsername ?? null;
  // A snapshot for a different username is stale (the student changed it on My Profile).
  const current = snapshot && username && snapshot.username.toLowerCase() === username.toLowerCase() ? snapshot : null;
  return NextResponse.json({ data: { username, snapshot: current } });
}

export async function POST(req: Request) {
  try {
    const { username: raw } = await req.json();
    const username = typeof raw === 'string' ? raw.trim().replace(/^@/, '') : '';

    if (!username) {
      return NextResponse.json({ error: 'GitHub username is required' }, { status: 400 });
    }
    if (!GITHUB_USERNAME.test(username)) {
      return NextResponse.json({ error: 'That is not a valid GitHub username.' }, { status: 400 });
    }

    const repos = await fetchUserRepositories(username);

    if (!repos || repos.length === 0) {
      return NextResponse.json({ error: 'No repositories found or user does not exist.' }, { status: 404 });
    }

    const data: GithubAnalyzeData = {
      username,
      totalRepos: repos.length,
      evidence: analyzeGithubProfile(repos),
      repositories: repos,
    };

    // Students: remember the username and fold the analysis into their saved report.
    const session = await auth();
    if (session?.user?.id && session.user.role === 'STUDENT') {
      try {
        await saveForStudent(session.user.id, data);
      } catch (e) {
        console.error('Failed to save GitHub analysis for student:', e);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('GitHub analysis error:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze GitHub profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function saveForStudent(userId: string, data: GithubAnalyzeData) {
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, githubUsername: data.username },
    update: { githubUsername: data.username },
  });

  const [row, profile] = await Promise.all([
    prisma.studentEvidence.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId }, select: { targetRole: true } }),
  ]);
  if (!row || !readInputs(row.evidence)) return;

  const { evidence, scoring } = withGithubProfile(row.evidence as unknown as StoredEvidence, data, profile?.targetRole ?? null);
  await prisma.studentEvidence.update({
    where: { userId },
    data: {
      evidence: evidence as unknown as Prisma.InputJsonValue,
      scoring: scoring as unknown as Prisma.InputJsonValue,
    },
  });
}
