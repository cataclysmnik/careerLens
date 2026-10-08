'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Loader2, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VERDICT_CLASS } from '@/components/matcher/JobFitReport';
import type { FitVerdict } from '@/lib/scoring/verdict';
import { scoreTextClass } from '@/lib/readiness';
import {
  StatusBadge, ListingMeta, RequirementChips, cardClass, formatDate,
  type ListingBase, type RequirementSummary,
} from '@/components/jobs/shared';

type Row = ListingBase & {
  companyName: string | null;
  accepting: boolean;
  appliedAt: string | null;
  requirementSummary: RequirementSummary;
  myFit: {
    score: number;
    verdict: FitVerdict;
    verdictLabel: string;
    verdictReason: string;
    eligible: boolean;
    failedChecks: string[];
    topGaps: { label: string; score: number; target: number }[];
  } | null;
};

export default function StudentJobsPage() {
  const [listings, setListings] = useState<Row[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'open' | 'applied'>('open');

  const load = () =>
    fetch('/api/jobs/listings')
      .then((res) => res.json())
      .then((json) => setListings(json.data ?? []))
      .catch(() => setListings([]));

  useEffect(() => { load(); }, []);

  const toggle = async (l: Row) => {
    setActing(l.id);
    setErrors((e) => ({ ...e, [l.id]: '' }));
    const res = await fetch(`/api/jobs/listings/${l.id}/apply`, { method: l.appliedAt ? 'DELETE' : 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrors((e) => ({ ...e, [l.id]: json.error || 'Something went wrong' }));
    }
    setActing(null);
    await load();
  };

  const visible = (listings ?? [])
    .filter((l) => (filter === 'applied' ? !!l.appliedAt : l.accepting))
    // Best fit first.
    .sort((a, b) => (b.myFit?.score ?? -1) - (a.myFit?.score ?? -1));
  const appliedCount = listings?.filter((l) => l.appliedAt).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-5xl p-6 mt-6 pb-24 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-blue-600" /> Jobs</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Openings approved by your placement cell, sorted by how well your verified evidence fits each one.
            Companies see applicants ranked by the same score.
          </p>
        </div>

        <div className="flex gap-2">
          {(['open', 'applied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                filter === f ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {f === 'open' ? 'Open' : `My applications (${appliedCount})`}
            </button>
          ))}
        </div>

        {!listings && (
          <div className="space-y-4 w-full animate-pulse mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-xl"></div>
            ))}
          </div>
        )}
        {listings && visible.length === 0 && (
          <div className={`${cardClass} p-10 text-center text-sm text-gray-500`}>
            {filter === 'open' ? 'No open listings right now. You’ll get a notification when one is published.' : 'You haven’t applied to anything yet.'}
          </div>
        )}

        {visible.map((l) => (
          <div key={l.id} className={`${cardClass} p-6 space-y-4`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{l.title}</h3>
                  {l.status !== 'APPROVED' && <StatusBadge status={l.status} />}
                  {l.appliedAt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <CheckCircle2 className="w-3 h-3" /> Applied {formatDate(l.appliedAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Building2 className="w-4 h-4" /> {l.companyName ?? 'Company'}</p>
                <ListingMeta listing={l} />
              </div>

              {l.myFit && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${scoreTextClass(l.myFit.score)}`}>{l.myFit.score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">your fit</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${VERDICT_CLASS[l.myFit.verdict]}`}>{l.myFit.verdictLabel}</span>
                </div>
              )}
            </div>

            <RequirementChips summary={l.requirementSummary} />

            {l.myFit && !l.myFit.eligible && (
              <p className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Not eligible: {l.myFit.failedChecks.join('; ')}
              </p>
            )}
            {l.myFit && l.myFit.topGaps.length > 0 && (
              <p className="text-xs text-gray-500">
                Biggest gaps: {l.myFit.topGaps.map((g) => `${g.label} ${g.score}/${g.target}`).join(' · ')}.{' '}
                <Link href="/dashboard" className="text-blue-600 hover:underline">See how to close them</Link>
              </p>
            )}

            <details>
              <summary className="cursor-pointer text-sm font-medium text-blue-600 list-none">Read job description</summary>
              <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{l.description}</p>
            </details>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
              {errors[l.id] && <p className="text-sm text-red-500 mr-auto">{errors[l.id]}</p>}
              {l.accepting ? (
                <button
                  onClick={() => toggle(l)}
                  disabled={acting === l.id}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 ${
                    l.appliedAt
                      ? 'border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {acting === l.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {l.appliedAt ? 'Withdraw application' : 'Apply'}
                </button>
              ) : (
                <span className="text-sm text-gray-400">Applications closed</span>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
