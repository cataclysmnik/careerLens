'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Layers,
  Sparkles,
  Bot,
  Zap,
  Shield,
  HeartHandshake,
  CheckCircle2,
  FolderGit2,
  Globe,
  FileText,
  ArrowRight,
  Loader2,
  Search,
  Code2,
  Terminal,
} from 'lucide-react';
import {
  matchProjectsToRole,
  type InterviewProject,
  type SeniorityLevel,
  type InterviewerType,
} from '@/lib/interview/engine';
import { getBasicJobDescription } from '@/lib/jobs/basic-jd';
import { RotateCcw } from 'lucide-react';

interface JobRoleSetupModalProps {
  allProjects: InterviewProject[];
  defaultRole: string;
  availableRoles: string[];
  onStartSession: (config: {
    targetRole: string;
    jobDescription?: string;
    seniority: SeniorityLevel;
    interviewerType: InterviewerType;
  }) => Promise<void>;
  isStarting: boolean;
}

export function JobRoleSetupModal({
  allProjects,
  defaultRole,
  availableRoles,
  onStartSession,
  isStarting,
}: JobRoleSetupModalProps) {
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole || 'Full Stack Developer');
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [seniority, setSeniority] = useState<SeniorityLevel>('entry');
  const [interviewerType, setInterviewerType] = useState<InterviewerType>('tech_lead');

  // Optional Job Description state
  const [jobDescription, setJobDescription] = useState<string>(() =>
    getBasicJobDescription(defaultRole || 'Full Stack Developer')
  );
  const [isCustomJd, setIsCustomJd] = useState<boolean>(false);

  const activeRole = isCustom && customRoleInput.trim() ? customRoleInput.trim() : selectedRole;

  // Real-time automatic project & skill matching for the active role + optional JD
  const { relevantProjects, matchedRoleSkills, expectedTopics } = useMemo(() => {
    return matchProjectsToRole(activeRole, allProjects, jobDescription.trim() || undefined);
  }, [activeRole, allProjects, jobDescription]);

  const topRelevantProjects = relevantProjects.slice(0, 3);

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    setIsCustom(false);
    if (!isCustomJd) {
      setJobDescription(getBasicJobDescription(role));
    }
  };

  const handleCustomRoleChange = (role: string) => {
    setCustomRoleInput(role);
    if (!isCustomJd && role.trim()) {
      setJobDescription(getBasicJobDescription(role.trim()));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRole || isStarting) return;
    onStartSession({
      targetRole: activeRole,
      jobDescription: jobDescription.trim() || undefined,
      seniority,
      interviewerType,
    });
  };

  const seniorityOptions: { id: SeniorityLevel; label: string; desc: string }[] = [
    {
      id: 'entry',
      label: 'Entry-Level / Junior',
      desc: 'Focuses on foundational data structures, clean code, and project implementation details.',
    },
    {
      id: 'mid',
      label: 'Mid-Level',
      desc: 'Deep dive into system trade-offs, concurrency, database indexing, and error handling.',
    },
    {
      id: 'senior',
      label: 'Senior / Staff',
      desc: 'Complex system design, high availability, edge cases, and architectural philosophy.',
    },
  ];

  const personaOptions: { id: InterviewerType; label: string; desc: string; icon: React.ElementType; badge: string }[] = [
    {
      id: 'tech_lead',
      label: 'Pragmatic Tech Lead',
      desc: 'Balances code quality, component trade-offs, and real-world system architecture.',
      icon: Terminal,
      badge: 'Balanced Real-World',
    },
    {
      id: 'bar_raiser',
      label: 'FAANG Bar Raiser',
      desc: 'Deep technical rigor. Probes concurrency bottlenecks, scaling failures, and design flaws.',
      icon: Shield,
      badge: 'High Rigor',
    },
    {
      id: 'friendly',
      label: 'Senior Engineering Manager',
      desc: 'Supportive and inquisitive. Explores thought process, teamwork, and key technical wins.',
      icon: HeartHandshake,
      badge: 'Constructive Coaching',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Bot className="w-3.5 h-3.5" />
            Real-Life Job Mock Interview
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Role-Based Technical Mock Interview
          </h1>
          <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
            Select your target job role. CareerLens automatically analyzes your background, fetches your relevant projects, and conducts an authentic job interview weaving your project architecture with core technical questions required for the role.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Select or Enter Target Job Role */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  1
                </span>
                Select Target Job Role
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                The interview and question blueprint will be structured around this job profile
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCustom(!isCustom)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isCustom ? 'Choose from preset roles' : '+ Enter custom role'}
            </button>
          </div>

          {isCustom ? (
            <div className="relative">
              <input
                type="text"
                value={customRoleInput}
                onChange={(e) => handleCustomRoleChange(e.target.value)}
                placeholder="e.g. iOS Engineer, SRE, Blockchain Developer, Solutions Architect..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {availableRoles.map((role) => {
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/30'
                        : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 1.5: Optional Job Description Input */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Job Description <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  jobDescription.trim() && isCustomJd
                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {jobDescription.trim() && isCustomJd ? 'Custom Job Description Grounded' : 'Role Baseline Grounded'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Paste a specific target job posting to align questions and resume project probes with company requirements, or use the standard role baseline.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setJobDescription(getBasicJobDescription(activeRole));
                  setIsCustomJd(false);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Fill Standard JD
              </button>
              <span className="text-gray-300 dark:text-zinc-700">•</span>
              <button
                type="button"
                onClick={() => {
                  setJobDescription('');
                  setIsCustomJd(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              setIsCustomJd(true);
            }}
            placeholder={`Optional: Paste the target job description for ${activeRole} here (responsibilities, required skills, tech stack)...`}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-950 text-xs sm:text-sm font-mono text-gray-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed"
          />
        </div>

        {/* Step 2: Automatic Role Project & Skill Alignment Preview */}
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Interview Setup for: <span className="text-blue-600 dark:text-blue-400 font-extrabold">{activeRole}</span>
              </h3>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {jobDescription.trim() && isCustomJd ? 'Role + Custom JD Aligned' : 'Role Baseline Aligned'}
            </span>
          </div>

          {/* Matched Relevant Projects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Projects Fetched from Your Uploaded Resume ({topRelevantProjects.length}):
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                Strictly from parsed resume
              </span>
            </div>

            {topRelevantProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topRelevantProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="font-semibold text-xs text-gray-900 dark:text-white line-clamp-1">
                        {proj.title}
                      </span>
                      <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                        Resume Project
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                      {proj.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {proj.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>No projects detected on your uploaded resume yet.</span>
                <Link href="/profile/resume" className="font-bold underline text-amber-900 dark:text-amber-200 ml-2">
                  Upload Resume in Parser &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Expected Technical Topics Covered */}
          <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 space-y-1.5">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
              General Technical Areas the Bot Will Test:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {expectedTopics.map((topic, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                >
                  • {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Seniority & Persona Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seniority */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                2
              </span>
              Target Seniority Level
            </h3>
            <div className="space-y-2">
              {seniorityOptions.map((opt) => {
                const isSelected = seniority === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSeniority(opt.id)}
                    className={`cursor-pointer p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-gray-900 dark:text-white">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Persona */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                3
              </span>
              Interviewer Persona
            </h3>
            <div className="space-y-2">
              {personaOptions.map((opt) => {
                const isSelected = interviewerType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setInterviewerType(opt.id)}
                    className={`cursor-pointer p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/20 ring-1 ring-purple-500/20'
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-gray-900 dark:text-white">
                        {opt.label}
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                        {opt.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!activeRole || isStarting}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up Real-Life Interview for {activeRole}...
              </>
            ) : (
              <>
                Launch {activeRole} Mock Interview
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
