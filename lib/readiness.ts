export type ReadinessTier = "READY" | "DEVELOPING" | "NEEDS_SUPPORT" | "NOT_ANALYZED"

export const TIER_ORDER: ReadinessTier[] = ["READY", "DEVELOPING", "NEEDS_SUPPORT", "NOT_ANALYZED"]

export function readinessTier(score: number | null | undefined): ReadinessTier {
  if (score == null) return "NOT_ANALYZED"
  if (score >= 70) return "READY"
  if (score >= 40) return "DEVELOPING"
  return "NEEDS_SUPPORT"
}

export const TIER_LABEL: Record<ReadinessTier, string> = {
  READY: "Placement ready",
  DEVELOPING: "Developing",
  NEEDS_SUPPORT: "Needs support",
  NOT_ANALYZED: "Not analyzed",
}

export const TIER_DESCRIPTION: Record<ReadinessTier, string> = {
  READY: "Score 70+ — strong, verifiable evidence across categories.",
  DEVELOPING: "Score 40–69 — solid base with clear gaps to close.",
  NEEDS_SUPPORT: "Score under 40 — needs more evidence and guidance.",
  NOT_ANALYZED: "Hasn't run a resume analysis yet.",
}

export const TIER_BADGE_CLASS: Record<ReadinessTier, string> = {
  READY: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DEVELOPING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  NEEDS_SUPPORT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  NOT_ANALYZED: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400",
}

export const TIER_BAR_CLASS: Record<ReadinessTier, string> = {
  READY: "bg-green-500",
  DEVELOPING: "bg-blue-500",
  NEEDS_SUPPORT: "bg-amber-500",
  NOT_ANALYZED: "bg-gray-300 dark:bg-zinc-600",
}

export function scoreTextClass(score: number) {
  const tier = readinessTier(score)
  return tier === "READY" ? "text-green-600" : tier === "DEVELOPING" ? "text-blue-600" : "text-amber-600"
}
