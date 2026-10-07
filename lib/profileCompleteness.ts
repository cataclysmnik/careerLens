import type { Me } from "@/lib/types/me"

export function profileChecklist(me: Me) {
  const p = me.profile
  return [
    { label: "Name", done: !!me.name },
    { label: "Target role", done: !!p?.targetRole },
    { label: "Experience level", done: !!p?.experienceLevel },
    { label: "Location", done: !!p?.location },
    { label: "Skills", done: (p?.skills.length ?? 0) > 0 },
    { label: "GitHub", done: !!p?.githubUsername },
    { label: "Portfolio", done: !!p?.portfolioUrl },
    { label: "LinkedIn", done: !!p?.linkedinUrl },
  ]
}

export function profileCompleteness(me: Me) {
  const checklist = profileChecklist(me)
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)
}
