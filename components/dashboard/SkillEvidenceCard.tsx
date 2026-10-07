import React from 'react';
import { ShieldCheck, GitFork } from 'lucide-react';
import type { SkillScore } from '@/lib/scoring/skill-score';
import { VerificationBadge, ScoreBar } from '@/components/scoring/badges';

const STATUS_NOTE: Record<string, string> = {
  source_unavailable: 'not provided',
  not_offered: 'not offered yet',
  none_found: 'none found',
};

/** One skill: score, verification band, confidence, and the §8 component breakdown. */
export function SkillEvidenceCard({ skill, githubUser }: { skill: SkillScore; githubUser?: string | null }) {
  return (
    <details className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors [&_summary::-webkit-details-marker]:hidden">
      <summary className="list-none cursor-pointer p-5 focus:outline-none">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-lg group-open:text-blue-600 dark:group-open:text-blue-400 transition-colors">{skill.label}</h3>
          <VerificationBadge level={skill.verification} insufficient={skill.insufficientEvidence} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl font-bold tabular-nums w-10">{skill.score}</span>
          <div className="flex-1"><ScoreBar score={skill.score} /></div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Confidence {Math.round(skill.confidence * 100)}%
          </span>
          <span>{skill.sources.length ? `Seen in ${skill.sources.join(', ')}` : 'No sources'}</span>
        </div>
        {skill.claimGap && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            Claimed on your resume, but there isn’t enough observable evidence yet to verify it.
          </p>
        )}
      </summary>

      <div className="px-5 pb-5 border-t border-gray-100 dark:border-zinc-800">
        <div className="text-xs font-bold text-gray-500 my-3 uppercase tracking-wider">Why {skill.score}?</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="font-medium pb-1">Component</th>
              <th className="font-medium pb-1 text-right">Value</th>
              <th className="font-medium pb-1 text-right">Weight</th>
              <th className="font-medium pb-1 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {skill.components.map((c) => (
              <tr key={c.key} className={`border-t border-gray-50 dark:border-zinc-800/60 ${c.effectiveWeight === 0 ? 'text-gray-400' : ''}`}>
                <td className="py-1.5 pr-2">
                  <div className="font-medium">{c.label}</div>
                  <div className="text-[11px] text-gray-500 truncate max-w-[14rem]" title={c.raw}>{c.raw}</div>
                </td>
                <td className="py-1.5 text-right tabular-nums">{c.normalized === null ? '—' : Math.round(c.normalized)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {c.effectiveWeight === 0 ? <span className="italic">{STATUS_NOTE[c.status] ?? '0%'}</span> : `${Math.round(c.effectiveWeight * 100)}%`}
                </td>
                <td className="py-1.5 text-right tabular-nums font-medium">{c.effectiveWeight === 0 ? '—' : c.weighted.toFixed(1)}</td>
              </tr>
            ))}
            <tr className="border-t border-gray-200 dark:border-zinc-700 font-semibold">
              <td className="pt-2" colSpan={3}>Evidence score</td>
              <td className="pt-2 text-right tabular-nums">{skill.exactScore.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-gray-400">
          Missing sources are left out of the weights (not scored as 0) and lower the confidence instead.
        </p>

        {skill.evidence.repos.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-4">
            {skill.evidence.repos.map((repo) => (
              <li key={repo}>
                <a
                  href={githubUser ? `https://github.com/${githubUser}/${repo}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-blue-300 text-xs font-medium"
                >
                  <GitFork className="w-3 h-3" /> {repo}
                </a>
              </li>
            ))}
          </ul>
        )}
        {(skill.evidence.projects.length > 0 || skill.evidence.roles.length > 0) && (
          <p className="mt-3 text-xs text-gray-500">
            {[...skill.evidence.projects.map((p) => `Project: ${p}`), ...skill.evidence.roles.map((r) => `Role: ${r}`)].join(' · ')}
          </p>
        )}
      </div>
    </details>
  );
}
