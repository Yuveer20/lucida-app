import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { AssessRequest, RecheckRequest } from '@lucida/shared';
import { assertConfigured, env } from '../config/env.js';
import { assessLesson } from '../pipeline/assess.js';
import { recheckChunk } from '../pipeline/recheck.js';
import { RefusalError } from '../llm/client.js';
import { requireAuth } from '../middleware/auth.js';

export const assessRouter = Router();

/** Lesson plans can be long; the default 100kb body limit is not enough. */
const MAX_LESSON_CHARS = 120_000;

const windowMs = env.rateLimitWindowMinutes * 60_000;

// Keyed by uid only, never IP — requireAuth runs first on both routes and
// either rejects the request or sets req.auth.uid, so this always has a
// verified identity to key on. (No IP fallback: express-rate-limit requires
// any req.ip usage in a custom keyGenerator to go through its IPv6-safe
// helper, and since auth always runs first that fallback would be dead code
// anyway — simpler to just not have it.)
const byUid = (req: { auth?: { uid: string } }) => req.auth?.uid ?? 'unauthenticated';

const assessLimiter = rateLimit({
  windowMs,
  limit: env.rateLimitMaxAssess,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUid,
  message: { error: 'Too many assessment requests. Please wait a while before trying again.' },
});

const recheckLimiter = rateLimit({
  windowMs,
  limit: env.rateLimitMaxRecheck,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUid,
  message: { error: 'Too many recheck requests. Please wait a while before trying again.' },
});

assessRouter.post('/assess', requireAuth, assessLimiter, async (req, res) => {
  const body = req.body as Partial<AssessRequest>;

  if (typeof body?.lessonText !== 'string' || !body.lessonText.trim()) {
    return res.status(400).json({ error: 'lessonText is required.' });
  }
  if (body.lessonText.length > MAX_LESSON_CHARS) {
    return res.status(413).json({
      error: `Lesson plan is too long (${body.lessonText.length} characters, limit ${MAX_LESSON_CHARS}).`,
    });
  }

  try {
    assertConfigured();
    const assessment = await assessLesson({
      lessonText: body.lessonText,
      gradeLevel: body.gradeLevel,
      subject: body.subject,
    });
    return res.json({ assessment });
  } catch (err) {
    return sendError(res, err);
  }
});

assessRouter.post('/recheck', requireAuth, recheckLimiter, async (req, res) => {
  const body = req.body as Partial<RecheckRequest>;

  if (!body?.chunkId || !body.original || typeof body.revisedText !== 'string') {
    return res.status(400).json({ error: 'chunkId, original and revisedText are required.' });
  }

  try {
    assertConfigured();
    const result = await recheckChunk({
      chunkId: body.chunkId,
      original: body.original,
      revisedText: body.revisedText,
      previousConfidence:
        body.previousConfidence ?? { low: 0, high: 0, tone: 'low', variance: 0 },
      previousCritiques: body.previousCritiques ?? [],
    });
    return res.json({ result });
  } catch (err) {
    return sendError(res, err);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendError(res: any, err: unknown) {
  if (err instanceof RefusalError) {
    return res.status(422).json({
      error: 'Claude declined to process this lesson plan.',
      detail: err.category ? `Category: ${err.category}` : undefined,
    });
  }
  // Full error (provider response bodies, internal config state, partial
  // model output on a parse failure) is logged here, server-side only — never
  // forwarded to the client. What the client gets back must stay generic
  // regardless of what actually broke.
  const message = err instanceof Error ? err.message : 'Unknown error';
  const refId = Math.random().toString(36).slice(2, 8);
  // eslint-disable-next-line no-console
  console.error(`[lucida] [ref:${refId}]`, message);
  return res.status(500).json({
    error: 'Assessment failed. Please try again.',
    ref: refId,
  });
}
