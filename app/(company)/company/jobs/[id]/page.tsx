'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, ChevronDown, Users, Info, Lock, Unlock } from 'lucide-react';
import type { JobFitResult } from '@/lib/scoring/jobMatch';
import { JobFitReport, VERDICT_CLASS } from '@/components/matcher/JobFitReport';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { scoreTextClass } from '@/lib/readiness';
import {
  StatusBadge, ListingMeta, RequirementChips, cardClass, formatDate,
  type ListingBase, type RequirementSummary,
} from '@/components/jobs/shared';

type Applicant = {
  studentId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  appliedAt: string;
  cgpa: number | null;
  tenthPercentage: number | null;
  twelfthPercentage: number | null;
  score: number | null;
  verdictLabel: string | null;
  eligible: boolean | null;
  readiness: number | null;
  fit: JobFitResult | null;
};

type Detail = ListingBase & { reviewedAt: string | null; requirementSummary: RequirementSummary; applicants: Applicant[] };

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ListingDetail />
    </Suspense>
  );
}

function Spinner() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [hideIneligible, setHideIneligible] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/company/jobs/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load this listing');
        setListing(json.data);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (action: 'close' | 'reopen') => {
    setActing(true);
    const res = await fetch(`/api/company/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!res.ok) setError((await res.json()).error || 'Could not update the listing');
    setActing(false);
    load();
  };

  if (error && !listing) return <div className="p-10 text-center text-sm text-red-500">{error}</div>;
  if (!listing) return <Spinner />;

  const applicants = hideIneligible ? listing.applicants.filter((a) => a.eligible !== false) : listing.applicants;
  const ineligibleCount = listing.applicants.filter((a) => a.eligible === false).length;

  return (
    <div className="min-h-screen p-6 md:p-10 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link href="/company/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Job Listings
        </Link>

        <div className={`${cardClass} p-6 space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{listing.title}</h1>
                <StatusBadge status={listing.status} />
              </div>
              <ListingMeta listing={listing} />
            </div>
            {listing.status === 'APPROVED' && (
              <button onClick={() => setStatus('close')} disabled={acting} className="inline-flex items-center gap-2 self-start rounded-md border border-gray-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50">
                <Lock className="w-4 h-4" /> Close applications
              </button>
            )}
            {listing.status === 'CLOSED' && (
              <button onClick={() => setStatus('reopen')} disabled={acting} className="inline-flex items-center gap-2 self-start rounded-md border border-gray-300 dark:border-zinc-700 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50">
                <Unlock className="w-4 h-4" /> Reopen
              </button>
            )}
          </div>

          {listing.status === 'PENDING' && (
            <p className="text-sm text-amber-700 dark:text-amber-400">Waiting for the placement cell to approve this listing. Students can’t see it yet.</p>
          )}
          {listing.status === 'REJECTED' && (
            <p className="text-sm text-red-600 dark:text-red-400">Rejected by the placement cell{listing.reviewNote ? `: ${listing.reviewNote}` : '.'}</p>
          )}
          {listing.status === 'APPROVED' && listing.reviewNote && (
            <p className="text-sm text-gray-500">Placement cell note: {listing.reviewNote}</p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}

          <RequirementChips summary={listing.requirementSummary} />

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 list-none">Show job description</summary>
            <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{listing.description}</p>
          </details>
        </div>

        <div className={`${cardClass} overflow-hidden`}>
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-zinc-800">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Applicants ({listing.applicants.length})</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Info className="w-3.5 h-3.5" />
                Sorted by fit score = Σ(skill evidence score × importance) ÷ Σ(importance), from each student’s verified evidence.
              </p>
            </div>
            {ineligibleCount > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" checked={hideIneligible} onChange={(e) => setHideIneligible(e.target.checked)} />
                Hide not eligible ({ineligibleCount})
              </label>
            )}
          </div>

          {applicants.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">
              {listing.status === 'APPROVED' ? 'No applications yet.' : listing.status === 'PENDING' ? 'Applications open once the placement cell approves this listing.' : 'No applications.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-zinc-950 text-xs uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Applicant</th>
                    <th className="text-left px-4 py-3">Fit score</th>
                    <th className="text-left px-4 py-3">Verdict</th>
                    <th className="text-left px-4 py-3">Eligibility</th>
                    <th className="text-left px-4 py-3">CGPA</th>
                    <th className="text-left px-4 py-3">Applied</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((a, i) => {
                    const isOpen = open === a.studentId;
                    return (
                      <React.Fragment key={a.studentId}>
                        <tr onClick={() => setOpen(isOpen ? null : a.studentId)} className={`border-t border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 ${isOpen ? 'bg-gray-50 dark:bg-zinc-800/40' : ''}`}>
                          <td className="px-4 py-3 text-gray-400 tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={a.name} email={a.email} image={a.image} size={32} />
                              <div className="min-w-0">
                                <div className="font-medium truncate">{a.name ?? 'Unnamed'}</div>
                                <div className="text-xs text-gray-500 truncate">{a.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {a.score === null ? <span className="text-gray-400">—</span> : <span className={`text-lg font-bold ${scoreTextClass(a.score)}`}>{a.score}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {a.fit ? (
                              <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${VERDICT_CLASS[a.fit.verdict]}`}>{a.verdictLabel}</span>
                            ) : <span className="text-xs text-gray-400">No analysis</span>}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {a.eligible === null ? '—' : a.eligible
                              ? <span className="text-green-600 dark:text-green-400 font-medium">{a.fit?.eligibility.status === 'unverified' ? 'Unverified' : 'Eligible'}</span>
                              : <span className="text-red-600 dark:text-red-400 font-medium">Not eligible</span>}
                          </td>
                          <td className="px-4 py-3">{a.cgpa ?? a.fit?.academics.graduation?.display ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(a.appliedAt)}</td>
                          <td className="px-4 py-3"><ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/60 dark:bg-zinc-950/40">
                            <td colSpan={8} className="px-4 py-5">
                              {a.fit ? <JobFitReport result={a.fit} /> : <p className="text-sm text-gray-500">This student hasn’t analyzed their resume, so there’s no fit report.</p>}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
