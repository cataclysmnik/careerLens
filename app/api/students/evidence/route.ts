import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildStudentEvidence, CandidateProfileSchema, readInputs, withCodingProfile, type GithubAnalyzeData, type StoredEvidence } from "@/lib/evidence/student-evidence";
import type { CodingProfileSummary } from "@/lib/coding/analyzer";
import type { PortfolioEvidence } from "@/lib/portfolio/analyzer";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const profile = CandidateProfileSchema.safeParse(body?.profile);
    if (!profile.success) {
      return NextResponse.json({ error: "Missing or invalid resume profile" }, { status: 400 });
    }

    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { targetRole: true },
    });

    // Scores are computed here, on the server, from the raw evidence.
    const { evidence, scoring } = buildStudentEvidence(
      profile.data,
      (body.github ?? null) as GithubAnalyzeData | null,
      (body.portfolio ?? null) as PortfolioEvidence | null,
      (body.coding ?? null) as CodingProfileSummary | null,
      userProfile?.targetRole ?? null
    );

    const data = {
      evidence: evidence as unknown as Prisma.InputJsonValue,
      scoring: scoring as unknown as Prisma.InputJsonValue,
    };
    await prisma.studentEvidence.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json({ success: true, data: { scoring } });
  } catch (error: unknown) {
    console.error("Failed to persist student evidence:", error);
    return NextResponse.json({ error: "Failed to save evidence" }, { status: 500 });
  }
}

/** Update only the coding-platform results on an existing report and re-score it. */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const coding = (body?.coding ?? null) as CodingProfileSummary | null;
    const [row, userProfile] = await Promise.all([
      prisma.studentEvidence.findUnique({ where: { userId: session.user.id } }),
      prisma.profile.findUnique({ where: { userId: session.user.id }, select: { targetRole: true } }),
    ]);
    if (!row || !readInputs(row.evidence)) {
      return NextResponse.json(
        { error: "Upload your resume on the Resume Parser page first, then add coding profiles." },
        { status: 409 }
      );
    }

    const { evidence, scoring } = withCodingProfile(
      row.evidence as unknown as StoredEvidence,
      coding,
      userProfile?.targetRole ?? null
    );
    const data = {
      evidence: evidence as unknown as Prisma.InputJsonValue,
      scoring: scoring as unknown as Prisma.InputJsonValue,
    };
    await prisma.studentEvidence.update({ where: { userId: session.user.id }, data });

    return NextResponse.json({ success: true, data: { scoring } });
  } catch (error: unknown) {
    console.error("Failed to update coding evidence:", error);
    return NextResponse.json({ error: "Failed to update readiness report" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await prisma.studentEvidence.findUnique({
    where: { userId: session.user.id },
  });

  // A student who hasn't run an analysis yet is a normal state, not an error.
  return NextResponse.json({
    data: row ? { evidence: row.evidence, scoring: row.scoring, updatedAt: row.updatedAt } : null,
  });
}
