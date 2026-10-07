'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Globe, Loader2, Link as LinkIcon, BookOpen, Search, Code2, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { PortfolioEvidence } from '@/lib/portfolio/analyzer';

export default function PortfolioIntegrationPage() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PortfolioEvidence | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/portfolio/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
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
          <Globe className="w-5 h-5" />
          <h1 className="text-xl font-bold tracking-tight">Portfolio & Web Presence Analyzer</h1>
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
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyze Personal Portfolio</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
              We scrape your personal website to verify UX/UI signals, check for case studies, and find undocumented live projects.
            </p>
            
            <form onSubmit={handleAnalyze} className="w-full max-w-md flex flex-col gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourportfolio.com"
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
                disabled={!url || isAnalyzing}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Scraping Website...</>
                ) : (
                  <>Analyze Portfolio</>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl">
              <div>
                <h2 className="text-2xl font-bold mb-1">Portfolio Analysis Complete</h2>
                <a href={results.url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                  {results.url} <LinkIcon className="w-3 h-3" />
                </a>
              </div>
              <button 
                onClick={() => setResults(null)}
                className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Scan Another URL
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Content Signals */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" /> Content Signals
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Case Studies Detected</span>
                    {results.hasCaseStudies ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold rounded">Missing</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">External Live Links</span>
                    <span className="font-bold">{results.liveLinksCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub References</span>
                    <span className="font-bold">{results.githubLinksCount}</span>
                  </div>
                </div>

                {!results.hasCaseStudies && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      We didn't detect strong case study structures (e.g. "The Problem", "Architecture"). Adding detailed write-ups drastically improves project scores.
                    </p>
                  </div>
                )}
              </div>

              {/* Technical Signals */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-500" /> Engineering & UX
                </h3>
                
                <div className="mb-6">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-3">Detected Frameworks</span>
                  {results.detectedFrameworks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {results.detectedFrameworks.map((fw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-sm font-medium rounded-md border border-gray-200 dark:border-zinc-700">
                          {fw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Plain HTML/CSS or undetectable framework.</p>
                  )}
                </div>

                <div className="space-y-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Quality Heuristics</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg border ${results.seoScore > 70 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'} dark:bg-transparent dark:border-zinc-800 dark:text-gray-300`}>
                      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">SEO Score</div>
                      <div className="font-bold text-xl">{results.seoScore}/100</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${results.accessibilityScore > 70 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'} dark:bg-transparent dark:border-zinc-800 dark:text-gray-300`}>
                      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">A11y Score</div>
                      <div className="font-bold text-xl">{results.accessibilityScore}/100</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400">Dark Mode Support</span>
                      {results.features?.hasDarkMode ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">✗</span>}
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400">Semantic HTML Tags</span>
                      {results.features?.hasSemanticHtml ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">✗</span>}
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400">Mobile Responsive</span>
                      {results.features?.hasResponsiveMeta ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">✗</span>}
                    </div>
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400">OpenGraph (Social Share)</span>
                      {results.features?.hasOpenGraph ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">✗</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                Add Portfolio Evidence to Profile
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
