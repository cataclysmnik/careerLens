'use client';

import React, { useState } from 'react';
import {
  Code,
  Layers,
  Sparkles,
  Bot,
  Zap,
  Shield,
  HeartHandshake,
  CheckCircle2,
  FolderGit2,
  Globe,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import type { InterviewProject, InterviewFocus, InterviewerType } from '@/lib/interview/engine';

interface ProjectSelectModalProps {
  projects: InterviewProject[];
  targetRole: string | null;
  onStartSession: (config: {
    projectId: string;
    focus: InterviewFocus;
    interviewerType: InterviewerType;
  }) => Promise<void>;
  isStarting: boolean;
}

export function ProjectSelectModal({
  projects,
  targetRole,
  onStartSession,
  isStarting,
}: ProjectSelectModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [focus, setFocus] = useState<InterviewFocus>('project_deep_dive');
  const [interviewerType, setInterviewerType] = useState<InterviewerType>('tech_lead');

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || isStarting) return;
    onStartSession({
      projectId: selectedProject.id,
      focus,
      interviewerType,
    });
  };

  const focusOptions: { id: InterviewFocus; label: string; desc: string; icon: React.ElementType }[] = [
    {
      id: 'project_deep_dive',
      label: 'Technical Deep Dive',
      desc: 'Architecture patterns, component boundaries, schema choices, and technical trade-offs.',
      icon: Layers,
    },
    {
      id: 'system_design',
      label: 'Scale & System Design',
      desc: 'Traffic surges, caching strategies, latency bottlenecks, and fault tolerance.',
      icon: Zap,
    },
    {
      id: 'behavioral',
      label: 'STAR & Engineering Ownership',
      desc: 'Hardest bugs solved, trade-off battles, dead-ends, and cross-team execution.',
      icon: HeartHandshake,
    },
  ];

  const interviewerOptions: { id: InterviewerType; label: string; desc: string; icon: React.ElementType; badge: string }[] = [
    {
      id: 'tech_lead',
      label: 'Pragmatic Tech Lead',
      desc: 'Focuses on maintainability, clean boundaries, and real-world implementation.',
      icon: Code,
      badge: 'Balanced',
    },
    {
      id: 'bar_raiser',
      label: 'FAANG Bar Raiser',
      desc: 'Exacting technical rigor. Probes concurrency, edge cases, and architectural flaws.',
      icon: Shield,
      badge: 'High Rigor',
    },
    {
      id: 'friendly',
      label: 'Senior Mentor',
      desc: 'Supportive and inquisitive. Helps you articulate achievements and impact.',
      icon: Sparkles,
      badge: 'Constructive',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Bot className="w-3.5 h-3.5" />
            AI Mock-Interview Arena
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Interview Practice Tailored to Your Projects
          </h1>
          <p className="text-blue-100 max-w-2xl text-sm leading-relaxed">
            The AI reads your actual verified resume projects and GitHub repositories, challenges your design choices, evaluates your responses, and suggests quantifiable bullet points to rewrite your resume.
          </p>
          {targetRole && (
            <div className="pt-2 text-xs text-blue-200">
              Grounded for Target Role:{' '}
              <span className="font-semibold text-white px-2 py-0.5 bg-white/10 rounded-md">
                {targetRole}
              </span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Select Project */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  1
                </span>
                Choose Project to Interview On
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select from your parsed resume or connected GitHub repositories
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProjectId(proj.id)}
                  className={`cursor-pointer rounded-xl p-5 border text-left transition-all relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20 shadow-md ring-2 ring-blue-500/20'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {proj.source === 'github' ? (
                        <FolderGit2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                        {proj.title}
                      </h3>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {proj.skills.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300"
                      >
                        {tech}
                      </span>
                    ))}
                    {proj.skills.length > 4 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500">
                        +{proj.skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Interview Focus */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                2
              </span>
              Select Interview Mode & Focus
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Customize the direction of questions the AI interviewer will prioritize
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {focusOptions.map((opt) => {
              const isSelected = focus === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setFocus(opt.id)}
                  className={`cursor-pointer rounded-xl p-4 border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                  <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Choose Persona */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold">
                3
              </span>
              Choose Interviewer Persona
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select difficulty level and interviewing philosophy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {interviewerOptions.map((opt) => {
              const isSelected = interviewerType === opt.id;
              const Icon = opt.icon;
              return (
                <div
                  key={opt.id}
                  onClick={() => setInterviewerType(opt.id)}
                  className={`cursor-pointer rounded-xl p-4 border text-left transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                      {opt.badge}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                    {opt.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {opt.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!selectedProject || isStarting}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing Project Context...
              </>
            ) : (
              <>
                Start Mock Interview on &quot;{selectedProject?.title}&quot;
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
