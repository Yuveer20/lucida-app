import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * `dotenv/config`'s implicit lookup resolves `.env` against `process.cwd()`.
 * That's the repo root when you run things from there directly, but npm
 * workspaces run `npm run dev -w backend` with cwd set to `backend/` — so the
 * implicit form silently finds nothing and every env var falls back to its
 * default with no error. Load the root `.env` explicitly, relative to this
 * file's own location, so it works the same regardless of the caller's cwd.
 * (Same relative depth from both `backend/src/config/` and the compiled
 * `backend/dist/config/`, so this needs no change between dev and build.)
 */
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

export type Provider = 'anthropic' | 'groq';

/**
 * Provider resolution (Technical Design §1b): explicit LUCIDA_PROVIDER wins;
 * otherwise ANTHROPIC_API_KEY takes priority over GROQ_API_KEY when both are
 * set, so adding an Anthropic key later switches the app over with no config
 * change — that's the whole mechanism for the planned Groq → Anthropic move.
 */
function resolveProvider(): Provider {
  const explicit = process.env.LUCIDA_PROVIDER;
  if (explicit === 'anthropic' || explicit === 'groq') return explicit;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'anthropic';
}

const provider = resolveProvider();

/** Provider-specific default model, used unless LUCIDA_MODEL overrides it. */
const providerDefaultModel: Record<Provider, string> = {
  // Chosen over Opus for near-Opus quality on this kind of structured,
  // well-specified work at roughly half the token price — see Technical
  // Design §4.9a. Student Agents multiply every cost by the roster size, so
  // that difference compounds.
  anthropic: 'claude-sonnet-5',
  // Stopgap provider (§1b). NOT the model from the original scaffold
  // (llama-3.3-70b-versatile) — that has since been decommissioned on Groq
  // and returns 404 model_not_found. Verified live against /v1/models before
  // picking this one; re-check if it starts erroring the same way.
  groq: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
};

export const env = {
  provider,

  /**
   * Left unvalidated at import time so the server can boot (and `/api/health`
   * can report the misconfiguration) without a key. The Anthropic SDK also
   * resolves an `ant auth login` profile when this is unset.
   */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',

  model: process.env.LUCIDA_MODEL || providerDefaultModel[provider],

  /**
   * Student Agents are the cost centre: they are the only agent whose call
   * count scales with the persona roster, and they dominate total spend.
   *
   * Pointing them at a cheaper model is the single largest lever available
   * (see docs/Technical_Design.md §4.9a). Defaults to the main model — this is
   * a quality tradeoff, so it is yours to make deliberately, not a default we
   * pick for you.
   */
  studentModel: process.env.LUCIDA_STUDENT_MODEL || process.env.LUCIDA_MODEL || providerDefaultModel[provider],

  // Effort and adaptive thinking are Anthropic-specific (Technical Design
  // §1b) — the Groq path ignores both.
  studentEffort: effort('LUCIDA_STUDENT_EFFORT', 'medium'),
  critiqueEffort: effort('LUCIDA_CRITIQUE_EFFORT', 'high'),

  /**
   * How many personas share one call. 1 = one call per profile (highest
   * fidelity, 18 calls). Raising this cuts calls proportionally but risks the
   * model blurring profiles together — see studentAgents.ts for the mitigation
   * and §4.9a for the tradeoff.
   */
  personasPerCall: Math.max(1, optionalInt('LUCIDA_PERSONAS_PER_CALL', 1)),

  /**
   * Repeat passes per persona. 1 is the documented §4.9 budget; each pass
   * beyond it multiplies the dominant cost. Confidence ranges no longer depend
   * on this being >1 — each pass now reports its own low/high band — so extra
   * passes buy stability, not the range itself.
   */
  studentPasses: Math.max(1, optionalInt('LUCIDA_STUDENT_PASSES', 1)),

  /**
   * Anthropic tiers comfortably sustain 6 concurrent calls; Groq's free/
   * on-demand tier has a tokens-per-minute budget low enough (8000 TPM
   * observed) that 6 concurrent calls trip 429s almost immediately — a burst
   * of calls is admitted-or-rejected against that budget, not queued. Lower
   * concurrency for Groq means fewer 429s in the first place; the retry/
   * backoff in providers/groq.ts absorbs whatever concurrency still causes.
   */
  concurrency: Math.max(1, optionalInt('LUCIDA_CONCURRENCY', provider === 'groq' ? 2 : 6)),

  /**
   * Hard cap on max_tokens sent to Groq, regardless of what a caller asks
   * for. Free/on-demand Groq tiers enforce a tokens-per-minute limit checked
   * against the *requested* max_tokens, not actual usage — a single call
   * requesting more than the account's TPM ceiling is rejected outright
   * (413/429) before it runs. 4000 fits comfortably under the 8000 TPM
   * observed on the free tier with room for prompt tokens; raise this if
   * your account is on a paid tier with more headroom.
   */
  groqMaxTokens: Math.max(512, optionalInt('LUCIDA_GROQ_MAX_TOKENS', 4000)),

  port: optionalInt('PORT', 3001),

  /**
   * Restricts CORS to this origin (the deployed frontend's URL) once set.
   * Unset by default so local dev and same-origin deploys (e.g. Vercel
   * "Services" grouping) keep working without configuration — but once
   * frontend and backend are on separate domains (e.g. Vercel + Render),
   * this should be set to the frontend's real origin rather than left open.
   */
  corsOrigin: process.env.CORS_ORIGIN || undefined,

  /**
   * IP-based cap on /api/assess and /api/recheck — the only endpoints that
   * trigger real, billed LLM calls. A single assessment is already ~20+
   * calls, so this bounds worst-case spend from one source, not just request
   * volume. Deliberately tight defaults; raise them once real usage patterns
   * are known rather than guessing generous ones up front.
   */
  rateLimitWindowMinutes: Math.max(1, optionalInt('LUCIDA_RATE_LIMIT_WINDOW_MIN', 15)),
  rateLimitMaxAssess: Math.max(1, optionalInt('LUCIDA_RATE_LIMIT_MAX_ASSESS', 5)),
  rateLimitMaxRecheck: Math.max(1, optionalInt('LUCIDA_RATE_LIMIT_MAX_RECHECK', 15)),
} as const;

export function assertConfigured(): void {
  if (env.provider === 'groq' && !env.groqApiKey) {
    throw new Error('GROQ_API_KEY is not set. Add one to .env from https://console.groq.com/keys');
  }
  if (env.provider === 'anthropic' && !env.anthropicApiKey) {
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
