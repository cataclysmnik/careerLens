import React from 'react';
import { readinessTier, TIER_BADGE_CLASS, TIER_LABEL, type ReadinessTier } from '@/lib/readiness';

const TIER_MESSAGE: Record<ReadinessTier, string> = {
  READY: 'Your profile shows strong, verifiable evidence for placement.',
  DEVELOPING: 'A solid base — closing the gaps below will lift your score fastest.',
  NEEDS_SUPPORT: 'Add more evidence — projects, GitHub and a portfolio — to build your score.',
  NOT_ANALYZED: 'Run an analysis to get your score.',
};

export function ReadinessScore({ score }: { score: number }) {
  const tier = readinessTier(score);
  // Simple SVG circle for readiness score
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Career Readiness</h3>
      
      <div className="relative flex items-center justify-center">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-100 dark:text-zinc-800"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-blue-600 transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{score}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
        </div>
      </div>
      
      <span className={`mt-4 px-2 py-0.5 rounded text-xs font-semibold uppercase ${TIER_BADGE_CLASS[tier]}`}>
        {TIER_LABEL[tier]}
      </span>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
        {TIER_MESSAGE[tier]}
      </p>
    </div>
  );
}
