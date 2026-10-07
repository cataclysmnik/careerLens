'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, GitFork, Globe, Search } from 'lucide-react';

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  targetRole: string | null;
  overallScore: number | null;
  categories: { title: string; score: number }[];
  gaps: { title: string; description: string }[];
  hasGithub: boolean;
  hasPortfolio: boolean;
  updatedAt: string | null;
};

export default function PlacementStudentsPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/placement/students?minScore=${minScore}`)
      .then((res) => res.json())
      .then((json) => setStudents(json.data))
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false));
  }, [minScore]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const filtered = (students ?? []).filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Students</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filtered.length} of {students?.length ?? 0} students
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              <option value={0}>All scores</option>
              <option value={60}>60%+</option>
              <option value={80}>80%+</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-950 text-xs uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Target Role</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Evidence</th>
                <th className="text-left px-4 py-3">Top Gap</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name ?? 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.targetRole ?? '—'}</td>
                  <td className="px-4 py-3">
                    {s.overallScore !== null ? (
                      <span className={`font-bold ${s.overallScore >= 80 ? 'text-green-600' : s.overallScore >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                        {s.overallScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Not analyzed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {s.hasGithub && <GitFork className="w-4 h-4 text-gray-400" />}
                      {s.hasPortfolio && <Globe className="w-4 h-4 text-gray-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.gaps[0]?.title ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No students match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
