import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { evidence, scoring } = await req.json();
    if (!evidence || !scoring) {
      return NextResponse.json({ error: "Missing evidence or scoring" }, { status: 400 });
    }

    await prisma.studentEvidence.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, evidence, scoring },
      update: { evidence, scoring },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to persist student evidence:", error);
    return NextResponse.json({ error: "Failed to save evidence" }, { status: 500 });
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
