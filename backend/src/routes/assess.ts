import { randomUUID } from "node:crypto";
import { Router } from "express";
import { chunkLesson } from "../chunking/chunkLesson.js";
import { simulateAllPersonas } from "../personas/simulateAllPersonas.js";
import { aggregate } from "../aggregation/aggregate.js";
import { LLMParseError } from "../llm/groqClient.js";
import type { AssessRequest, ApiError, LessonPlan } from "@lucida/shared";

const MAX_LESSON_LENGTH = 20000;

export const assessRouter = Router();

assessRouter.post("/", async (req, res) => {
  const body = req.body as Partial<AssessRequest>;
  const rawText = body.rawText;

  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return res.status(400).json({ error: "rawText is required" } satisfies ApiError);
  }
  if (rawText.length > MAX_LESSON_LENGTH) {
    return res
      .status(400)
      .json({ error: `rawText exceeds maximum length of ${MAX_LESSON_LENGTH} characters` } satisfies ApiError);
  }

  const lessonPlan: LessonPlan = {
    id: randomUUID(),
    rawText,
    createdAt: new Date().toISOString(),
  };

  try {
    const chunks = await chunkLesson(lessonPlan);
    const { personaResults, partialFailures } = await simulateAllPersonas(chunks);

    if (personaResults.length === 0) {
      return res.status(502).json({ error: "All persona simulations failed" } satisfies ApiError);
    }

    const assessment = aggregate(lessonPlan, chunks, personaResults, partialFailures);
    res.json(assessment);
  } catch (err) {
    if (err instanceof LLMParseError) {
      return res.status(502).json({ error: `Lesson chunking failed: ${err.message}` } satisfies ApiError);
    }
    console.error("Assessment failed:", err);
    res.status(500).json({ error: "Unexpected error while assessing lesson" } satisfies ApiError);
  }
});
