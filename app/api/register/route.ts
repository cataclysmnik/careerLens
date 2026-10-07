import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

const VALID_ROLES: Role[] = ["STUDENT", "PLACEMENT_CELL", "COMPANY"]

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const requestedRole: Role = VALID_ROLES.includes(role) ? role : "STUDENT"

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    if (requestedRole === "STUDENT") {
      await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: "STUDENT",
          status: "ACTIVE",
          profile: {
            create: {} // create an empty profile for the user
          }
        }
      })
      return NextResponse.json({ success: true, status: "ACTIVE" }, { status: 201 })
    }

    // Company / Placement-Cell accounts start PENDING until an existing
    // active Placement-Cell user approves them -- except the very first
    // Placement-Cell account ever created, which bootstraps the chain.
    let status: "ACTIVE" | "PENDING" = "PENDING"
    if (requestedRole === "PLACEMENT_CELL") {
      const activePlacementCellCount = await prisma.user.count({
        where: { role: "PLACEMENT_CELL", status: "ACTIVE" }
      })
      if (activePlacementCellCount === 0) status = "ACTIVE"
    }

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: requestedRole,
        status,
      }
    })

    return NextResponse.json({ success: true, status }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
