import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db/prisma"
import { CODING_PLATFORMS, HANDLE_FIELD, PLATFORM_INFO, parseCodingHandle } from "@/lib/coding/handles"

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  status: true,
  createdAt: true,
  password: true,
  evidence: { select: { id: true } },
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
      cgpa: true,
      tenthPercentage: true,
      twelfthPercentage: true,
      leetcodeUsername: true,
      codeforcesHandle: true,
      codechefUsername: true,
      hackerrankUsername: true,
      gfgUsername: true,
    },
  },
} as const

async function loadMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })
  if (!user) return null
  const { password, evidence, ...rest } = user
  // Students unlock the rest of the app once their first analysis is saved.
  return { ...rest, hasPassword: !!password, hasAnalysis: !!evidence }
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

function optionalNumber(value: unknown, label: string, max: number): number | null {
  if (value === undefined || value === null || value === "") return null
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${label} must be a number between 0 and ${max}`)
  return Math.round(n * 100) / 100
}

function codingHandles(body: Record<string, unknown>) {
  const handles: Record<string, string | null> = {}
  for (const platform of CODING_PLATFORMS) {
    const field = HANDLE_FIELD[platform]
    const raw = optionalText(body[field], 200)
    const handle = raw ? parseCodingHandle(platform, raw) : null
    if (raw && !handle) throw new Error(`${PLATFORM_INFO[platform].label}: enter a username or profile URL`)
    handles[field] = handle
  }
  return handles
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
      cgpa: optionalNumber(body.cgpa, "CGPA", 10),
      tenthPercentage: optionalNumber(body.tenthPercentage, "10th percentage", 100),
      twelfthPercentage: optionalNumber(body.twelfthPercentage, "12th percentage", 100),
      ...codingHandles(body),
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
