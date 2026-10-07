import { NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/evidence/parsers/text-extractor';
import { parseResumeDeterministic } from '@/lib/evidence/parsers/resume-parser';
import { extractCandidateProfile } from '@/lib/llm/extract-resume';
import { auth } from '@/lib/auth';
import { syncProfileFromResume, type ProfileSyncResult } from '@/lib/profile/sync-from-resume';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF or DOCX.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractedText = await extractTextFromFile(buffer, file.type);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    // 1. Deterministic pass: links, emails, dictionary skills.
    const parsedData = parseResumeDeterministic(extractedText);

    // 2. LLM pass over the full text: education, CGPA, 10th/12th marks,
    //    experience, projects. Falls back to the deterministic pass without a key.
    const { profile, ai } = await extractCandidateProfile(extractedText, parsedData);

    // 3. Copy what the resume states into the student's "My Profile".
    let profileSync: ProfileSyncResult | null = null;
    const session = await auth();
    if (session?.user?.id && session.user.role === 'STUDENT') {
      try {
        profileSync = await syncProfileFromResume(session.user.id, profile);
      } catch (e) {
        console.error('Failed to update profile from resume:', e);
      }
    }

    return NextResponse.json({ success: true, data: parsedData, profile, ai, profileSync }, { status: 200 });

  } catch (error: unknown) {
    console.error('Resume parsing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process resume';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
