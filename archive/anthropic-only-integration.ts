/**
 * ARCHIVED REFERENCE — NOT PART OF THE BUILD, NOT IMPORTED ANYWHERE.
 *
 * This is the original, Anthropic-only LLM integration, saved as of the
 * point where a Groq stopgap was added to backend/src/llm/ so the app could
 * run before an ANTHROPIC_API_KEY was available (see docs/Technical_Design.md
 * section 1b). It lives under archive/, at the repo root — outside every
 * workspace's tsconfig `include` glob (each of shared, backend, and frontend
 * only includes its own src directory) — so this file is never compiled,
 * typechecked, or linted. It's a snapshot to diff against or restore from,
 * not live code, and it is NOT valid to compile as a single module on its
 * own: the two sections below are two SEPARATE original files, concatenated
 * here for convenience, each with its own original import statements intact.
 *
 * WHY THIS EXISTS: the live backend/src/llm/client.ts now dispatches between
 * two providers (Anthropic primary, Groq stopgap) based on env.provider.
 * That dispatch, plus Groq's retry/backoff and token-budget clamping, is
 * real complexity that only exists because of the interim Groq detour —
 * none of it is needed once you're reliably on Anthropic. This file is what
 * the integration looked like, and arguably should look like again, without
 * any of that.
 *
 * TO RESTORE (once you no longer need the Groq path at all):
 *   1. Replace backend/src/config/env.ts with the ENV CONFIG section below.
 *   2. Replace backend/src/llm/client.ts with the LLM CLIENT section below.
 *   3. Delete backend/src/llm/providers/groq.ts and backend/src/llm/types.ts.
 *   4. In backend/src/app.ts, the /api/health handler reads env.provider,
 *      env.studentModel, and env.concurrency to describe the dual-provider
 *      state — those fields still exist on the single-provider env below,
 *      just without a `provider` field, so drop that one reference or add
 *      back a literal 'anthropic' if you want /api/health unchanged.
 *   5. In backend/src/index.ts, the startup log branches on env.provider —
 *      drop that branch in favor of a plain ANTHROPIC_API_KEY check.
 *   6. Remove GROQ_API_KEY, GROQ_MODEL, LUCIDA_PROVIDER, and
 *      LUCIDA_GROQ_MAX_TOKENS from .env.example and .env.
 *
 * One thing NOT to lose in that revert: the explicit-path dotenv fix at the
 * top of the ENV CONFIG section below is an independent correctness fix, not
 * a Groq-related one. `npm run dev -w backend` runs with cwd set to
 * backend/, so the implicit `dotenv/config` lookup silently misses the root
 * .env. Keep that fix regardless of how many providers you end up with.
 */

// =============================================================================
// ENV CONFIG — originally backend/src/config/env.ts
// =============================================================================

import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// See the file-level comment above: load the root .env by an explicit,
// cwd-independent path rather than relying on dotenv/config's implicit
// process.cwd()-relative lookup.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
loadDotenv({ path: path.join(repoRoot, '.env') });

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

function effort(name: string, fallback: Effort): Effort {
  const raw = process.env[name] as Effort | undefined;
  const allowed: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
  return raw && allowed.includes(raw) ? raw : fallback;
}

export const env = {
  /**
   * Left unvalidated at import time so the server can boot (and /api/health
   * can report the misconfiguration) without a key. The Anthropic SDK also
   * resolves an `ant auth login` profile when this is unset.
   */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  /**
   * Sonnet 5 by explicit project choice. It reaches near-Opus quality on this
   * kind of structured, well-specified work at roughly half the token price,
   * which matters here because Student Agents multiply every cost by the
   * roster size. Set LUCIDA_MODEL=claude-opus-5 to trade cost for depth on
   * the critique agents.
   */
  model: process.env.LUCIDA_MODEL ?? 'claude-sonnet-5',

  /**
   * Student Agents are the cost centre: they are the only agent whose call
   * count scales with the persona roster, and they dominate total spend.
   * Pointing them at a cheaper model is the single largest lever available
   * (docs/Technical_Design.md section 4.9a). Defaults to the main model —
   * this is a quality tradeoff, so it is yours to make deliberately, not a
   * default we pick for you.
   */
  studentModel: process.env.LUCIDA_STUDENT_MODEL || (process.env.LUCIDA_MODEL ?? 'claude-sonnet-5'),

  studentEffort: effort('LUCIDA_STUDENT_EFFORT', 'medium'),
  critiqueEffort: effort('LUCIDA_CRITIQUE_EFFORT', 'high'),

  /**
   * How many personas share one call. 1 = one call per profile (highest
   * fidelity, 18 calls). Raising this cuts calls proportionally but risks the
   * model blurring profiles together — see studentAgents.ts for the
   * mitigation and section 4.9a for the tradeoff.
   */
  personasPerCall: Math.max(1, optionalInt('LUCIDA_PERSONAS_PER_CALL', 1)),

  /**
   * Repeat passes per persona. 1 is the documented section 4.9 budget; each
   * pass beyond it multiplies the dominant cost. Confidence ranges no longer
   * depend on this being >1 — each pass now reports its own low/high band —
   * so extra passes buy stability, not the range itself.
   */
  studentPasses: Math.max(1, optionalInt('LUCIDA_STUDENT_PASSES', 1)),

  concurrency: Math.max(1, optionalInt('LUCIDA_CONCURRENCY', 6)),

  port: optionalInt('PORT', 3001),
} as const;

export function assertConfigured(): void {
  if (!env.anthropicApiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add a key from https://platform.claude.com/',
    );
  }
}

/** Number of model calls a full assessment will make, for /api/health. */
export function projectedCallCount(personaCount: number): number {
  const studentCalls = Math.ceil(personaCount / env.personasPerCall) * env.studentPasses;
  return 1 /* chunking */ + studentCalls + 2 /* teacher + expert */ + 1; /* QA (upper bound) */
}

// =============================================================================
// LLM CLIENT — originally backend/src/llm/client.ts
// (this section's `env` import below refers to its own original file, the
// one immediately above — not a real module resolution within this archive)
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
// import { env } from '../config/env.js';   // ← the ENV CONFIG section above, in its real location

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

export interface StructuredCallOptions {
  system: string;
  /**
   * Content blocks for the user turn. Mark the stable prefix (the lesson
   * chunks, which are identical across all 18 personas) with `cache: true`
   * so repeated Student Agent calls read one cache entry instead of
   * re-paying for the lesson text every time.
   */
  blocks: Array<{ text: string; cache?: boolean }>;
  schema: Record<string, unknown>;
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  maxTokens?: number;
  /** Overrides LUCIDA_MODEL — used to run Student Agents on a cheaper tier. */
  model?: string;
}

/**
 * One structured-output call. `output_config.format` constrains the response
 * to the given JSON Schema, so the first text block is guaranteed-parseable
 * JSON — no regex extraction, no retry-on-parse loop.
 */
export async function callStructured<T>(opts: StructuredCallOptions): Promise<T> {
  const response = await anthropic().messages.create({
    model: opts.model ?? env.model,
    max_tokens: opts.maxTokens ?? 16000,
    // Adaptive thinking is the default on Opus 5; stated explicitly so the
    // behaviour does not change if LUCIDA_MODEL is pointed at another model.
    thinking: { type: 'adaptive' },
    output_config: {
      effort: opts.effort,
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

  // Check stop_reason before touching content: a refusal returns HTTP 200
  // with an empty or partial content array, so indexing content[0] would throw.
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
 * `warmFirst` runs item 0 alone before releasing the rest. A cache entry
 * only becomes readable once the first response starts streaming, so firing
 * every Student Agent call at once would have all of them miss the cache and
 * pay full price for the lesson text.
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
