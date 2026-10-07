// lib/llm/extract-resume.ts
// LLM step 1: unstructured resume text -> structured facts. No scoring.

import { callGroqJSON, GROQ_MODELS, isLLMEnabled } from './groq';
import { callGeminiJSON, isGeminiEnabled } from './gemini';
import { CandidateExtractionSchema } from './schemas';
import { buildFallbackProfile, sanitizeExtraction, type CandidateProfile } from '@/lib/profile/candidate';
import type { ParsedResume } from '@/lib/evidence/parsers/resume-parser';

const MAX_RESUME_CHARS = 24_000;

const SYSTEM = `You are a precise resume parser for a campus-placement platform. Extract facts from the resume (a PDF file or its extracted text) into the JSON schema. You extract — you never judge, rank or score the candidate.

Rules:
- Use only what the resume states. Never invent or infer values that are not written. Unknown -> null (or [] / false).
- Text extracted from PDFs can be jumbled (columns merged, words split). Reconstruct sensibly, but do not guess numbers.

Education:
- One entry per qualification. level: "class10" for 10th / SSC / SSLC / Class X / matriculation / ICSE / CBSE-X; "class12" for 12th / HSC / Class XII / intermediate / PUC / ISC / senior secondary; "undergraduate" for B.Tech/B.E./B.Sc/BCA/B.Com/BA etc.; "postgraduate" for M.Tech/M.Sc/MCA/MBA etc.; "diploma" for polytechnic diplomas.
- score.type "cgpa" for CGPA / GPA / CPI / SGPA, with outOf = the scale shown (10 if written "/10" or if unstated and value <= 10 on an Indian resume; 4 if "/4"). score.type "percentage" for marks in %. If both are given, prefer what is labelled as the final/aggregate figure.
- board: the school board for class 10/12 (CBSE, ICSE, State Board…). isOngoing true when the course is "pursuing" / expected / has a future end year.

Experience (jobs, internships, research, freelance — NOT projects or positions of responsibility in clubs unless they are clearly work):
- Dates as "YYYY-MM" (or "YYYY" if only the year is given). "Present"/"Current"/"Now" -> endDate null and isCurrent true.
- skills: technologies explicitly used in that role.

Projects (personal, academic, hackathon):
- skills: technologies the project explicitly used.
- components: distinct system parts that are actually described, e.g. "frontend", "backend", "database", "authentication", "external API", "ML model", "realtime", "payments", "cache", "queue", "mobile app", "admin dashboard".
- featureCount: number of distinct features or capabilities described (count them; 0 if none are described).
- architecturePatterns: only patterns named or clearly described: "REST API", "GraphQL API", "MVC", "microservices", "event-driven", "caching layer", "message queue", "serverless", "client-server".
- mentionsTesting: tests/unit tests/test coverage are mentioned. mentionsDocumentation: README/docs/API documentation mentioned.
- isDeployed: deployed/hosted/live/published, or a live URL is given. hasQuantifiedOutcome: a measurable result is stated (users, % improvement, latency, accuracy, revenue…).
- repoUrl / liveUrl only if a URL is written.

Skills:
- Every skill named anywhere. listedInSkillsSection true only for skills in a dedicated skills/technologies section.
- kind: "technical" for languages, frameworks, libraries, databases, tools, platforms and technical methods (e.g. Python, React, SQL, Docker, Machine Learning, Data Analysis, REST APIs); "soft" for interpersonal skills (leadership, communication, teamwork, coordination); "domain" for business or subject knowledge (market research, finance, marketing, research).
- Project and experience "skills" lists hold only technical skills.
- Use the common canonical name: "React" (not ReactJS), "Node.js", "PostgreSQL", "JavaScript", "TypeScript", "Next.js", "REST APIs", "Machine Learning", "Docker", "AWS", "C++", "Git".

activeBacklogs: number of current backlogs/arrears if stated, else null.`;

export type ResumeExtractionResult = {
  profile: CandidateProfile;
  ai: { enabled: boolean; used: boolean; model: string | null; error: string | null };
};

/** The original upload, so Gemini can read the PDF's layout instead of extracted text. */
export type ResumeFile = { data: Buffer; mimeType: string; /** Hyperlinks found in the file, which aren't part of its visible text. */ links?: string[] };

/** Clickable links (icons, hyperlinked words) aren't in the text, so list them for the model. */
function linkNote(links: string[] | undefined): string {
  return links?.length
    ? `\n\nHyperlinks embedded in the resume (use these for links.github / linkedin / portfolio / other):\n${links.join('\n')}`
    : '';
}

/**
 * Gemini first (reads the PDF itself, so columns and tables stay intact), then
 * Groq on the extracted text, then the keyword fallback.
 */
export async function extractCandidateProfile(fullText: string, parsed: ParsedResume, file?: ResumeFile): Promise<ResumeExtractionResult> {
  if (!isGeminiEnabled() && !isLLMEnabled()) {
    return {
      profile: buildFallbackProfile(parsed, fullText, 'AI extraction is off (no GEMINI_API_KEY or GROQ_API_KEY) — projects, experience and some academics could not be read.'),
      ai: { enabled: false, used: false, model: null, error: null },
    };
  }

  const truncated = fullText.length > MAX_RESUME_CHARS;
  const text = truncated ? fullText.slice(0, MAX_RESUME_CHARS) : fullText;
  const errors: string[] = [];

  if (isGeminiEnabled()) {
    try {
      const isPdf = file?.mimeType === 'application/pdf';
      const { data, model } = await callGeminiJSON({
        system: SYSTEM,
        parts: isPdf
          ? [{ inline_data: { mime_type: 'application/pdf', data: file!.data.toString('base64') } }, { text: `Extract this resume into the schema.${linkNote(file!.links)}` }]
          : [{ text: `Resume text:\n"""\n${text}\n"""${linkNote(file?.links)}` }],
        schema: CandidateExtractionSchema,
        thinkingLevel: 'low',
      });
      const warnings = !isPdf && truncated ? ['Resume was very long; only the first part was analysed.'] : [];
      return { profile: sanitizeExtraction(data, parsed, 'llm', warnings), ai: { enabled: true, used: true, model, error: null } };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gemini extraction failed';
      console.error('[llm] Gemini resume extraction failed, trying Groq:', message);
      errors.push(message);
    }
  }

  if (isLLMEnabled()) {
    try {
      const raw = await callGroqJSON({
        model: GROQ_MODELS.extraction,
        system: SYSTEM,
        user: `Resume text:\n"""\n${text}\n"""${linkNote(file?.links)}`,
        schema: CandidateExtractionSchema,
        schemaName: 'candidate_profile',
        // Medium reasoning noticeably improves jumbled PDF text (merged columns,
        // marks next to the wrong qualification); leave room for it.
        reasoningEffort: 'medium',
        maxTokens: 16384,
      });
      const warnings = truncated ? ['Resume was very long; only the first part was analysed.'] : [];
      return {
        profile: sanitizeExtraction(raw, parsed, 'llm', warnings),
        ai: { enabled: true, used: true, model: GROQ_MODELS.extraction, error: errors.length ? errors.join(' | ') : null },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Groq extraction failed';
      console.error('[llm] Groq resume extraction failed, using keyword fallback:', message);
      errors.push(message);
    }
  }

  return {
    profile: buildFallbackProfile(parsed, fullText, 'AI extraction failed — showing keyword-based results. Re-run analysis to retry.'),
    ai: { enabled: true, used: false, model: null, error: errors.join(' | ') },
  };
}
