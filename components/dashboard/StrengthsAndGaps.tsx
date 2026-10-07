import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export function StrengthsAndGaps({ 
  strengths, 
  gaps 
}: { 
  strengths: { title: string; description: string }[];
  gaps: { title: string; description: string }[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Strengths */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Top Strengths
        </h3>
        {strengths.length > 0 ? (
          <ul className="space-y-4">
            {strengths.map((s, idx) => (
              <li key={idx} className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Add more evidence to identify strengths.</p>
        )}
      </div>

      {/* Gaps */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Biggest Gaps
        </h3>
        {gaps.length > 0 ? (
          <ul className="space-y-4">
            {gaps.map((g, idx) => (
              <li key={idx} className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{g.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No major gaps identified!</p>
        )}
      </div>
    </div>
  );
}
