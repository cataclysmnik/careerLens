// lib/profile/academics.ts
// Deterministic derivations over the extracted profile: academic scores on a
// common scale and experience duration from dates.

import { CGPA_TO_PERCENT_FACTOR } from '@/lib/scoring/config';
import type { CandidateProfile } from './candidate';
import type { Education, Experience } from '@/lib/llm/schemas';

export type AcademicScore = {
  /** As written on the resume, e.g. "8.4 / 10" or "91.2%". */
  display: string;
  /** Percentage on a 0–100 scale (converted from CGPA when needed). */
  percent: number;
  /** CGPA on a 10-point scale (converted from percentage when needed). */
  cgpa10: number;
  /** Which of the two numbers above was actually on the resume; the other is converted. */
  statedAs: 'cgpa' | 'percentage';
  institution: string | null;
  qualification: string | null;
  year: number | null;
};

export type AcademicSummary = {
  graduation: AcademicScore | null;
  postgraduation: AcademicScore | null;
  class12: AcademicScore | null;
  class10: AcademicScore | null;
  highestLevel: Education['level'] | null;
  graduationYear: number | null;
  degrees: string[];
  fields: string[];
};

function toAcademicScore(e: Education): AcademicScore | null {
  const { type, value, outOf } = e.score;
  if (value === null || type === 'none') return null;
  const qualification = [e.degree, e.field].filter(Boolean).join(', ') || e.board || null;
  const base = { institution: e.institution, qualification, year: e.endYear };
  if (type === 'percentage') {
    return { ...base, display: `${value}%`, percent: value, cgpa10: value / CGPA_TO_PERCENT_FACTOR, statedAs: 'percentage' };
  }
  const scale = outOf && outOf > 0 ? outOf : 10;
  const cgpa10 = (value / scale) * 10;
  return {
    ...base,
    display: `${value} / ${scale}`,
    cgpa10,
    percent: Math.min(100, cgpa10 * CGPA_TO_PERCENT_FACTOR),
    statedAs: 'cgpa',
  };
}

const LEVEL_RANK: Record<Education['level'], number> = {
  doctorate: 6, postgraduate: 5, undergraduate: 4, diploma: 3, class12: 2, class10: 1, other: 0,
};

/** Latest entry of a level (ongoing first, then by end year). */
function pick(education: Education[], level: Education['level']): Education | null {
  const matches = education.filter((e) => e.level === level);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => Number(b.isOngoing) - Number(a.isOngoing) || (b.endYear ?? 0) - (a.endYear ?? 0))[0];
}

export function summarizeAcademics(profile: CandidateProfile): AcademicSummary {
  const edu = profile.education;
  const ug = pick(edu, 'undergraduate') ?? pick(edu, 'diploma');
  const pg = pick(edu, 'postgraduate');
  const highest = [...edu].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0] ?? null;
  const graduating = pg ?? ug;

  return {
    graduation: ug ? toAcademicScore(ug) : null,
    postgraduation: pg ? toAcademicScore(pg) : null,
    class12: (() => { const e = pick(edu, 'class12'); return e ? toAcademicScore(e) : null; })(),
    class10: (() => { const e = pick(edu, 'class10'); return e ? toAcademicScore(e) : null; })(),
    highestLevel: highest?.level ?? null,
    graduationYear: graduating?.endYear ?? null,
    degrees: edu.filter((e) => LEVEL_RANK[e.level] >= LEVEL_RANK.diploma).map((e) => e.degree).filter((d): d is string => !!d),
    fields: edu.filter((e) => LEVEL_RANK[e.level] >= LEVEL_RANK.diploma).map((e) => e.field).filter((f): f is string => !!f),
  };
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

/** Parse "YYYY-MM" / "YYYY" into a Date at the start (or end, for end dates) of that period. */
export function parseResumeDate(value: string | null, end = false): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1950 || year > 2100) return null;
  const month = m[2] ? Math.min(12, Math.max(1, Number(m[2]))) : end ? 12 : 1;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function experienceMonths(x: Experience, asOf: Date): number | null {
  const start = parseResumeDate(x.startDate);
  if (!start) return null;
  const end = x.isCurrent ? asOf : parseResumeDate(x.endDate, true) ?? null;
  if (!end || end < start) return null;
  // Inclusive month count: Jan–Mar is 3 months.
  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()) + 1;
  return Math.max(0, months);
}

export type ExperienceSummary = {
  totalMonths: number;
  internshipMonths: number;
  professionalMonths: number;
  /** Roles whose dates couldn't be read — excluded from the totals, not counted as 0. */
  undatedRoles: number;
  roles: { index: number; title: string; organization: string | null; type: Experience['employmentType']; months: number | null }[];
};

/**
 * Totals use the union of date ranges, so two overlapping internships don't
 * double-count calendar time.
 */
export function summarizeExperience(profile: CandidateProfile, asOf: Date): ExperienceSummary {
  const roles = profile.experience.map((x, index) => ({
    index,
    title: x.title,
    organization: x.organization,
    type: x.employmentType,
    months: experienceMonths(x, asOf),
  }));

  const monthsCovered = (filter: (x: Experience) => boolean) => {
    const covered = new Set<string>();
    for (const x of profile.experience) {
      if (!filter(x)) continue;
      const start = parseResumeDate(x.startDate);
      const end = x.isCurrent ? asOf : parseResumeDate(x.endDate, true);
      if (!start || !end || end < start) continue;
      const d = new Date(start);
      while (d <= end) {
        covered.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
    }
    return covered.size;
  };

  const countable = (x: Experience) => x.employmentType !== 'volunteer';
  return {
    totalMonths: monthsCovered(countable),
    internshipMonths: monthsCovered((x) => x.employmentType === 'internship'),
    professionalMonths: monthsCovered((x) => countable(x) && x.employmentType !== 'internship'),
    undatedRoles: roles.filter((r) => r.months === null).length,
    roles,
  };
}

export function formatMonths(months: number): string {
  if (months <= 0) return '0 months';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ');
}
