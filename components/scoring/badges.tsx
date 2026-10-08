import React from 'react';
import type { VerificationLevel } from '@/lib/scoring/config';
import { VERIFICATION_LABEL } from '@/lib/scoring/normalize';

export const VERIFICATION_CLASS: Record<VerificationLevel, string> = {
  STRONGLY_VERIFIED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  DEMONSTRATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  EMERGING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  WEAK: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  UNVERIFIED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400',
};

export function VerificationBadge({ level, insufficient }: { level: VerificationLevel; insufficient?: boolean }) {
  if (insufficient) {
    return (
      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400 border border-dashed border-gray-300 dark:border-zinc-600">
        Insufficient evidence
      </span>
    );
  }
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${VERIFICATION_CLASS[level]}`}>
      {VERIFICATION_LABEL[level]}
    </span>
  );
}

export function barClass(score: number) {
  if (score >= 80) return 'bg-green-600';
  if (score >= 60) return 'bg-green-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ScoreBar({ score, target }: { score: number; target?: number }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-800">
      <div className={`h-2 rounded-full ${barClass(score)}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      {target !== undefined && (
        <div
          className="absolute -top-1 h-4 w-0.5 bg-gray-700 dark:bg-gray-300"
          style={{ left: `${target}%` }}
          title={`Target ${target}`}
        />
      )}
    </div>
  );
}

export function AiSourceBadge({ source }: { source: 'llm' | 'fallback' }) {
  return source === 'llm' ? (
    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
      AI extracted
    </span>
  ) : (
    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400">
      Keyword parse
    </span>
  );
}
