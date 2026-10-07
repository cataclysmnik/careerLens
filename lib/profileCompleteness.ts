import type { Me } from "@/lib/types/me"

export function profileChecklist(me: Me) {
  const p = me.profile
  return [
    { label: "Name", done: !!me.name },
    { label: "Target role", done: !!p?.targetRole },
    { label: "Experience level", done: !!p?.experienceLevel },
    { label: "Location", done: !!p?.location },
    { label: "Skills", done: (p?.skills.length ?? 0) > 0 },
    { label: "Academics (CGPA)", done: p?.cgpa != null },
    { label: "GitHub", done: !!p?.githubUsername },
    {
      label: "Coding profile",
      done: !!(p?.leetcodeUsername || p?.codeforcesHandle || p?.codechefUsername || p?.hackerrankUsername || p?.gfgUsername),
    },
    { label: "Portfolio", done: !!p?.portfolioUrl },
    { label: "LinkedIn", done: !!p?.linkedinUrl },
  ]
}

export function profileCompleteness(me: Me) {
  const checklist = profileChecklist(me)
  return Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)
}
