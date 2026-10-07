'use client';

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { ReadinessScore } from "@/components/dashboard/ReadinessScore";
import { CategoryScoreCard } from "@/components/dashboard/CategoryScoreCard";
import { StrengthsAndGaps } from "@/components/dashboard/StrengthsAndGaps";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { ShieldCheck, Loader2 } from "lucide-react";
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Skill</th>
                    <th className="px-4 py-3 text-center">Resume</th>
                    <th className="px-4 py-3 text-center">GitHub Repos</th>
                    <th className="px-4 py-3 text-center">Portfolio</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.skills.map((skill, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{skill.name}</td>
                      <td className="px-4 py-3 text-center">
                        {skill.mentionedInResume ? <span className="text-green-500 font-bold">✓</span> : <span className="text-gray-300 dark:text-gray-700">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {skill.githubRepoCount > 0 ? (
                          <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {skill.githubRepoCount}
                          </span>
                        ) : <span className="text-gray-300 dark:text-gray-700">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {skill.isDeployed ? <span className="text-blue-500 font-bold">✓</span> : <span className="text-gray-300 dark:text-gray-700">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          skill.strength === 'Strong' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          skill.strength === 'Moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400'
                        }`}>
                          {Math.round(skill.confidenceScore * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills detected. Upload a resume to build your model.</p>
          )}
        </div>

      </main>
    </div>
  )
}
