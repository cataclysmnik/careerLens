import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export function StrengthsAndGaps() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Strengths */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Top Strengths
        </h3>
        <ul className="space-y-4">
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Strong React Experience</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verified across 7 repositories and 4 deployed projects.</span>
          </li>
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Multiple Completed Projects</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Consistent project delivery over the past 12 months.</span>
          </li>
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Consistent GitHub Activity</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Frequent commits and PR reviews indicating active engagement.</span>
          </li>
        </ul>
      </div>

      {/* Gaps */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Biggest Gaps
        </h3>
        <ul className="space-y-4">
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Limited Testing Practices</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">No unit or integration tests detected in recent repositories.</span>
          </li>
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Weak Deployment Evidence</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only static deployments found; lack of containerization/CI/CD.</span>
          </li>
          <li className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Few Production-Scale Projects</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Projects lack complex architecture or database relationships.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
