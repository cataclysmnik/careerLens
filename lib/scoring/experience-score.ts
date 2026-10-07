// §16 — Experience score from the roles the LLM extracted from the resume.
// The LLM only supplies the facts (title, dates, skills, description); every
// number below comes from fixed tables and word lists.
//
//   Experience = Relevant experience × 0.30 + Technical relevance × 0.30
//              + Responsibility / ownership × 0.20 + Production exposure × 0.20

import {
  EXPERIENCE_MONTHS_TABLE,
  EXPERIENCE_WEIGHTS,
  OWNERSHIP_SIGNALS_TABLE,
  PRODUCTION_SIGNALS_TABLE,
  ROLE_TECH_SKILLS_TABLE,
} from './config';
import { piecewise, round1, weightedScore } from './normalize';
import { canonicalizeSkill, findSkillsInText } from './skill-taxonomy';
import { experienceMonths } from '@/lib/profile/academics';
import type { CandidateProfile } from '@/lib/profile/candidate';

/** Words that show the candidate owned or led work, matched as whole words. */
const OWNERSHIP_SIGNALS: [string, RegExp][] = [
  ['led', /\b(led|lead|leading)\b/i],
  ['owned', /\b(owned|ownership|own)\b/i],
  ['designed', /\b(designed|architected|architecture)\b/i],
  ['spearheaded', /\b(spearheaded|initiated|drove|driving)\b/i],
  ['mentored', /\b(mentored|mentoring|trained|coached)\b/i],
  ['managed', /\b(managed|managing|coordinated|supervised|headed)\b/i],
];

/** Words that show the work reached real users or production systems. */
const PRODUCTION_SIGNALS: [string, RegExp][] = [
  ['production', /\b(production|prod|live)\b/i],
  ['deployed', /\b(deployed|deploying|shipped|released|launched|rolled out)\b/i],
  ['users', /\b(users|customers|clients|traffic|requests)\b/i],
  ['scale', /\b(scale|scaled|scalable|uptime|latency|performance)\b/i],
];

export type ExperienceComponent = { label: string; value: number; weight: number; detail: string };

export function experienceScore(profile: CandidateProfile, asOf: Date): { score: number; parts: ExperienceComponent[]; roles: number } | null {
  if (profile.source === 'fallback') return null; // roles can't be read without AI extraction
  const roles = profile.experience.filter((x) => x.employmentType !== 'volunteer');

  if (roles.length === 0) {
    const zero = (label: string, weight: number) => ({ label, value: 0, weight, detail: 'No internships or jobs on the resume' });
    return {
      score: 0,
      roles: 0,
      parts: [
        zero('Relevant Experience', EXPERIENCE_WEIGHTS.relevantExperience),
        zero('Technical Relevance', EXPERIENCE_WEIGHTS.technicalRelevance),
        zero('Responsibility / Ownership', EXPERIENCE_WEIGHTS.responsibility),
        zero('Production Exposure', EXPERIENCE_WEIGHTS.productionExposure),
      ],
    };
  }

  const perRole = roles.map((x) => {
    const tech = new Set<string>();
    for (const s of x.skills) {
      const c = canonicalizeSkill(s);
      if (c.known && c.id !== 'agile') tech.add(c.id);
    }
    findSkillsInText(x.description).forEach((id) => id !== 'agile' && tech.add(id));
    // Undated roles still count, as one month, so they aren't ignored entirely.
    return { months: experienceMonths(x, asOf) ?? 1, tech: tech.size, text: `${x.title} ${x.description}` };
  });

  // Relevant experience: months in roles that used at least one technical skill.
  const relevantMonths = perRole.filter((r) => r.tech > 0).reduce((a, r) => a + r.months, 0);
  const totalMonths = perRole.reduce((a, r) => a + r.months, 0);

  // Technical relevance: each role's technical depth, weighted by how long it lasted.
  const technicalRelevance = totalMonths > 0
    ? perRole.reduce((a, r) => a + piecewise(r.tech, ROLE_TECH_SKILLS_TABLE) * r.months, 0) / totalMonths
    : 0;

  const allText = perRole.map((r) => r.text).join(' \n ');
  const ownership = OWNERSHIP_SIGNALS.filter(([, re]) => re.test(allText)).map(([w]) => w);
  const production = PRODUCTION_SIGNALS.filter(([, re]) => re.test(allText)).map(([w]) => w);

  const parts: ExperienceComponent[] = [
    {
      label: 'Relevant Experience',
      value: round1(piecewise(relevantMonths, EXPERIENCE_MONTHS_TABLE)),
      weight: EXPERIENCE_WEIGHTS.relevantExperience,
      detail: `${relevantMonths} month${relevantMonths === 1 ? '' : 's'} in technical roles`,
    },
    {
      label: 'Technical Relevance',
      value: round1(technicalRelevance),
      weight: EXPERIENCE_WEIGHTS.technicalRelevance,
      detail: `Technical skills used per role: ${perRole.map((r) => r.tech).join(', ')}`,
    },
    {
      label: 'Responsibility / Ownership',
      value: round1(piecewise(ownership.length, OWNERSHIP_SIGNALS_TABLE)),
      weight: EXPERIENCE_WEIGHTS.responsibility,
      detail: ownership.length ? `Ownership signals: ${ownership.join(', ')}` : 'No ownership signals (led, owned, designed…)',
    },
    {
      label: 'Production Exposure',
      value: round1(piecewise(production.length, PRODUCTION_SIGNALS_TABLE)),
      weight: EXPERIENCE_WEIGHTS.productionExposure,
      detail: production.length ? `Production signals: ${production.join(', ')}` : 'No production signals (deployed, users, live…)',
    },
  ];
  const score = weightedScore(parts.map((p) => ({ value: p.value, weight: p.weight }))) ?? 0;
  return { score: round1(score), parts, roles: roles.length };
}
