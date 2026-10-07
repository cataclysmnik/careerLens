'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Loader2, GitFork, Globe, Search, ChevronDown, Link2, MapPin, Briefcase,
  CheckCircle2, AlertTriangle, Send, X,
} from 'lucide-react';
import { UserAvatar } from '@/components/layout/UserAvatar';
import {
  TIER_BADGE_CLASS, TIER_LABEL, TIER_ORDER, scoreTextClass, type ReadinessTier,
} from '@/lib/readiness';

type StudentRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  joinedAt: string;
  targetRole: string | null;
  experienceLevel: string | null;
  location: string | null;
  githubUsername: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  overallScore: number | null;
  tier: ReadinessTier;
  evidenceStrength: number | null;
  categories: { title: string; score: number }[];
  strengths: { title: string; description: string }[];
  gaps: { title: string; description: string }[];
  skills: { name: string; strength: string }[];
  hasGithub: boolean;
  hasPortfolio: boolean;
  updatedAt: string | null;
};

type SortKey = 'score-desc' | 'score-asc' | 'name' | 'recent';

const controlClass =
  'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function PlacementStudentsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <StudentsView />
    </Suspense>
  );
}

function FullPageSpinner() {
  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

function StudentsView() {
  const searchParams = useSearchParams();
  const initialTier = searchParams.get('tier');
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState<ReadinessTier | 'ALL'>(
    TIER_ORDER.includes(initialTier as ReadinessTier) ? (initialTier as ReadinessTier) : 'ALL'
  );
  const [role, setRole] = useState('ALL');
  const [needGithub, setNeedGithub] = useState(false);
  const [needPortfolio, setNeedPortfolio] = useState(false);
  const [sort, setSort] = useState<SortKey>('score-desc');
  const [expanded, setExpanded] = useState<string | null>(searchParams.get('student'));

  useEffect(() => {
    fetch('/api/placement/students')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json) => setStudents(json.data))
      .catch(() => setLoadError(true));
  }, []);

  const roles = useMemo(
    () => Array.from(new Set((students ?? []).map((s) => s.targetRole).filter((r): r is string => !!r))).sort(),
    [students]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (students ?? []).filter((s) => {
      if (q && !s.name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q)) return false;
      if (tier !== 'ALL' && s.tier !== tier) return false;
      if (role !== 'ALL' && s.targetRole !== role) return false;
      if (needGithub && !s.hasGithub) return false;
      if (needPortfolio && !s.hasPortfolio) return false;
      return true;
    });
    const score = (s: StudentRow) => s.overallScore ?? -1;
    return rows.sort((a, b) => {
      if (sort === 'score-desc') return score(b) - score(a);
      if (sort === 'score-asc') return (a.overallScore ?? 101) - (b.overallScore ?? 101);
      if (sort === 'name') return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      return (b.updatedAt ? Date.parse(b.updatedAt) : 0) - (a.updatedAt ? Date.parse(a.updatedAt) : 0);
    });
  }, [students, search, tier, role, needGithub, needPortfolio, sort]);

  if (loadError) {
    return <div className="p-10 text-center text-sm text-red-500">Couldn&apos;t load students. Refresh the page to try again.</div>;
  }
  if (!students) return <FullPageSpinner />;

  const filtersActive = search || tier !== 'ALL' || role !== 'ALL' || needGithub || needPortfolio;
  const clearFilters = () => {
    setSearch(''); setTier('ALL'); setRole('ALL'); setNeedGithub(false); setNeedPortfolio(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Students</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Showing {visible.length} of {students.length} students
            </p>
          </div>
          <Link
            href="/placement/notifications"
            className="inline-flex items-center gap-2 self-start md:self-auto rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Send className="w-4 h-4" /> Message students
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${controlClass} w-full pl-9`}
            />
          </div>
          <select value={tier} onChange={(e) => setTier(e.target.value as ReadinessTier | 'ALL')} className={controlClass} aria-label="Readiness tier">
            <option value="ALL">All tiers</option>
            {TIER_ORDER.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={controlClass} aria-label="Target role">
            <option value="ALL">All target roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={controlClass} aria-label="Sort">
            <option value="score-desc">Highest score</option>
            <option value="score-asc">Lowest score</option>
            <option value="recent">Recently analyzed</option>
            <option value="name">Name A–Z</option>
          </select>
          <Toggle checked={needGithub} onChange={setNeedGithub} icon={GitFork} label="Has GitHub" />
          <Toggle checked={needPortfolio} onChange={setNeedPortfolio} icon={Globe} label="Has portfolio" />
          {filtersActive && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-950 text-xs uppercase text-gray-500 tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Target Role</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">Readiness</th>
                  <th className="text-left px-4 py-3">Evidence</th>
                  <th className="text-left px-4 py-3">Top Gap</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const isOpen = expanded === s.id;
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : s.id)}
                        className={`border-t border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40 ${isOpen ? 'bg-gray-50 dark:bg-zinc-800/40' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={s.name} email={s.email} image={s.image} size={32} />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{s.name ?? 'Unnamed'}</div>
                              <div className="text-xs text-gray-500 truncate">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.targetRole ?? '—'}</td>
                        <td className="px-4 py-3">
                          {s.overallScore !== null ? (
                            <span className={`font-bold ${scoreTextClass(s.overallScore)}`}>{s.overallScore}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${TIER_BADGE_CLASS[s.tier]}`}>
                            {TIER_LABEL[s.tier]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 text-gray-400">
                            {s.hasGithub && <span title="GitHub evidence"><GitFork className="w-4 h-4" /></span>}
                            {s.hasPortfolio && <span title="Portfolio evidence"><Globe className="w-4 h-4" /></span>}
                            {!s.hasGithub && !s.hasPortfolio && <span className="text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px] truncate">{s.gaps[0]?.title ?? '—'}</td>
                        <td className="px-4 py-3">
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/60 dark:bg-zinc-950/40">
                          <td colSpan={7} className="px-4 py-5">
                            <StudentDetail s={s} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">
                      {students.length === 0 ? 'No students have registered yet.' : 'No students match these filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Toggle({
  checked, onChange, icon: Icon, label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
        checked
          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-400'
          : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function StudentDetail({ s }: { s: StudentRow }) {
  const links = [
    s.githubUsername && { icon: GitFork, label: `github.com/${s.githubUsername}`, href: `https://github.com/${s.githubUsername}` },
    s.portfolioUrl && { icon: Globe, label: 'Portfolio', href: s.portfolioUrl },
    s.linkedinUrl && { icon: Link2, label: 'LinkedIn', href: s.linkedinUrl },
  ].filter(Boolean) as { icon: typeof GitFork; label: string; href: string }[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500 dark:text-gray-400">
        {s.experienceLevel && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" />{s.experienceLevel}</span>}
        {s.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{s.location}</span>}
        <span>Joined {new Date(s.joinedAt).toLocaleDateString()}</span>
        {s.updatedAt && <span>Last analyzed {new Date(s.updatedAt).toLocaleDateString()}</span>}
        {s.evidenceStrength !== null && <span>Evidence strength {s.evidenceStrength}%</span>}
        {links.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-blue-600 hover:underline">
            <l.icon className="w-4 h-4" />{l.label}
          </a>
        ))}
      </div>

      {s.overallScore === null ? (
        <p className="text-sm text-gray-500">This student hasn&apos;t run a resume analysis yet, so there&apos;s no readiness breakdown.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Category Scores</h4>
            <div className="space-y-2.5">
              {s.categories.map((c) => (
                <div key={c.title}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{c.title}</span>
                    <span className={`font-semibold ${scoreTextClass(c.score)}`}>{c.score}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Strengths</h4>
            {s.strengths.length > 0 ? (
              <ul className="space-y-2">
                {s.strengths.map((st) => (
                  <li key={st.title} className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span><span className="font-medium">{st.title}</span><span className="block text-xs text-gray-500">{st.description}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">None identified yet.</p>}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Gaps</h4>
            {s.gaps.length > 0 ? (
              <ul className="space-y-2">
                {s.gaps.map((g) => (
                  <li key={g.title} className="flex gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><span className="font-medium">{g.title}</span><span className="block text-xs text-gray-500">{g.description}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">No major gaps.</p>}
          </div>
        </div>
      )}

      {s.skills.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Verified Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {s.skills.map((sk) => (
              <span key={sk.name} className="px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs">
                {sk.name} <span className="text-gray-400">· {sk.strength}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
