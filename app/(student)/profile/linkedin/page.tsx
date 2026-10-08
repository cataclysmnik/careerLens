'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2, Briefcase, FileText, Type } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function LinkedinParserPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [manualText, setManualText] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<{ experiences: string[], certifications: string[], skills: string[] } | null>(null);
  const [mode, setMode] = useState<'upload' | 'manual' | 'scrape'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (mode === 'upload' && files.length === 0) return;
    if (mode === 'manual' && !manualText.trim()) return;
    if (mode === 'scrape' && !scrapeUrl.trim()) return;
    
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setParsedItems(null);

    const formData = new FormData();
    formData.append('mode', mode);
    if (mode === 'upload' && files.length > 0) {
      files.forEach(f => formData.append('csv', f));
    } else if (mode === 'manual') {
      formData.append('text', manualText);
    } else if (mode === 'scrape') {
      formData.append('url', scrapeUrl);
    }

    try {
      const res = await fetch('/api/linkedin/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parsing failed');

      if (data.added) {
        const { experiences, certifications, skills, items } = data.added;
        const added = [
          experiences ? `${experiences} role(s)` : null,
          certifications ? `${certifications} certification(s)` : null,
          skills ? `${skills} skill(s)` : null
        ].filter(Boolean);
        
        if (added.length > 0) {
          setSuccess(`Successfully added ${added.join(', ')} from LinkedIn to your profile!`);
          if (items) {
            setParsedItems(items);
          }
        } else {
          setSuccess(`Analyzed successfully, but no new information was found to add.`);
        }
      } else {
        setSuccess('Successfully added LinkedIn details to your profile!');
      }
      
      // Notify other components if needed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('careerlens:analysis-updated'));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          LinkedIn Parser
        </h1>
      </header>

      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
            <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Enhance your Profile with LinkedIn</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
            Upload your LinkedIn Data Export (Experience.csv, Certifications.csv) or manually paste your experience to boost your readiness scores.
          </p>

          <div className="flex gap-4 mb-8 flex-wrap justify-center">
            <button
              onClick={() => { setMode('upload'); setError(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${mode === 'upload' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400'}`}
            >
              <Upload className="w-4 h-4" /> CSV Upload
            </button>
            <button
              onClick={() => { setMode('manual'); setError(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${mode === 'manual' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400'}`}
            >
              <Type className="w-4 h-4" /> Manual Entry
            </button>
            <button
              onClick={() => { setMode('scrape'); setError(null); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${mode === 'scrape' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-400'}`}
            >
              <Briefcase className="w-4 h-4" /> Fetch from URL
            </button>
          </div>

          <div className="w-full max-w-md">
            {mode === 'upload' ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-zinc-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to browse</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{files.length > 0 ? `${files.length} file(s) selected` : 'CSV (Max 2MB)'}</p>
                </div>
                <input type="file" className="hidden" accept=".csv" multiple onChange={handleFileChange} />
              </label>
            ) : mode === 'manual' ? (
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste your LinkedIn experience, certifications, or posts here..."
                className="w-full h-32 p-3 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50 focus:border-blue-500 focus:ring-blue-500"
              />
            ) : (
              <input
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/your-profile"
                className="w-full p-3 text-sm border border-gray-300 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50 focus:border-blue-500 focus:ring-blue-500"
              />
            )}
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-6 flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg w-full justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">{success}</span>
              </div>
              
              {parsedItems && (
                <div className="text-left w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h3 className="text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">Extracted Items</h3>
                  {parsedItems.experiences.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Roles</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                        {parsedItems.experiences.map((exp, i) => <li key={i}>{exp}</li>)}
                      </ul>
                    </div>
                  )}
                  {parsedItems.certifications.length > 0 && (
                    <div className="mb-2 mt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Certifications</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                        {parsedItems.certifications.map((cert, i) => <li key={i}>{cert}</li>)}
                      </ul>
                    </div>
                  )}
                  {parsedItems.skills.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {parsedItems.skills.map((skill, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isUploading || (mode === 'upload' ? files.length === 0 : mode === 'manual' ? !manualText.trim() : !scrapeUrl.trim())}
            className="mt-8 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isUploading ? 'Parsing…' : 'Add to Profile'}
          </button>
          
          {success && (
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-6 py-2.5 bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
