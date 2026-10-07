'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Edit2, UserCheck, Loader2, GitFork, Globe, Trophy, Sparkles } from 'lucide-react';
import type { ParsedResume } from '@/lib/evidence/parsers/resume-parser';
import type { CandidateProfile } from '@/lib/profile/candidate';
import { ExtractedProfile } from '@/components/profile/ExtractedProfile';
import { runFullAnalysis, type AnalysisStep } from '@/lib/evidence/run-analysis';

const FIELD_LABEL: Record<string, string> = {
  name: 'name', cgpa: 'CGPA', tenthPercentage: '10th %', twelfthPercentage: '12th %', location: 'location',
  githubUsername: 'GitHub', portfolioUrl: 'portfolio', linkedinUrl: 'LinkedIn', skills: 'skills',
  experienceLevel: 'experience level', leetcodeUsername: 'LeetCode', codeforcesHandle: 'Codeforces',
  codechefUsername: 'CodeChef', hackerrankUsername: 'HackerRank', gfgUsername: 'GeeksforGeeks',
};

const STEPS: { key: AnalysisStep; title: string; icon: React.ElementType }[] = [
  { key: 'github', title: 'GitHub Analysis', icon: GitFork },
  { key: 'portfolio', title: 'Portfolio Scanning', icon: Globe },
  { key: 'coding', title: 'Coding Profiles', icon: Trophy },
  { key: 'scoring', title: 'Calculating Scores', icon: CheckCircle2 },
];

export default function ResumeUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableSkills, setEditableSkills] = useState<string>('');
  const [profileUpdated, setProfileUpdated] = useState<string[] | null>(null);
  // null while loading; first-time students have no saved analysis yet.
  const [hasAnalysis, setHasAnalysis] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<{ step: AnalysisStep; detail: string; seen: AnalysisStep[] } | null>(null);
  const [analysisProblems, setAnalysisProblems] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setHasAnalysis(!!json?.data?.hasAnalysis))
      .catch(() => setHasAnalysis(false));
  }, []);

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
      const res = await fetch('/api/resume/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setParsedData(data.data);
      setProfile(data.profile ?? null);
      setProfileUpdated(data.profileSync?.updated ?? null);
      setEditableSkills(data.data.skills.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveCorrections = () => {
    const skills = editableSkills.split(',').map((s) => s.trim()).filter(Boolean);
    if (parsedData) setParsedData({ ...parsedData, skills });
    // Corrections feed the analysis: the skills list becomes the resume's skills section.
    if (profile) {
      const kept = new Set(skills.map((s) => s.toLowerCase()));
      const existing = profile.skills.filter((s) => kept.has(s.name.toLowerCase()));
      const added = skills
        .filter((s) => !existing.some((e) => e.name.toLowerCase() === s.toLowerCase()))
        .map((name) => ({ name, listedInSkillsSection: true, kind: 'technical' as const }));
      setProfile({ ...profile, skills: [...existing, ...added] });
    }
    setIsEditing(false);
  };

  const handleConfirm = async () => {
    if (!profile || !parsedData) return;
    setError(null);
    setAnalysis({ step: 'github', detail: 'Starting analysis…', seen: [] });
    try {
      const result = await runFullAnalysis(profile, parsedData.links, (step, detail) =>
        setAnalysis((a) => ({ step, detail, seen: [...(a?.seen ?? []), step] }))
      );
      if (result.problems.length) {
        // Saved anyway; let the student see what was skipped before moving on.
        setAnalysisProblems(result.problems);
        return;
      }
      // The sidebar re-checks on navigation and unlocks the other pages.
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalysis(null);
    }
  };

  const reset = () => {
    setParsedData(null);
    setProfile(null);
    setProfileUpdated(null);
    setFile(null);
    setError(null);
  };

  const firstRun = hasAnalysis === false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">Resume Parser</h1>
        {hasAnalysis && (
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Back to Dashboard
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-4xl p-6 mt-6 pb-24">
        {analysis ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 flex flex-col items-center">
            {analysis.step === 'done'
              ? <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
              : <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />}
            <h2 className="text-lg font-semibold mb-8 text-center">{analysis.detail}</h2>
            <div className="space-y-3 w-full max-w-sm">
              {STEPS.map(({ key, title, icon }) => {
                const order = STEPS.findIndex((s) => s.key === analysis.step);
                const idx = STEPS.findIndex((s) => s.key === key);
                const state = analysis.step === 'done' || idx < order ? 'done' : idx === order ? 'active' : 'pending';
                return <StepIndicator key={key} icon={icon} title={title} state={state} skipped={state === 'done' && !analysis.seen.includes(key)} />;
              })}
            </div>
            {analysisProblems.length > 0 && (
              <div className="mt-8 w-full max-w-md space-y-4">
                <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Your report was saved, but some sources couldn’t be analyzed:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {analysisProblems.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                    <p className="mt-1">Those scores leave that evidence out. Fix the username on My Profile and re-analyze to include it.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        ) : !parsedData ? (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{firstRun ? 'Welcome to CareerLens' : 'Upload your Resume'}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
              {firstRun
                ? 'Start by uploading your resume. We’ll read it, let you check what we found, then build your profile and readiness report. The rest of CareerLens unlocks once that’s done.'
                : 'Upload an updated resume to refresh your profile and re-run your readiness analysis.'}
            </p>

            <div className="w-full max-w-md">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-zinc-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileText className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to browse</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : 'PDF, DOCX or TXT (Max 5MB)'}</p>
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
              className="mt-8 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? 'Reading your resume…' : 'Analyze Resume'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Check what we found</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fix anything that’s wrong, then confirm to build your readiness report.</p>
              </div>
              <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1">
                <X className="w-4 h-4" /> Upload a different file
              </button>
            </div>

            {profileUpdated && (
              <div className="flex items-start gap-2 text-sm text-green-800 bg-green-50 dark:text-green-300 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 px-4 py-3 rounded-lg">
                <UserCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {profileUpdated.length
                    ? <>Updated My Profile from your resume: {profileUpdated.map((k) => FIELD_LABEL[k] ?? k).join(', ')}.</>
                    : <>My Profile already matches this resume.</>}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Contact &amp; Skills
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    title="Edit skills"
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
                    <span className="text-xs font-medium text-gray-500 uppercase">Skills</span>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editableSkills}
                          onChange={(e) => setEditableSkills(e.target.value)}
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

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  AI Extraction
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The AI reads your academics, experience and projects. These are claims: they become verified skills only when GitHub, portfolio or project evidence backs them up.
                </p>
                {profile && (
                  <ul className="mt-4 space-y-1 text-sm">
                    <li>{profile.education.length} education entr{profile.education.length === 1 ? 'y' : 'ies'}</li>
                    <li>{profile.experience.length} role{profile.experience.length === 1 ? '' : 's'}</li>
                    <li>{profile.projects.length} project{profile.projects.length === 1 ? '' : 's'}</li>
                    <li>{profile.skills.length} skills claimed</li>
                  </ul>
                )}
              </div>
            </div>

            {profile && <ExtractedProfile profile={profile} />}

            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:mr-auto">
                Next we’ll analyze the GitHub, portfolio and coding profiles linked on your resume.
              </p>
              <button
                onClick={handleConfirm}
                disabled={!profile}
                className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {firstRun ? 'Confirm & Build My Profile' : 'Confirm & Re-analyze'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepIndicator({ icon: Icon, title, state, skipped }: { icon: React.ElementType; title: string; state: 'done' | 'active' | 'pending'; skipped: boolean }) {
  const cls =
    state === 'done' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50 text-green-700 dark:text-green-400'
    : state === 'active' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/50 text-blue-700 dark:text-blue-400'
    : 'bg-gray-50 border-gray-100 dark:bg-zinc-800/50 dark:border-zinc-800 text-gray-400';
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${cls}`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{title}</span>
      {state === 'done' && (skipped
        ? <span className="ml-auto text-xs text-gray-400">not on resume</span>
        : <CheckCircle2 className="w-4 h-4 ml-auto text-green-500" />)}
      {state === 'active' && <Loader2 className="w-4 h-4 ml-auto animate-spin" />}
    </div>
  );
}
