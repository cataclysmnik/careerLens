'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, GitFork, Globe, User, Briefcase, Trophy, ClipboardList } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SidebarUserCard } from './SidebarUserCard';

const RESUME_HREF = '/profile/resume';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/jobs', icon: ClipboardList },
  { name: 'Job Matcher', href: '/matcher', icon: Briefcase },
  { name: 'My Profile', href: '/profile', icon: User },
  { name: 'Resume Parser', href: '/profile/resume', icon: FileText },
  { name: 'LinkedIn Parser', href: '/profile/linkedin', icon: Globe }, // Use Globe or a distinct icon here
  { name: 'GitHub Analyzer', href: '/profile/github', icon: GitFork },
  { name: 'Coding Profiles', href: '/profile/coding', icon: Trophy },
  { name: 'Portfolio Scanner', href: '/profile/portfolio', icon: Globe },
];

export function StudentSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Until the first resume analysis is saved, only the Resume Parser is shown.
  const [hasAnalysis, setHasAnalysis] = useState<boolean | null>(null);

  const checkAnalysis = React.useCallback(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setHasAnalysis(!!json.data.hasAnalysis);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasAnalysis) return;
    checkAnalysis();
  }, [pathname, hasAnalysis, checkAnalysis]);

  useEffect(() => {
    const onAnalysisUpdated = () => {
      setHasAnalysis(true);
      checkAnalysis();
    };
    window.addEventListener('careerlens:analysis-updated', onAnalysisUpdated);
    return () => window.removeEventListener('careerlens:analysis-updated', onAnalysisUpdated);
  }, [checkAnalysis]);

  const visibleItems = hasAnalysis !== false 
    ? navItems 
    : navItems.filter((item) => item.href === RESUME_HREF || item.href === '/profile/linkedin');

  return (
    <div className="flex h-screen bg-transparent font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col hidden md:flex shadow-sm z-10">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
            <span className="font-bold text-lg tracking-tight">CareerLens</span>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-900 dark:hover:text-gray-200'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {item.name}
              </Link>
            );
          })}
          {hasAnalysis === false && (
            <p className="px-3 pt-3 text-xs text-gray-500 dark:text-gray-400">
              Upload your resume or add your LinkedIn to unlock your dashboard and profile tools.
            </p>
          )}
        </nav>

        <SidebarUserCard profileHref="/profile" />
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center px-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
          <span className="font-bold text-lg tracking-tight">CareerLens</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div key={pathname} className="animate-page-transition h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
