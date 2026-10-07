import { NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/evidence/parsers/text-extractor';
import { cleanLinks, parseResumeDeterministic } from '@/lib/evidence/parsers/resume-parser';
import { extractCandidateProfile } from '@/lib/llm/extract-resume';
import { isGeminiEnabled } from '@/lib/llm/gemini';
import { auth } from '@/lib/auth';
import { syncProfileFromResume, type ProfileSyncResult } from '@/lib/profile/sync-from-resume';

export const maxDuration = 90;

/** URLs from the PDF's link annotations (/URI entries in uncompressed objects). */
function pdfLinkAnnotations(buffer: Buffer): string[] {
  const raw = buffer.toString('latin1');
  return [...raw.matchAll(/\/URI\s*\(([^)]{4,300})\)/g)]
    .map((m) => m[1].replace(/\\([()\\])/g, '$1').trim())
    .filter((u) => /^https?:\/\//i.test(u));
}

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

    // Some PDFs defeat the text extractor (unusual xref tables, scans). Gemini
    // reads the PDF itself, so with it available a failed extraction isn't fatal.
    const canReadPdfDirectly = file.type === 'application/pdf' && isGeminiEnabled();
    let extractedText = '';
    try {
      extractedText = await extractTextFromFile(buffer, file.type);
    } catch (e) {
      if (!canReadPdfDirectly) throw e;
      console.warn('PDF text extraction failed; relying on Gemini to read the PDF:', e instanceof Error ? e.message : e);
    }

    if (!extractedText.trim() && !canReadPdfDirectly) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    // 1. Deterministic pass: links, emails, dictionary skills. Clickable links
    //    (e.g. a "GitHub" icon) live in the PDF's link annotations, not its text.
    const parsedData = parseResumeDeterministic(extractedText);
    if (file.type === 'application/pdf') {
      // Embedded links first: they're complete, while text links can be cut off by line wraps.
      parsedData.links = cleanLinks([...pdfLinkAnnotations(buffer), ...parsedData.links]);
    }

    // 2. LLM pass over the full text: education, CGPA, 10th/12th marks,
    //    experience, projects. Falls back to the deterministic pass without a key.
    const { profile, ai } = await extractCandidateProfile(extractedText, parsedData, { data: buffer, mimeType: file.type, links: parsedData.links });

    // The AI reads links whole even where the text wraps them mid-word
    // ("linkedin.com/in/name-pa\nrt"); merging drops the cut-off text copies.
    const aiLinks = [
      profile.links.github, profile.links.linkedin, profile.links.portfolio, ...profile.links.other,
      ...profile.projects.flatMap((p) => [p.repoUrl, p.liveUrl]),
    ].filter((l): l is string => !!l);
    parsedData.links = cleanLinks([...(file.type === 'application/pdf' ? pdfLinkAnnotations(buffer) : []), ...aiLinks, ...parsedData.links]);

    // 3. Copy what the resume states into the student's "My Profile".
    let profileSync: ProfileSyncResult | null = null;
    const session = await auth();
    if (session?.user?.id && session.user.role === 'STUDENT') {
      try {
        profileSync = await syncProfileFromResume(session.user.id, profile, parsedData.links);
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
