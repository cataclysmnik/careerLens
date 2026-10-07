'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GitFork, Loader2, GitMerge, Search, ShieldCheck } from 'lucide-react';
import type { GithubSkillEvidence } from '@/lib/github/analyzer';

type GithubResults = {
  username: string;
  totalRepos: number;
  evidence: GithubSkillEvidence[];
  repositories: { name: string; description: string | null; stargazers_count: number; updated_at: string; language: string | null; topics: string[] }[];
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
          <GitFork className="w-5 h-5" />
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
              <GitFork className="w-8 h-8 text-gray-700 dark:text-gray-300" />
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

            {/* Contribution Graph */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl overflow-x-auto">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Contribution Activity</h3>
              <div className="min-w-[700px]">
                {/* 
                  Using rshah's ghchart service which returns an SVG of the user's Github contribution graph.
                  In dark mode, we append a hex color code to change the theme color.
                */}
                <img 
                  src={`https://ghchart.rshah.org/${results.username}`} 
                  alt={`${results.username}'s Github Chart`}
                  className="w-full dark:invert dark:hue-rotate-180 opacity-90"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.evidence.map((ev, idx) => (
                <details key={idx} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
                  <summary className="list-none cursor-pointer p-5 focus:outline-none">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg group-open:text-blue-600 dark:group-open:text-blue-400 transition-colors">{ev.skill}</h3>
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
                        <span className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline">{ev.repoCount} (Click to expand)</span>
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
                  </summary>

                  {/* Expanded Projects Section */}
                  <div className="p-5 pt-0 border-t border-gray-100 dark:border-zinc-800">
                    <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Matched Projects</div>
                    <ul className="flex flex-wrap gap-2">
                      {ev.repositories?.map((repo, rIdx) => (
                        <li key={rIdx}>
                          <a 
                            href={`https://github.com/${results.username}/${repo.name}`}
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
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-10 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Latest Repositories</h3>
              <div className="space-y-4">
                {results.repositories && results.repositories.length > 0 ? (
                  results.repositories.slice(0, 5).map((repo, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <a href={`https://github.com/${results.username}/${repo.name}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-2">
                          <GitFork className="w-4 h-4" />
                          {repo.name}
                        </a>
                        {repo.language && (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded-full font-medium">
                            {repo.language}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {repo.description || 'No description provided.'}
                      </p>
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {repo.topics.slice(0, 4).map(topic => (
                            <span key={topic} className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 rounded uppercase font-bold tracking-wider">
                              {topic}
                            </span>
                          ))}
                          {repo.topics.length > 4 && <span className="text-[10px] text-gray-400">+{repo.topics.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No repositories found or available.</p>
                )}
              </div>
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
