import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { hashResetToken, MIN_PASSWORD_LENGTH } from "@/lib/passwordReset"

const INVALID_LINK = "This reset link is invalid or has expired. Request a new one."

export async function POST(req: Request) {
  let token: unknown, password: unknown
  try {
    ;({ token, password } = await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    )
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  })
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  // Claim the token atomically so two concurrent submits can't both use it.
  const claimed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.passwordResetToken.updateMany({
      where: { id: resetToken.id, usedAt: null },
      data: { usedAt: new Date() },
    })
    if (count === 0) return false
    await tx.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } })
    await tx.passwordResetToken.deleteMany({ where: { userId: resetToken.userId, usedAt: null } })
    return true
  })
  if (!claimed) {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
