// lib/llm/gemini.ts
// Minimal Gemini client (generateContent) returning validated JSON. Gemini reads
// PDFs natively (layout, columns, tables), so resumes go to it as files rather
// than as extracted text.

import { z } from 'zod';
import { LLMError } from './groq';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 40_000;

/** Tried in order: a model that's overloaded (503) or rate-limited (429) falls through to the next. */
// Free-tier Flash models are often overloaded; the Lite ones usually aren't.
export const GEMINI_MODELS: string[] = (process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash,gemini-3.7-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export function isGeminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

type CallOptions<T extends z.ZodType> = {
  system: string;
  parts: GeminiPart[];
  schema: T;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  maxTokens?: number;
};

/** Call Gemini and return output validated against `schema`, plus the model that produced it. */
export async function callGeminiJSON<T extends z.ZodType>(opts: CallOptions<T>): Promise<{ data: z.infer<T>; model: string }> {
  if (!isGeminiEnabled()) throw new LLMError('GEMINI_API_KEY is not configured');

  const schema = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  delete schema.$schema;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: 'user', parts: opts.parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: opts.maxTokens ?? 16384,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      thinkingConfig: { thinkingLevel: opts.thinkingLevel ?? 'low' },
    },
  });

  let lastError: unknown = new LLMError('No Gemini models configured');
  // If every model is busy, wait briefly and go round once more.
  const queue = [...GEMINI_MODELS, ...GEMINI_MODELS];
  for (let i = 0; i < queue.length; i++) {
    const model = queue[i];
    if (i === GEMINI_MODELS.length) {
      if (!(lastError instanceof LLMError && (lastError.status === 503 || lastError.status === 429))) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    // One retry per model for a malformed or empty answer.
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${API}/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: 'no-store',
        });
      } catch (e) {
        lastError = e;
        break; // timeout / network: try the next model
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        lastError = new LLMError(`Gemini ${model} ${res.status}: ${text.slice(0, 300)}`, res.status);
        // Overloaded / rate-limited / retired: move to the next model straight away.
        if (res.status === 429 || res.status >= 500 || res.status === 404) break; // next model
        throw lastError; // 400/401/403: a request or key problem no other model fixes
      }

      const json = await res.json();
      const candidate = json?.candidates?.[0];
      const content: string = (candidate?.content?.parts ?? [])
        .filter((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string')
        .map((p: { text: string }) => p.text)
        .join('');
      if (!content) {
        lastError = new LLMError(`Gemini ${model} returned no content (${candidate?.finishReason ?? json?.promptFeedback?.blockReason ?? 'unknown'})`);
        continue;
      }
      try {
        const parsed = opts.schema.safeParse(JSON.parse(content));
        if (parsed.success) return { data: parsed.data, model };
        lastError = new LLMError(`Gemini output failed validation: ${parsed.error.message.slice(0, 300)}`);
      } catch {
        lastError = new LLMError('Gemini output was not valid JSON');
      }
    }
  }
  throw lastError instanceof Error ? lastError : new LLMError('Gemini request failed');
}
