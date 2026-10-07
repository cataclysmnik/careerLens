import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { ScoringResult } from "@/lib/scoring/engine";
import type { UnifiedEvidence } from "@/lib/evidence/aggregator";
import { readinessTier } from "@/lib/readiness";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const minScore = Number(searchParams.get("minScore") ?? 0);
  const hasPortfolio = searchParams.get("hasPortfolio");
  const targetRole = searchParams.get("targetRole");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { profile: true, evidence: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = students.map((s) => {
    const scoring = s.evidence?.scoring as unknown as ScoringResult | undefined;
    const evidence = s.evidence?.evidence as unknown as UnifiedEvidence | undefined;
    const overallScore = scoring?.overallScore ?? null;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      image: s.image,
      joinedAt: s.createdAt,
      targetRole: s.profile?.targetRole ?? null,
      experienceLevel: s.profile?.experienceLevel ?? null,
      location: s.profile?.location ?? null,
      githubUsername: s.profile?.githubUsername ?? null,
      portfolioUrl: s.profile?.portfolioUrl ?? null,
      linkedinUrl: s.profile?.linkedinUrl ?? null,
      overallScore,
      tier: readinessTier(overallScore),
      evidenceStrength: scoring?.evidenceStrength ?? null,
      categories: scoring?.categories ?? [],
      strengths: scoring?.strengths ?? [],
      gaps: scoring?.gaps ?? [],
      skills: (evidence?.skills ?? []).map((sk) => ({ name: sk.name, strength: sk.strength })),
      hasGithub: evidence?.hasGithub ?? false,
      hasPortfolio: evidence?.hasPortfolio ?? false,
      updatedAt: s.evidence?.updatedAt ?? null,
    };
  });

  const filtered = rows.filter((r) => {
    if (minScore > 0 && (r.overallScore === null || r.overallScore < minScore)) return false;
    if (hasPortfolio === "true" && !r.hasPortfolio) return false;
    if (targetRole && r.targetRole !== targetRole) return false;
    return true;
  });

  return NextResponse.json({ data: filtered });
}
