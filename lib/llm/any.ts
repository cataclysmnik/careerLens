// lib/llm/any.ts
// Structured-JSON call on whichever provider is available: Gemini first, then Groq.

import type { z } from 'zod';
import { callGeminiJSON, isGeminiEnabled } from './gemini';
import { callGroqJSON, GROQ_MODELS, isLLMEnabled, LLMError } from './groq';

export function isAnyLLMEnabled(): boolean {
  return isGeminiEnabled() || isLLMEnabled();
}

export async function callAnyJSON<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  maxTokens?: number;
}): Promise<{ data: z.infer<T>; model: string }> {
  const errors: string[] = [];
  if (isGeminiEnabled()) {
    try {
      return await callGeminiJSON({ system: opts.system, parts: [{ text: opts.user }], schema: opts.schema, maxTokens: opts.maxTokens });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Gemini failed');
    }
  }
  if (isLLMEnabled()) {
    try {
      const data = await callGroqJSON({ model: GROQ_MODELS.extraction, ...opts });
      return { data, model: GROQ_MODELS.extraction };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Groq failed');
    }
  }
  throw new LLMError(errors.length ? errors.join(' | ') : 'No LLM configured');
}
