import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { callGroqStructured } from './providers/groq.js';
import type { StructuredCallOptions } from './types.js';

export type { StructuredCallOptions } from './types.js';

let cached: Anthropic | null = null;

/**
 * The SDK resolves credentials in order: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN,
 * then an `ant auth login` profile on disk. Passing an empty apiKey would
 * shadow the profile, so we only set it when we actually have one.
 */
export function anthropic(): Anthropic {
  if (!cached) {
    cached = env.anthropicApiKey ? new Anthropic({ apiKey: env.anthropicApiKey }) : new Anthropic();
  }
  return cached;
}

export class RefusalError extends Error {
  constructor(readonly category: string | null) {
    super(`Claude declined this request${category ? ` (${category})` : ''}.`);
    this.name = 'RefusalError';
  }
}

/**
 * One structured-output call, dispatched to whichever provider `env.provider`
 * resolved to (Technical Design §1b). Anthropic's `output_config.format`
 * constrains the response to the given JSON Schema at the API level; Groq's
 * schema conformance is instruction-only — see providers/groq.ts for what
 * that trades away. Every call site is provider-agnostic.
 */
/**
 * Adaptive thinking and `output_config.effort` only exist on the current
 * model generation (Sonnet 5, Opus 5, Fable 5, Mythos 5, Opus 4.6-4.8,
 * Sonnet 4.6) — both fields error on older models. LUCIDA_STUDENT_MODEL can
 * point at an older, cheaper model (e.g. Haiku 4.5), so this has to be
 * decided per call by the model actually being used, not assumed from env.model.
 */
const ADAPTIVE_THINKING_MODELS = new Set([
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-fable-5',
  'claude-mythos-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
]);

export async function callStructured<T>(opts: StructuredCallOptions): Promise<T> {
  const model = opts.model ?? env.model;

  if (env.provider === 'groq') {
    return callGroqStructured<T>(opts, model);
  }

  const supportsAdaptiveThinking = ADAPTIVE_THINKING_MODELS.has(model);

  const response = await anthropic().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 16000,
    // Adaptive thinking is the default on Opus 5; stated explicitly so the
    // behaviour does not change if LUCIDA_MODEL is pointed at another model.
    // Older models (e.g. Haiku 4.5, used for LUCIDA_STUDENT_MODEL) reject
    // this field outright, so it's only sent when the model supports it.
    ...(supportsAdaptiveThinking ? { thinking: { type: 'adaptive' as const } } : {}),
    output_config: {
      // Same story as thinking — `effort` errors on older models.
      ...(supportsAdaptiveThinking ? { effort: opts.effort } : {}),
      format: { type: 'json_schema', schema: opts.schema },
    },
    system: [
      {
        type: 'text',
        text: opts.system,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: opts.blocks.map((b) => ({
          type: 'text' as const,
          text: b.text,
          ...(b.cache ? { cache_control: { type: 'ephemeral' as const } } : {}),
        })),
      },
    ],
  });

  // Check stop_reason before touching content: a refusal returns HTTP 200 with
  // an empty or partial content array, so indexing content[0] would throw.
  if (response.stop_reason === 'refusal') {
    throw new RefusalError(response.stop_details?.category ?? null);
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Response hit max_tokens before completing. Raise maxTokens for this call.');
  }

  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') {
    throw new Error('Model returned no text block.');
  }

  try {
    return JSON.parse(text.text) as T;
  } catch {
    throw new Error(`Model returned unparseable JSON: ${text.text.slice(0, 200)}`);
  }
}

/**
 * Bounded-concurrency map.
 *
 * `warmFirst` runs item 0 alone before releasing the rest. On Anthropic, a
 * cache entry only becomes readable once the first response starts
 * streaming, so firing every Student Agent call at once would have all of
 * them miss the cache and pay full price for the lesson text. Harmless
 * (slightly slower) on Groq, which has no prompt caching to warm.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  opts: { warmFirst?: boolean } = {},
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let start = 0;

  if (opts.warmFirst) {
    results[0] = await fn(items[0] as T, 0);
    start = 1;
  }

  let cursor = start;
  const workers = Array.from({ length: Math.min(limit, items.length - start) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T, i);
    }
  });

  await Promise.all(workers);
  return results;
}
