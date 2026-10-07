import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// GET: any authenticated role lists their own notifications.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: notifications });
}

// POST: Placement Cell sends a notification to one, several, or all students.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { studentIds, title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: "Missing title or body" }, { status: 400 });
    }

    let targetIds: string[];
    if (studentIds === "all") {
      const students = await prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true } });
      targetIds = students.map((s) => s.id);
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetIds = studentIds;
    } else {
      return NextResponse.json({ error: "Missing studentIds" }, { status: 400 });
    }

    await prisma.notification.createMany({
      data: targetIds.map((userId) => ({ userId, title, body })),
    });

    return NextResponse.json({ success: true, sentTo: targetIds.length });
  } catch (error) {
    console.error("Failed to send notification:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH: mark one of the caller's own notifications as read.
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.notification.update({ where: { id }, data: { read: true } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
