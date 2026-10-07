// Server-side helpers for job listings and applications.

import type { JobListing, JobListingStatus } from '@prisma/client';
import { extractJobRequirements } from '@/lib/llm/extract-jd';
import type { JobRequirements } from '@/lib/llm/schemas';
import { readInputs } from '@/lib/evidence/student-evidence';
import { computeJobFit, type JobFitResult } from '@/lib/scoring/jobMatch';

export const EMPLOYMENT_TYPES = ['internship', 'full_time'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = { internship: 'Internship', full_time: 'Full-time' };

/** What's stored in JobListing.requirements. */
export type StoredRequirements = { parsedBy: 'llm' | 'keywords'; requirements: JobRequirements };

export type ListingInput = {
  title: string;
  location: string | null;
  employmentType: EmploymentType;
  ctc: string | null;
  deadline: Date | null;
  description: string;
};

const text = (v: unknown, label: string, max: number, required = false): string | null => {
  if (v === undefined || v === null || v === '') {
    if (required) throw new Error(`${label} is required`);
    return null;
  }
  if (typeof v !== 'string') throw new Error(`${label} must be text`);
  const t = v.trim();
  if (required && !t) throw new Error(`${label} is required`);
  if (t.length > max) throw new Error(`${label} must be ${max} characters or fewer`);
  return t || null;
};

export function parseListingInput(body: Record<string, unknown>): ListingInput {
  const description = text(body.description, 'Job description', 16_000, true)!;
  if (description.length < 50) throw new Error('Job description is too short — include the role, skills and eligibility');
  const employmentType = body.employmentType;
  if (!EMPLOYMENT_TYPES.includes(employmentType as EmploymentType)) throw new Error('Choose internship or full-time');

  let deadline: Date | null = null;
  if (body.deadline) {
    deadline = new Date(String(body.deadline));
    if (isNaN(deadline.getTime())) throw new Error('Deadline must be a valid date');
    // A date picker sends YYYY-MM-DD; applications close at the end of that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.deadline))) deadline.setUTCHours(23, 59, 59, 999);
    if (deadline.getTime() < Date.now()) throw new Error('Deadline must be in the future');
  }

  return {
    title: text(body.title, 'Title', 120, true)!,
    location: text(body.location, 'Location', 120),
    employmentType: employmentType as EmploymentType,
    ctc: text(body.ctc, 'CTC / stipend', 60),
    deadline,
    description,
  };
}

/** Read the JD once, at creation, so all applicants are scored against the same requirements. */
export async function extractListingRequirements(description: string): Promise<StoredRequirements> {
  const jd = await extractJobRequirements(description);
  return { parsedBy: jd.ai.used ? 'llm' : 'keywords', requirements: jd.requirements };
}

export function readRequirements(value: unknown): StoredRequirements | null {
  const v = value as Partial<StoredRequirements> | null;
  return v?.requirements ? (v as StoredRequirements) : null;
}

/** Open to applications: approved and before its deadline. */
export function isAcceptingApplications(listing: Pick<JobListing, 'status' | 'deadline'>): boolean {
  return listing.status === 'APPROVED' && (!listing.deadline || listing.deadline.getTime() >= Date.now());
}

/** Deterministic fit of a student's saved evidence against a listing. Null when the student has no analysis. */
export function scoreApplicant(evidence: unknown, stored: StoredRequirements | null): JobFitResult | null {
  const inputs = readInputs(evidence);
  if (!inputs || !stored) return null;
  return computeJobFit(inputs, stored.requirements, { enabled: true, used: stored.parsedBy === 'llm' });
}

/** Summary of the extracted requirements, safe to send to any role. */
export function requirementSummary(stored: StoredRequirements | null) {
  if (!stored) return null;
  const r = stored.requirements;
  return {
    parsedBy: stored.parsedBy,
    seniority: r.seniority,
    skills: r.skills
      .slice()
      .sort((a, b) => b.importance - a.importance)
      .map((s) => ({ name: s.name, importance: s.importance, requirement: s.requirement })),
    eligibility: r.eligibility,
  };
}

export type ListingStatus = JobListingStatus;
