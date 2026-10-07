import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { sendMail } from "@/lib/email"
import { generateResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/passwordReset"

const RESEND_COOLDOWN_MS = 60 * 1000

// Always answers the same way, whether or not the email has an account, so the
// endpoint can't be used to discover which emails are registered.
const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that email, a password reset link has been sent.",
}

export async function POST(req: Request) {
  let email: unknown
  try {
    ;({ email } = await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user?.email) return NextResponse.json(GENERIC_RESPONSE)

    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    })
    if (recent) return NextResponse.json(GENERIC_RESPONSE)

    // Only the newest link should work.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

    const { token, tokenHash } = generateResetToken()
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || new URL(req.url).origin
    const link = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`
    const action = user.password ? "reset your" : "set a"

    await sendMail({
      to: user.email,
      subject: "Reset your CareerLens password",
      text: `Use this link to ${action} CareerLens password. It expires in ${RESET_TOKEN_TTL_MINUTES} minutes.\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Use the link below to ${action} CareerLens password. It expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p><p><a href="${link}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    })
  } catch (error) {
    console.error("Password reset request failed:", error)
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
