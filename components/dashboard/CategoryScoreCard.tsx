import React from 'react';

type CategoryScoreProps = {
  title: string;
  score: number;
};

export function CategoryScoreCard({ title, score }: CategoryScoreProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <div className="w-48 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full" 
            style={{ width: `${score}%` }} 
          />
        </div>
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">
        {score}
      </div>
    </div>
  );
}
