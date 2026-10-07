import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { ScoringResult } from "@/lib/scoring/engine";
import type { UnifiedEvidence } from "@/lib/evidence/aggregator";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.studentEvidence.findMany();
  const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } });

  const scores = rows.map((r) => (r.scoring as unknown as ScoringResult).overallScore);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const buckets = { "0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  scores.forEach((s) => {
    if (s <= 40) buckets["0-40"]++;
    else if (s <= 60) buckets["41-60"]++;
    else if (s <= 80) buckets["61-80"]++;
    else buckets["81-100"]++;
  });

  const withGithub = rows.filter((r) => (r.evidence as unknown as UnifiedEvidence).hasGithub).length;
  const withPortfolio = rows.filter((r) => (r.evidence as unknown as UnifiedEvidence).hasPortfolio).length;

  const gapCounts = new Map<string, number>();
  rows.forEach((r) => {
    (r.scoring as unknown as ScoringResult).gaps.forEach((g) => {
      gapCounts.set(g.title, (gapCounts.get(g.title) ?? 0) + 1);
    });
  });
  const topGaps = Array.from(gapCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  return NextResponse.json({
    data: {
      totalStudents,
      analyzedStudents: rows.length,
      averageScore,
      scoreDistribution: buckets,
      pctWithGithub: rows.length > 0 ? Math.round((withGithub / rows.length) * 100) : 0,
      pctWithPortfolio: rows.length > 0 ? Math.round((withPortfolio / rows.length) * 100) : 0,
      topGaps,
    },
  });
}
