import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { ScoringResult } from "@/lib/scoring/engine";
import type { UnifiedEvidence } from "@/lib/evidence/aggregator";
import { readinessTier, TIER_ORDER, type ReadinessTier } from "@/lib/readiness";
import { currentScoring } from "@/lib/evidence/student-evidence";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [students, pendingApprovals] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        profile: { select: { targetRole: true, branch: true } },
        evidence: { select: { evidence: true, scoring: true, updatedAt: true } },
      },
    }),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);

  const analyzed = students
    .filter((s) => s.evidence)
    .map((s) => {
      // Stale reports are re-scored in memory (the students endpoint saves them).
      const scoring = currentScoring(s.evidence!.evidence, s.evidence!.scoring, s.profile?.targetRole ?? null).scoring as unknown as ScoringResult;
      const evidence = s.evidence!.evidence as unknown as UnifiedEvidence;
      return { id: s.id, name: s.name, email: s.email, branch: s.profile?.branch, scoring, evidence, updatedAt: s.evidence!.updatedAt };
    });
  const n = analyzed.length;
  const pct = (count: number) => (n > 0 ? Math.round((count / n) * 100) : 0);

  const scores = analyzed.map((a) => a.scoring.overallScore);
  const averageScore = n > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / n) : 0;

  const scoreDistribution = { "0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  scores.forEach((s) => {
    if (s <= 40) scoreDistribution["0-40"]++;
    else if (s <= 60) scoreDistribution["41-60"]++;
    else if (s <= 80) scoreDistribution["61-80"]++;
    else scoreDistribution["81-100"]++;
  });

  const tierCounts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0])) as Record<ReadinessTier, number>;
  tierCounts.NOT_ANALYZED = students.length - n;
  scores.forEach((s) => tierCounts[readinessTier(s)]++);

  const categoryTotals = new Map<string, number>();
  analyzed.forEach((a) =>
    a.scoring.categories.forEach((c) => categoryTotals.set(c.title, (categoryTotals.get(c.title) ?? 0) + c.score))
  );
  const categoryAverages = Array.from(categoryTotals, ([title, total]) => ({ title, average: Math.round(total / n) }));

  const gapCounts = new Map<string, number>();
  analyzed.forEach((a) => a.scoring.gaps.forEach((g) => gapCounts.set(g.title, (gapCounts.get(g.title) ?? 0) + 1)));
  const topGaps = Array.from(gapCounts, ([title, count]) => ({ title, count, pct: pct(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const roleCounts = new Map<string, number>();
  students.forEach((s) => {
    const role = s.profile?.targetRole?.trim() || "Not set";
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  });
  const targetRoles = Array.from(roleCounts, ([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const branchData = new Map<string, { totalScore: number; count: number; gaps: Map<string, number> }>();
  analyzed.forEach((a) => {
    const branch = a.branch || "Not set";
    if (!branchData.has(branch)) branchData.set(branch, { totalScore: 0, count: 0, gaps: new Map() });
    const b = branchData.get(branch)!;
    b.totalScore += a.scoring.overallScore;
    b.count++;
    a.scoring.gaps.forEach((g) => b.gaps.set(g.title, (b.gaps.get(g.title) ?? 0) + 1));
  });

  const branchInsights = Array.from(branchData, ([branch, d]) => {
    const topGap = Array.from(d.gaps.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      branch,
      students: d.count,
      avgScore: Math.round(d.totalScore / d.count),
      commonGap: topGap ? topGap[0] : null,
      gapPct: topGap ? Math.round((topGap[1] / d.count) * 100) : 0,
    };
  }).sort((a, b) => b.students - a.students);

  const brief = (a: (typeof analyzed)[number]) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    score: a.scoring.overallScore,
    topGap: a.scoring.gaps[0]?.title ?? null,
    updatedAt: a.updatedAt,
  });
  const byScore = [...analyzed].sort((a, b) => b.scoring.overallScore - a.scoring.overallScore);

  return NextResponse.json({
    data: {
      totalStudents: students.length,
      analyzedStudents: n,
      averageScore,
      scoreDistribution,
      tierCounts,
      categoryAverages,
      pctWithGithub: pct(analyzed.filter((a) => a.evidence.hasGithub).length),
      pctWithPortfolio: pct(analyzed.filter((a) => a.evidence.hasPortfolio).length),
      topGaps,
      targetRoles,
      branchInsights,
      topStudents: byScore.slice(0, 5).map(brief),
      needsAttention: byScore
        .filter((a) => readinessTier(a.scoring.overallScore) === "NEEDS_SUPPORT")
        .reverse()
        .slice(0, 5)
        .map(brief),
      recentlyAnalyzed: [...analyzed]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
        .map(brief),
      pendingApprovals,
    },
  });
}
