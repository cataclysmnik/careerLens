import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { extractCandidateProfile } from '@/lib/llm/extract-resume';
import { buildStudentEvidence, type StoredEvidence } from '@/lib/evidence/student-evidence';

export const maxDuration = 90;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const mode = formData.get('mode') as string;
    let extractedText = '';

    if (mode === 'upload') {
      const files = formData.getAll('csv') as File[];
      if (files.length === 0) return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
      let combinedText = '';
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        combinedText += `\n--- File: ${file.name} ---\n`;
        combinedText += Buffer.from(arrayBuffer).toString('utf-8');
      }
      extractedText = combinedText;
    } else if (mode === 'manual') {
      extractedText = formData.get('text') as string;
    } else if (mode === 'scrape') {
      const url = formData.get('url') as string;
      if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const html = await response.text();
        extractedText = html.replace(/<[^>]*>?/gm, ' ');
      } catch (err) {
        return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Empty content' }, { status: 400 });
    }

    // Get current profile
    const existing = await prisma.studentEvidence.findUnique({
      where: { userId: session.user.id },
      include: { user: { include: { profile: true } } },
    });

    let baseProfile: any = null;
    let inputs: any = null;
    let targetRole: string | null = null;
    let existingId: string | undefined;
    let previousHistory: any[] = [];

    if (existing) {
      existingId = existing.id;
      targetRole = existing.user.profile?.targetRole ?? null;
      const storedEvidence = existing.evidence as unknown as StoredEvidence;
      inputs = storedEvidence.inputs;
      if (inputs && inputs.profile) {
        baseProfile = inputs.profile;
      }
      previousHistory = storedEvidence.history ?? [];
    } else {
      const userProf = await prisma.profile.findUnique({ where: { userId: session.user.id } });
      targetRole = userProf?.targetRole ?? null;
    }

    if (!baseProfile) {
      baseProfile = {
        name: null, email: null, phone: null, location: null, headline: null,
        links: { github: null, linkedin: null, portfolio: null, other: [] },
        education: [], experience: [], projects: [], skills: [],
        certifications: [], achievements: [], activeBacklogs: null,
        source: 'llm', extractedAt: new Date().toISOString(), warnings: []
      };
    }

    // Run LLM extraction on the LinkedIn data
    // We pass empty links and an empty base parsedData since it's just raw text
    const { profile: linkedinExtracted } = await extractCandidateProfile(
      extractedText,
      { skills: [], links: [], emails: [], rawText: extractedText, confidence: 0, aiDetectedClaims: [] },
      { data: Buffer.from(extractedText), mimeType: 'text/plain', links: [] }
    );

    // Merge logic
    // Add new experience
    const newExperiences = linkedinExtracted.experience.filter(
      le => !baseProfile.experience.some((be: any) => 
        be.title.toLowerCase() === le.title.toLowerCase() && 
        be.organization?.toLowerCase() === le.organization?.toLowerCase()
      )
    );

    // Add new certifications
    const newCertifications = linkedinExtracted.certifications.filter(
      lc => !baseProfile.certifications.some((bc: any) => bc.name.toLowerCase() === lc.name.toLowerCase())
    );

    // Add new skills
    const newSkills = linkedinExtracted.skills.filter(
      ls => !baseProfile.skills.some((bs: any) => bs.name.toLowerCase() === ls.name.toLowerCase())
    );

    const updatedProfile = {
      ...baseProfile,
      experience: [...baseProfile.experience, ...newExperiences],
      certifications: [...baseProfile.certifications, ...newCertifications],
      skills: [...baseProfile.skills, ...newSkills],
    };

    // Rebuild evidence and score
    const { evidence: newEvidence, scoring: newScoring } = buildStudentEvidence(
      updatedProfile,
      inputs?.github ?? null,
      inputs?.portfolio ?? null,
      inputs?.coding ?? null,
      targetRole,
      previousHistory
    );

    newEvidence.history = [
      ...previousHistory,
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        type: 'PROFILE_EDIT',
        title: 'LinkedIn Sync',
        description: 'Synced data from LinkedIn profile.',
        score: newScoring.overallScore,
        skillsAdded: newSkills.map((s: any) => s.name).slice(0, 5),
      }
    ];

    if (existingId) {
      await prisma.studentEvidence.update({
        where: { id: existingId },
        data: {
          evidence: newEvidence as any,
          scoring: newScoring as any,
        },
      });
    } else {
      await prisma.studentEvidence.create({
        data: {
          userId: session.user.id,
          evidence: newEvidence as any,
          scoring: newScoring as any,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      added: {
        experiences: newExperiences.length,
        certifications: newCertifications.length,
        skills: newSkills.length,
        items: {
          experiences: newExperiences.map(e => e.title),
          certifications: newCertifications.map(c => c.name),
          skills: newSkills.map(s => s.name)
        }
      } 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('LinkedIn parsing error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process LinkedIn data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
