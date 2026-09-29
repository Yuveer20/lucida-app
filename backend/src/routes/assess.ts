import { Router } from 'express';
import type { AssessRequest, RecheckRequest } from '@lucida/shared';
import { assertConfigured } from '../config/env.js';
import { assessLesson } from '../pipeline/assess.js';
import { recheckChunk } from '../pipeline/recheck.js';
import { RefusalError } from '../llm/client.js';

export const assessRouter = Router();

/** Lesson plans can be long; the default 100kb body limit is not enough. */
const MAX_LESSON_CHARS = 120_000;

assessRouter.post('/assess', async (req, res) => {
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

assessRouter.post('/recheck', async (req, res) => {
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
  const message = err instanceof Error ? err.message : 'Unknown error';
  // eslint-disable-next-line no-console
  console.error('[lucida]', message);
  return res.status(500).json({ error: 'Assessment failed.', detail: message });
}
