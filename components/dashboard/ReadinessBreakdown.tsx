import React from 'react';
import { ChevronRight, Info, GitFork, Globe, Trophy, Award, ShieldOff } from 'lucide-react';
import type { ProofSource } from '@/lib/scoring/skill-score';
import type { ScoringResult, TraceNode } from '@/lib/scoring/engine';
import { ScoreBar } from '@/components/scoring/badges';
import { READINESS_DIMENSION_LABEL, READINESS_WEIGHTS, type ReadinessDimensionKey } from '@/lib/scoring/config';
import { SkillRadarChart } from './SkillRadarChart';

const BASE_WEIGHTS = (Object.keys(READINESS_WEIGHTS) as ReadinessDimensionKey[])
  .map((k) => `${READINESS_DIMENSION_LABEL[k]} ${Math.round(READINESS_WEIGHTS[k] * 1000) / 10}%`)
  .join(', ');

function weightLabel(w: number | undefined, parent: string) {
  if (w === undefined) return null;
  // Role-alignment children carry importance (1–5), not a fraction.
  if (parent === 'Role Alignment') return `importance ${w}`;
  return `${Math.round(w * 1000) / 10}%`;
}

const PROOF_ICON: Record<ProofSource['kind'], typeof GitFork> = { github: GitFork, portfolio: Globe, coding: Trophy, certificate: Award };

/** Compact source list for a skill row: GitHub · LeetCode · …, or "No proof". */
function SourceTags({ proof, note }: { proof: ProofSource[]; note?: string }) {
  if (note === 'no evidence') return <span className="text-[11px] text-gray-400">no evidence</span>;
  if (proof.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400" title="Only claimed on the resume — no GitHub, portfolio, coding platform or certificate shows it">
        <ShieldOff className="w-3 h-3" /> No proof{note ? ` (${note})` : ''}
      </span>
    );
  }
  // One tag per source (e.g. GitHub once even if it has several repos).
  const bySource = new Map<string, ProofSource[]>();
  proof.forEach((p) => bySource.set(p.label, [...(bySource.get(p.label) ?? []), p]));
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {Array.from(bySource.entries()).map(([label, items]) => {
        const Icon = PROOF_ICON[items[0].kind];
        const title = items.map((p) => p.detail).join(' · ');
        const cls = 'inline-flex items-center gap-0.5 text-[11px] text-green-700 dark:text-green-400';
        return items[0].url ? (
          <a key={label} href={items[0].url} target="_blank" rel="noreferrer" className={`${cls} hover:underline`} title={title}>
            <Icon className="w-3 h-3" />{label}
          </a>
        ) : (
          <span key={label} className={cls} title={title}><Icon className="w-3 h-3" />{label}</span>
        );
      })}
      {note && <span className="text-[11px] text-gray-400">{note}</span>}
    </span>
  );
}

function TraceChildren({ node }: { node: TraceNode }) {
  if (!node.children?.length) return null;
  return (
    <ul className="mt-2 ml-1 pl-3 border-l border-gray-200 dark:border-zinc-800 space-y-1.5">
      {node.children.map((c, i) => (
        <li key={i} className="text-xs flex items-center justify-between gap-3">
          <span className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <span className="text-gray-600 dark:text-gray-300 truncate" title={c.detail}>{c.label}</span>
            {c.proof && <SourceTags proof={c.proof} note={c.note} />}
          </span>
          <span className="flex items-center gap-2 shrink-0 tabular-nums">
            <span className="text-gray-400">{weightLabel(c.weight, node.label)}</span>
            <span className="font-semibold w-7 text-right">{c.score ?? '—'}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** §17 + §22: readiness dimensions with weights, each expandable to what produced it. */
export function ReadinessBreakdown({ scoring }: { scoring: ScoringResult }) {
  const radarData = scoring.trace.children?.map(node => ({
    subject: node.label,
    score: node.score,
    fullMark: 100
  })) || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex-1 space-y-2">
        {scoring.trace.children?.map((node, i) => {
          const dim = scoring.dimensions[i];
          const measured = node.score !== null;
          return (
            <details key={node.label} className="group rounded-lg border border-gray-100 dark:border-zinc-800 [&_summary::-webkit-details-marker]:hidden">
              <summary className="list-none cursor-pointer p-3 flex items-center gap-3">
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={`font-medium ${measured ? '' : 'text-gray-400'}`}>{node.label}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="text-xs text-gray-400">
                        {measured ? `× ${Math.round(dim.effectiveWeight * 1000) / 10}%` : dim.status === 'not_offered' ? 'not offered yet' : 'not enough data'}
                      </span>
                      <span className="font-bold w-7 text-right">{node.score ?? '—'}</span>
                    </span>
                  </div>
                  {measured ? <ScoreBar score={node.score!} /> : <div className="h-2 rounded-full border border-dashed border-gray-200 dark:border-zinc-700" />}
                </div>
              </summary>
              <div className="px-3 pb-3 pl-10">
                <p className="text-xs text-gray-500 dark:text-gray-400">{node.detail}</p>
                <TraceChildren node={node} />
              </div>
            </details>
          );
        })}
        <p className="flex items-start gap-1.5 text-[11px] text-gray-400 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          Base weights: {BASE_WEIGHTS} — re-normalized over the dimensions we could measure.
          Scoring {scoring.scoringVersion}.
        </p>
      </div>
      
      {radarData.length >= 3 && (
        <div className="w-full flex items-center justify-center p-8 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800">
          <SkillRadarChart data={radarData} size={350} />
        </div>
      )}
    </div>
  );
}
