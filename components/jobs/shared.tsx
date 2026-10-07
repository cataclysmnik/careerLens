import React from 'react';
import { MapPin, Briefcase, IndianRupee, CalendarClock } from 'lucide-react';

export type ListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED';

export type RequirementSummary = {
  parsedBy: 'llm' | 'keywords';
  seniority: string;
  skills: { name: string; importance: number; requirement: 'required' | 'preferred' }[];
  eligibility: {
    minCgpa: { value: number; outOf: number } | null;
    minClass10Percent: number | null;
    minClass12Percent: number | null;
    minGraduationPercent: number | null;
    minExperienceMonths: number | null;
    maxExperienceMonths: number | null;
    degrees: string[];
    fields: string[];
    graduationYears: number[];
    maxActiveBacklogs: number | null;
  };
} | null;

export type ListingBase = {
  id: string;
  title: string;
  location: string | null;
  employmentType: string;
  ctc: string | null;
  deadline: string | null;
  description: string;
  status: ListingStatus;
  reviewNote: string | null;
  createdAt: string;
};

export const cardClass = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl';
export const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white';

const STATUS: Record<ListingStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Pending approval', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  APPROVED: { label: 'Live', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CLOSED: { label: 'Closed', cls: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400' },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
}

export const typeLabel = (t: string) => (t === 'internship' ? 'Internship' : t === 'full_time' ? 'Full-time' : t);
export const formatDate = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function ListingMeta({ listing }: { listing: Pick<ListingBase, 'location' | 'employmentType' | 'ctc' | 'deadline'> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{typeLabel(listing.employmentType)}</span>
      {listing.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{listing.location}</span>}
      {listing.ctc && <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{listing.ctc}</span>}
      {listing.deadline && <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Apply by {formatDate(listing.deadline)}</span>}
    </div>
  );
}

/** Skills (by importance) and eligibility the LLM read from the job description. */
export function RequirementChips({ summary }: { summary: RequirementSummary }) {
  if (!summary) return null;
  const e = summary.eligibility;
  const criteria = [
    e.minCgpa && `CGPA ≥ ${e.minCgpa.value}/${e.minCgpa.outOf}`,
    e.minClass10Percent != null && `10th ≥ ${e.minClass10Percent}%`,
    e.minClass12Percent != null && `12th ≥ ${e.minClass12Percent}%`,
    e.minGraduationPercent != null && `Graduation ≥ ${e.minGraduationPercent}%`,
    e.maxActiveBacklogs != null && (e.maxActiveBacklogs === 0 ? 'No active backlogs' : `≤ ${e.maxActiveBacklogs} backlogs`),
    e.degrees.length > 0 && e.degrees.join(' / '),
    e.fields.length > 0 && e.fields.join(', '),
    e.graduationYears.length > 0 && `Batch ${e.graduationYears.join(', ')}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-2">
      {summary.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.skills.map((s) => (
            <span
              key={s.name}
              title={`Importance ${s.importance}/5 · ${s.requirement}`}
              className={`px-2 py-0.5 rounded-full text-xs border ${
                s.importance >= 4
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-300'
                  : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300'
              }`}
            >
              {s.name} <span className="opacity-60">{s.importance}</span>
            </span>
          ))}
        </div>
      )}
      {criteria.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Eligibility: {criteria.join(' · ')}</p>
      )}
    </div>
  );
}
