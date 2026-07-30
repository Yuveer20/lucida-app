import { randomUUID } from "node:crypto";
import { chatJSON } from "../llm/groqClient.js";
import { ChunkingResponseSchema } from "./chunking.schema.js";
import type { Chunk, LessonPlan } from "@lucida/shared";

const SYSTEM_PROMPT = `You are an instructional designer breaking a lesson plan into logical teaching segments.
Split the lesson into its natural sections (e.g. hook/intro, direct instruction, guided practice, independent practice, closure) —
NOT fixed-size blocks. A full concept explanation should stay together as one chunk rather than being cut mid-thought.
Typical lessons have 5-12 chunks; use your judgment based on the actual structure of the lesson given.

Return ONLY a JSON object of this exact shape:
{
  "chunks": [
    { "id": "c1", "label": "Intro / hook", "text": "..." },
    { "id": "c2", "label": "Direct instruction: photosynthesis", "text": "..." }
  ]
}
Each chunk's "text" must be the verbatim portion of the original lesson text belonging to that section.`;

export async function chunkLesson(lessonPlan: LessonPlan): Promise<Chunk[]> {
  const response = await chatJSON({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: lessonPlan.rawText,
    schema: ChunkingResponseSchema,
  });

  return response.chunks.map((chunk, index) => ({
    id: chunk.id || randomUUID(),
    lessonPlanId: lessonPlan.id,
    label: chunk.label,
    text: chunk.text,
    order: index,
  }));
}
