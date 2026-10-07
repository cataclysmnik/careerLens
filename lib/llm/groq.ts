// lib/llm/groq.ts
// Minimal Groq client (OpenAI-compatible chat completions) returning validated JSON.

import { z } from 'zod';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 60_000;

export const GROQ_MODELS = {
  /** Structured parsing: resume and JD extraction. The 20b model missed and
   *  mis-filed too many fields (academics, project details), so use the 120b. */
  extraction: process.env.GROQ_EXTRACTION_MODEL || 'openai/gpt-oss-120b',
  /** The cross-validation / fit explanation. */
  reasoning: process.env.GROQ_REASONING_MODEL || 'openai/gpt-oss-120b',
};

export function isLLMEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export class LLMError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'LLMError';
  }
}

type CallOptions<T extends z.ZodType> = {
  model: string;
  system: string;
  user: string;
  schema: T;
  /** Schema name sent to Groq (letters, digits, underscores). */
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
  /** gpt-oss hidden reasoning budget. */
  reasoningEffort?: 'low' | 'medium' | 'high';
};

function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function post(body: Record<string, unknown>): Promise<Response> {
  return fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Groq and return output validated against `schema`.
 *
 * Uses strict structured outputs (`json_schema`). If the model/account rejects
 * that, falls back to JSON mode with the schema in the prompt. Retries once on
 * rate limiting, transient errors, or output that fails validation.
 */
export async function callGroqJSON<T extends z.ZodType>(opts: CallOptions<T>): Promise<z.infer<T>> {
  if (!isLLMEnabled()) throw new LLMError('GROQ_API_KEY is not configured');

  const jsonSchema = jsonSchemaFor(opts.schema);
  let useStrictSchema = true;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const messages = [
      {
        role: 'system',
        content: useStrictSchema
          ? opts.system
          : `${opts.system}\n\nRespond with a single JSON object that matches this JSON Schema exactly:\n${JSON.stringify(jsonSchema)}`,
      },
      { role: 'user', content: opts.user },
    ];

    const body: Record<string, unknown> = {
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0,
      max_completion_tokens: opts.maxTokens ?? 8192,
      response_format: useStrictSchema
        ? { type: 'json_schema', json_schema: { name: opts.schemaName, schema: jsonSchema, strict: true } }
        : { type: 'json_object' },
    };
    // gpt-oss models spend tokens on hidden reasoning before answering.
    if (opts.model.startsWith('openai/gpt-oss')) body.reasoning_effort = opts.reasoningEffort ?? 'low';

    let res: Response;
    try {
      res = await post(body);
    } catch (e) {
      lastError = e;
      await sleep(800 * (attempt + 1));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      lastError = new LLMError(`Groq ${res.status}: ${text.slice(0, 300)}`, res.status);
      if (res.status === 400 && useStrictSchema && /schema|response_format|json_schema/i.test(text)) {
        useStrictSchema = false; // model doesn't accept strict schemas — retry in JSON mode
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1500 * (attempt + 1));
        continue;
      }
      throw lastError;
    }

    const json = await res.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) {
      lastError = new LLMError('Groq returned an empty response');
      continue;
    }

    try {
      const parsed = opts.schema.safeParse(JSON.parse(content));
      if (parsed.success) return parsed.data;
      lastError = new LLMError(`LLM output failed validation: ${parsed.error.message.slice(0, 300)}`);
    } catch {
      lastError = new LLMError('LLM output was not valid JSON');
    }
  }

  throw lastError instanceof Error ? lastError : new LLMError('Groq request failed');
}
