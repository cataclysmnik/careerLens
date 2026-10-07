'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Loader2, ShieldCheck, Star, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { CODING_PLATFORMS, PLATFORM_INFO, type CodingHandles, type CodingPlatform } from '@/lib/coding/handles';
import type { CodingPlatformStats, CodingProfileSummary } from '@/lib/coding/analyzer';

type Errors = Partial<Record<CodingPlatform, string>>;

const strengthClass = (strength: CodingProfileSummary['strength']) =>
  strength === 'Strong' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
  strength === 'Moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
  'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400';

const cardClass = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl';

export default function CodingProfilesPage() {
  const [handles, setHandles] = useState<CodingHandles>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformErrors, setPlatformErrors] = useState<Errors>({});
  const [results, setResults] = useState<CodingProfileSummary | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const analyze = useCallback(async (toAnalyze: CodingHandles) => {
    setIsAnalyzing(true);
    setError(null);
    setPlatformErrors({});
    try {
      // The server saves the handles and updates the readiness report.
      const res = await fetch('/api/coding/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handles: toAnalyze }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');
      setPlatformErrors(json.errors ?? {});
      if (json.data) setResults(json.data);
      else setError('None of the profiles could be analyzed. Check the usernames below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Reopen with the saved handles and last results. Handles found on the resume
  // but never analyzed are analyzed straight away.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/coding/analyze')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const saved: { handles: CodingHandles; summary: CodingProfileSummary | null } | undefined = json?.data;
        const savedHandles = saved?.handles ?? {};
        setHandles(savedHandles);
        const analyzed = new Map(saved?.summary?.platforms.map((p) => [p.platform, p.handle.toLowerCase()]) ?? []);
        const unanalyzed = CODING_PLATFORMS.some((p) => savedHandles[p] && analyzed.get(p) !== savedHandles[p]!.toLowerCase());
        if (saved?.summary && !unanalyzed) setResults(saved.summary);
        else if (Object.keys(savedHandles).length > 0) analyze(savedHandles);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSaved(false); });
    return () => { cancelled = true; };
  }, [analyze]);

  const hasAnyHandle = CODING_PLATFORMS.some((p) => handles[p]?.trim());

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnyHandle) await analyze(handles);
  };

  const errorList = Object.entries(platformErrors) as [CodingPlatform, string][];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          <h1 className="text-xl font-bold tracking-tight">Coding Profile Analyzer</h1>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
          Back to Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24">
        {loadingSaved || (isAnalyzing && !results) ? (
          <div className="flex flex-col items-center gap-3 py-24 text-sm text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            {isAnalyzing && 'Analyzing your coding profiles…'}
          </div>
        ) : !results ? (
          <div className={`${cardClass} p-10 flex flex-col items-center text-center`}>
            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Trophy className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Coding Profiles</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
              CareerLens checks problems solved, contest ratings, badges and certificates to verify your problem-solving skills.
              Add any platforms you use.
            </p>

            <form onSubmit={handleAnalyze} className="w-full max-w-md flex flex-col gap-4 text-left">
              {CODING_PLATFORMS.map((platform) => (
                <div key={platform}>
                  <label htmlFor={platform} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {PLATFORM_INFO[platform].label}
                  </label>
                  <input
                    id={platform}
                    type="text"
                    value={handles[platform] ?? ''}
                    onChange={(e) => setHandles((h) => ({ ...h, [platform]: e.target.value }))}
                    placeholder="Username or profile URL"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  />
                  {platformErrors[platform] && <p className="mt-1 text-xs text-red-600">{platformErrors[platform]}</p>}
                </div>
              ))}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</div>
              )}

              <button
                type="submit"
                disabled={!hasAnyHandle || isAnalyzing}
                className="mt-2 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Profiles...</> : <>Analyze Profiles</>}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`${cardClass} p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div>
                <h2 className="text-2xl font-bold mb-1">Coding Analysis Complete</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyzed <span className="font-semibold text-gray-900 dark:text-white">{results.platforms.length}</span>{' '}
                  {results.platforms.length === 1 ? 'platform' : 'platforms'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => analyze(Object.fromEntries(results.platforms.map((p) => [p.platform, p.handle])))}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Re-analyze
                </button>
                <button
                  onClick={() => { setResults(null); setError(null); }}
                  disabled={isAnalyzing}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  Edit Profiles
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryStat label="Problem-solving score" value={`${results.overallScore}/100`}>
                <span className={`mt-2 inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${strengthClass(results.strength)}`}>
                  {results.strength}
                </span>
              </SummaryStat>
              <SummaryStat label="Problems solved" value={results.totalSolved.toLocaleString()} />
              <SummaryStat
                label="Best contest rating"
                value={results.bestRating ? String(results.bestRating.rating) : '—'}
                sub={results.bestRating ? PLATFORM_INFO[results.bestRating.platform].label : 'No rated contests'}
              />
              <SummaryStat label="Contests" value={String(results.totalContests)} />
            </div>

            {errorList.length > 0 && (
              <div className="flex gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <ul className="space-y-1 text-amber-800 dark:text-amber-300">
                  {errorList.map(([platform, message]) => (
                    <li key={platform}><span className="font-semibold">{PLATFORM_INFO[platform].label}:</span> {message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.platforms.map((p) => <PlatformCard key={p.platform} stats={p} />)}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 text-right mt-8">
              Saved to your account and included in your readiness score. <Link href="/dashboard" className="underline">View dashboard</Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryStat({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
      {children}
    </div>
  );
}

function PlatformCard({ stats: p }: { stats: CodingPlatformStats }) {
  const ratingLabel = p.platform === 'gfg' ? 'Coding score' : 'Rating';
  const rows = [
    { label: 'Problems solved', value: p.problemsSolved },
    { label: ratingLabel, value: p.rating != null ? `${p.rating}${p.maxRating && p.maxRating !== p.rating ? ` (max ${p.maxRating})` : ''}` : null },
    { label: 'Rank', value: p.rank },
    { label: 'Contests', value: p.contests },
  ].filter((r) => r.value != null && r.value !== '');

  const d = p.difficulty;
  const total = d ? d.easy + d.medium + d.hard : 0;

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{PLATFORM_INFO[p.platform].label}</h3>
          <a href={p.profileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
            @{p.handle} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          Score <span className="text-gray-900 dark:text-white font-bold">{p.score}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-400">No public activity yet.</p>}
      </div>

      {d && total > 0 && (
        <div className="mb-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
            <div className="bg-green-500" style={{ width: `${(d.easy / total) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(d.medium / total) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(d.hard / total) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5 text-gray-500 dark:text-gray-400">
            <span><span className="text-green-600 font-semibold">{d.easy}</span> easy</span>
            <span><span className="text-amber-600 font-semibold">{d.medium}</span> medium</span>
            <span><span className="text-red-600 font-semibold">{d.hard}</span> hard</span>
          </div>
        </div>
      )}

      {p.badges.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Badges</div>
          <div className="flex flex-wrap gap-1.5">
            {p.badges.slice(0, 8).map((b) => (
              <span key={b.name} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                {b.name}
                <span className="inline-flex items-center text-amber-500">{b.stars}<Star className="w-3 h-3 fill-current" /></span>
              </span>
            ))}
          </div>
        </div>
      )}

      {p.certificates.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Certificates</div>
          <div className="flex flex-wrap gap-1.5">
            {p.certificates.map((c) => (
              <span key={c} className="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">{c}</span>
            ))}
          </div>
        </div>
      )}

      {(p.languages.length > 0 || p.topics.length > 0) && (
        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
          {p.languages.map((l) => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded uppercase font-bold tracking-wider">{l}</span>
          ))}
          {p.topics.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded font-medium">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
