'use client';

import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, GitFork, Globe, Loader2, AlertTriangle } from 'lucide-react';

type Stats = {
  totalStudents: number;
  analyzedStudents: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  pctWithGithub: number;
  pctWithPortfolio: number;
  topGaps: { title: string; count: number }[];
};

export default function PlacementOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/placement/stats')
      .then((res) => res.json())
      .then((json) => setStats(json.data))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!stats) return null;

  const maxBucket = Math.max(1, ...Object.values(stats.scoreDistribution));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Cohort Overview</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Aggregate career-readiness stats across all students.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={stats.totalStudents} />
          <StatCard icon={TrendingUp} label="Average Score" value={`${stats.averageScore}%`} />
          <StatCard icon={GitFork} label="With GitHub Evidence" value={`${stats.pctWithGithub}%`} />
          <StatCard icon={Globe} label="With Portfolio" value={`${stats.pctWithPortfolio}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Score Distribution</h3>
            <div className="space-y-3">
              {Object.entries(stats.scoreDistribution).map(([bucket, count]) => (
                <div key={bucket} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-gray-500">{bucket}</span>
                  <div className="flex-1 h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs font-medium text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Most Common Gaps</h3>
            {stats.topGaps.length > 0 ? (
              <div className="space-y-2">
                {stats.topGaps.map((g) => (
                  <div key={g.title} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="flex-1">{g.title}</span>
                    <span className="text-gray-400">{g.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data yet &mdash; students haven&apos;t completed onboarding.</p>
            )}
          </div>
        </div>

        {stats.analyzedStudents === 0 && (
          <p className="text-sm text-gray-500">No students have completed onboarding yet.</p>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
