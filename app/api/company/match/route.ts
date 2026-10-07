import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/evidence/parsers/text-extractor";
import { parseResumeDeterministic } from "@/lib/evidence/parsers/resume-parser";
import { extractCandidateProfile } from "@/lib/llm/extract-resume";
import { extractJobRequirements } from "@/lib/llm/extract-jd";
import { analyzeJobFit, type CompanyMatchRow } from "@/lib/scoring/jobMatch";

export const maxDuration = 300;

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_RESUMES = 25;
/** Parallel LLM pipelines — keeps us inside Groq's per-minute limits. */
const CONCURRENCY = 3;

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const jobDescription = formData.get("jobDescription");
    const resumes = formData.getAll("resumes").filter((f): f is File => f instanceof File);

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ error: "Missing jobDescription" }, { status: 400 });
    }
    if (resumes.length === 0) {
      return NextResponse.json({ error: "Attach at least one resume" }, { status: 400 });
    }
    if (resumes.length > MAX_RESUMES) {
      return NextResponse.json({ error: `Attach at most ${MAX_RESUMES} resumes at a time` }, { status: 400 });
    }

    // Parse the JD once up front; every candidate is then scored against the same requirements.
    await extractJobRequirements(jobDescription);

    const results = await mapLimited<File, CompanyMatchRow>(resumes, CONCURRENCY, async (file) => {
      try {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return { fileName: file.name, error: "Unsupported file type" };
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromFile(buffer, file.type);
        const parsed = parseResumeDeterministic(text);
        const { profile } = await extractCandidateProfile(text, parsed);
        // Resume-only evidence: no GitHub or portfolio is fetched for uploaded resumes.
        const result = await analyzeJobFit({ profile, github: null, portfolio: null, asOf: new Date().toISOString() }, jobDescription);
        return { fileName: file.name, candidateName: profile.name, result };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to process resume";
        return { fileName: file.name, error: message };
      }
    });

    const rank = (r: CompanyMatchRow) =>
      "result" in r ? (r.result.verdict === "not_eligible" ? -1 : r.result.exactRoleFit) : -2;
    results.sort((a, b) => rank(b) - rank(a));

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    console.error("Company match failed:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
