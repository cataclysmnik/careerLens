'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BotMessageSquare,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Loader2,
  FileText,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { ProjectSelectModal } from '@/components/interview/ProjectSelectModal';
import { InterviewChat } from '@/components/interview/InterviewChat';
import { EvaluationReport } from '@/components/interview/EvaluationReport';
import { ProgressTracker } from '@/components/interview/ProgressTracker';
import type {
  InterviewProject,
  InterviewFocus,
  InterviewerType,
  InterviewMessage,
  InterviewEvaluation,
} from '@/lib/interview/engine';

type ViewMode = 'select' | 'interview' | 'report' | 'progress';

export default function InterviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const [activeTab, setActiveTab] = useState<'arena' | 'progress'>('arena');

  const [projects, setProjects] = useState<InterviewProject[]>([]);
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [hasEvidence, setHasEvidence] = useState<boolean>(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentProject, setCurrentProject] = useState<InterviewProject | null>(null);
  const [currentInterviewerType, setCurrentInterviewerType] = useState<InterviewerType>('tech_lead');
  const [currentFocus, setCurrentFocus] = useState<InterviewFocus>('project_deep_dive');
  const [currentMessages, setCurrentMessages] = useState<InterviewMessage[]>([]);
  const [suggestedFocusAreas, setSuggestedFocusAreas] = useState<string[]>([]);

  // Evaluation Report State
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);

  // Loading States
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/interview/projects')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load projects');
        return res.json();
      })
      .then((json) => {
        if (json?.data) {
          setProjects(json.data.projects || []);
          setTargetRole(json.data.targetRole || null);
          setHasEvidence(Boolean(json.data.hasEvidence));
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch projects. Please upload your resume first.');
      })
      .finally(() => setIsLoadingProjects(false));
  }, []);

  const handleStartSession = async (config: {
    projectId: string;
    focus: InterviewFocus;
    interviewerType: InterviewerType;
  }) => {
    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to start interview session');
      }

      const { session, project, suggestedFocusAreas } = json.data;
      setCurrentSessionId(session.id);
      setCurrentProject(project);
      setCurrentInterviewerType(config.interviewerType);
      setCurrentFocus(config.focus);
      setCurrentMessages(session.messages || []);
      setSuggestedFocusAreas(suggestedFocusAreas || []);
      setViewMode('interview');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to launch session');
    } finally {
      setIsStarting(false);
    }
  };

  const handleFinishSession = async () => {
    if (!currentSessionId) return;
    setIsFinishing(true);
    setError(null);

    try {
      const res = await fetch('/api/interview/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to evaluate session');
      }

      setEvaluation(json.data.evaluation);
      setViewMode('report');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleSelectPastSession = (sessionData: {
    evaluation: InterviewEvaluation;
    project: InterviewProject;
  }) => {
    setEvaluation(sessionData.evaluation);
    setCurrentProject(sessionData.project);
    setViewMode('report');
    setActiveTab('arena');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <BotMessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                AI Project Mock Interviewer
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Project-tailored technical probing, resume rewrites, and progress tracking
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-gray-200/80 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('arena');
                if (viewMode === 'progress') setViewMode('select');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'arena'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BotMessageSquare className="w-4 h-4" />
              Interview Arena
            </button>
            <button
              onClick={() => {
                setActiveTab('progress');
                setViewMode('progress');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Progress & History
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Main Content Area */}
        {isLoadingProjects ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Extracting verified projects and tech profiles...</p>
          </div>
        ) : activeTab === 'progress' || viewMode === 'progress' ? (
          <ProgressTracker
            onStartNewSession={() => {
              setActiveTab('arena');
              setViewMode('select');
            }}
            onSelectPastSession={handleSelectPastSession}
          />
        ) : viewMode === 'select' ? (
          <ProjectSelectModal
            projects={projects}
            targetRole={targetRole}
            onStartSession={handleStartSession}
            isStarting={isStarting}
          />
        ) : viewMode === 'interview' && currentProject && currentSessionId ? (
          <InterviewChat
            sessionId={currentSessionId}
            project={currentProject}
            interviewerType={currentInterviewerType}
            roleFocus={currentFocus}
            initialMessages={currentMessages}
            suggestedFocusAreas={suggestedFocusAreas}
            onFinishSession={handleFinishSession}
            onBackToSelect={() => setViewMode('select')}
            isFinishing={isFinishing}
          />
        ) : viewMode === 'report' && evaluation && currentProject ? (
          <EvaluationReport
            evaluation={evaluation}
            project={currentProject}
            onRestart={() => {
              setViewMode('select');
              setEvaluation(null);
            }}
            onViewHistory={() => {
              setActiveTab('progress');
              setViewMode('progress');
            }}
          />
        ) : (
          <div className="p-12 text-center space-y-4">
            <p className="text-gray-500 text-sm">Session state reset.</p>
            <button
              onClick={() => setViewMode('select')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Back to Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
