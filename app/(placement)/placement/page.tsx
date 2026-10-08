'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Users, TrendingUp, GitFork, Globe, Loader2, AlertTriangle, ShieldCheck,
  Trophy, LifeBuoy, Clock, Target, ArrowRight, CheckCircle2,
} from 'lucide-react';
import {
  TIER_BAR_CLASS, TIER_DESCRIPTION, TIER_LABEL, TIER_ORDER,
  scoreTextClass, type ReadinessTier,
} from '@/lib/readiness';

type BriefStudent = {
  id: string;
  name: string | null;
  email: string | null;
  score: number;
  topGap: string | null;
  updatedAt: string;
};

type Stats = {
  totalStudents: number;
  analyzedStudents: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  tierCounts: Record<ReadinessTier, number>;
  categoryAverages: { title: string; average: number }[];
  pctWithGithub: number;
  pctWithPortfolio: number;
  topGaps: { title: string; count: number; pct: number }[];
  targetRoles: { role: string; count: number }[];
  topStudents: BriefStudent[];
  needsAttention: BriefStudent[];
  recentlyAnalyzed: BriefStudent[];
  pendingApprovals: number;
  branchInsights: { branch: string; students: number; avgScore: number; commonGap: string | null; gapPct: number }[];
};

const card = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6';

export default function PlacementOverviewPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/api/placement/stats')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json) => setStats(json.data))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }
  if (loadError || !stats) {
    return <div className="p-10 text-center text-sm text-red-500">Couldn&apos;t load cohort stats. Refresh the page to try again.</div>;
  }

  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
  const coverage = stats.totalStudents > 0 ? Math.round((stats.analyzedStudents / stats.totalStudents) * 100) : 0;
  const maxBucket = Math.max(1, ...Object.values(stats.scoreDistribution));
  const maxRole = Math.max(1, ...stats.targetRoles.map((r) => r.count));
  const hasAnalyzed = stats.analyzedStudents > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{firstName ? `Welcome back, ${firstName}` : 'Cohort Overview'}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Career readiness across {stats.totalStudents} student{stats.totalStudents === 1 ? '' : 's'}
              {' · '}{stats.analyzedStudents} analyzed ({coverage}%)
            </p>
          </div>
          {stats.pendingApprovals > 0 && (
            <Link
              href="/placement/approvals"
              className="inline-flex items-center gap-2 self-start md:self-auto px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <ShieldCheck className="w-4 h-4" />
              {stats.pendingApprovals} pending approval{stats.pendingApprovals === 1 ? '' : 's'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Students" value={stats.totalStudents} hint={`${coverage}% analyzed`} />
          <StatCard icon={TrendingUp} label="Avg. Score" value={hasAnalyzed ? stats.averageScore : '—'} hint="out of 100" />
          <StatCard icon={CheckCircle2} label="Placement Ready" value={stats.tierCounts.READY} hint="score 70+" />
          <StatCard icon={GitFork} label="With GitHub" value={`${stats.pctWithGithub}%`} hint="of analyzed" />
          <StatCard icon={Globe} label="With Portfolio" value={`${stats.pctWithPortfolio}%`} hint="of analyzed" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Readiness Tiers</h3>
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 mb-5">
              {TIER_ORDER.map((t) =>
                stats.tierCounts[t] > 0 ? (
                  <div key={t} className={TIER_BAR_CLASS[t]} style={{ width: `${(stats.tierCounts[t] / Math.max(1, stats.totalStudents)) * 100}%` }} />
                ) : null
              )}
            </div>
            <div className="space-y-2">
              {TIER_ORDER.map((t) => (
                <Link
                  key={t}
                  href={`/placement/students?tier=${t}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${TIER_BAR_CLASS[t]}`} />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{TIER_LABEL[t]}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{TIER_DESCRIPTION[t]}</span>
                  </span>
                  <span className="text-sm font-bold">{stats.tierCounts[t]}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Score Distribution</h3>
            {hasAnalyzed ? (
              <div className="h-48 flex items-end justify-between gap-[1px] mt-4 relative">
                {/* Horizontal axis guides */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="w-full border-t border-gray-900 dark:border-gray-100" />
                  <div className="w-full border-t border-gray-900 dark:border-gray-100" />
                  <div className="w-full border-t border-gray-900 dark:border-gray-100" />
                  <div className="w-full border-t border-gray-900 dark:border-gray-100" />
                </div>
                {Object.entries(stats.scoreDistribution).map(([bucket, count]) => {
                  const heightPct = maxBucket > 0 ? (count / maxBucket) * 100 : 0;
                  const score = parseInt(bucket, 10);
                  const showLabel = score % 20 === 0;
                  
                  return (
                    <div key={bucket} className="flex flex-col items-center flex-1 group h-full z-10">
                      <div className="w-full h-full flex justify-center items-end mb-1 relative">
                        {count > 0 && (
                          <div className="absolute bottom-full mb-1 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            <span className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[10px] px-2 py-1 rounded shadow-lg">
                              Score {bucket}: {count}
                            </span>
                          </div>
                        )}
                        <div 
                          className={`w-full bg-blue-500 dark:bg-blue-600 rounded-t-[1px] transition-all duration-300 ease-in-out group-hover:bg-blue-400 dark:group-hover:bg-blue-500 ${count === 0 ? 'opacity-0' : 'opacity-100'}`} 
                          style={{ height: `${heightPct}%`, minHeight: count > 0 ? '2px' : '0px' }} 
                        />
                      </div>
                      <div className="h-4 mt-1 relative w-full flex justify-center">
                        {showLabel && (
                          <span className="text-[9px] text-gray-400 absolute top-0 transform -translate-x-1/2 left-1/2">
                            {bucket}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyNote />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${card} lg:col-span-2`}>
            <h3 className="text-sm font-semibold mb-1 uppercase tracking-wider">Cohort Category Averages</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Lowest categories are where training will move the cohort most.</p>
            {hasAnalyzed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[...stats.categoryAverages].sort((a, b) => a.average - b.average).map((c) => (
                  <div key={c.title}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{c.title}</span>
                      <span className={`font-semibold ${scoreTextClass(c.average)}`}>{c.average}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.average}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote />
            )}
          </div>

          <div className={card}>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4" /> Target Roles
            </h3>
            {stats.targetRoles.length > 0 ? (
              <div className="space-y-3">
                {stats.targetRoles.map((r) => (
                  <div key={r.role}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`truncate ${r.role === 'Not set' ? 'text-gray-400 italic' : ''}`}>{r.role}</span>
                      <span className="font-medium">{r.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(r.count / maxRole) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No students yet.</p>
            )}
          </div>
        </div>

        <div className={card}>
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Most Common Gaps</h3>
          {stats.topGaps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {stats.topGaps.map((g) => (
                <div key={g.title} className="flex items-center gap-3 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="flex-1">{g.title}</span>
                  <span className="text-gray-500 whitespace-nowrap">{g.count} · {g.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote />
          )}
        </div>

        <div className={card}>
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Batch Insights by Branch
          </h3>
          {stats.branchInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stats.branchInsights.map((b) => (
                <div key={b.branch} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-4 bg-gray-50/50 dark:bg-zinc-800/30">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{b.branch}</span>
                    <span className="text-xs font-medium bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full">{b.students} students</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-gray-500">Avg Score</span>
                    <span className={`font-bold ${scoreTextClass(b.avgScore)}`}>{b.avgScore}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${b.avgScore}%` }} />
                  </div>
                  {b.commonGap && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span><span className="font-semibold">{b.gapPct}%</span> of this branch lacks <span className="font-semibold">{b.commonGap}</span></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StudentList icon={Trophy} title="Top Performers" students={stats.topStudents} empty="No analyzed students yet." />
          <StudentList
            icon={LifeBuoy}
            title="Needs Attention"
            students={stats.needsAttention}
            empty="No students below 40 — nice."
            showGap
            footer={stats.needsAttention.length > 0 ? { href: '/placement/students?tier=NEEDS_SUPPORT', label: 'View all' } : undefined}
          />
          <StudentList icon={Clock} title="Recently Analyzed" students={stats.recentlyAnalyzed} empty="No analyses yet." showDate />
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function StudentList({
  icon: Icon, title, students, empty, showGap, showDate, footer,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  students: BriefStudent[];
  empty: string;
  showGap?: boolean;
  showDate?: boolean;
  footer?: { href: string; label: string };
}) {
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider flex items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {students.length > 0 ? (
        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id}>
              <Link href={`/placement/students?student=${s.id}`} className="flex items-center gap-3 group">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate group-hover:text-blue-600">{s.name || s.email}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                    {showGap && s.topGap ? s.topGap : showDate ? new Date(s.updatedAt).toLocaleDateString() : s.email}
                  </span>
                </span>
                <span className={`text-sm font-bold ${scoreTextClass(s.score)}`}>{s.score}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
      {footer && (
        <Link href={footer.href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
          {footer.label} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyNote() {
  return <p className="text-sm text-gray-500">No data yet &mdash; no student has run an analysis.</p>;
}
