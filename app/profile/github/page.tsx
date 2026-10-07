'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Github, Loader2, GitMerge, Search, ShieldCheck } from 'lucide-react';
import type { GithubSkillEvidence } from '@/lib/github/analyzer';

type GithubResults = {
  username: string;
  totalRepos: number;
  evidence: GithubSkillEvidence[];
};

export default function GithubIntegrationPage() {
  const [username, setUsername] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GithubResults | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/github/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      
      setResults(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          <h1 className="text-xl font-bold tracking-tight">GitHub Evidence Analyzer</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24">
        {!results ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
              <Github className="w-8 h-8 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect GitHub Profile</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
              CareerLens analyzes repository metadata, commit recency, project structure, and technologies to verify your coding skills.
            </p>
            
            <form onSubmit={handleAnalyze} className="w-full max-w-md flex flex-col gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter GitHub username (e.g., torvalds)"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  required
                />
              </div>

              {error && (
                <div className="text-left text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!username || isAnalyzing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Repositories...</>
                ) : (
                  <>Analyze Profile</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl">
              <div>
                <h2 className="text-2xl font-bold mb-1">GitHub Analysis Complete</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Analyzed <span className="font-semibold text-gray-900 dark:text-white">{results.totalRepos}</span> public repositories for <span className="font-semibold text-gray-900 dark:text-white">@{results.username}</span>
                </p>
              </div>
              <button 
                onClick={() => setResults(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Analyze Another
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.evidence.map((ev, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg">{ev.skill}</h3>
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                      ev.strength === 'Strong' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                      ev.strength === 'Moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                      'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-400'
                    }`}>
                      {ev.strength} Evidence
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Repositories</span>
                      <span className="font-medium">{ev.repoCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Recent Activity (6mo)</span>
                      <span className="font-medium">{ev.recentProjects}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Infrastructure</span>
                      <div className="flex gap-2">
                        {ev.isDeployed && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Deployed</span>}
                        {ev.hasDocker && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">Docker</span>}
                        {ev.hasTests && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">Tested</span>}
                        {!ev.isDeployed && !ev.hasDocker && !ev.hasTests && <span className="text-gray-400 text-xs">Basic</span>}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      Confidence Score: <span className="text-gray-900 dark:text-white">{(ev.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-8">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <GitMerge className="w-4 h-4" />
                Sync Evidence to Profile
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
