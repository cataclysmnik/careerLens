'use client';

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { ReadinessScore } from "@/components/dashboard/ReadinessScore";
import { CategoryScoreCard } from "@/components/dashboard/CategoryScoreCard";
import { StrengthsAndGaps } from "@/components/dashboard/StrengthsAndGaps";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { ShieldCheck, Loader2, Github } from "lucide-react";
import { aggregateEvidence, UnifiedEvidence } from "@/lib/evidence/aggregator";
import { calculateReadiness, ScoringResult } from "@/lib/scoring/engine";

export default function DashboardPage() {
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [evidence, setEvidence] = useState<UnifiedEvidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('careerlens_pipeline');
      if (stored) {
        const { resume, github, portfolio } = JSON.parse(stored);
        const unifiedEvidence = aggregateEvidence(resume, github, portfolio);
        setEvidence(unifiedEvidence);
        setScoring(calculateReadiness(unifiedEvidence));
      } else {
        // Fallback to mock if nothing in local storage
        const mockResume = {
          skills: ["React", "TypeScript", "Node.js"],
          links: ["github.com/mockuser"],
          emails: ["test@example.com"],
          rawText: "...",
          confidence: 0.8,
          aiDetectedClaims: []
        };
        const unifiedEvidence = aggregateEvidence(mockResume, null, null);
        setEvidence(unifiedEvidence);
        setScoring(calculateReadiness(unifiedEvidence));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!scoring) return null;

  const user = { 
    name: "Guest User", 
    profile: { githubUsername: "Auto-Detected", targetRole: "Software Engineer" } 
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Career Readiness Overview</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Analyzing <span className="font-medium text-gray-700 dark:text-gray-300">Target Role: {user.profile.targetRole}</span>
              <span className="mx-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold uppercase">Dynamic Engine Active</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Evidence Strength: {scoring.evidenceStrength}%</span>
          </div>
        </div>

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
                              <Github className="w-3.5 h-3.5" />
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
