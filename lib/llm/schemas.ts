// lib/llm/schemas.ts
//
// Shapes the LLM must return. These are sent to Groq as strict JSON Schemas and
// re-validated with zod on the way back. Every field is required (nullable when
// unknown) because strict structured outputs require it; numeric bounds are
// enforced after parsing rather than in the schema.
//
// The LLM extracts *facts* here — never scores. Scores are computed from these
// facts by lib/scoring.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Resume extraction
// ---------------------------------------------------------------------------

export const EducationLevel = z.enum([
  'doctorate',
  'postgraduate',
  'undergraduate',
  'diploma',
  'class12',
  'class10',
  'other',
]);

export const AcademicScoreSchema = z.object({
  type: z.enum(['cgpa', 'percentage', 'none']),
  value: z.number().nullable(),
  /** Scale for CGPA (usually 10 or 4). 100 for percentages. */
  outOf: z.number().nullable(),
});

export const EducationSchema = z.object({
  level: EducationLevel,
  degree: z.string().nullable(),
  field: z.string().nullable(),
  institution: z.string().nullable(),
  board: z.string().nullable(),
  startYear: z.number().int().nullable(),
  endYear: z.number().int().nullable(),
  isOngoing: z.boolean(),
  score: AcademicScoreSchema,
});

export const ExperienceSchema = z.object({
  title: z.string(),
  organization: z.string().nullable(),
  employmentType: z.enum(['internship', 'full_time', 'part_time', 'freelance', 'research', 'volunteer', 'other']),
  /** YYYY-MM, or YYYY when only the year is known. */
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
  description: z.string(),
  skills: z.array(z.string()),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  /** Distinct system parts: frontend, backend, database, auth, external API, ML model, realtime, payments, cache, queue, mobile app… */
  components: z.array(z.string()),
  /** Number of distinct user-facing or technical features described. */
  featureCount: z.number().int(),
  /** Named architecture patterns: REST API, MVC, microservices, event-driven, caching layer, message queue… */
  architecturePatterns: z.array(z.string()),
  mentionsTesting: z.boolean(),
  mentionsDocumentation: z.boolean(),
  isDeployed: z.boolean(),
  hasQuantifiedOutcome: z.boolean(),
  repoUrl: z.string().nullable(),
  liveUrl: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const CandidateExtractionSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  links: z.object({
    github: z.string().nullable(),
    linkedin: z.string().nullable(),
    portfolio: z.string().nullable(),
    other: z.array(z.string()),
  }),
  education: z.array(EducationSchema),
  experience: z.array(ExperienceSchema),
  projects: z.array(ProjectSchema),
  skills: z.array(
    z.object({
      name: z.string(),
      listedInSkillsSection: z.boolean(),
      /** technical = a tool/language/framework/technical method; soft = interpersonal; domain = business/subject knowledge. */
      kind: z.enum(['technical', 'soft', 'domain']),
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      year: z.number().int().nullable(),
    })
  ),
  achievements: z.array(z.string()),
  activeBacklogs: z.number().int().nullable(),
  feedback: z.array(z.string()).describe("Actionable critiques and improvement suggestions for the resume and portfolio").optional(),
});

export type CandidateExtraction = z.infer<typeof CandidateExtractionSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;

// ---------------------------------------------------------------------------
// Job description extraction
// ---------------------------------------------------------------------------

export const JobRequirementsSchema = z.object({
  title: z.string().nullable(),
  company: z.string().nullable(),
  seniority: z.enum(['intern', 'entry', 'mid', 'senior', 'lead', 'unspecified']),
  skills: z.array(
    z.object({
      name: z.string(),
      /** 1 (bonus) … 5 (core must-have). */
      importance: z.number().int(),
      requirement: z.enum(['required', 'preferred']),
      /** Same label on skills the JD accepts interchangeably ("Java or Python"); null otherwise. */
      anyOfGroup: z.string().nullable(),
      /** Short quote from the JD that justifies the importance. */
      quote: z.string(),
    })
  ),
  eligibility: z.object({
    minCgpa: z.object({ value: z.number(), outOf: z.number() }).nullable(),
    minClass10Percent: z.number().nullable(),
    minClass12Percent: z.number().nullable(),
    minGraduationPercent: z.number().nullable(),
    minExperienceMonths: z.number().int().nullable(),
    maxExperienceMonths: z.number().int().nullable(),
    degrees: z.array(z.string()),
    fields: z.array(z.string()),
    graduationYears: z.array(z.number().int()),
    maxActiveBacklogs: z.number().int().nullable(),
  }),
  responsibilities: z.array(z.string()),
});

export type JobRequirements = z.infer<typeof JobRequirementsSchema>;

// ---------------------------------------------------------------------------
// Cross-validation + explanation (written after the scores are computed)
// ---------------------------------------------------------------------------

const Relevance = z.enum(['relevant', 'partially_relevant', 'not_relevant']);

export const FitAssessmentSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.object({ point: z.string(), evidence: z.string() })),
  concerns: z.array(z.object({ point: z.string(), evidence: z.string() })),
  claimVsEvidence: z.array(
    z.object({
      skill: z.string(),
      claim: z.string(),
      observedEvidence: z.string(),
      assessment: z.enum(['supported', 'partially_supported', 'unsupported']),
    })
  ),
  experienceRelevance: z.array(z.object({ index: z.number().int(), relevance: Relevance, reason: z.string() })),
  projectRelevance: z.array(z.object({ index: z.number().int(), relevance: Relevance, reason: z.string() })),
  recommendations: z.array(z.object({ action: z.string(), why: z.string() })),
  interviewFocus: z.array(z.string()),
});

export type FitAssessment = z.infer<typeof FitAssessmentSchema>;
