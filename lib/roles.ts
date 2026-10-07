import type { Role } from "@prisma/client"

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  PLACEMENT_CELL: "Placement Cell",
  COMPANY: "Company",
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  STUDENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PLACEMENT_CELL: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  COMPANY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?"
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}
