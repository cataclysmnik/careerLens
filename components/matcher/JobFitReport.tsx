'use client';

import React from 'react';
import {
  CheckCircle2, XCircle, HelpCircle, AlertTriangle, Sparkles, Lightbulb, MessageSquareQuote,
  ListChecks, TrendingUp, PlusCircle, GraduationCap, Briefcase, FolderGit2, Info,
} from 'lucide-react';
import type { JobFitResult } from '@/lib/scoring/jobMatch';
import { VERDICT_LABEL, type FitVerdict } from '@/lib/scoring/verdict';
import type { CheckStatus } from '@/lib/scoring/eligibility';
import { VerificationBadge, ScoreBar } from '@/components/scoring/badges';

const card = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm';

export const VERDICT_CLASS: Record<FitVerdict, string> = {
  strong_fit: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50',
  good_fit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
  stretch: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
  not_a_fit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50',
  not_eligible: 'bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-gray-300 border-gray-300 dark:border-zinc-700',
};

const RING_CLASS: Record<FitVerdict, string> = {
  strong_fit: 'text-green-500', good_fit: 'text-blue-500', stretch: 'text-amber-500', not_a_fit: 'text-red-500', not_eligible: 'text-gray-400',
};

const ELIGIBILITY_LABEL = {
  eligible: 'Meets all stated criteria',
  not_eligible: 'Does not meet stated criteria',
  unverified: 'Some criteria can’t be verified from the resume',
  no_criteria: 'No eligibility criteria in this JD',
};

const RELEVANCE_CLASS = {
  relevant: 'text-green-600 dark:text-green-400',
  partially_relevant: 'text-amber-600 dark:text-amber-400',
  not_relevant: 'text-gray-400',
};
const RELEVANCE_LABEL = { relevant: 'Relevant', partially_relevant: 'Partly relevant', not_relevant: 'Not relevant' };

const CLAIM_CLASS = {
  supported: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partially_supported: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  unsupported: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const CLAIM_LABEL = { supported: 'Supported', partially_supported: 'Partly supported', unsupported: 'Not yet verified' };

function CheckIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <HelpCircle className="w-4 h-4 text-gray-400 shrink-0" />;
}

function Importance({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`Importance ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}`} />
      ))}
    </span>
  );
}

export function FitRing({ score, verdict, size = 128 }: { score: number; verdict: FitVerdict; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="text-gray-100 dark:text-zinc-800" strokeWidth="10" stroke="currentColor" fill="transparent" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className={`${RING_CLASS[verdict]} transition-all duration-1000 ease-out`}
          strokeWidth="10" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} stroke="currentColor" fill="transparent" strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className={size >= 120 ? 'text-3xl font-black' : 'text-xl font-black'}>{score}</span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Role fit</span>
      </div>
    </div>
  );
}

export function JobFitReport({ result }: { result: JobFitResult }) {
  const a = result.assessment;
  const jobLine = [result.job.title, result.job.company].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
      {/* Verdict */}
      <div className={`${card} flex flex-col md:flex-row gap-6 items-center md:items-start`}>
        <FitRing score={result.roleFit} verdict={result.verdict} />
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full border text-sm font-bold ${VERDICT_CLASS[result.verdict]}`}>{VERDICT_LABEL[result.verdict]}</span>
            {jobLine && <span className="text-sm text-gray-500">{jobLine}</span>}
            {result.job.seniority !== 'unspecified' && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500">{result.job.seniority}</span>
            )}
          </div>
          {a?.summary && <p className="text-gray-700 dark:text-gray-300 mb-3">{a.summary}</p>}
          <p className="text-xs text-gray-500">{result.verdictReason}</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Role fit = Σ(skill score × importance) / Σ(importance) = {result.formula.numerator} / {result.formula.denominator} = {result.exactRoleFit}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
            <span>Required met: <b className="text-gray-800 dark:text-gray-200">{result.coverage.requiredMet}/{result.coverage.required}</b></span>
            {result.coverage.preferred > 0 && <span>Preferred met: <b className="text-gray-800 dark:text-gray-200">{result.coverage.preferredMet}/{result.coverage.preferred}</b></span>}
            <span>Readiness for this role: <b className="text-gray-800 dark:text-gray-200">{result.readinessForRole.overallScore}/100</b></span>
          </div>
        </div>
      </div>

      {/* Eligibility */}
      <div className={card}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-600" /> Eligibility</h3>
        <p className="text-sm text-gray-500 mb-4">{ELIGIBILITY_LABEL[result.eligibility.status]}</p>
        {result.eligibility.checks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400"><th className="font-medium pb-2">Criterion</th><th className="font-medium pb-2">Required</th><th className="font-medium pb-2">Candidate</th></tr></thead>
              <tbody>
                {result.eligibility.checks.map((c) => (
                  <tr key={c.key} className="border-t border-gray-100 dark:border-zinc-800 align-top">
                    <td className="py-2 pr-3"><span className="flex items-center gap-2 font-medium"><CheckIcon status={c.status} />{c.label}</span></td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{c.required}</td>
                    <td className="py-2">
                      <span className={c.status === 'fail' ? 'text-red-600 font-medium' : ''}>{c.actual}</span>
                      {c.note && <p className="text-[11px] text-gray-400 mt-0.5">{c.note}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
            {result.academics.graduation && <span>CGPA: <b>{result.academics.graduation.display}</b></span>}
            {result.academics.class12 && <span>Class 12: <b>{result.academics.class12.display}</b></span>}
            {result.academics.class10 && <span>Class 10: <b>{result.academics.class10.display}</b></span>}
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className={card}>
        <h3 className="font-bold mb-1 flex items-center gap-2"><ListChecks className="w-5 h-5 text-blue-600" /> Skill requirements</h3>
        <p className="text-sm text-gray-500 mb-4">
          Importance is read from the JD by AI. Scores come from your evidence, never from the AI. The black tick marks the target score.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-gray-400">
                <th className="font-medium pb-2">Skill</th>
                <th className="font-medium pb-2">Importance</th>
                <th className="font-medium pb-2 w-48">Score vs target</th>
                <th className="font-medium pb-2">Evidence</th>
                <th className="font-medium pb-2 text-right">Gap</th>
                <th className="font-medium pb-2 text-right">Priority</th>
              </tr>
            </thead>
            <tbody>
              {result.requirements.map((r) => (
                <tr key={r.label} className="border-t border-gray-100 dark:border-zinc-800 align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium" title={r.quote || undefined}>{r.label}</div>
                    <div className="text-[11px] text-gray-400">
                      {r.requirement === 'preferred' ? 'Preferred' : 'Required'}
                      {r.matchedSkill && ` · counted: ${r.matchedSkill}`}
                      {r.via === 'implied' && ` · implied by ${r.viaSkill}`}
                      {!r.claimed && r.via === 'none' && ' · not on resume'}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3"><Importance value={r.importance} /></td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold w-7">{Math.round(r.score)}</span>
                      <div className="flex-1"><ScoreBar score={r.score} target={r.target} /></div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    {r.via === 'none' ? <span className="text-xs text-gray-400">No evidence</span> : <VerificationBadge level={r.verification} insufficient={r.insufficientEvidence} />}
                    {r.via !== 'none' && r.proof && (
                      <div className="mt-1 text-[11px]">
                        {r.proof.length ? (
                          <span className="text-green-700 dark:text-green-400" title={r.proof.map((p) => `${p.label}: ${p.detail}`).join('\n')}>
                            Proof: {Array.from(new Set(r.proof.map((p) => p.label))).join(', ')}
                          </span>
                        ) : (
                          <span className="font-semibold text-red-600 dark:text-red-400">No proof</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{r.gap > 0 ? Math.round(r.gap) : <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}</td>
                  <td className="py-2.5 text-right tabular-nums font-semibold">{r.priority > 0 ? Math.round(r.priority) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.bonusSkills.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1 flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" /> Other strong skills:</span>
            {result.bonusSkills.map((b) => (
              <span key={b.id} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">{b.label} {b.score}</span>
            ))}
          </div>
        )}
      </div>

      {/* Strengths & concerns */}
      {a && (a.strengths.length > 0 || a.concerns.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={card}>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle2 className="w-5 h-5" /> Strengths for this role</h3>
            <ul className="space-y-3">
              {a.strengths.map((s, i) => (
                <li key={i} className="text-sm"><p className="font-medium">{s.point}</p><p className="text-xs text-gray-500 mt-0.5">{s.evidence}</p></li>
              ))}
            </ul>
          </div>
          <div className={card}>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" /> Concerns</h3>
            <ul className="space-y-3">
              {a.concerns.map((s, i) => (
                <li key={i} className="text-sm"><p className="font-medium">{s.point}</p><p className="text-xs text-gray-500 mt-0.5">{s.evidence}</p></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Claim vs evidence */}
      {a && a.claimVsEvidence.length > 0 && (
        <div className={card}>
          <h3 className="font-bold mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600" /> Resume claims vs observable evidence</h3>
          <p className="text-sm text-gray-500 mb-4">A claim that isn’t verified yet isn’t proof the skill is missing — it means there’s no public evidence for it so far.</p>
          <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
            {a.claimVsEvidence.map((c, i) => (
              <li key={i} className="py-3 grid grid-cols-1 md:grid-cols-[10rem_1fr_auto] gap-2 md:gap-4 text-sm">
                <span className="font-medium">{c.skill}</span>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <p><span className="text-gray-400">Claim:</span> {c.claim}</p>
                  <p className="mt-0.5"><span className="text-gray-400">Evidence:</span> {c.observedEvidence}</p>
                </div>
                <span className={`self-start px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${CLAIM_CLASS[c.assessment]}`}>{CLAIM_LABEL[c.assessment]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Relevance */}
      {a && (a.experienceRelevance.length > 0 || a.projectRelevance.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {a.experienceRelevance.length > 0 && (
            <div className={card}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-600" /> Experience relevance</h3>
              <ul className="space-y-3">
                {a.experienceRelevance.map((e) => {
                  const role = result.experience.roles[e.index];
                  return (
                    <li key={e.index} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{role ? [role.title, role.organization].filter(Boolean).join(' · ') : `Role ${e.index + 1}`}</span>
                        <span className={`text-xs font-semibold shrink-0 ${RELEVANCE_CLASS[e.relevance]}`}>{RELEVANCE_LABEL[e.relevance]}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{e.reason}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {a.projectRelevance.length > 0 && (
            <div className={card}>
              <h3 className="font-bold mb-3 flex items-center gap-2"><FolderGit2 className="w-5 h-5 text-blue-600" /> Project relevance</h3>
              <ul className="space-y-3">
                {a.projectRelevance.map((p) => (
                  <li key={p.index} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{result.projectNames[p.index] ?? `Project ${p.index + 1}`}</span>
                      <span className={`text-xs font-semibold shrink-0 ${RELEVANCE_CLASS[p.relevance]}`}>{RELEVANCE_LABEL[p.relevance]}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {(result.nextActions.length > 0 || (a && a.recommendations.length > 0)) && (
        <div className={card}>
          <h3 className="font-bold mb-1 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> What would raise this fit most</h3>
          <p className="text-sm text-gray-500 mb-4">Ranked by ROI = expected improvement × importance ÷ effort. Gains are estimates, not guarantees.</p>
          {result.nextActions.length > 0 && (
            <ol className="space-y-3 mb-5">
              {result.nextActions.map((x, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{x.title}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{x.impact}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{x.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                      ≈ +{Math.round(x.expectedImprovement)} {x.skill} · ≈ +{x.estimatedRoleFitGain} role fit · ROI {x.roi}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {a && a.recommendations.length > 0 && (
            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> AI recommendations for this role</p>
              <ul className="space-y-2">
                {a.recommendations.map((r, i) => (
                  <li key={i} className="text-sm"><span className="font-medium">{r.action}</span><span className="text-gray-500"> — {r.why}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {a && a.interviewFocus.length > 0 && (
        <div className={card}>
          <h3 className="font-bold mb-3 flex items-center gap-2"><MessageSquareQuote className="w-5 h-5 text-blue-600" /> Likely interview focus</h3>
          <ul className="flex flex-wrap gap-2">
            {a.interviewFocus.map((t, i) => (
              <li key={i} className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm">{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Provenance */}
      <div className="flex items-start gap-2 text-[11px] text-gray-400">
        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
        <p>
          Scoring {result.scoringVersion} · JD read by {result.ai.jdParsedBy === 'llm' ? 'AI' : 'keyword match'} · resume read by {result.ai.profileSource === 'llm' ? 'AI' : 'keyword match'} ·
          {' '}{result.ai.assessment === 'llm' ? 'AI explanation generated after scoring — it cannot change the numbers.' : 'AI explanation unavailable.'}
          {result.ai.errors.length > 0 && <span className="text-amber-600"> {result.ai.errors.join(' · ')}</span>}
        </p>
      </div>
    </div>
  );
}
