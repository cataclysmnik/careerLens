import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await prisma.user.findMany({
    where: { status: "PENDING" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: pending });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, action } = await req.json();
    if (!userId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.status !== "PENDING") {
      return NextResponse.json({ error: "No pending account found" }, { status: 404 });
    }

    if (action === "approve") {
      await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
    } else {
      await prisma.user.delete({ where: { id: userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approval action failed:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
