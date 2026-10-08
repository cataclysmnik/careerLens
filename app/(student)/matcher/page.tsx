'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Target, Loader2, ShieldCheck, Sparkles, Globe, FileText, RotateCcw } from 'lucide-react';
import type { JobFitResult } from '@/lib/scoring/jobMatch';
import { JobFitReport } from '@/components/matcher/JobFitReport';
import { ROLE_CATALOG } from '@/lib/scoring/roles-catalog';
import { getBasicJobDescription } from '@/lib/jobs/basic-jd';

type ProfileState = 'loading' | 'ready' | 'missing' | 'outdated' | 'error';

const SUGGESTED_ROLES = [
  ...ROLE_CATALOG.map((r) => r.title),
  'Android Developer', 'DevOps Engineer', 'Machine Learning Engineer', 'Software Engineer', 'QA Engineer', 'Cloud Engineer',
].filter((r, i, all) => all.indexOf(r) === i);

export default function JobMatcherPage() {
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isCustomJd, setIsCustomJd] = useState(false);
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
        // Start from the target role saved on My Profile.
        const me = await fetch('/api/me').then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const target = me?.data?.profile?.targetRole;
        if (target) {
          setRole((current) => current || target);
          setJobDescription((current) => current || getBasicJobDescription(target));
        } else {
          setRole((current) => current || 'Full Stack Developer');
          setJobDescription((current) => current || getBasicJobDescription('Full Stack Developer'));
        }
      } catch (e) {
        console.error(e);
        setProfileState('error');
      }
    })();
  }, []);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (!isCustomJd) {
      setJobDescription(getBasicJobDescription(newRole));
    }
  };

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role.trim().length < 2 && !jobDescription.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role.trim(),
          jobDescription: jobDescription.trim() || undefined,
        }),
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
            Enter the role you&apos;re aiming for and optionally provide a job description. If a JD is not provided, CareerLens automatically fills the standard basic JD for that role and measures your evidence against it.
          </p>
        </div>

        <form onSubmit={handleMatch} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="role" className="block text-sm font-semibold mb-2">Job role you&apos;re seeking</label>
              <input
                id="role"
                list="role-suggestions"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder="e.g. Backend Developer, Data Analyst, Android Developer"
                value={role}
                maxLength={80}
                onChange={(e) => handleRoleChange(e.target.value)}
                required
              />
              <datalist id="role-suggestions">
                {SUGGESTED_ROLES.map((r) => <option key={r} value={r} />)}
              </datalist>
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTED_ROLES.slice(0, 8).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer ${role === r ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Job Description Area */}
            <div className="pt-6 border-t border-gray-100 dark:border-zinc-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="jd" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Job Description <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                    </label>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isCustomJd
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}>
                      {isCustomJd ? 'Custom Job Description' : 'Basic Role Baseline (Default)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Paste a specific company JD to match against their exact requirements, or use the auto-filled basic JD for this role.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setJobDescription(getBasicJobDescription(role || 'Full Stack Developer'));
                      setIsCustomJd(false);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Basic JD
                  </button>
                  <span className="text-gray-300 dark:text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setJobDescription('');
                      setIsCustomJd(true);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <textarea
                id="jd"
                rows={7}
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  setIsCustomJd(true);
                }}
                placeholder="Paste the job description (responsibilities, required skills, eligibility criteria)..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm font-mono text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Globe className="w-4 h-4" /> Role requirements <ShieldCheck className="w-4 h-4 ml-2" /> your saved evidence
            </span>
            <button
              type="submit"
              disabled={isAnalyzing || (role.trim().length < 2 && !jobDescription.trim())}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Target className="w-4 h-4" /> Check My Fit</>}
            </button>
          </div>
        </form>

        {isAnalyzing && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/50 text-sm text-violet-700 dark:text-violet-300">
            <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
            Analyzing your evidence against {isCustomJd ? 'your custom job description' : `the baseline ${role.trim() || 'role'} requirements`}, measuring skill coverage and scoring fit. This takes about 10–20 seconds.
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
