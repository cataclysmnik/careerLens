'use client';

import React, { useMemo } from 'react';
import { GraduationCap, Briefcase, FolderGit2, Award, AlertTriangle, ExternalLink } from 'lucide-react';
import type { CandidateProfile } from '@/lib/profile/candidate';
import { formatMonths, summarizeAcademics, summarizeExperience, type AcademicScore } from '@/lib/profile/academics';
import { AiSourceBadge } from '@/components/scoring/badges';

const card = 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5';
const EMPLOYMENT_LABEL: Record<string, string> = {
  internship: 'Internship', full_time: 'Full-time', part_time: 'Part-time', freelance: 'Freelance',
  research: 'Research', volunteer: 'Volunteer', other: 'Role',
};

function AcademicTile({ label, score }: { label: string; score: AcademicScore | null }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
      <div className="text-[11px] uppercase font-semibold tracking-wider text-gray-500">{label}</div>
      {score ? (
        <>
          <div className="text-lg font-bold mt-0.5">{score.display}</div>
          <div className="text-xs text-gray-500 truncate" title={[score.qualification, score.institution].filter(Boolean).join(' · ')}>
            {[score.qualification, score.year].filter(Boolean).join(' · ') || '—'}
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400 mt-1">Not on resume</div>
      )}
    </div>
  );
}

/** What the LLM read off the resume: academics, experience, projects. */
export function ExtractedProfile({ profile, compact = false }: { profile: CandidateProfile; compact?: boolean }) {
  const asOf = useMemo(() => new Date(profile.extractedAt), [profile.extractedAt]);
  const academics = useMemo(() => summarizeAcademics(profile), [profile]);
  const experience = useMemo(() => summarizeExperience(profile, asOf), [profile, asOf]);

  return (
    <div className="space-y-4">
      {profile.warnings.length > 0 && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{profile.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
        </div>
      )}

      {profile.feedback && profile.feedback.length > 0 && (
        <div className="flex gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/50 text-sm text-indigo-800 dark:text-indigo-300">
          <div className="flex-1">
            <h4 className="font-semibold mb-2">AI Resume & Portfolio Feedback</h4>
            <ul className="list-disc list-inside space-y-1">
              {profile.feedback.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-600" /> Academics</h3>
          <AiSourceBadge source={profile.source} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AcademicTile label={academics.postgraduation ? 'PG CGPA / %' : 'Graduation CGPA / %'} score={academics.postgraduation ?? academics.graduation} />
          <AcademicTile label="Class 12" score={academics.class12} />
          <AcademicTile label="Class 10" score={academics.class10} />
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
            <div className="text-[11px] uppercase font-semibold tracking-wider text-gray-500">Experience</div>
            <div className="text-lg font-bold mt-0.5">{formatMonths(experience.totalMonths)}</div>
            <div className="text-xs text-gray-500">
              {experience.internshipMonths > 0 ? `${formatMonths(experience.internshipMonths)} internships` : `${profile.experience.length} role(s)`}
              {experience.undatedRoles > 0 && ` · ${experience.undatedRoles} undated`}
            </div>
          </div>
        </div>
        {profile.activeBacklogs !== null && (
          <p className="text-xs text-gray-500 mt-3">Active backlogs: <span className="font-medium text-gray-700 dark:text-gray-300">{profile.activeBacklogs}</span></p>
        )}
      </div>

      {!compact && profile.experience.length > 0 && (
        <div className={card}>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Briefcase className="w-4 h-4 text-blue-600" /> Experience</h3>
          <ul className="space-y-3">
            {profile.experience.map((x, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">{x.title}{x.organization && <span className="text-gray-500"> · {x.organization}</span>}</span>
                  <span className="text-xs text-gray-500">
                    {EMPLOYMENT_LABEL[x.employmentType]} · {x.startDate ?? '?'} – {x.isCurrent ? 'Present' : x.endDate ?? '?'}
                    {experience.roles[i]?.months ? ` · ${formatMonths(experience.roles[i].months!)}` : ''}
                  </span>
                </div>
                {x.skills.length > 0 && <p className="text-xs text-gray-500 mt-1">{x.skills.join(' · ')}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && profile.projects.length > 0 && (
        <div className={card}>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><FolderGit2 className="w-4 h-4 text-blue-600" /> Projects</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.projects.map((p, i) => {
              const link = p.liveUrl ?? p.repoUrl;
              const href = link ? (link.startsWith('http') ? link : `https://${link}`) : undefined;
              return (
              <li key={i} className="p-3 rounded-lg border border-gray-100 dark:border-zinc-800 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{p.name}</span>
                  {href && (
                    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.isDeployed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Deployed</span>}
                  {p.mentionsTesting && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Tested</span>}
                  {p.hasQuantifiedOutcome && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Measured outcome</span>}
                  {p.skills.slice(0, 6).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">{s}</span>
                  ))}
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {!compact && (profile.certifications.length > 0 || profile.achievements.length > 0) && (
        <div className={card}>
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-blue-600" /> Certifications & achievements</h3>
          <ul className="text-sm space-y-1 list-disc list-inside text-gray-700 dark:text-gray-300">
            {profile.certifications.map((c, i) => <li key={`c${i}`}>{c.name}{c.issuer && ` — ${c.issuer}`}{c.year && ` (${c.year})`}</li>)}
            {profile.achievements.map((a, i) => <li key={`a${i}`}>{a}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
