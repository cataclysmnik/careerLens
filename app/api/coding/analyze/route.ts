import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { CODING_PLATFORMS, HANDLE_FIELD, parseCodingHandle, type CodingHandles, type CodingPlatform } from '@/lib/coding/handles';
import { CodingProfileError, fetchCodingProfile } from '@/lib/coding/platforms';
import { summarizeCodingProfiles, type CodingPlatformStats, type CodingProfileSummary } from '@/lib/coding/analyzer';
import { readInputs, withCodingProfile, type StoredEvidence } from '@/lib/evidence/student-evidence';

/** The student's saved coding handles and last analysis, so the page reopens with them. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const [profile, row] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.studentEvidence.findUnique({ where: { userId: session.user.id }, select: { evidence: true } }),
  ]);
  const handles: CodingHandles = {};
  for (const p of CODING_PLATFORMS) {
    const h = profile?.[HANDLE_FIELD[p]];
    if (h) handles[p] = h;
  }
  const summary = readInputs(row?.evidence)?.coding ?? null;
  return NextResponse.json({ data: { handles, summary } });
}

/** Students: remember the analyzed handles and fold the results into the saved report. */
async function saveForStudent(userId: string, summary: CodingProfileSummary) {
  const analyzed = Object.fromEntries(summary.platforms.map((p) => [HANDLE_FIELD[p.platform], p.handle]));
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...analyzed },
    update: analyzed,
  });

  const [row, profile] = await Promise.all([
    prisma.studentEvidence.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId }, select: { targetRole: true } }),
  ]);
  if (!row || !readInputs(row.evidence)) return;
  const { evidence, scoring } = withCodingProfile(row.evidence as unknown as StoredEvidence, summary, profile?.targetRole ?? null);
  await prisma.studentEvidence.update({
    where: { userId },
    data: {
      evidence: evidence as unknown as Prisma.InputJsonValue,
      scoring: scoring as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function POST(req: Request) {
  let handles: Record<string, unknown>;
  try {
    ({ handles } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!handles || typeof handles !== 'object') {
    return NextResponse.json({ error: 'Provide at least one coding profile' }, { status: 400 });
  }

  const requested: [CodingPlatform, string][] = [];
  const errors: Partial<Record<CodingPlatform, string>> = {};
  for (const platform of CODING_PLATFORMS) {
    const raw = handles[platform];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const handle = parseCodingHandle(platform, raw);
    if (handle) requested.push([platform, handle]);
    else errors[platform] = 'Not a valid username or profile URL for this platform.';
  }
  if (requested.length === 0 && Object.keys(errors).length === 0) {
    return NextResponse.json({ error: 'Provide at least one coding profile' }, { status: 400 });
  }

  const settled = await Promise.allSettled(requested.map(([platform, handle]) => fetchCodingProfile(platform, handle)));
  const platforms: CodingPlatformStats[] = [];
  settled.forEach((result, i) => {
    const [platform] = requested[i];
    if (result.status === 'fulfilled') {
      platforms.push(result.value);
    } else {
      const err = result.reason;
      if (!(err instanceof CodingProfileError)) console.error(`Coding profile analysis failed (${platform}):`, err);
      errors[platform] = err instanceof CodingProfileError ? err.message : 'Analysis failed. Try again later.';
    }
  });

  const summary = summarizeCodingProfiles(platforms);
  if (summary) {
    const session = await auth();
    if (session?.user?.id && session.user.role === 'STUDENT') {
      try {
        await saveForStudent(session.user.id, summary);
      } catch (e) {
        console.error('Failed to save coding analysis for student:', e);
      }
    }
  }
  return NextResponse.json({ data: summary, errors });
}
