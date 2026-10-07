'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Edit2 } from 'lucide-react';
import type { ParsedResume } from '@/lib/evidence/parsers/resume-parser';

export default function ResumeUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableSkills, setEditableSkills] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await fetch('/api/resume/parse', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setParsedData(data.data);
      setEditableSkills(data.data.skills.join(', '));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveCorrections = () => {
    if (parsedData) {
      setParsedData({
        ...parsedData,
        skills: editableSkills.split(',').map(s => s.trim()).filter(Boolean)
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Resume Parser Engine</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24">
        {!parsedData ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Upload your Resume</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
              We support PDF and DOCX formats. Our pipeline will extract text, parse structure, and generate evidence candidates.
            </p>
            
            <div className="w-full max-w-md">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-zinc-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to browse</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : "PDF or DOCX (Max 5MB)"}</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.docx,text/plain" onChange={handleFileChange} />
              </label>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="mt-8 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Extracting Data...' : 'Analyze Resume'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Extraction Results</h2>
              <button 
                onClick={() => setParsedData(null)}
                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Clear & Upload New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deterministic Data */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Verified Extraction
                  </h3>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Emails Found</span>
                    {parsedData.emails.length > 0 ? (
                      <ul className="mt-1 list-disc list-inside text-sm">
                        {parsedData.emails.map((email, i) => <li key={i}>{email}</li>)}
                      </ul>
                    ) : <p className="text-sm mt-1 text-gray-400">None detected</p>}
                  </div>
                  
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Links Found</span>
                    {parsedData.links.length > 0 ? (
                      <ul className="mt-1 list-disc list-inside text-sm overflow-hidden text-ellipsis">
                        {parsedData.links.map((link, i) => <li key={i}><a href={link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{link}</a></li>)}
                      </ul>
                    ) : <p className="text-sm mt-1 text-gray-400">None detected</p>}
                  </div>

                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Extracted Skills</span>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea 
                          value={editableSkills}
                          onChange={e => setEditableSkills(e.target.value)}
                          className="w-full text-sm p-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-transparent"
                          rows={3}
                        />
                        <button onClick={handleSaveCorrections} className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save Corrections</button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {parsedData.skills.map((skill, i) => (
                          <span key={i} className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-zinc-800 rounded-md border border-gray-200 dark:border-zinc-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Ambiguous Claims */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  AI Semantic Claims
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  The AI detected potential semantic claims that require additional evidence from GitHub or a portfolio.
                </p>
                <div className="space-y-3">
                  {parsedData.aiDetectedClaims.map((claim, idx) => (
                    <div key={idx} className="p-3 border border-gray-100 dark:border-zinc-800 rounded-lg bg-amber-50/30 dark:bg-amber-900/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-amber-900 dark:text-amber-200">{claim.skill}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          claim.confidence === 'High' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 
                          claim.confidence === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 
                          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {claim.confidence} Confidence
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{claim.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Raw Text Preview */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
               <h3 className="text-sm font-semibold mb-2">Raw Text Snippet</h3>
               <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-zinc-950 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                 {parsedData.rawText}
               </pre>
            </div>

            <div className="flex justify-end">
              <button className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                Confirm & Generate Evidence Candidates
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
