// lib/llm/extract-jd.ts
// LLM step 2: job description -> weighted skill requirements + eligibility.
// The importance weights it assigns feed the deterministic role-fit formula.

import { createHash } from 'crypto';
import { callGroqJSON, GROQ_MODELS, isLLMEnabled } from './groq';
import { callGeminiJSON, isGeminiEnabled } from './gemini';
import { JobRequirementsSchema, type JobRequirements } from './schemas';
import { findSkillsInText, skillLabel } from '@/lib/scoring/skill-taxonomy';

const MAX_JD_CHARS = 16_000;

const SYSTEM = `You read job descriptions for a campus-placement platform and extract the requirements into the JSON schema. You do not evaluate any candidate.

skills — every technical skill, tool, framework or CS fundamental the role needs:
- name: the common canonical name ("React", "Node.js", "PostgreSQL", "REST APIs", "Docker", "AWS", "Data Structures & Algorithms", "System Design", "Machine Learning", "SQL"). Generic phrases map to a skill: "relational databases" -> "SQL", "cloud platforms like AWS" -> "AWS", "containerization" -> "Docker", "version control" -> "Git", "unit testing" -> "Automated Testing".
- importance (integer 1–5):
  5 = core must-have: in the title, listed first under requirements, or stated as mandatory/strong/expert.
  4 = clearly required.
  3 = required but secondary, or a responsibility that clearly needs it.
  2 = preferred / nice to have / plus / bonus.
  1 = mentioned in passing.
- requirement: "required" or "preferred" as the JD frames it.
- anyOfGroup: when the JD accepts any one of several skills ("Java or Python", "React/Angular/Vue", "any cloud: AWS, GCP or Azure"), list each of them with the same importance and the same anyOfGroup label (e.g. "java|python"). Otherwise null.
- quote: the shortest phrase from the JD that justifies the entry.
- Do not list soft skills (communication, teamwork) — only technical/CS skills.

eligibility — only criteria the JD states explicitly, otherwise null / []:
- minCgpa {value, outOf} for "CGPA ≥ 7", "7.0/10 and above" (outOf 10 unless stated).
- minClass10Percent / minClass12Percent / minGraduationPercent for "60% in 10th & 12th" style criteria. "60% throughout academics" sets all three.
- minExperienceMonths / maxExperienceMonths: "0–2 years" -> 0 and 24; "freshers" -> 0 and 12; "3+ years" -> 36 and null.
- degrees: e.g. ["B.Tech", "B.E.", "MCA"]. fields: branches/streams e.g. ["Computer Science", "IT", "ECE"].
- graduationYears: allowed passing-out years. maxActiveBacklogs: "no active backlogs" -> 0.

seniority: intern / entry (freshers, 0–2 yrs) / mid / senior / lead / unspecified.
responsibilities: up to 8 short bullet summaries of what the role does.`;

// Same JD text -> same requirements -> same score (§39). Keeps repeat analyses
// reproducible within a server process and saves LLM calls.
const cache = new Map<string, { requirements: JobRequirements; model: string }>();
const CACHE_LIMIT = 200;

export type JDExtractionResult = {
  requirements: JobRequirements;
  ai: { enabled: boolean; used: boolean; model: string | null; error: string | null };
};

export async function extractJobRequirements(jobDescription: string): Promise<JDExtractionResult> {
  const jd = jobDescription.trim().slice(0, MAX_JD_CHARS);
  const key = createHash('sha256').update(jd).digest('hex');

  if (!isGeminiEnabled() && !isLLMEnabled()) {
    return { requirements: keywordRequirements(jd), ai: { enabled: false, used: false, model: null, error: null } };
  }

  const cached = cache.get(key);
  if (cached) return { requirements: cached.requirements, ai: { enabled: true, used: true, model: cached.model, error: null } };

  // Same provider order as resume extraction: Gemini, then Groq, then keywords.
  const errors: string[] = [];
  const remember = (requirements: JobRequirements, model: string): JDExtractionResult => {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, { requirements, model });
    return { requirements, ai: { enabled: true, used: true, model, error: null } };
  };
  const user = `Job description:\n"""\n${jd}\n"""`;

  if (isGeminiEnabled()) {
    try {
      const { data, model } = await callGeminiJSON({ system: SYSTEM, parts: [{ text: user }], schema: JobRequirementsSchema, maxTokens: 8192 });
      return remember(sanitizeRequirements(data), model);
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  if (isLLMEnabled()) {
    try {
      const raw = await callGroqJSON({
        model: GROQ_MODELS.extraction,
        system: SYSTEM,
        user,
        schema: JobRequirementsSchema,
        schemaName: 'job_requirements',
        maxTokens: 8192,
      });
      return remember(sanitizeRequirements(raw), GROQ_MODELS.extraction);
    } catch (e) {
      errors.push(`Groq: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }

  const message = errors.join('; ') || 'JD extraction failed';
  console.error('[llm] JD extraction failed, using keyword fallback:', message);
  return { requirements: keywordRequirements(jd), ai: { enabled: true, used: false, model: null, error: message } };
}

function sanitizeRequirements(r: JobRequirements): JobRequirements {
  const pct = (v: number | null) => (v === null || v <= 0 || v > 100 ? null : v);
  const months = (v: number | null) => (v === null || v < 0 || v > 600 ? null : v);
  const seen = new Set<string>();
  return {
    ...r,
    skills: r.skills
      .map((s) => ({ ...s, importance: Math.min(5, Math.max(1, Math.round(s.importance))) }))
      .filter((s) => {
        const k = s.name.trim().toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      }),
    eligibility: {
      ...r.eligibility,
      minCgpa:
        r.eligibility.minCgpa && r.eligibility.minCgpa.value > 0 && r.eligibility.minCgpa.value <= (r.eligibility.minCgpa.outOf || 10)
          ? { value: r.eligibility.minCgpa.value, outOf: r.eligibility.minCgpa.outOf || 10 }
          : null,
      minClass10Percent: pct(r.eligibility.minClass10Percent),
      minClass12Percent: pct(r.eligibility.minClass12Percent),
      minGraduationPercent: pct(r.eligibility.minGraduationPercent),
      minExperienceMonths: months(r.eligibility.minExperienceMonths),
      maxExperienceMonths: months(r.eligibility.maxExperienceMonths),
      maxActiveBacklogs: r.eligibility.maxActiveBacklogs !== null && r.eligibility.maxActiveBacklogs >= 0 ? r.eligibility.maxActiveBacklogs : null,
    },
  };
}

/** No-LLM fallback: dictionary match, every skill treated as importance 3. */
function keywordRequirements(jd: string): JobRequirements {
  return {
    title: null,
    company: null,
    seniority: 'unspecified',
    skills: Array.from(findSkillsInText(jd)).map((id) => ({
      name: skillLabel(id),
      importance: 3,
      requirement: 'required' as const,
      anyOfGroup: null,
      quote: '',
    })),
    eligibility: {
      minCgpa: null, minClass10Percent: null, minClass12Percent: null, minGraduationPercent: null,
      minExperienceMonths: null, maxExperienceMonths: null, degrees: [], fields: [], graduationYears: [], maxActiveBacklogs: null,
    },
    responsibilities: [],
  };
}
