'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Loader2, Mail, CalendarDays, KeyRound, MapPin, Target, Briefcase,
  GitFork, Globe, Link2, CheckCircle2, ArrowRight, GraduationCap, Code,
} from 'lucide-react';
import type { Me } from '@/lib/types/me';
import type { ScoringResult } from '@/lib/scoring/engine';
import { ROLE_BADGE_CLASS, ROLE_LABEL } from '@/lib/roles';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { profileChecklist, profileCompleteness } from '@/lib/profileCompleteness';
import { CODING_PLATFORMS, HANDLE_FIELD, PLATFORM_INFO } from '@/lib/coding/handles';

const EXPERIENCE_LEVELS = [
  'Student / Fresher',
  'Intern',
  'Entry level (0–2 yrs)',
  'Mid level (2–5 yrs)',
  'Senior (5+ yrs)',
];

type FormState = {
  name: string;
  targetRole: string;
  experienceLevel: string;
  location: string;
  githubUsername: string;
  portfolioUrl: string;
  linkedinUrl: string;
  skills: string;
  preferredIndustries: string;
  cgpa: string;
  tenthPercentage: string;
  twelfthPercentage: string;
  leetcodeUsername: string;
  codeforcesHandle: string;
  codechefUsername: string;
  hackerrankUsername: string;
  gfgUsername: string;
};

const numToText = (n: number | null | undefined) => (n == null ? '' : String(n));

function toForm(me: Me): FormState {
  const p = me.profile;
  return {
    name: me.name ?? '',
    targetRole: p?.targetRole ?? '',
    experienceLevel: p?.experienceLevel ?? '',
    location: p?.location ?? '',
    githubUsername: p?.githubUsername ?? '',
    portfolioUrl: p?.portfolioUrl ?? '',
    linkedinUrl: p?.linkedinUrl ?? '',
    skills: (p?.skills ?? []).join(', '),
    preferredIndustries: (p?.preferredIndustries ?? []).join(', '),
    cgpa: numToText(p?.cgpa),
    tenthPercentage: numToText(p?.tenthPercentage),
    twelfthPercentage: numToText(p?.twelfthPercentage),
    leetcodeUsername: p?.leetcodeUsername ?? '',
    codeforcesHandle: p?.codeforcesHandle ?? '',
    codechefUsername: p?.codechefUsername ?? '',
    hackerrankUsername: p?.hackerrankUsername ?? '',
    gfgUsername: p?.gfgUsername ?? '',
  };
}

const splitList = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
const cardClass = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6';

export default function ProfilePage() {
  const { update: refreshSession } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [meRes, evidenceRes] = await Promise.all([
          fetch('/api/me'),
          fetch('/api/students/evidence'),
        ]);
        if (!meRes.ok) throw new Error();
        const { data } = await meRes.json();
        setMe(data);
        setForm(toForm(data));
        if (evidenceRes.ok) setScoring((await evidenceRes.json()).data?.scoring ?? null);
      } catch {
        setLoadError("Couldn't load your profile. Refresh the page to try again.");
      }
    })();
  }, []);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          skills: splitList(form.skills),
          preferredIndustries: splitList(form.preferredIndustries),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setMe(json.data);
      setForm(toForm(json.data));
      setSaved(true);
      await refreshSession();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <div className="p-10 text-center text-sm text-red-500">{loadError}</div>;
  }
  if (!me || !form) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const p = me.profile;
  const checklist = profileChecklist(me);
  const completeness = profileCompleteness(me);
  const memberSince = new Date(me.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const links = [
    p?.githubUsername && { icon: GitFork, label: `github.com/${p.githubUsername}`, href: `https://github.com/${p.githubUsername}` },
    p?.portfolioUrl && { icon: Globe, label: 'Portfolio', href: p.portfolioUrl },
    p?.linkedinUrl && { icon: Link2, label: 'LinkedIn', href: p.linkedinUrl },
    ...CODING_PLATFORMS.map((platform) => {
      const handle = p?.[HANDLE_FIELD[platform]];
      return handle && { icon: Code, label: PLATFORM_INFO[platform].label, href: PLATFORM_INFO[platform].profileUrl(handle) };
    }),
  ].filter(Boolean) as { icon: typeof GitFork; label: string; href: string }[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24 space-y-6">
        {/* Identity */}
        <div className={`${cardClass} flex flex-col sm:flex-row sm:items-center gap-6`}>
          <UserAvatar name={me.name} email={me.email} image={me.image} size={80} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold truncate">{me.name || 'Unnamed user'}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${ROLE_BADGE_CLASS[me.role]}`}>
                {ROLE_LABEL[me.role]}
              </span>
            </div>
            {p?.targetRole && (
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                Aspiring {p.targetRole}{p.experienceLevel ? ` · ${p.experienceLevel}` : ''}
              </p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{me.email}</span>
              {p?.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{p.location}</span>}
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />Member since {memberSince}</span>
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                {me.hasPassword ? 'Email & password' : 'Google sign-in'}
              </span>
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <l.icon className="w-3.5 h-3.5" />
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: snapshot + completeness */}
          <div className="space-y-6 lg:order-2">
            <div className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Career Snapshot</h3>
              {scoring ? (
                <>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-bold">{scoring.overallScore}</span>
                    <span className="text-gray-500 mb-1">/100 readiness</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Evidence strength {scoring.evidenceStrength}%</p>
                  <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                    View full report <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No readiness report yet.</p>
                  <Link href="/profile/resume" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                    Upload your resume <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>

            <div className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Profile Completeness</h3>
                <span className="text-sm font-bold">{completeness}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 mb-4">
                <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <ul className="space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 ${c.done ? 'text-green-500' : 'text-gray-300 dark:text-zinc-700'}`} />
                    <span className={c.done ? '' : 'text-gray-500 dark:text-gray-400'}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {(p?.cgpa != null || p?.tenthPercentage != null || p?.twelfthPercentage != null) && (
              <div className={cardClass}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Academics</h3>
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'CGPA', value: p?.cgpa },
                    { label: '12th', value: p?.twelfthPercentage, suffix: '%' },
                    { label: '10th', value: p?.tenthPercentage, suffix: '%' },
                  ].map((a) => (
                    <div key={a.label} className="rounded-lg bg-gray-50 dark:bg-zinc-800/60 py-3">
                      <dd className="text-lg font-bold">{a.value != null ? `${a.value}${a.suffix ?? ''}` : '—'}</dd>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">{a.label}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {(p?.skills.length ?? 0) > 0 && (
              <div className={cardClass}>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {p!.skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className={`${cardClass} lg:col-span-2 lg:order-1 space-y-6`}>
            <h2 className="text-lg font-semibold">Edit Profile</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label htmlFor="name" className={labelClass}>Full name</label>
                <input id="name" required value={form.name} onChange={set('name')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="targetRole" className={labelClass}>
                  <Target className="inline w-3.5 h-3.5 mr-1" />Target role
                </label>
                <input id="targetRole" value={form.targetRole} onChange={set('targetRole')} className={inputClass} placeholder="e.g. Full Stack Developer" />
              </div>
              <div>
                <label htmlFor="experienceLevel" className={labelClass}>
                  <Briefcase className="inline w-3.5 h-3.5 mr-1" />Experience level
                </label>
                <select id="experienceLevel" value={form.experienceLevel} onChange={set('experienceLevel')} className={inputClass}>
                  <option value="">Select…</option>
                  {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  {form.experienceLevel && !EXPERIENCE_LEVELS.includes(form.experienceLevel) && (
                    <option value={form.experienceLevel}>{form.experienceLevel}</option>
                  )}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="location" className={labelClass}>Location</label>
                <input id="location" value={form.location} onChange={set('location')} className={inputClass} placeholder="e.g. Vellore, India" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="skills" className={labelClass}>Skills</label>
                <input id="skills" value={form.skills} onChange={set('skills')} className={inputClass} placeholder="React, TypeScript, PostgreSQL" />
                <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="preferredIndustries" className={labelClass}>Preferred industries</label>
                <input id="preferredIndustries" value={form.preferredIndustries} onChange={set('preferredIndustries')} className={inputClass} placeholder="Fintech, SaaS, EdTech" />
                <p className="mt-1 text-xs text-gray-500">Comma-separated.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold mt-4 mb-4">
                <GraduationCap className="inline w-4 h-4 mr-1" />Academics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="cgpa" className={labelClass}>CGPA (out of 10)</label>
                  <input id="cgpa" type="number" inputMode="decimal" min="0" max="10" step="0.01" value={form.cgpa} onChange={set('cgpa')} className={inputClass} placeholder="8.45" />
                </div>
                <div>
                  <label htmlFor="twelfthPercentage" className={labelClass}>12th percentage</label>
                  <input id="twelfthPercentage" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.twelfthPercentage} onChange={set('twelfthPercentage')} className={inputClass} placeholder="92.4" />
                </div>
                <div>
                  <label htmlFor="tenthPercentage" className={labelClass}>10th percentage</label>
                  <input id="tenthPercentage" type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.tenthPercentage} onChange={set('tenthPercentage')} className={inputClass} placeholder="95" />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">Visible to your placement cell. If your board used CGPA for 10th/12th, convert it to a percentage.</p>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold mt-4 mb-4">Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="githubUsername" className={labelClass}>GitHub username</label>
                  <input id="githubUsername" value={form.githubUsername} onChange={set('githubUsername')} className={inputClass} placeholder="octocat" />
                </div>
                <div>
                  <label htmlFor="portfolioUrl" className={labelClass}>Portfolio URL</label>
                  <input id="portfolioUrl" type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} className={inputClass} placeholder="https://yourwebsite.com" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="linkedinUrl" className={labelClass}>LinkedIn URL</label>
                  <input id="linkedinUrl" type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} className={inputClass} placeholder="https://linkedin.com/in/you" />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mt-4 mb-4">
                <h3 className="text-sm font-semibold">
                  <Code className="inline w-4 h-4 mr-1" />Coding profiles
                </h3>
                <Link href="/profile/coding" className="text-xs font-medium text-blue-600 hover:underline">
                  Analyze coding profiles →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {CODING_PLATFORMS.map((platform) => {
                  const field = HANDLE_FIELD[platform];
                  return (
                    <div key={platform}>
                      <label htmlFor={field} className={labelClass}>{PLATFORM_INFO[platform].label}</label>
                      <input id={field} value={form[field]} onChange={set(field)} className={inputClass} placeholder="Username or profile URL" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-end gap-4">
              {saveError && <p className="text-sm text-red-500 mr-auto">{saveError}</p>}
              {saved && <p className="text-sm text-green-600 dark:text-green-400 mr-auto">Profile saved.</p>}
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
