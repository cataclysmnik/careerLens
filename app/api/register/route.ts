import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        profile: {
          create: {} // create an empty profile for the user
        }
      }
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
