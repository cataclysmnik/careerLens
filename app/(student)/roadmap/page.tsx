'use client';

import React, { useEffect, useState } from 'react';
import { Map, Loader2, ArrowRight, CheckCircle2, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import type { Me } from '@/lib/types/me';
import type { ScoringResult } from '@/lib/scoring/engine';
import type { NextAction } from '@/lib/scoring/role-fit';

export default function RoadmapPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, evidenceRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/students/evidence'),
        ]);
        if (meRes.ok) setMe((await meRes.json()).data);
        if (evidenceRes.ok) {
          const { data } = await evidenceRes.json();
          if (data) {
            setScoring(data.scoring);
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
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-4 md:p-8 mt-10">
        <div className="h-8 w-64 bg-gray-200 dark:bg-zinc-800 rounded mb-4"></div>
        <div className="h-4 w-96 bg-gray-200 dark:bg-zinc-800 rounded mb-10"></div>
        <div className="space-y-6 border-l-2 border-gray-200 dark:border-zinc-800 pl-6 ml-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-xl relative">
               <div className="absolute -left-10 top-4 w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className="p-10 text-center text-sm text-red-500">Failed to load roadmap data.</div>;
  }

  const actions = scoring?.actions || [];
  
  if (actions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Map className="w-8 h-8 text-blue-500" />
            Your Career Roadmap
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Based on your profile, we have mapped out your next steps.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all set!</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Your profile looks great. We don't have any immediate actions to recommend right now. Keep building and updating your resume!
          </p>
        </div>
      </div>
    );
  }

  // Group actions by phase
  // Phase 1: High ROI (Top 3)
  // Phase 2: Medium ROI
  const sortedActions = [...actions].sort((a, b) => b.roi - a.roi);
  
  const phase1 = sortedActions.slice(0, Math.min(3, Math.max(1, Math.ceil(sortedActions.length / 3))));
  const phase2 = sortedActions.slice(phase1.length, phase1.length + Math.ceil((sortedActions.length - phase1.length) / 2));
  const phase3 = sortedActions.slice(phase1.length + phase2.length);

  const phases = [
    { title: "Phase 1: Quick Wins & High Impact", description: "Tasks that require the least effort for the highest boost in your role fit.", items: phase1, color: "text-blue-500", bg: "bg-blue-500" },
    { title: "Phase 2: Core Foundations", description: "Important steps to solidify your baseline skills for your target role.", items: phase2, color: "text-amber-500", bg: "bg-amber-500" },
    { title: "Phase 3: Deep Dives & Polish", description: "Advanced actions to set you apart from the competition.", items: phase3, color: "text-purple-500", bg: "bg-purple-500" }
  ].filter(p => p.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-3">
          <Map className="w-8 h-8 text-blue-500" />
          Your Career Roadmap
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          A personalized step-by-step plan to reach your target role of <span className="font-semibold text-gray-900 dark:text-white">{me?.profile?.targetRole || 'Software Engineer'}</span>.
        </p>
      </div>

      <div className="space-y-12">
        {phases.map((phase, pIdx) => (
          <div key={pIdx} className="relative">
            <div className="mb-6 ml-10">
              <h2 className={`text-xl font-bold mb-1 ${phase.color}`}>{phase.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{phase.description}</p>
            </div>
            
            <div className="space-y-6 relative border-l-2 border-gray-200 dark:border-zinc-800 ml-4 pl-6">
              {phase.items.map((action, aIdx) => (
                <div key={aIdx} className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[31px] top-6 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-950 ${phase.bg}`}></div>
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white">{action.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          action.impact === 'High Impact' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          action.impact === 'Medium Impact' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300'
                        }`}>
                          {action.impact}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {action.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{Math.round(action.estimatedRoleFitGain * 100)}% Match
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Effort Level: {action.effort}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
