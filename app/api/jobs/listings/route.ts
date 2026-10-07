import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isAcceptingApplications, readRequirements, requirementSummary, scoreApplicant } from "@/lib/jobs/listings";
import { VERDICT_LABEL } from "@/lib/scoring/verdict";

/** Approved listings (plus any the student applied to), each with the student's own fit. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = session.user.id;

  const [listings, evidence] = await Promise.all([
    prisma.jobListing.findMany({
      where: { OR: [{ status: "APPROVED" }, { applications: { some: { studentId: userId } } }] },
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        applications: { where: { studentId: userId }, select: { createdAt: true } },
      },
    }),
    prisma.studentEvidence.findUnique({ where: { userId }, select: { evidence: true } }),
  ]);

  return NextResponse.json({
    data: listings.map(({ requirements, applications, company, companyId: _companyId, reviewedById: _reviewer, ...l }) => {
      const stored = readRequirements(requirements);
      const fit = scoreApplicant(evidence?.evidence, stored);
      return {
        ...l,
        companyName: company.name,
        accepting: isAcceptingApplications(l),
        appliedAt: applications[0]?.createdAt ?? null,
        requirementSummary: requirementSummary(stored),
        myFit: fit && {
          score: fit.roleFit,
          verdict: fit.verdict,
          verdictLabel: VERDICT_LABEL[fit.verdict],
          verdictReason: fit.verdictReason,
          eligible: fit.eligibility.status !== "not_eligible",
          failedChecks: fit.eligibility.checks.filter((c) => c.status === "fail").map((c) => `${c.label}: needs ${c.required}, you have ${c.actual}`),
          topGaps: fit.gaps.slice(0, 3).map((g) => ({ label: g.label, score: Math.round(g.score), target: g.target })),
        },
      };
    }),
  });
}
