import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  status: true,
  createdAt: true,
  password: true,
  profile: {
    select: {
      targetRole: true,
      location: true,
      experienceLevel: true,
      preferredIndustries: true,
      skills: true,
      githubUsername: true,
      portfolioUrl: true,
      linkedinUrl: true,
    },
  },
} as const

async function loadMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })
  if (!user) return null
  const { password, ...rest } = user
  return { ...rest, hasPassword: !!password }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const me = await loadMe(session.user.id)
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ data: me })
}

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") throw new Error("Invalid field")
  const trimmed = value.trim()
  if (trimmed.length > max) throw new Error(`Must be ${max} characters or fewer`)
  return trimmed || null
}

function optionalUrl(value: unknown, label: string): string | null {
  const text = optionalText(value, 300)
  if (!text) return null
  try {
    const url = new URL(text)
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString()
  } catch {}
  throw new Error(`${label} must be a valid http(s) URL`)
}

function stringList(value: unknown, maxItems: number): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error("Invalid list")
  const items = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && v.length <= 60)
  return [...new Set(items)].slice(0, maxItems)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const name = optionalText(body.name, 100)
    if (!name) throw new Error("Name is required")

    const githubUsername = optionalText(body.githubUsername, 39)
    if (githubUsername && !/^[A-Za-z0-9-]+$/.test(githubUsername)) {
      throw new Error("GitHub username can only contain letters, numbers and hyphens")
    }

    const profile = {
      targetRole: optionalText(body.targetRole, 100),
      location: optionalText(body.location, 100),
      experienceLevel: optionalText(body.experienceLevel, 50),
      githubUsername,
      portfolioUrl: optionalUrl(body.portfolioUrl, "Portfolio URL"),
      linkedinUrl: optionalUrl(body.linkedinUrl, "LinkedIn URL"),
      skills: stringList(body.skills, 50),
      preferredIndustries: stringList(body.preferredIndustries, 20),
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        profile: { upsert: { create: profile, update: profile } },
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  return NextResponse.json({ data: await loadMe(session.user.id) })
}
