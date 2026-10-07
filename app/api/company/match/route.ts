import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractTextFromFile } from "@/lib/evidence/parsers/text-extractor";
import { parseResumeDeterministic } from "@/lib/evidence/parsers/resume-parser";
import { aggregateEvidence } from "@/lib/evidence/aggregator";
import { matchEvidenceAgainstJD, JobMatchResult } from "@/lib/scoring/jobMatch";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

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

    const results: ({ fileName: string } & (JobMatchResult | { error: string }))[] = await Promise.all(
      resumes.map(async (file) => {
        try {
          if (!ALLOWED_TYPES.includes(file.type)) {
            return { fileName: file.name, error: "Unsupported file type" };
          }
          const buffer = Buffer.from(await file.arrayBuffer());
          const text = await extractTextFromFile(buffer, file.type);
          const parsedResume = parseResumeDeterministic(text);
          const evidence = aggregateEvidence(parsedResume, null, null);
          const match = matchEvidenceAgainstJD(jobDescription, evidence.skills);
          return { fileName: file.name, ...match };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to process resume";
          return { fileName: file.name, error: message };
        }
      })
    );

    results.sort((a, b) => (('matchScore' in b ? b.matchScore : -1) - ('matchScore' in a ? a.matchScore : -1)));

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    console.error("Company match failed:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
