'use client';

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { ReadinessScore } from "@/components/dashboard/ReadinessScore";
import { CategoryScoreCard } from "@/components/dashboard/CategoryScoreCard";
import { StrengthsAndGaps } from "@/components/dashboard/StrengthsAndGaps";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import {
  ShieldCheck, Loader2, GitFork, MapPin, Target, FileText, ArrowRight,
  RefreshCw, UserCircle, Briefcase, Bell,
} from "lucide-react";
import type { UnifiedEvidence } from "@/lib/evidence/aggregator";
import type { ScoringResult } from "@/lib/scoring/engine";
import type { Me } from "@/lib/types/me";
import { ROLE_BADGE_CLASS, ROLE_LABEL } from "@/lib/roles";
import { profileCompleteness } from "@/lib/profileCompleteness";
import { UserAvatar } from "@/components/layout/UserAvatar";

type NotificationItem = { id: string; title: string; body: string; read: boolean; createdAt: string };

const tileClass =
  'block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors';

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [evidence, setEvidence] = useState<UnifiedEvidence | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, evidenceRes, notificationsRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/students/evidence'),
          fetch('/api/placement/notifications'),
        ]);
        if (meRes.ok) setMe((await meRes.json()).data);
        if (notificationsRes.ok) setNotifications((await notificationsRes.json()).data ?? []);
        if (evidenceRes.ok) {
          const { data } = await evidenceRes.json();
          if (data) {
            setEvidence(data.evidence);
            setScoring(data.scoring);
            setAnalyzedAt(data.updatedAt ?? null);
          }
        } else {
          setLoadError(true);
        }
      } catch (e) {
        console.error(e);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const firstName = me?.name?.trim().split(/\s+/)[0];
  const targetRole = me?.profile?.targetRole;
  const location = me?.profile?.location;

  const header = (
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <UserAvatar name={me?.name} email={me?.email} image={me?.image} size={56} />
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            {me && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${ROLE_BADGE_CLASS[me.role]}`}>
                {ROLE_LABEL[me.role]}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              {targetRole ? (
                <span>Target role: <span className="font-medium text-gray-700 dark:text-gray-300">{targetRole}</span></span>
              ) : (
                <Link href="/profile" className="text-blue-600 hover:underline">Set a target role</Link>
              )}
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {location}
              </span>
            )}
          </div>
        </div>
      </div>
      {scoring && (
        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Evidence Strength: {scoring.evidenceStrength}%</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {analyzedAt && <span>Last analyzed {new Date(analyzedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            <Link href="/onboarding" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  const completeness = me ? profileCompleteness(me) : null;
  const latestMessage = notifications[0];
  const unread = notifications.filter((n) => !n.read).length;

  const nextSteps = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Link href="/profile" className={`${tileClass} group`}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <UserCircle className="w-4 h-4" /> Profile
          </span>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
        </div>
        {completeness !== null && (
          <>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold">{completeness}%</span>
              <span className="text-sm text-gray-500">complete</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800">
              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {completeness < 100 ? 'Placement cell sees your profile — fill in the gaps.' : 'Your profile is complete.'}
            </p>
          </>
        )}
      </Link>

      <Link href="/matcher" className={`${tileClass} group`}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Briefcase className="w-4 h-4" /> Job Matcher
          </span>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
        </div>
        <p className="text-sm font-medium mb-1">Check your fit for a specific job</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Paste a job description to see matched skills, missing skills and a match score.
        </p>
      </Link>

      <div className={tileClass}>
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Bell className="w-4 h-4" /> Placement Cell
          </span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{unread} new</span>
          )}
        </div>
        {latestMessage ? (
          <>
            <p className="text-sm font-medium mb-1 line-clamp-1">{latestMessage.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{latestMessage.body}</p>
            <p className="mt-2 text-[11px] text-gray-400">{new Date(latestMessage.createdAt).toLocaleDateString()}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No messages from the placement cell yet.</p>
        )}
      </div>
    </div>
  );

  if (!scoring) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
        <main className="mx-auto max-w-6xl p-6 mt-6 pb-24">
          {header}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {loadError ? "Couldn't load your career readiness report" : 'No career readiness report yet'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {loadError
                ? 'Something went wrong fetching your saved analysis. Refresh the page to try again.'
                : 'Upload your resume and we’ll analyze it alongside your GitHub and portfolio to build your readiness score.'}
            </p>
            {!loadError && (
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Upload &amp; Analyze
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          {nextSteps}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">

      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24">
        {header}

        {nextSteps}

        {/* Top Row: Overall Score & Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <ReadinessScore score={scoring.overallScore} />
          </div>
          
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Category Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {scoring.categories.map((cat, idx) => (
                <CategoryScoreCard key={idx} title={cat.title} score={cat.score} />
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row: Strengths and Gaps */}
        <div className="mb-6">
          <StrengthsAndGaps strengths={scoring.strengths} gaps={scoring.gaps} />
        </div>

        {/* Bottom Row: Recommendations */}
        <div className="mb-6">
          <RecommendedActions actions={scoring.actions} />
        </div>

        {/* Evidence Model UI */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Verified Skills Model
          </h3>
          {evidence && evidence.skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {evidence.skills.map((skill, idx) => (
                <details key={idx} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
                  <summary className="list-none cursor-pointer p-5 focus:outline-none">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg group-open:text-blue-600 dark:group-open:text-blue-400 transition-colors">{skill.name}</h3>
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                        skill.strength === 'Strong' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                        skill.strength === 'Moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400'
                      }`}>
                        {skill.strength} Evidence
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Repositories</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline">{skill.githubRepoCount} (Click to expand)</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Mentioned in Resume</span>
                        {skill.mentionedInResume ? <span className="font-bold text-green-500">Yes</span> : <span className="text-gray-400">No</span>}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Infrastructure</span>
                        <div className="flex gap-2">
                          {skill.isDeployed && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Deployed</span>}
                          {skill.hasGithubDocker && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Docker</span>}
                          {skill.hasGithubTests && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">Tested</span>}
                          {!skill.isDeployed && !skill.hasGithubDocker && !skill.hasGithubTests && <span className="text-gray-400 text-xs">Basic</span>}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Confidence Score: <span className="text-gray-900 dark:text-white">{Math.round(skill.confidenceScore * 100)}%</span>
                      </span>
                    </div>
                  </summary>

                  {/* Expanded Projects Section */}
                  <div className="p-5 pt-0 border-t border-gray-100 dark:border-zinc-800">
                    <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Matched Projects</div>
                    {skill.githubRepositories.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {skill.githubRepositories.map((repo, rIdx) => (
                          <li key={rIdx}>
                            <a 
                              href={evidence.contactInfo.links.find(l => l.includes('github.com')) ? `https://github.com/${evidence.contactInfo.links.find(l => l.includes('github.com'))?.split('github.com/')[1]?.split('/')[0]}/${repo.name}` : '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all shadow-sm"
                            >
                              <GitFork className="w-3.5 h-3.5" />
                              {repo.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No specific repositories detected for this skill.</p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills detected. Upload a resume to build your model.</p>
          )}
        </div>

      </main>
    </div>
  )
}
