'use client';

import React, { useState, useRef } from 'react';
import { Briefcase, Target, AlertTriangle, CheckCircle2, Loader2, PlusCircle, UploadCloud, FileText, X } from 'lucide-react';

type MatchResult = {
  fileName: string;
  matchScore?: number;
  matchedSkills?: { name: string; strength: string; confidenceScore: number }[];
  missingSkills?: string[];
  bonusSkills?: string[];
  feedback?: string;
  error?: string;
};

export default function CompanyMatcherPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('jobDescription', jobDescription.trim());
      files.forEach((f) => formData.append('resumes', f));

      const res = await fetch('/api/company/match', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Matching failed');

      setResults(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 p-6 md:p-10 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            JD Matcher
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paste a job description and drop in applicant resumes. CareerLens will rank each
            resume by how well it matches your requirements.
          </p>
        </div>

        <form onSubmit={handleMatch} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Paste Job Description</label>
              <textarea
                className="w-full h-40 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="e.g. We are looking for a Senior Frontend Engineer with deep experience in React, Next.js, and TypeScript..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Applicant Resumes</label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-zinc-950"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to add resumes (PDF, DOCX, or TXT)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/50 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={isAnalyzing || !jobDescription || files.length === 0}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Target className="w-4 h-4" /> Rank Applicants</>}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {results.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                {r.error ? (
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{r.fileName}</p>
                      <p className="text-sm">{r.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
                      <div className="relative mb-2">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="34" className="text-gray-100 dark:text-zinc-800" strokeWidth="8" stroke="currentColor" fill="transparent" />
                          <circle
                            cx="40" cy="40" r="34"
                            className={`${(r.matchScore ?? 0) >= 80 ? 'text-green-500' : (r.matchScore ?? 0) >= 60 ? 'text-blue-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                            strokeWidth="8" strokeDasharray={34 * 2 * Math.PI} strokeDashoffset={34 * 2 * Math.PI - ((r.matchScore ?? 0) / 100) * 34 * 2 * Math.PI} stroke="currentColor" fill="transparent"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-xl font-black">{r.matchScore}%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium truncate w-full">{r.fileName}</p>
                    </div>

                    <div className="md:col-span-3 space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{r.feedback}</p>
                      <div className="flex flex-wrap gap-2">
                        {r.matchedSkills?.map((s) => (
                          <span key={s.name} className="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-lg text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {s.name}
                          </span>
                        ))}
                        {r.missingSkills?.map((s) => (
                          <span key={s} className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {s}
                          </span>
                        ))}
                        {r.bonusSkills?.map((s) => (
                          <span key={s} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs font-medium flex items-center gap-1">
                            <PlusCircle className="w-3 h-3" /> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
