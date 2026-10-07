'use client';

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  TrendingUp,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
  Briefcase,
} from 'lucide-react';
import type { InterviewEvaluation, InterviewProject } from '@/lib/interview/engine';

interface EvaluationReportProps {
  evaluation: InterviewEvaluation;
  onRestart: () => void;
  onViewHistory: () => void;
}

export function EvaluationReport({
  evaluation,
  onRestart,
  onViewHistory,
}: EvaluationReportProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 85) return { label: 'Strong Hire Ready', color: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if (score >= 70) return { label: 'Competitive Candidate', color: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    return { label: 'Needs Technical Refinement', color: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  const verdict = getScoreVerdict(evaluation.overallScore);

  const metricItems = [
    { label: 'Role Core Foundations', score: evaluation.metrics.roleFoundations, desc: 'Mastery of fundamental concepts and language protocols' },
    { label: 'Project Implementation Depth', score: evaluation.metrics.projectDepth, desc: 'Authentic understanding of code, schemas, and logic' },
    { label: 'System Architecture', score: evaluation.metrics.architecture, desc: 'Scalability, error recovery, caching & trade-off decisions' },
    { label: 'Communication & Clarity', score: evaluation.metrics.communication, desc: 'Structured articulation, conciseness, avoiding fluff' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Top Banner & Overall Score Card */}
      <div className="bg-gradient-to-br from-gray-900 via-zinc-900 to-black text-white p-8 rounded-3xl border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide uppercase bg-white/5 border-white/10">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              {evaluation.roleTitle} Technical Screen Evaluation
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Mock Interview Results: {evaluation.roleTitle}
            </h1>
            <p className="text-zinc-300 font-medium text-xs">
              Verdict: <span className="text-white font-bold">{evaluation.feedback.roleReadinessVerdict}</span>
            </p>
            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
              {evaluation.feedback.summary}
            </p>
          </div>

          {/* Large Metric Score Card */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center bg-zinc-800/80 border border-zinc-700 p-6 rounded-2xl min-w-[160px] text-center shadow-inner">
            <span className="text-4xl md:text-5xl font-black text-white tracking-tight">
              {evaluation.overallScore}
              <span className="text-xl font-normal text-zinc-400">/100</span>
            </span>
            <span className={`mt-2 text-xs font-semibold px-2.5 py-1 rounded-full border ${verdict.badge}`}>
              {verdict.label}
            </span>
          </div>
        </div>

        {/* 4 Core Competency Progress Bars */}
        <div className="mt-8 pt-8 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {metricItems.map((m) => (
            <div key={m.label} className="bg-zinc-800/40 p-4 rounded-xl border border-zinc-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300">{m.label}</span>
                <span className="text-xs font-bold text-white">{m.score}%</span>
              </div>
              <div className="w-full bg-zinc-700/60 h-2 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Role-Tailored Resume Rewrite Suggestions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Tailored for {evaluation.roleTitle}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Resume Rewrite Suggestions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Based on the technical explanations you provided in this interview, here is how you should rewrite your resume bullets to target {evaluation.roleTitle} recruiters.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            Google XYZ Standard
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {evaluation.resumeRewrites.map((rewrite, idx) => {
            const isCopied = copiedIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:border-blue-300 dark:hover:border-zinc-700 transition-all space-y-4"
              >
                {/* Before vs After comparison */}
                <div className="space-y-3">
                  {rewrite.originalPoint && (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/60 dark:border-zinc-700/60 text-xs">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-1">
                        Previous / Generic Phrasing:
                      </span>
                      <p className="text-gray-600 dark:text-gray-300 italic">
                        &quot;{rewrite.originalPoint}&quot;
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200 dark:border-blue-900/50 relative group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Role-Tailored Bullet for {evaluation.roleTitle}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                          {rewrite.suggestedRewrite}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCopy(rewrite.suggestedRewrite, idx)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex-shrink-0 ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200'
                        }`}
                        title="Copy bullet to clipboard"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Bullet
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reasoning & Metric breakdown */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs border-t border-gray-100 dark:border-zinc-800/80">
                  <div className="text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-800 dark:text-gray-200">Why recruiters love this: </strong>
                    {rewrite.reasoning}
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                    {rewrite.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Actionable Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/10 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Verified Technical Strengths
          </h3>
          <ul className="space-y-3">
            {evaluation.feedback.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/30 dark:bg-amber-950/10 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            High-Priority Refinements for {evaluation.roleTitle}
          </h3>
          <ul className="space-y-3">
            {evaluation.feedback.areasToImprove.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Takeaways */}
      {evaluation.feedback.keyTakeaways.length > 0 && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-6 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Preparation Takeaways
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {evaluation.feedback.keyTakeaways.map((tip, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/50 text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-gray-200 font-semibold text-sm transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <RotateCcw className="w-4 h-4" />
          Practice Another Job Role
        </button>

        <button
          onClick={onViewHistory}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer w-full sm:w-auto justify-center"
        >
          <TrendingUp className="w-4 h-4" />
          View Progress Tracking Over Time
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
