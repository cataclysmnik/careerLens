import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { initialStatusFor, parseRole } from "@/lib/accountStatus"

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const requestedRole = parseRole(role)

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const status = await initialStatusFor(requestedRole)

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: requestedRole,
        status,
        ...(requestedRole === "STUDENT" && { profile: { create: {} } }),
      }
    })

    return NextResponse.json({ success: true, status }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
