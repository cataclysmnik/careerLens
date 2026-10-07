'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Info } from 'lucide-react';
import { cardClass, inputClass } from '@/components/jobs/shared';

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

export default function NewListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', employmentType: 'full_time', location: '', ctc: '', deadline: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/company/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create the listing');
      router.push(`/company/jobs/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the listing');
      setSaving(false);
    }
  };

  // Deadlines can't be in the past.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen p-6 md:p-10 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/company/jobs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Job Listings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New listing</h1>

        <form onSubmit={submit} className={`${cardClass} p-6 space-y-5`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="title" className={labelClass}>Job title</label>
              <input id="title" required maxLength={120} value={form.title} onChange={set('title')} className={inputClass} placeholder="Backend Developer" />
            </div>
            <div>
              <label htmlFor="employmentType" className={labelClass}>Type</label>
              <select id="employmentType" value={form.employmentType} onChange={set('employmentType')} className={inputClass}>
                <option value="full_time">Full-time</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div>
              <label htmlFor="location" className={labelClass}>Location</label>
              <input id="location" maxLength={120} value={form.location} onChange={set('location')} className={inputClass} placeholder="Bengaluru / Remote" />
            </div>
            <div>
              <label htmlFor="ctc" className={labelClass}>{form.employmentType === 'internship' ? 'Stipend' : 'CTC'}</label>
              <input id="ctc" maxLength={60} value={form.ctc} onChange={set('ctc')} className={inputClass} placeholder={form.employmentType === 'internship' ? '40k / month' : '12 LPA'} />
            </div>
            <div>
              <label htmlFor="deadline" className={labelClass}>Application deadline</label>
              <input id="deadline" type="date" min={today} value={form.deadline} onChange={set('deadline')} className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>Job description</label>
            <textarea
              id="description"
              required
              minLength={50}
              rows={14}
              value={form.description}
              onChange={set('description')}
              className={`${inputClass} resize-y`}
              placeholder={'Responsibilities, required and preferred skills, and eligibility (e.g. "CGPA ≥ 7, 60% in 10th & 12th, no active backlogs, B.Tech CSE/IT 2026 batch").'}
            />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              CareerLens reads the skills, how important each one is, and the eligibility criteria from this text, then ranks applicants with a fixed formula.
              Be explicit about must-haves vs nice-to-haves.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-2 border-t border-gray-200 dark:border-zinc-800">
            {error && <p className="text-sm text-red-500 mr-auto">{error}</p>}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Reading the job description…' : 'Submit for approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
