import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { readRequirements, requirementSummary } from "@/lib/jobs/listings";

/** Every listing, pending first, for the placement cell to review. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listings = await prisma.jobListing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      company: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true } },
      _count: { select: { applications: true } },
    },
  });

  const order = { PENDING: 0, APPROVED: 1, CLOSED: 2, REJECTED: 3 } as const;
  return NextResponse.json({
    data: listings
      .sort((a, b) => order[a.status] - order[b.status])
      .map(({ requirements, _count, reviewedBy, ...l }) => ({
        ...l,
        reviewedByName: reviewedBy?.name ?? null,
        applicantCount: _count.applications,
        requirementSummary: requirementSummary(readRequirements(requirements)),
      })),
  });
}
