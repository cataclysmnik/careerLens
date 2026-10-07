'use client';

import React, { useState, useRef } from 'react';
import { Briefcase, Target, AlertTriangle, Loader2, UploadCloud, FileText, X, ChevronDown, Info } from 'lucide-react';
import type { CompanyMatchRow } from '@/lib/scoring/jobMatch';
import { VERDICT_LABEL } from '@/lib/scoring/verdict';
import { JobFitReport, FitRing, VERDICT_CLASS } from '@/components/matcher/JobFitReport';

export default function CompanyMatcherPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompanyMatchRow[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
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
    setOpen(null);

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
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            JD Matcher
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paste a job description and add applicant resumes. AI extracts each candidate’s academics, experience and projects and checks them against your eligibility criteria.
            Candidates are then ranked by a fixed role-fit formula.
          </p>
        </div>

        <form onSubmit={handleMatch} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Paste Job Description</label>
              <textarea
                className="w-full h-40 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="Include requirements and eligibility (CGPA, 10th/12th %, experience, branches) for the most accurate screening…"
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
                <p className="text-sm font-medium">Click to add resumes (PDF, DOCX, or TXT) — up to 25</p>
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
              {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing {files.length} resume{files.length > 1 ? 's' : ''}…</> : <><Target className="w-4 h-4" /> Rank Applicants</>}
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
            <p className="flex items-start gap-2 text-xs text-gray-500">
              <Info className="w-4 h-4 shrink-0" />
              Uploaded resumes have no GitHub or portfolio attached, so these scores reflect resume evidence only and confidence is lower. Use them to compare candidates with each other, not as absolute scores.
            </p>
            {results.map((r, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                {'error' in r ? (
                  <div className="flex items-center gap-3 text-red-500 p-6">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{r.fileName}</p>
                      <p className="text-sm">{r.error}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" onClick={() => setOpen(open === idx ? null : idx)} className="w-full text-left p-6 flex flex-col md:flex-row gap-5 md:items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                        <FitRing score={r.result.roleFit} verdict={r.result.verdict} size={84} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{r.candidateName ?? r.fileName}</p>
                          <span className={`px-2 py-0.5 rounded-full border text-xs font-bold ${VERDICT_CLASS[r.result.verdict]}`}>{VERDICT_LABEL[r.result.verdict]}</span>
                        </div>
                        {r.candidateName && <p className="text-xs text-gray-400 truncate mb-1">{r.fileName}</p>}
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{r.result.assessment?.summary ?? r.result.verdictReason}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          {r.result.academics.graduation && <span>CGPA {r.result.academics.graduation.display}</span>}
                          {r.result.academics.class12 && <span>XII {r.result.academics.class12.display}</span>}
                          {r.result.academics.class10 && <span>X {r.result.academics.class10.display}</span>}
                          <span>Required skills met {r.result.coverage.requiredMet}/{r.result.coverage.required}</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${open === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {open === idx && (
                      <div className="px-4 md:px-6 pb-6 border-t border-gray-100 dark:border-zinc-800 pt-6 bg-gray-50/50 dark:bg-black/20">
                        <JobFitReport result={r.result} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
