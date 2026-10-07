'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Loader2, GitFork, Globe, CheckCircle2 } from 'lucide-react';
import { aggregateEvidence } from '@/lib/evidence/aggregator';
import { calculateReadiness } from '@/lib/scoring/engine';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scrapedData, setScrapedData] = useState<{ github: any, portfolio: any } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startPipeline = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setStep(2);

    try {
      // Step 1: Parse Resume
      setStatusText('Extracting text from resume...');
      const formData = new FormData();
      formData.append('resume', file);

      const resumeRes = await fetch('/api/resume/parse', { method: 'POST', body: formData });
      const resumeData = await resumeRes.json();
      if (!resumeRes.ok) throw new Error(resumeData.error || 'Failed to parse resume');
      
      const parsedResume = resumeData.data;

      // Extract Usernames & URLs
      let githubUsername: string | null = null;
      let portfolioUrl: string | null = null;

      parsedResume.links.forEach((link: string) => {
        if (link.includes('github.com')) {
          const parts = link.split('github.com/');
          if (parts[1]) githubUsername = parts[1].split('/')[0];
        } else {
          // Parse the URL to get the exact hostname for safer blocking
          let hostname = link.toLowerCase();
          try {
            hostname = new URL(link).hostname.replace(/^www\./, '');
          } catch(e) {
            hostname = hostname.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          }

          const isEmail = link.includes('@') || link.includes('mailto:');
          
          // Platforms where the NAKED domain is never a portfolio (e.g., vercel.app, github.io)
          // But SUBDOMAINS (e.g. sagnik.vercel.app) are allowed!
          const nakedPlatforms = ['vercel.app', 'netlify.app', 'github.io', 'heroku.com', 'render.com', 'firebaseapp.com'];
          
          // Domains that are NEVER a portfolio, even as subdomains
          const ignoreDomains = [
            'linkedin.com', 'twitter.com', 'x.com', 'facebook.com', 
            'instagram.com', 'outlook.com', 'gmail.com', 'google.com', 
            'yahoo.com', 'youtube.com', 'medium.com', 'dev.to', 'hashnode.com',
            'github.com' // Github handled above
          ];
          
          const isIgnoredDomain = ignoreDomains.some(domain => hostname.includes(domain)) || 
                                  nakedPlatforms.includes(hostname); // Only block if it is exactly the naked platform

          if (!isEmail && !isIgnoredDomain) {
            if (!portfolioUrl) portfolioUrl = link; 
          }
        }
      });

      let githubData = null;
      let portfolioData = null;

      // Step 2: Analyze GitHub if found
      if (githubUsername) {
        setStep(3);
        setStatusText(`Analyzing GitHub profile: @${githubUsername}...`);
        try {
          const ghRes = await fetch('/api/github/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: githubUsername })
          });
          if (ghRes.ok) {
            const ghJson = await ghRes.json();
            githubData = ghJson.data;
          }
        } catch (e) {
          console.error("GitHub analysis failed in pipeline", e);
        }
      }

      // Step 3: Analyze Portfolio if found
      if (portfolioUrl) {
        setStep(4);
        setStatusText(`Scraping Portfolio: ${portfolioUrl}...`);
        try {
          const portRes = await fetch('/api/portfolio/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: portfolioUrl })
          });
          if (portRes.ok) {
            const portJson = await portRes.json();
            portfolioData = portJson.data;
          }
        } catch (e) {
          console.error("Portfolio analysis failed in pipeline", e);
        }
      }

      // Final Step: Save to LocalStorage and show results
      setStep(5);
      setStatusText('Career Readiness Model Generated!');
      
      localStorage.setItem('careerlens_pipeline', JSON.stringify({
        resume: parsedResume,
        github: githubData,
        portfolio: portfolioData
      }));

      // Persist to the server so the dashboard, placement cell, and future
      // devices/browsers can all see this student's evidence and score.
      try {
        const unifiedEvidence = aggregateEvidence(parsedResume, githubData, portfolioData);
        const scoring = calculateReadiness(unifiedEvidence);
        await fetch('/api/students/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence: unifiedEvidence, scoring }),
        });
      } catch (e) {
        console.error('Failed to persist evidence to server', e);
      }

      setScrapedData({
        github: githubData,
        portfolio: portfolioData
      });

    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-500/30">
            C
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to CareerLens</h1>
          <p className="text-gray-500 dark:text-gray-400">Upload your resume and we'll automatically build your profile.</p>
        </div>

        {!isProcessing ? (
          <div className="space-y-6">
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-10 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-zinc-950"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="font-medium mb-1">Click to upload your Resume</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF, DOCX, or TXT up to 5MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-lg border border-red-100 dark:border-red-900/50">
                {error}
              </div>
            )}

            <button
              onClick={startPipeline}
              disabled={!file}
              className="w-full py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
            >
              Start Automated Analysis
            </button>
          </div>
        ) : (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center mb-8">
              {step < 5 ? (
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
              )}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{statusText}</h2>
            </div>

            {!scrapedData ? (
              <div className="space-y-4 max-w-sm mx-auto">
                <StepIndicator icon={FileText} title="Parsing Resume" active={step >= 2} completed={step > 2} />
                <StepIndicator icon={GitFork} title="GitHub Analysis" active={step >= 3} completed={step > 3} />
                <StepIndicator icon={Globe} title="Portfolio Scanning" active={step >= 4} completed={step > 4} />
                <StepIndicator icon={CheckCircle2} title="Finalizing Profile" active={step >= 5} completed={step > 5} />
              </div>
            ) : (
              <div className="space-y-6 w-full text-left">
                {scrapedData.github && (
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <GitFork className="w-5 h-5" /> Scraped GitHub Data
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Found <span className="font-bold">{scrapedData.github.totalRepos}</span> total repositories for <span className="font-bold">@{scrapedData.github.username}</span>.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {scrapedData.github.evidence.map((ev: any, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm">
                          {ev.skill} ({ev.repoCount} Repos)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {scrapedData.portfolio && (
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                      <Globe className="w-5 h-5" /> Scraped Portfolio Data
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                      <span className="font-bold">URL:</span> {scrapedData.portfolio.url}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">SEO Score</div>
                        <div className="text-lg font-bold">{scrapedData.portfolio.seoScore}/100</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">A11y Score</div>
                        <div className="text-lg font-bold">{scrapedData.portfolio.accessibilityScore}/100</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 mt-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                >
                  View Full Career Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ icon: Icon, title, active, completed }: { icon: any, title: string, active: boolean, completed: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      completed ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50 text-green-700 dark:text-green-400' :
      active ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' :
      'bg-gray-50 border-gray-100 dark:bg-zinc-800/50 dark:border-zinc-800 text-gray-400'
    }`}>
      <Icon className={`w-5 h-5 ${completed ? 'text-green-500' : active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
      <span className="font-medium text-sm">{title}</span>
      {completed && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />}
      {active && !completed && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
    </div>
  )
}
