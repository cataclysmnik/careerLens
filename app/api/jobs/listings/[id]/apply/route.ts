import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isAcceptingApplications } from "@/lib/jobs/listings";
import { readInputs } from "@/lib/evidence/student-evidence";

type Ctx = { params: Promise<{ id: string }> };

async function context(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const listing = await prisma.jobListing.findUnique({ where: { id }, select: { id: true, status: true, deadline: true } });
  if (!listing) return { error: NextResponse.json({ error: "Listing not found" }, { status: 404 }) };
  if (!isAcceptingApplications(listing)) {
    return { error: NextResponse.json({ error: "This listing isn't accepting applications" }, { status: 409 }) };
  }
  return { userId: session.user.id, listing };
}

/** Apply. Companies rank applicants by their evidence, so an analyzed resume is required. */
export async function POST(_req: Request, { params }: Ctx) {
  const ctx = await context((await params).id);
  if ("error" in ctx) return ctx.error;

  const evidence = await prisma.studentEvidence.findUnique({ where: { userId: ctx.userId }, select: { evidence: true } });
  if (!readInputs(evidence?.evidence)) {
    return NextResponse.json({ error: "Analyze your resume first — companies rank applicants by their evidence scores." }, { status: 409 });
  }

  await prisma.jobApplication.upsert({
    where: { listingId_studentId: { listingId: ctx.listing.id, studentId: ctx.userId } },
    create: { listingId: ctx.listing.id, studentId: ctx.userId },
    update: {},
  });
  return NextResponse.json({ success: true }, { status: 201 });
}

/** Withdraw, while the listing is still open. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await context((await params).id);
  if ("error" in ctx) return ctx.error;
  await prisma.jobApplication.deleteMany({ where: { listingId: ctx.listing.id, studentId: ctx.userId } });
  return NextResponse.json({ success: true });
}
