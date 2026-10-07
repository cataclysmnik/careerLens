import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readRequirements, requirementSummary, scoreApplicant } from "@/lib/jobs/listings";
import { VERDICT_LABEL } from "@/lib/scoring/verdict";

type Ctx = { params: Promise<{ id: string }> };

async function ownListing(id: string, companyId: string) {
  const listing = await prisma.jobListing.findUnique({ where: { id } });
  return listing && listing.companyId === companyId ? listing : null;
}

/** A listing with its applicants, scored against the listing and sorted by score (highest first). */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const listing = await ownListing(id, session.user.id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const applications = await prisma.jobApplication.findMany({
    where: { listingId: id },
    select: {
      createdAt: true,
      student: {
        select: {
          id: true, name: true, email: true, image: true,
          profile: { select: { cgpa: true, tenthPercentage: true, twelfthPercentage: true } },
          evidence: { select: { evidence: true } },
        },
      },
    },
  });

  const stored = readRequirements(listing.requirements);
  const applicants = applications
    .map(({ createdAt, student }) => {
      const fit = scoreApplicant(student.evidence?.evidence, stored);
      return {
        studentId: student.id,
        name: student.name,
        email: student.email,
        image: student.image,
        appliedAt: createdAt,
        cgpa: student.profile?.cgpa ?? null,
        tenthPercentage: student.profile?.tenthPercentage ?? null,
        twelfthPercentage: student.profile?.twelfthPercentage ?? null,
        score: fit?.roleFit ?? null,
        exactScore: fit?.exactRoleFit ?? null,
        verdict: fit?.verdict ?? null,
        verdictLabel: fit ? VERDICT_LABEL[fit.verdict] : null,
        eligible: fit ? fit.eligibility.status !== "not_eligible" : null,
        readiness: fit?.readinessForRole.overallScore ?? null,
        fit,
      };
    })
    // Highest score first; students without an analysis go last; ties: earliest applicant first.
    .sort((a, b) => (b.exactScore ?? -1) - (a.exactScore ?? -1) || a.appliedAt.getTime() - b.appliedAt.getTime());

  const { requirements, ...rest } = listing;
  return NextResponse.json({
    data: { ...rest, requirementSummary: requirementSummary(readRequirements(requirements)), applicants },
  });
}

/** Close an approved listing, or reopen a closed one. */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const listing = await ownListing(id, session.user.id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const { action } = await req.json().catch(() => ({}));
  if (action === "close" && listing.status === "APPROVED") {
    await prisma.jobListing.update({ where: { id }, data: { status: "CLOSED" } });
  } else if (action === "reopen" && listing.status === "CLOSED") {
    // It was approved before it was closed, so it doesn't need another review.
    await prisma.jobListing.update({ where: { id }, data: { status: "APPROVED" } });
  } else {
    return NextResponse.json({ error: `Can't ${action ?? "change"} a ${listing.status.toLowerCase()} listing` }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
