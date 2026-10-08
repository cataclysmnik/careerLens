import type { AccountStatus, Role } from "@prisma/client"

export type MeProfile = {
  targetRole: string | null
  location: string | null
  experienceLevel: string | null
  preferredIndustries: string[]
  skills: string[]
  githubUsername: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  cgpa: number | null
  tenthPercentage: number | null
  twelfthPercentage: number | null
  leetcodeUsername: string | null
  codeforcesHandle: string | null
  codechefUsername: string | null
  hackerrankUsername: string | null
  gfgUsername: string | null
  kaggleUsername: string | null
}

export type Me = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: Role
  status: AccountStatus
  createdAt: string
  hasPassword: boolean
  /** A readiness analysis is saved (students only). */
  hasAnalysis: boolean
  profile: MeProfile | null
}
