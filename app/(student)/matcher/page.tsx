'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Target, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import type { JobFitResult } from '@/lib/scoring/jobMatch';
import { JobFitReport } from '@/components/matcher/JobFitReport';

type ProfileState = 'loading' | 'ready' | 'missing' | 'outdated' | 'error';

const MIN_JD_LENGTH = 40;

export default function JobMatcherPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobFitResult | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/students/evidence');
        if (!res.ok) return setProfileState('error');
        const { data } = await res.json();
        if (!data) return setProfileState('missing');
        setProfileState(data.evidence?.inputs?.profile ? 'ready' : 'outdated');
      } catch (e) {
        console.error(e);
        setProfileState('error');
      }
    })();
  }, []);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jobDescription.trim().length < MIN_JD_LENGTH) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matching failed');
      setResult(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (profileState === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (profileState !== 'ready') {
    const message = {
      missing: 'No profile found. Upload your resume first so we have evidence to match against.',
      outdated: 'Your saved analysis is from an older version. Re-run the analysis to enable AI job matching.',
      error: "Couldn't load your profile. Refresh the page to try again.",
    }[profileState];
    return (
      <div className="p-10 text-center">
        <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
        {profileState !== 'error' && (
          <Link href="/profile/resume" className="inline-flex px-4 py-2.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500">
            {profileState === 'missing' ? 'Upload Resume' : 'Re-analyze'}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 p-6 md:p-10 pb-24">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Job Matcher
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paste a job description. AI reads the requirements and eligibility criteria and cross-checks them against your resume.
            Your fit score is calculated from your verified evidence with a fixed formula, so the same evidence and JD always give the same score.
          </p>
        </div>

        <form onSubmit={handleMatch} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6">
            <label className="block text-sm font-semibold mb-2">Paste Job Description</label>
            <textarea
              className="w-full h-56 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Paste the full JD, including requirements and eligibility (CGPA, 10th/12th %, experience, branches)…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            />
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Matched against your saved evidence
            </span>
            <button
              type="submit"
              disabled={isAnalyzing || jobDescription.trim().length < MIN_JD_LENGTH}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Target className="w-4 h-4" /> Check My Fit</>}
            </button>
          </div>
        </form>

        {isAnalyzing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/50 text-sm text-violet-700 dark:text-violet-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Reading the JD, scoring each requirement against your evidence, then writing the cross-validation. This takes about 10 seconds.
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {result && <JobFitReport result={result} />}
      </div>
    </div>
  );
}
