import { NextResponse } from 'next/server';
import { UnifiedEvidence } from '@/lib/evidence/aggregator';
import { matchEvidenceAgainstJD } from '@/lib/scoring/jobMatch';

export async function POST(req: Request) {
  try {
    const { jobDescription, evidence }: { jobDescription: string, evidence: UnifiedEvidence } = await req.json();

    if (!jobDescription || !evidence) {
      return NextResponse.json({ error: 'Missing jobDescription or evidence' }, { status: 400 });
    }

    const result = matchEvidenceAgainstJD(jobDescription, evidence.skills);

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    console.error('Job Matching failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to process job description';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
