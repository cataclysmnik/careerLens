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
  profile: MeProfile | null
}
