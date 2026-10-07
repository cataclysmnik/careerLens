'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { SidebarUserCard } from './SidebarUserCard';

export function CompanySidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
          <span className="font-bold text-lg tracking-tight">CareerLens</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            JD Matcher
          </div>
        </nav>

        <SidebarUserCard />
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center px-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
          <span className="font-bold text-lg tracking-tight">CareerLens</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
