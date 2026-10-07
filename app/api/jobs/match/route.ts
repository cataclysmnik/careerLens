import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { readInputs } from '@/lib/evidence/student-evidence';
import { analyzeJobFit } from '@/lib/scoring/jobMatch';

export const maxDuration = 90;

const MIN_JD_LENGTH = 40;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { jobDescription }: { jobDescription?: string } = await req.json();
    if (!jobDescription || jobDescription.trim().length < MIN_JD_LENGTH) {
      return NextResponse.json({ error: 'Paste the full job description (at least a few lines).' }, { status: 400 });
    }

    const row = await prisma.studentEvidence.findUnique({ where: { userId: session.user.id } });
    if (!row) {
      return NextResponse.json({ error: 'No profile found. Upload your resume on the Resume Parser page first.' }, { status: 404 });
    }
    const inputs = readInputs(row.evidence);
    if (!inputs) {
      return NextResponse.json(
        { error: 'Your saved analysis is from an older version. Re-upload your resume on the Resume Parser page to enable AI job matching.' },
        { status: 409 }
      );
    }

    const result = await analyzeJobFit(inputs, jobDescription);
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    console.error('Job Matching failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to process job description';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
