import React from 'react';

export function ReadinessScore({ score }: { score: number }) {
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
      
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
        Your profile demonstrates strong alignment with mid-level engineering roles.
      </p>
    </div>
  );
}
