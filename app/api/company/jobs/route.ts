import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { extractListingRequirements, parseListingInput } from "@/lib/jobs/listings";

export const maxDuration = 60;

/** The company's own listings, newest first. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listings = await prisma.jobListing.findMany({
    where: { companyId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, location: true, employmentType: true, ctc: true, deadline: true,
      status: true, reviewNote: true, reviewedAt: true, createdAt: true,
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json({
    data: listings.map(({ _count, ...l }) => ({ ...l, applicantCount: _count.applications })),
  });
}

/** Create a listing. It stays PENDING until the placement cell approves it. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let input;
  try {
    input = parseListingInput(await req.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid listing" }, { status: 400 });
  }

  try {
    // The LLM reads the JD once here; applicants are later scored against
    // these stored requirements by the deterministic engine.
    const requirements = await extractListingRequirements(input.description);
    const listing = await prisma.jobListing.create({
      data: {
        ...input,
        companyId: session.user.id,
        requirements: requirements as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ data: listing }, { status: 201 });
  } catch (error) {
    console.error("Failed to create job listing:", error);
    return NextResponse.json({ error: "Could not create the listing" }, { status: 500 });
  }
}
