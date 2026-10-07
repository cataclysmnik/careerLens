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
  Briefcase,
} from 'lucide-react';
import { JobRoleSetupModal } from '@/components/interview/JobRoleSetupModal';
import { InterviewChat } from '@/components/interview/InterviewChat';
import { EvaluationReport } from '@/components/interview/EvaluationReport';
import { ProgressTracker } from '@/components/interview/ProgressTracker';
import type {
  InterviewProject,
  SeniorityLevel,
  InterviewerType,
  InterviewMessage,
  InterviewEvaluation,
} from '@/lib/interview/engine';

type ViewMode = 'setup' | 'interview' | 'report' | 'progress';

export default function InterviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('setup');
  const [activeTab, setActiveTab] = useState<'arena' | 'progress'>('arena');

  const [allProjects, setAllProjects] = useState<InterviewProject[]>([]);
  const [defaultRole, setDefaultRole] = useState<string>('Full Stack Developer');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<string>('Full Stack Developer');
  const [seniority, setSeniority] = useState<SeniorityLevel>('entry');
  const [interviewerType, setInterviewerType] = useState<InterviewerType>('tech_lead');
  const [relevantProjects, setRelevantProjects] = useState<InterviewProject[]>([]);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [suggestedFocusAreas, setSuggestedFocusAreas] = useState<string[]>([]);
  const [expectedTopics, setExpectedTopics] = useState<string[]>([]);

  // Evaluation Report State
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);

  // Loading States
  const [isStarting, setIsStarting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/interview/projects')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load setup');
        return res.json();
      })
      .then((json) => {
        if (json?.data) {
          setAllProjects(json.data.allProjects || []);
          setDefaultRole(json.data.targetRole || 'Full Stack Developer');
          setAvailableRoles(json.data.availableRoles || []);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch profile projects. Please verify your resume is uploaded.');
      })
      .finally(() => setIsLoadingSetup(false));
  }, []);

  const handleStartSession = async (config: {
    targetRole: string;
    seniority: SeniorityLevel;
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

      const {
        session,
        relevantProjects: matchedProjects,
        suggestedFocusAreas: focusAreas,
        expectedTopics: topics,
      } = json.data;

      setCurrentSessionId(session.id);
      setTargetRole(config.targetRole);
      setSeniority(config.seniority);
      setInterviewerType(config.interviewerType);
      setRelevantProjects(matchedProjects || []);
      setMessages(session.messages || []);
      setSuggestedFocusAreas(focusAreas || []);
      setExpectedTopics(topics || []);
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
        throw new Error(json.error || 'Failed to evaluate interview');
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

  const handleSelectPastSession = (pastEval: InterviewEvaluation) => {
    setEvaluation(pastEval);
    setViewMode('report');
    setActiveTab('arena');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <BotMessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                Real-Life Job Mock Interviewer
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Job-role technical screening, project-grounded questions, resume rewrites, and progress tracking
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-gray-200/80 dark:bg-zinc-800/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('arena');
                if (viewMode === 'progress') setViewMode('setup');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'arena'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
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

        {/* Global Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-3 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Dynamic View Display */}
        {isLoadingSetup ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Loading your profile & project database...</p>
          </div>
        ) : activeTab === 'progress' || viewMode === 'progress' ? (
          <ProgressTracker
            onStartNewSession={() => {
              setActiveTab('arena');
              setViewMode('setup');
            }}
            onSelectPastSession={handleSelectPastSession}
          />
        ) : viewMode === 'setup' ? (
          <JobRoleSetupModal
            allProjects={allProjects}
            defaultRole={defaultRole}
            availableRoles={availableRoles}
            onStartSession={handleStartSession}
            isStarting={isStarting}
          />
        ) : viewMode === 'interview' && currentSessionId ? (
          <InterviewChat
            sessionId={currentSessionId}
            targetRole={targetRole}
            seniority={seniority}
            interviewerType={interviewerType}
            relevantProjects={relevantProjects}
            initialMessages={messages}
            suggestedFocusAreas={suggestedFocusAreas}
            expectedTopics={expectedTopics}
            onFinishSession={handleFinishSession}
            onBackToSelect={() => setViewMode('setup')}
            isFinishing={isFinishing}
          />
        ) : viewMode === 'report' && evaluation ? (
          <EvaluationReport
            evaluation={evaluation}
            onRestart={() => {
              setViewMode('setup');
              setEvaluation(null);
            }}
            onViewHistory={() => {
              setActiveTab('progress');
              setViewMode('progress');
            }}
          />
        ) : (
          <div className="p-12 text-center space-y-4">
            <p className="text-gray-500 text-sm">Session state ready.</p>
            <button
              onClick={() => setViewMode('setup')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              Start New Job Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
