'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Calendar,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Briefcase,
} from 'lucide-react';
import type { InterviewEvaluation } from '@/lib/interview/engine';

interface ProgressTrackerProps {
  onStartNewSession: () => void;
  onSelectPastSession: (evaluation: InterviewEvaluation) => void;
}

export function ProgressTracker({
  onStartNewSession,
  onSelectPastSession,
}: ProgressTrackerProps) {
  const [data, setData] = useState<{
    sessions: any[];
    stats: {
      totalSessions: number;
      averageScore: number;
      growthRate: number | null;
      scoreTrend: { id: string; date: string; score: number; roleTitle: string; seniority: string }[];
      metricsAverage: { roleFoundations: number; projectDepth: number; architecture: number; communication: number } | null;
      topStrengths: string[];
      topAreasToImprove: string[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/interview/history')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
      })
      .then((json) => {
        setData(json.data);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load interview progress. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading your interview progress & trends...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="font-bold text-gray-900 dark:text-white">Unable to Load Progress</h3>
        <p className="text-xs text-gray-500">{error}</p>
        <button
          onClick={onStartNewSession}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          Start a New Session
        </button>
      </div>
    );
  }

  const { sessions, stats } = data;
  const completedSessions = sessions.filter((s) => s.status === 'completed' && s.overallScore !== null);

  if (completedSessions.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
          <TrendingUp className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            No Completed Sessions Yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            Take your first real-life job mock interview! Practice against realistic technical questions, unlock role-tailored resume rewrites, and track your interview mastery across roles over time.
          </p>
        </div>
        <button
          onClick={onStartNewSession}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
        >
          Start Your First Job Mock Interview
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Job Interview Progress & Mastery Over Time
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tracking your communication, technical depth, and architectural performance across roles.
          </p>
        </div>
        <button
          onClick={onStartNewSession}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Start New Mock Interview
        </button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Sessions</span>
          <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalSessions}</div>
          <span className="text-[11px] text-gray-400">Completed mock rounds</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Average Score</span>
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
            {stats.averageScore}
            <span className="text-sm font-normal text-gray-400">/100</span>
          </div>
          <span className="text-[11px] text-gray-400">Across all completed job roles</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Skill Growth Rate</span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            {stats.growthRate !== null ? (
              <>
                {stats.growthRate >= 0 ? `+${stats.growthRate}%` : `${stats.growthRate}%`}
                <ArrowUpRight className="w-5 h-5" />
              </>
            ) : (
              <span className="text-gray-400 text-xl font-medium">1st round</span>
            )}
          </div>
          <span className="text-[11px] text-gray-400">Compared to initial interview</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Strongest Category</span>
          <div className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1 pt-1">
            {stats.metricsAverage?.projectDepth && stats.metricsAverage.projectDepth >= 80 ? 'Project Depth' : 'Core Foundations'}
          </div>
          <span className="text-[11px] text-gray-400">Consistent highest category</span>
        </div>
      </div>

      {/* Visual Score Progression Chart */}
      {stats.scoreTrend.length >= 2 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Score Trajectory Across Roles
            </h3>
            <span className="text-xs text-gray-400">Past {stats.scoreTrend.length} sessions</span>
          </div>

          <div className="h-44 w-full relative pt-4 pb-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {(() => {
                const points = stats.scoreTrend.map((s, idx) => {
                  const x = (idx / (stats.scoreTrend.length - 1)) * 480 + 10;
                  const clamped = Math.max(0, Math.min(100, s.score));
                  const y = 110 - (clamped / 100) * 90;
                  return { x, y, score: s.score, role: s.roleTitle };
                });

                const lineD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                const areaD = `${lineD} L ${points[points.length - 1].x} 115 L ${points[0].x} 115 Z`;

                return (
                  <>
                    <path d={areaD} fill="url(#scoreGrad)" />
                    <path d={lineD} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#2563eb" className="stroke-white dark:stroke-zinc-900" strokeWidth="2" />
                        <text
                          x={p.x}
                          y={p.y - 10}
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-gray-700 dark:fill-gray-300"
                        >
                          {p.score}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Competency Averages & Recurring Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.metricsAverage && (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Average Role Competency Breakdown
            </h3>
            <div className="space-y-3.5">
              {[
                { label: 'Role Core Foundations', val: stats.metricsAverage.roleFoundations },
                { label: 'Project Implementation Depth', val: stats.metricsAverage.projectDepth },
                { label: 'System Architecture', val: stats.metricsAverage.architecture },
                { label: 'Communication & Clarity', val: stats.metricsAverage.communication },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{item.val}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aggregated Strengths & Areas to Refine */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            Top Trends Across Past Rounds
          </h3>
          <div className="space-y-3">
            {stats.topStrengths.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Consistent Strengths
                </span>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4 list-disc">
                  {stats.topStrengths.slice(0, 3).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {stats.topAreasToImprove.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  High-Priority Refinements
                </span>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-4 list-disc">
                  {stats.topAreasToImprove.slice(0, 3).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Sessions Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          Session History & Saved Reports
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {completedSessions.map((session) => {
            const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const roleName = session.roleTitle || session.projectTitle || 'Software Engineer';

            return (
              <div
                key={session.id}
                onClick={() => {
                  if (session.feedback && session.resumeRewrites) {
                    onSelectPastSession({
                      overallScore: session.overallScore,
                      roleTitle: roleName,
                      metrics: session.metrics,
                      feedback: session.feedback,
                      resumeRewrites: session.resumeRewrites,
                    });
                  }
                }}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 -mx-3 px-3 rounded-xl transition-all cursor-pointer group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      {roleName}
                    </h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 capitalize">
                      {session.seniority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{session.interviewerType?.replace(/_/g, ' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-black text-blue-600 dark:text-blue-400">
                      {session.overallScore}/100
                    </div>
                    <span className="text-[10px] text-gray-400">Score</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
