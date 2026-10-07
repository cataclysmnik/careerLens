// lib/scoring/eligibility.ts
// Hard criteria from the JD (CGPA, 10th/12th %, experience, degree, backlogs)
// checked deterministically against the extracted academics.

import type { JobRequirements } from '@/lib/llm/schemas';
import type { AcademicScore, AcademicSummary, ExperienceSummary } from '@/lib/profile/academics';
import { formatMonths } from '@/lib/profile/academics';
import { round1 } from './normalize';

export type CheckStatus = 'pass' | 'fail' | 'unknown';

export type EligibilityCheck = {
  key: string;
  label: string;
  required: string;
  actual: string;
  status: CheckStatus;
  note: string | null;
};

export type EligibilityResult = {
  status: 'eligible' | 'not_eligible' | 'unverified' | 'no_criteria';
  checks: EligibilityCheck[];
};

const fmt = (n: number) => String(round1(n));

function percentCheck(key: string, label: string, min: number | null, score: AcademicScore | null): EligibilityCheck | null {
  if (min === null) return null;
  if (!score) return { key, label, required: `≥ ${min}%`, actual: 'Not on resume', status: 'unknown', note: null };
  return {
    key,
    label,
    required: `≥ ${min}%`,
    actual: score.statedAs === 'percentage' ? score.display : `${score.display} ≈ ${fmt(score.percent)}%`,
    status: score.percent >= min ? 'pass' : 'fail',
    note: score.statedAs === 'cgpa' ? 'Converted from CGPA (× 9.5) — confirm the official conversion for this employer.' : null,
  };
}

export function checkEligibility(
  req: JobRequirements['eligibility'],
  academics: AcademicSummary,
  experience: ExperienceSummary,
  activeBacklogs: number | null
): EligibilityResult {
  const checks: EligibilityCheck[] = [];
  const grad = academics.postgraduation ?? academics.graduation;

  if (req.minCgpa) {
    const minOn10 = (req.minCgpa.value / req.minCgpa.outOf) * 10;
    const required = `≥ ${req.minCgpa.value} / ${req.minCgpa.outOf}`;
    checks.push(
      !grad
        ? { key: 'cgpa', label: 'Graduation CGPA', required, actual: 'Not on resume', status: 'unknown', note: null }
        : {
            key: 'cgpa',
            label: 'Graduation CGPA',
            required,
            actual: grad.statedAs === 'cgpa' ? grad.display : `${grad.display} ≈ ${fmt(grad.cgpa10)} / 10`,
            status: grad.cgpa10 + 1e-9 >= minOn10 ? 'pass' : 'fail',
            note: grad.statedAs === 'percentage' ? 'Converted from percentage (÷ 9.5).' : null,
          }
    );
  }

  const c12 = percentCheck('class12', 'Class 12 marks', req.minClass12Percent, academics.class12);
  const c10 = percentCheck('class10', 'Class 10 marks', req.minClass10Percent, academics.class10);
  const gp = percentCheck('graduationPercent', 'Graduation marks', req.minGraduationPercent, grad);
  for (const c of [c10, c12, gp]) if (c) checks.push(c);

  if (req.minExperienceMonths !== null || req.maxExperienceMonths !== null) {
    const min = req.minExperienceMonths ?? 0;
    const max = req.maxExperienceMonths;
    const total = experience.totalMonths;
    const required = max !== null ? `${formatMonths(min)} – ${formatMonths(max)}` : `≥ ${formatMonths(min)}`;
    const undatedOnly = total === 0 && experience.undatedRoles > 0;
    checks.push({
      key: 'experience',
      label: 'Experience',
      required,
      actual: undatedOnly ? `${experience.undatedRoles} undated role(s)` : formatMonths(total),
      // Exceeding a "freshers / 0–2 yrs" cap is reported but not treated as a hard fail for internships.
      status: undatedOnly ? 'unknown' : total < min ? 'fail' : max !== null && total > max ? 'fail' : 'pass',
      note: experience.internshipMonths > 0 ? `Includes ${formatMonths(experience.internshipMonths)} of internships.` : null,
    });
  }

  if (req.degrees.length > 0) {
    const have = academics.degrees.map((d) => d.toLowerCase().replace(/[^a-z]/g, ''));
    const ok = req.degrees.some((d) => {
      const want = d.toLowerCase().replace(/[^a-z]/g, '');
      return have.some((h) => h.includes(want) || want.includes(h));
    });
    checks.push({
      key: 'degree',
      label: 'Degree',
      required: req.degrees.join(' / '),
      actual: academics.degrees.join(', ') || 'Not on resume',
      status: academics.degrees.length === 0 ? 'unknown' : ok ? 'pass' : 'fail',
      note: null,
    });
  }

  if (req.fields.length > 0) {
    const have = academics.fields.join(' ').toLowerCase();
    const ok = req.fields.some((f) => fieldMatches(f, have));
    checks.push({
      key: 'field',
      label: 'Branch / field',
      required: req.fields.join(' / '),
      actual: academics.fields.join(', ') || 'Not on resume',
      status: academics.fields.length === 0 ? 'unknown' : ok ? 'pass' : 'fail',
      note: null,
    });
  }

  if (req.graduationYears.length > 0) {
    const y = academics.graduationYear;
    checks.push({
      key: 'graduationYear',
      label: 'Graduation year',
      required: req.graduationYears.join(' / '),
      actual: y ? String(y) : 'Not on resume',
      status: y === null ? 'unknown' : req.graduationYears.includes(y) ? 'pass' : 'fail',
      note: null,
    });
  }

  if (req.maxActiveBacklogs !== null) {
    checks.push({
      key: 'backlogs',
      label: 'Active backlogs',
      required: `≤ ${req.maxActiveBacklogs}`,
      actual: activeBacklogs === null ? 'Not stated' : String(activeBacklogs),
      status: activeBacklogs === null ? 'unknown' : activeBacklogs <= req.maxActiveBacklogs ? 'pass' : 'fail',
      note: null,
    });
  }

  const status: EligibilityResult['status'] =
    checks.length === 0 ? 'no_criteria'
    : checks.some((c) => c.status === 'fail') ? 'not_eligible'
    : checks.some((c) => c.status === 'unknown') ? 'unverified'
    : 'eligible';

  return { status, checks };
}

const FIELD_SYNONYMS: Record<string, string[]> = {
  'computer science': ['computer science', 'cse', 'cs', 'computer engineering', 'information technology', 'it', 'software'],
  it: ['information technology', 'it', 'computer science', 'cse'],
  ece: ['electronics', 'ece', 'communication'],
  eee: ['electrical', 'eee'],
  mechanical: ['mechanical', 'mech'],
  civil: ['civil'],
};

function fieldMatches(required: string, have: string): boolean {
  const r = required.toLowerCase();
  if (have.includes(r)) return true;
  for (const [key, syns] of Object.entries(FIELD_SYNONYMS)) {
    if (r.includes(key) || syns.some((s) => s.length > 3 && r.includes(s))) {
      if (syns.some((s) => (s.length <= 3 ? new RegExp(`\\b${s}\\b`).test(have) : have.includes(s)))) return true;
    }
  }
  return false;
}
