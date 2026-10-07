import React from 'react';
import { ArrowRight } from 'lucide-react';

export function RecommendedActions() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
        Recommended Actions
      </h3>
      <div className="space-y-3">
        <ActionCard 
          title="Add automated tests to two projects"
          description="Implementing Jest or Vitest in your existing React projects will significantly boost your Engineering Practices score."
          impact="High Impact"
        />
        <ActionCard 
          title="Deploy one backend application"
          description="Create a simple Node.js/Express API, containerize it with Docker, and deploy it to a platform like Render or AWS."
          impact="High Impact"
        />
        <ActionCard 
          title="Improve project documentation"
          description="Update README.md files on your top 3 repositories to include setup instructions and architecture diagrams."
          impact="Medium Impact"
        />
      </div>
    </div>
  );
}

function ActionCard({ title, description, impact }: { title: string, description: string, impact: string }) {
  return (
    <div className="group flex items-start gap-4 p-4 rounded-lg border border-gray-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${impact === 'High Impact' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300'}`}>
            {impact}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {description}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors mt-2" />
    </div>
  );
}
