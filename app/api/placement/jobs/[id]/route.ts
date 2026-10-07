import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { EMPLOYMENT_TYPE_LABEL, type EmploymentType } from "@/lib/jobs/listings";

type Ctx = { params: Promise<{ id: string }> };

/** Approve or reject a pending listing. Approval publishes it to students and notifies them. */
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const { action, note } = await req.json().catch(() => ({}));
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const reviewNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : null;
  if (action === "reject" && !reviewNote) {
    return NextResponse.json({ error: "Add a note telling the company why it was rejected" }, { status: 400 });
  }

  const listing = await prisma.jobListing.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  if (listing.status !== "PENDING") {
    return NextResponse.json({ error: `This listing is already ${listing.status.toLowerCase()}` }, { status: 409 });
  }

  await prisma.jobListing.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewNote,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  if (action === "approve") {
    const students = await prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true } });
    const type = EMPLOYMENT_TYPE_LABEL[listing.employmentType as EmploymentType] ?? listing.employmentType;
    const deadline = listing.deadline ? ` Apply by ${listing.deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.` : "";
    if (students.length) {
      await prisma.notification.createMany({
        data: students.map((s) => ({
          userId: s.id,
          title: `New ${type.toLowerCase()}: ${listing.title}`,
          body: `${listing.company.name ?? "A company"} is hiring for ${listing.title}${listing.location ? ` (${listing.location})` : ""}.${deadline} See it on the Jobs page.`,
        })),
      });
    }
  }

  return NextResponse.json({ success: true });
}
