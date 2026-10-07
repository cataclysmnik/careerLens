'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus, Loader2, Users, ChevronRight } from 'lucide-react';
import { StatusBadge, ListingMeta, cardClass, formatDate, type ListingBase } from '@/components/jobs/shared';

type Row = Omit<ListingBase, 'description'> & { applicantCount: number; reviewedAt: string | null };

export default function CompanyJobsPage() {
  const [listings, setListings] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/company/jobs')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setListings(json.data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-10 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-blue-600" /> Job Listings
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              New listings go to the placement cell for approval before students can see them.
            </p>
          </div>
          <Link href="/company/jobs/new" className="inline-flex items-center gap-2 self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            <Plus className="w-4 h-4" /> New listing
          </Link>
        </div>

        {error && <p className="text-sm text-red-500">Couldn’t load your listings. Refresh to try again.</p>}
        {!listings && !error && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}

        {listings?.length === 0 && (
          <div className={`${cardClass} p-10 text-center`}>
            <p className="font-semibold mb-1">No listings yet</p>
            <p className="text-sm text-gray-500 mb-4">Post a job or internship; once approved, students can apply and you’ll see them ranked by fit.</p>
            <Link href="/company/jobs/new" className="text-sm font-semibold text-blue-600 hover:underline">Create your first listing</Link>
          </div>
        )}

        <div className="space-y-3">
          {listings?.map((l) => (
            <Link key={l.id} href={`/company/jobs/${l.id}`} className={`${cardClass} p-5 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-800 transition-colors`}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-lg truncate">{l.title}</h2>
                  <StatusBadge status={l.status} />
                </div>
                <ListingMeta listing={l} />
                {l.status === 'REJECTED' && l.reviewNote && (
                  <p className="text-sm text-red-600 dark:text-red-400">Placement cell: {l.reviewNote}</p>
                )}
                <p className="text-xs text-gray-400">Posted {formatDate(l.createdAt)}</p>
              </div>
              <div className="text-center shrink-0">
                <div className="flex items-center gap-1 text-2xl font-bold"><Users className="w-5 h-5 text-gray-400" />{l.applicantCount}</div>
                <div className="text-xs text-gray-500">applicant{l.applicantCount === 1 ? '' : 's'}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
