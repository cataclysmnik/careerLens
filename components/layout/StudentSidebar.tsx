'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, GitFork, Globe, User, Briefcase, Trophy } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { SidebarUserCard } from './SidebarUserCard';

const navItems = [
  { name: 'Upload & Analyze', href: '/onboarding', icon: FileText },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Job Matcher', href: '/matcher', icon: Briefcase },
  { name: 'My Profile', href: '/profile', icon: User },
  { name: 'Resume Parser', href: '/profile/resume', icon: FileText },
  { name: 'GitHub Analyzer', href: '/profile/github', icon: GitFork },
  { name: 'Coding Profiles', href: '/profile/coding', icon: Trophy },
  { name: 'Portfolio Scanner', href: '/profile/portfolio', icon: Globe },
];

export function StudentSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">C</div>
            <span className="font-bold text-lg tracking-tight">CareerLens</span>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
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
        </nav>

        <SidebarUserCard profileHref="/profile" />
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
