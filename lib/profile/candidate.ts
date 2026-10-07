// lib/profile/candidate.ts
//
// The structured candidate profile every downstream score is computed from.
// Produced by the LLM (lib/llm/extract-resume.ts) or, without an API key, by
// the regex fallback below. Either way the shape is identical.

import type { CandidateExtraction, Education } from '@/lib/llm/schemas';
import type { ParsedResume } from '@/lib/evidence/parsers/resume-parser';
import { canonicalizeSkill } from '@/lib/scoring/skill-taxonomy';

export type CandidateProfile = CandidateExtraction & {
  source: 'llm' | 'fallback';
  /** ISO timestamp — also the "as of" date for experience and recency maths. */
  extractedAt: string;
  warnings: string[];
};

const clampNum = (v: number | null, min: number, max: number) =>
  v === null || !Number.isFinite(v) || v < min || v > max ? null : v;

/** Coerce LLM output into sane ranges and fill gaps the deterministic parser can cover. */
export function sanitizeExtraction(
  raw: CandidateExtraction,
  parsed: ParsedResume | null,
  source: CandidateProfile['source'],
  warnings: string[] = []
): CandidateProfile {
  const education = raw.education.map((e) => sanitizeEducation(e, warnings));

  const projects = raw.projects.map((p) => ({
    ...p,
    featureCount: Math.max(0, Math.min(50, Math.round(p.featureCount || 0))),
    skills: dedupeStrings(p.skills),
    components: dedupeStrings(p.components),
    architecturePatterns: dedupeStrings(p.architecturePatterns),
  }));

  const experience = raw.experience.map((x) => ({ ...x, skills: dedupeStrings(x.skills) }));

  // Every skill used in a project or role is also a resume claim, even if the
  // skills section forgot to list it.
  type Skill = CandidateExtraction['skills'][number];
  const skillMap = new Map<string, Skill>();
  for (const s of raw.skills) {
    const id = canonicalizeSkill(s.name).id;
    const prev = skillMap.get(id);
    skillMap.set(id, { name: s.name, listedInSkillsSection: s.listedInSkillsSection || !!prev?.listedInSkillsSection, kind: s.kind ?? prev?.kind ?? 'technical' });
  }
  for (const name of [...projects.flatMap((p) => p.skills), ...experience.flatMap((x) => x.skills)]) {
    const id = canonicalizeSkill(name).id;
    // Project and role skill lists hold technical skills only (see the prompt).
    if (!skillMap.has(id)) skillMap.set(id, { name, listedInSkillsSection: false, kind: 'technical' });
  }
  // Keyword parser hits the LLM skipped (rare, but cheap insurance).
  for (const name of parsed?.skills ?? []) {
    const id = canonicalizeSkill(name).id;
    if (!skillMap.has(id)) skillMap.set(id, { name, listedInSkillsSection: true, kind: 'technical' });
  }

  const links = { ...raw.links, other: dedupeStrings(raw.links.other) };
  for (const l of parsed?.links ?? []) {
    if (!links.github && /github\.com\/[^/\s]+/i.test(l)) links.github = l;
    else if (!links.linkedin && /linkedin\.com\/in\//i.test(l)) links.linkedin = l;
  }

  return {
    ...raw,
    email: raw.email ?? parsed?.emails[0] ?? null,
    links,
    education,
    experience,
    projects,
    skills: Array.from(skillMap.values()),
    activeBacklogs: clampNum(raw.activeBacklogs, 0, 50),
    source,
    extractedAt: new Date().toISOString(),
    warnings,
  };
}

function sanitizeEducation(e: Education, warnings: string[]): Education {
  const score = { ...e.score };
  if (score.type === 'cgpa') {
    const outOf = score.outOf && score.outOf > 0 ? score.outOf : score.value !== null && score.value <= 4 ? 4 : 10;
    score.outOf = outOf;
    if (score.value !== null && (score.value < 0 || score.value > outOf)) {
      warnings.push(`Ignored CGPA ${score.value}/${outOf} for ${e.degree ?? e.level} — out of range.`);
      score.value = null;
    }
  } else if (score.type === 'percentage') {
    score.outOf = 100;
    if (score.value !== null && (score.value < 0 || score.value > 100)) {
      warnings.push(`Ignored percentage ${score.value} for ${e.degree ?? e.level} — out of range.`);
      score.value = null;
    }
  } else {
    score.value = null;
    score.outOf = null;
  }
  return { ...e, score };
}

function dedupeStrings(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const t = s.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fallback: no LLM available
// ---------------------------------------------------------------------------

const CGPA_RE = /\b(?:c\.?g\.?p\.?a|g\.?p\.?a|cpi|sgpa)\b\s*[:\-–]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/\s*(10|4(?:\.0)?))?/i;
const PERCENT_RE = /(\d{2}(?:\.\d{1,2})?)\s*%/;
const CLASS10_RE = /\b(10th|x\b|class\s*x\b|class\s*10|ssc|sslc|secondary school|matriculation|icse|cbse\s*\(?x)/i;
const CLASS12_RE = /\b(12th|xii\b|class\s*xii|class\s*12|hsc|higher secondary|senior secondary|intermediate|puc|isc)/i;

/**
 * Build a profile from the keyword parser alone. Academics are pulled with
 * regexes; projects and experience can't be structured reliably without the
 * LLM, so they stay empty and the profile is flagged as partial.
 */
export function buildFallbackProfile(parsed: ParsedResume, fullText: string, reason: string): CandidateProfile {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const education: Education[] = [];

  const cgpa = fullText.match(CGPA_RE);
  if (cgpa) {
    education.push({
      level: 'undergraduate', degree: null, field: null, institution: null, board: null,
      startYear: null, endYear: null, isOngoing: false,
      score: { type: 'cgpa', value: Number(cgpa[1]), outOf: cgpa[2] ? Number(cgpa[2]) : Number(cgpa[1]) <= 4 ? 4 : 10 },
    });
  }

  const findPercentNear = (re: RegExp): number | null => {
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      for (const l of [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean)) {
        const m = l.match(PERCENT_RE);
        if (m) return Number(m[1]);
      }
    }
    return null;
  };
  const p12 = findPercentNear(CLASS12_RE);
  const p10 = findPercentNear(CLASS10_RE);
  for (const [level, value] of [['class12', p12], ['class10', p10]] as const) {
    if (value !== null) {
      education.push({
        level, degree: null, field: null, institution: null, board: null,
        startYear: null, endYear: null, isOngoing: false,
        score: { type: 'percentage', value, outOf: 100 },
      });
    }
  }

  const github = parsed.links.find((l) => /github\.com\/[^/\s]+/i.test(l)) ?? null;
  const linkedin = parsed.links.find((l) => /linkedin\.com\/in\//i.test(l)) ?? null;

  return sanitizeExtraction(
    {
      name: null,
      email: parsed.emails[0] ?? null,
      phone: null,
      location: null,
      headline: null,
      links: { github, linkedin, portfolio: null, other: parsed.links.filter((l) => l !== github && l !== linkedin) },
      education,
      experience: [],
      projects: [],
      // The keyword parser only matches the technical skill dictionary.
      skills: parsed.skills.map((name) => ({ name, listedInSkillsSection: true, kind: 'technical' as const })),
      certifications: [],
      achievements: [],
      activeBacklogs: null,
    },
    parsed,
    'fallback',
    [reason]
  );
}
