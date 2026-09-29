import { env } from '../../config/env.js';
import type { StructuredCallOptions } from '../types.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq's free/on-demand tier enforces a low tokens-per-minute budget, checked
 * on admission (not just after the fact) — a burst of concurrent calls trips
 * 429s well before the assessment finishes, which is expected on this tier
 * rather than a bug: 18+ student calls simply cannot all fit inside one
 * minute's budget, no matter how they're paced. The Anthropic SDK retries
 * 429/5xx automatically; this fetch-based path has no such SDK underneath
 * it, so it's replicated here.
 *
 * Bounded by elapsed time, not attempt count — a fixed retry count (e.g. 6)
 * under-provisions this: a single pipeline call can need several consecutive
 * ~15s waits back-to-back before the account's budget frees up, observed in
 * practice on a full assessment. Groq's error message includes a "try again
 * in Xs" hint — honoured when present, since it's a better estimate than a
 * fixed backoff.
 *
 * 10 minutes, not 5: the rubric fields (§4.10) mean every one of the ~22
 * calls in an assessment now emits more completion tokens than before, which
 * pushes harder against this account's fixed per-minute budget — a 5-minute
 * budget measurably wasn't enough headroom once that landed.
 *
 * MAX_ATTEMPTS must not be reachable before the time budget in practice —
 * confirmed the hard way: an earlier value of 100 got hit at ~258s, well
 * under the (then 10-minute) time budget, because Groq's "try again in Xs"
 * hint is often sub-second, not the ~15s this was originally sized around —
 * with two concurrent workers each polling on their own short hint, 100
 * attempts burn through in well under a minute of *wall clock*, even though
 * each attempt's own wait looks small. Set high enough that hitting it would
 * mean something is actually wrong (e.g. a zero-delay retry loop), not that
 * the account is merely rate-limited — real network round-trip latency alone
 * makes 1000 attempts take minutes, so this doesn't reopen the runaway-loop
 * risk it exists to guard against.
 */
const MAX_TOTAL_WAIT_MS = 10 * 60 * 1000; // 10 minutes of cumulative backoff before giving up
const MAX_ATTEMPTS = 1000; // pathological-loop backstop; the time budget above is the real gate
const FALLBACK_BACKOFF_MS = 4000;

interface GroqResponse {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  error?: { message?: string };
}

/**
 * Groq's `response_format: {type: "json_object"}` guarantees syntactically
 * valid JSON but NOT conformance to a particular shape — unlike Anthropic's
 * `output_config.format`, there is no schema enforcement on the wire. The
 * schema is serialized into the prompt as an instruction instead, which is
 * weaker: a model can produce valid JSON that is still missing a required
 * field or uses the wrong type. This is the tradeoff of running the Groq path
 * (Technical Design §1b) — every agent's schema is simple enough that this
 * has been reliable in testing, but it is not the same guarantee.
 */
function schemaInstructionBlock(schema: Record<string, unknown>): string {
  return [
    'Respond with ONLY a single JSON object — no markdown code fences, no text before or after it.',
    'The object MUST conform exactly to this JSON Schema (every required field present, correct types):',
    JSON.stringify(schema),
  ].join('\n');
}

/** Strips a ```json ... ``` fence if the model wrapped its output in one despite the instruction not to. */
function stripFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1]!.trim() : trimmed;
}

function retryDelayMs(status: number, body: string, attempt: number): number | null {
  if (status !== 429 && status < 500) return null; // non-retryable client error

  const hint = /try again in ([\d.]+)s/i.exec(body);
  if (hint) return Math.ceil(Number.parseFloat(hint[1]!) * 1000) + 250;

  // Exponential backoff with jitter for anything else retryable (429 without
  // a parseable hint, or a transient 5xx).
  return FALLBACK_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGroqStructured<T>(opts: StructuredCallOptions, model: string): Promise<T> {
  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not set.');
  }

  const body = JSON.stringify({
    model,
    // Clamped regardless of what the caller requested — see env.groqMaxTokens.
    max_tokens: Math.min(opts.maxTokens ?? 16000, env.groqMaxTokens),
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `${opts.system}\n\n${schemaInstructionBlock(opts.schema)}` },
      { role: 'user', content: opts.blocks.map((b) => b.text).join('\n\n') },
    ],
  });

  const deadline = Date.now() + MAX_TOTAL_WAIT_MS;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.groqApiKey}`,
        },
        body,
      });
    } catch (cause) {
      // fetch() itself rejected — DNS, connection reset, TLS handshake
      // failure. There's no response to read a "try again in Xs" hint from,
      // so this falls back to plain exponential backoff. Over a multi-minute
      // assessment making many sequential calls, a transient network blip is
      // expected often enough to be worth retrying, not just HTTP 429/5xx.
      const message = cause instanceof Error ? cause.message : String(cause);
      const err = new Error(`Groq request failed (network error): ${message}`);
      const delay = FALLBACK_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 500);
      if (Date.now() + delay > deadline) throw err;
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      const responseBody = await response.text();
      const err = new Error(`Groq request failed (${response.status}): ${responseBody.slice(0, 400)}`);
      const delay = retryDelayMs(response.status, responseBody, attempt);
      // Give up if this isn't retryable, or if waiting would blow the total
      // backoff budget — better to fail with a clear error than to keep the
      // caller hanging indefinitely.
      if (delay === null || Date.now() + delay > deadline) throw err;
      await sleep(delay);
      continue;
    }

    const payload = (await response.json()) as GroqResponse;
    if (payload.error) {
      throw new Error(`Groq error: ${payload.error.message ?? 'unknown'}`);
    }

    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      throw new Error('Groq returned no content.');
    }
    if (choice?.finish_reason === 'length') {
      throw new Error('Groq response hit max_tokens before completing. Raise maxTokens for this call.');
    }

    try {
      return JSON.parse(stripFence(content)) as T;
    } catch {
      throw new Error(`Groq returned unparseable JSON: ${content.slice(0, 200)}`);
    }
  }

  throw new Error(`Groq request did not succeed after ${MAX_ATTEMPTS} attempts (pathological-loop backstop hit).`);
}
