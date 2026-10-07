'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Check, X, ClipboardList, Users, Building2 } from 'lucide-react';
import {
  StatusBadge, ListingMeta, RequirementChips, cardClass, formatDate, inputClass,
  type ListingBase, type ListingStatus, type RequirementSummary,
} from '@/components/jobs/shared';

type Row = ListingBase & {
  company: { name: string | null; email: string | null };
  reviewedByName: string | null;
  reviewedAt: string | null;
  applicantCount: number;
  requirementSummary: RequirementSummary;
};

const TABS: { key: 'PENDING' | 'ALL'; label: string }[] = [
  { key: 'PENDING', label: 'Awaiting review' },
  { key: 'ALL', label: 'All listings' },
];

export default function PlacementJobsPage() {
  const [listings, setListings] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () =>
    fetch('/api/placement/jobs')
      .then((res) => res.json())
      .then((json) => setListings(json.data ?? []))
      .catch(() => setListings([]));

  useEffect(() => { load(); }, []);

  const review = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    setErrors((e) => ({ ...e, [id]: '' }));
    const res = await fetch(`/api/placement/jobs/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note: notes[id] ?? '' }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErrors((e) => ({ ...e, [id]: json.error || 'Something went wrong' }));
    }
    setActing(null);
    await load();
  };

  const pendingCount = listings?.filter((l) => l.status === 'PENDING').length ?? 0;
  const visible = (listings ?? []).filter((l) => tab === 'ALL' || l.status === 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-5xl p-6 mt-6 pb-24 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-blue-600" /> Job Listings</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Companies’ listings stay hidden from students until you approve them. Approving notifies every student.
          </p>
        </div>

        <div className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                tab === t.key ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {t.label}{t.key === 'PENDING' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {!listings && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}
        {listings && visible.length === 0 && (
          <div className={`${cardClass} p-10 text-center text-sm text-gray-500`}>
            {tab === 'PENDING' ? 'No listings waiting for review.' : 'No companies have posted listings yet.'}
          </div>
        )}

        {visible.map((l) => (
          <div key={l.id} className={`${cardClass} p-6 space-y-4`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{l.title}</h3>
                  <StatusBadge status={l.status as ListingStatus} />
                </div>
                <p className="text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Building2 className="w-4 h-4" /> {l.company.name ?? 'Unnamed company'} <span className="text-gray-400">· {l.company.email}</span>
                </p>
                <ListingMeta listing={l} />
                <p className="text-xs text-gray-400">
                  Posted {formatDate(l.createdAt)}
                  {l.reviewedAt && ` · ${l.status === 'REJECTED' ? 'Rejected' : 'Approved'} ${formatDate(l.reviewedAt)}${l.reviewedByName ? ` by ${l.reviewedByName}` : ''}`}
                </p>
              </div>
              {l.status !== 'PENDING' && (
                <span className="flex items-center gap-1 text-sm text-gray-500 shrink-0"><Users className="w-4 h-4" /> {l.applicantCount} applicant{l.applicantCount === 1 ? '' : 's'}</span>
              )}
            </div>

            <RequirementChips summary={l.requirementSummary} />

            <details>
              <summary className="cursor-pointer text-sm font-medium text-blue-600 list-none">Read job description</summary>
              <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">{l.description}</p>
            </details>

            {l.reviewNote && l.status !== 'PENDING' && <p className="text-sm text-gray-500">Note: {l.reviewNote}</p>}

            {l.status === 'PENDING' && (
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                <input
                  value={notes[l.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))}
                  className={inputClass}
                  placeholder="Note to the company (required to reject, optional to approve)"
                  maxLength={500}
                />
                <div className="flex items-center justify-end gap-2">
                  {errors[l.id] && <p className="text-sm text-red-500 mr-auto">{errors[l.id]}</p>}
                  <button
                    onClick={() => review(l.id, 'reject')}
                    disabled={acting === l.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => review(l.id, 'approve')}
                    disabled={acting === l.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-green-600 text-white text-sm font-semibold hover:bg-green-500 disabled:opacity-50"
                  >
                    {acting === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve &amp; publish
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
