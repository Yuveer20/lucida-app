import { chatJSON } from "../llm/groqClient.js";
import { describeArchetype } from "../config/personas.js";
import { PersonaSimResponseSchema } from "./persona.schema.js";
import type { Archetype, Chunk, PersonaResult } from "@lucida/shared";

function buildSystemPrompt(archetype: Archetype): string {
  return `You are simulating how a specific type of student experiences a lesson, chunk by chunk.

Student profile:
${describeArchetype(archetype)}

Walk through the lesson's chunks IN ORDER, the way this student actually would — carrying comprehension or
confusion forward from one chunk to the next. If this student struggled with an earlier chunk that a later
chunk depends on, factor that into your judgment for the later chunk. Simulate a continuous learning
experience, not independent snapshots of each chunk in isolation.

For each chunk, decide: did this student understand it (true/false), how confident are they (0-1), why
(specific reason grounded in this student's profile and the chunk's actual content), and — only if they
did not fully understand — what specific part of the chunk caused the confusion (stuck_point), else null.

Return ONLY a JSON object of this exact shape:
{
  "archetype": "${archetype.id}",
  "chunk_results": [
    { "chunk_id": "c1", "understood": true, "confidence": 0.75, "reason": "Concrete example anchored the concept", "stuck_point": null },
    { "chunk_id": "c2", "understood": false, "confidence": 0.3, "reason": "Explanation was entirely text-based with no hands-on or physical analogy", "stuck_point": "The abstract description of energy conversion with no concrete action to anchor it" }
  ]
}`;
}

function buildUserPrompt(chunks: Chunk[]): string {
  return chunks
    .map((c) => `Chunk ${c.id} (${c.label}):\n${c.text}`)
    .join("\n\n---\n\n");
}

export async function simulatePersona(archetype: Archetype, chunks: Chunk[]): Promise<PersonaResult[]> {
  const response = await chatJSON({
    systemPrompt: buildSystemPrompt(archetype),
    userPrompt: buildUserPrompt(chunks),
    schema: PersonaSimResponseSchema,
  });

  return response.chunk_results.map((r) => ({
    chunkId: r.chunk_id,
    archetypeId: archetype.id,
    understood: r.understood,
    confidence: r.confidence,
    reason: r.reason,
    stuckPoint: r.stuck_point,
  }));
}
