'use client';

import React, { useEffect, useState } from 'react';
import { History, FileText, Globe, GitFork, User, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import type { StoredEvidence, HistoryEvent } from '@/lib/evidence/student-evidence';

export default function TimelinePage() {
  const [evidence, setEvidence] = useState<StoredEvidence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/students/evidence');
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.evidence) {
            setEvidence(data.evidence);
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
      <div className="max-w-3xl mx-auto p-4 md:p-8 animate-pulse mt-10">
        <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded mb-4"></div>
        <div className="h-4 w-72 bg-gray-200 dark:bg-zinc-800 rounded mb-12"></div>
        
        <div className="space-y-8 border-l-2 border-gray-200 dark:border-zinc-800 pl-6 ml-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-zinc-800 rounded-xl relative">
              <div className="absolute -left-10 top-4 w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className="p-10 text-center text-sm text-red-500">Failed to load timeline.</div>;
  }

  const history = evidence?.history ? [...evidence.history].reverse() : []; // Newest first

  if (history.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <History className="w-8 h-8 text-blue-500" />
            Profile Timeline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress as you build your career profile.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No history yet</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Upload a resume or connect your GitHub to start building your timeline.
          </p>
        </div>
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'RESUME_UPLOAD': return <FileText className="w-4 h-4 text-white" />;
      case 'GITHUB_SYNC': return <GitFork className="w-4 h-4 text-white" />;
      case 'PORTFOLIO_SYNC': return <Globe className="w-4 h-4 text-white" />;
      default: return <User className="w-4 h-4 text-white" />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'RESUME_UPLOAD': return 'bg-blue-500';
      case 'GITHUB_SYNC': return 'bg-purple-500';
      case 'PORTFOLIO_SYNC': return 'bg-amber-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-3">
          <History className="w-8 h-8 text-blue-500" />
          Profile Timeline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          A historical view of your profile updates, skill additions, and readiness scores.
        </p>
      </div>

      {history.length > 1 && (
        <div className="mb-12 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Score Progression</h3>
          <div className="relative h-48 w-full flex items-end">
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              
              {/* The Smooth Curve Line */}
              <path
                fill="none"
                stroke="currentColor"
                className="text-blue-500"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                d={(() => {
                  const pts = [...history].reverse().map((e, i, arr) => ({
                    x: (i / Math.max(1, arr.length - 1)) * 100,
                    y: 100 - e.score
                  }));
                  let d = `M ${pts[0].x},${pts[0].y} `;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p1 = pts[i];
                    const p2 = pts[i+1];
                    const midX = (p1.x + p2.x) / 2;
                    d += `C ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y} `;
                  }
                  return d;
                })()}
              />
            </svg>
            
            {/* Tooltips and Points overlay */}
            <div className="absolute inset-0 w-full h-full">
              {[...history].reverse().map((e, i, arr) => {
                const xPct = (i / Math.max(1, arr.length - 1)) * 100;
                const yPct = 100 - e.score;
                return (
                  <div 
                    key={i} 
                    className="group absolute w-4 h-4 flex items-center justify-center cursor-pointer z-10" 
                    style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {/* The Point */}
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-900 shadow-sm" />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-[10px] px-2 py-1 rounded shadow-lg flex flex-col items-center">
                        <span className="font-bold">Score: {Math.round(e.score)}</span>
                        <span className="text-gray-300 dark:text-gray-600">{new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>{new Date(history[history.length - 1].date).toLocaleDateString()}</span>
            <span>{new Date(history[0].date).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      <div className="relative border-l-2 border-gray-200 dark:border-zinc-800 ml-4 pl-8 space-y-8 pb-10">
        {history.map((event, idx) => {
          const prevEvent = idx < history.length - 1 ? history[idx + 1] : null;
          const scoreDiff = prevEvent ? Math.round(event.score - prevEvent.score) : null;
          
          return (
            <div key={event.id || idx} className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
              <div className={`absolute -left-[45px] top-5 w-8 h-8 rounded-full border-4 border-white dark:border-zinc-950 flex items-center justify-center ${getColorForType(event.type)}`}>
                {getIconForType(event.type)}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{event.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{event.description}</p>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="text-xs text-gray-400 mb-1">
                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">{Math.round(event.score)}</span>
                    <span className="text-xs text-gray-500">Score</span>
                    
                    {scoreDiff !== null && scoreDiff !== 0 && (
                      <span className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${scoreDiff > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {scoreDiff > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(scoreDiff)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {event.skillsAdded && event.skillsAdded.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Skills Added / Updated</span>
                  <div className="flex flex-wrap gap-2">
                    {event.skillsAdded.map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
