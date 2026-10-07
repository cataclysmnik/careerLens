'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Target, AlertTriangle, CheckCircle2, Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
import type { UnifiedEvidence } from '@/lib/evidence/aggregator';

type MatchResult = {
  matchScore: number;
  matchedSkills: { name: string; strength: string; confidenceScore: number }[];
  missingSkills: string[];
  bonusSkills: string[];
  feedback: string;
};

export default function JobMatcherPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [evidence, setEvidence] = useState<UnifiedEvidence | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/students/evidence');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            setEvidence(data.evidence);
          } else {
            setError("No profile found. Please upload your resume on the onboarding page first.");
          }
        } else {
          setError("Couldn't load your profile. Refresh the page to try again.");
        }
      } catch (e) {
        console.error(e);
        setError("Couldn't load your profile. Refresh the page to try again.");
      }
    })();
  }, []);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || !evidence) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jobDescription.trim(), evidence }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matching failed');
      
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!evidence) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 mb-4">{error || "Loading profile..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 p-6 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Job Matcher
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paste a Job Description below. CareerLens will cross-reference its required skills with your Verified Skills Model to determine your precise Match Score.
          </p>
        </div>

        <form onSubmit={handleMatch} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6">
            <label className="block text-sm font-semibold mb-2">Paste Job Description</label>
            <textarea
              className="w-full h-48 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="e.g. We are looking for a Senior Frontend Engineer with deep experience in React, Next.js, and TypeScript. You should be familiar with AWS..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            />
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Using your Verified Skills Model
            </span>
            <button
              type="submit"
              disabled={isAnalyzing || !jobDescription}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Target className="w-4 h-4" /> Calculate Match Score</>}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {/* Score Panel */}
            <div className="md:col-span-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="relative mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" className="text-gray-100 dark:text-zinc-800" strokeWidth="12" stroke="currentColor" fill="transparent" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    className={`${result.matchScore >= 80 ? 'text-green-500' : result.matchScore >= 60 ? 'text-blue-500' : 'text-amber-500'} transition-all duration-1000 ease-out`} 
                    strokeWidth="12" strokeDasharray={56 * 2 * Math.PI} strokeDashoffset={56 * 2 * Math.PI - (result.matchScore / 100) * 56 * 2 * Math.PI} stroke="currentColor" fill="transparent" 
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black">{result.matchScore}%</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Match</span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {result.feedback}
              </p>
            </div>

            {/* Details Panel */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" /> Requirements Met ({result.matchedSkills.length})
                </h3>
                {result.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.matchedSkills.map(s => (
                      <span key={s.name} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-lg text-sm font-medium flex items-center gap-2">
                        {s.name}
                        <span className="bg-green-100 dark:bg-green-900/60 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">{s.strength}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">None of your verified skills matched the requirements.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-4 h-4" /> Missing Skills ({result.missingSkills.length})
                  </h3>
                  {result.missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.missingSkills.map(s => (
                        <span key={s} className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-900/30 text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">You meet all technical requirements!</p>
                  )}
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <PlusCircle className="w-4 h-4" /> Bonus Skills ({result.bonusSkills.length})
                  </h3>
                  {result.bonusSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.bonusSkills.map(s => (
                        <span key={s} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-900/30 text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No major unrequested skills detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
