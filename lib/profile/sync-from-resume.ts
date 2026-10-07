// lib/profile/sync-from-resume.ts
// Copies what the resume extraction found into the student's editable Profile
// ("My Profile"). Fields the resume states overwrite the stored value; fields
// it doesn't state are left alone, so a missing value never wipes a manual edit.

import { prisma } from '@/lib/db/prisma';
import { CODING_PLATFORMS, HANDLE_FIELD, extractCodingHandles } from '@/lib/coding/handles';
import { canonicalizeSkill, skillLabel } from '@/lib/scoring/skill-taxonomy';
import { summarizeAcademics, summarizeExperience } from './academics';
import type { CandidateProfile } from './candidate';

const MAX_SKILLS = 50;
const round2 = (n: number) => Math.round(n * 100) / 100;

function httpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function githubUsername(link: string | null): string | null {
  const name = link?.match(/github\.com\/([A-Za-z0-9-]+)/i)?.[1];
  return name && name.length <= 39 ? name : null;
}

function experienceLevel(profile: CandidateProfile): string | null {
  const exp = summarizeExperience(profile, new Date(profile.extractedAt));
  const studying = profile.education.some((e) => e.isOngoing);
  const years = exp.professionalMonths / 12;
  if (years >= 5) return 'Senior (5+ yrs)';
  if (years >= 2) return 'Mid level (2–5 yrs)';
  if (exp.professionalMonths > 0 && !studying) return 'Entry level (0–2 yrs)';
  if (exp.internshipMonths > 0) return 'Intern';
  if (studying || profile.experience.length === 0) return 'Student / Fresher';
  return null;
}

export type ProfileSyncResult = { updated: string[] };

export async function syncProfileFromResume(userId: string, profile: CandidateProfile): Promise<ProfileSyncResult> {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const academics = summarizeAcademics(profile);
  const update: Record<string, unknown> = {};

  // The highest degree's CGPA, on the 10-point scale the profile stores.
  const degree = academics.postgraduation ?? academics.graduation;
  if (degree && degree.cgpa10 > 0) update.cgpa = round2(Math.min(10, degree.cgpa10));
  if (academics.class10) update.tenthPercentage = round2(academics.class10.percent);
  if (academics.class12) update.twelfthPercentage = round2(academics.class12.percent);

  if (profile.location) update.location = profile.location.slice(0, 100);
  // A GitHub username the student entered (or analyzed) stays; the resume only fills a blank.
  const gh = githubUsername(profile.links.github);
  if (gh && !existing?.githubUsername) update.githubUsername = gh;
  const portfolio = httpUrl(profile.links.portfolio);
  if (portfolio) update.portfolioUrl = portfolio;
  const linkedin = httpUrl(profile.links.linkedin);
  if (linkedin) update.linkedinUrl = linkedin;

  const handles = extractCodingHandles([
    profile.links.github, profile.links.portfolio, profile.links.linkedin, ...profile.links.other,
  ].filter((l): l is string => !!l));
  for (const p of CODING_PLATFORMS) if (handles[p]) update[HANDLE_FIELD[p]] = handles[p];

  // Skills: resume skills first, then any the student added by hand.
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const name of [...profile.skills.map((s) => skillLabel(canonicalizeSkill(s.name).id)), ...(existing?.skills ?? [])]) {
    const key = canonicalizeSkill(name).id;
    if (seen.has(key) || !name.trim() || name.length > 60) continue;
    seen.add(key);
    skills.push(name.trim());
  }
  if (skills.length) update.skills = skills.slice(0, MAX_SKILLS);

  // Experience level is a judgement call, so only fill it when it's empty.
  if (!existing?.experienceLevel) {
    const level = experienceLevel(profile);
    if (level) update.experienceLevel = level;
  }

  const updated = Object.keys(update).filter((k) => JSON.stringify(update[k]) !== JSON.stringify((existing as Record<string, unknown> | null)?.[k]));

  const nameUpdate = !user?.name?.trim() && profile.name ? { name: profile.name.slice(0, 100) } : {};
  if (nameUpdate.name) updated.push('name');

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...nameUpdate,
      profile: { upsert: { create: update, update } },
    },
  });
  return { updated };
}
