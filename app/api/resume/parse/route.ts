import { NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/evidence/parsers/text-extractor';
import { parseResumeDeterministic } from '@/lib/evidence/parsers/resume-parser';

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

    // Busting Turbopack cache for Phase 3 fix
    const extractedText = await extractTextFromFile(buffer, file.type);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    // 2. Parsing (Deterministic + AI)
    const parsedData = parseResumeDeterministic(extractedText);

    // Normally we would save this to the database and generate "Evidence Candidates" here
    // For Phase 3, we return it to the UI for user correction

    return NextResponse.json({ success: true, data: parsedData }, { status: 200 });

  } catch (error: any) {
    console.error('Resume parsing error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process resume' }, { status: 500 });
  }
}
