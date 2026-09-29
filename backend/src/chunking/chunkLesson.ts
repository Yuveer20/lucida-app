import type { Chunk } from '@lucida/shared';
import { env } from '../config/env.js';
import { callStructured } from '../llm/client.js';
import { chunkingSchema } from '../llm/schemas.js';

interface ChunkingResult {
  chunks: Array<{ label: string; text: string }>;
}

const SYSTEM = [
  'You split a lesson plan into its logical sections.',
  '',
  'Rules:',
  '- Split on meaning, not on length. A section is one instructional move: a hook, a definition, a worked example, an activity, a check for understanding, a wrap-up.',
  '- Copy the section text VERBATIM from the input. Do not paraphrase, summarise, reorder, or fix typos. Downstream agents quote these spans back and a grounding check verifies the quotes against the original — paraphrasing here breaks that check.',
  '- Cover the whole lesson. Every substantive line belongs to exactly one section.',
  '- Aim for 3-12 sections. A lesson that yields 30 sections has been split too finely.',
  '- Label each section in 2-4 words, in the teacher\'s own vocabulary where possible.',
].join('\n');

export async function chunkLesson(
  lessonText: string,
  context: { gradeLevel?: string; subject?: string } = {},
): Promise<Chunk[]> {
  const contextLine = [
    context.subject ? `Subject: ${context.subject}` : null,
    context.gradeLevel ? `Grade level: ${context.gradeLevel}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await callStructured<ChunkingResult>({
    system: SYSTEM,
    blocks: [
      { text: `${contextLine ? `${contextLine}\n\n` : ''}Lesson plan:\n\n${lessonText}` },
    ],
    schema: chunkingSchema,
    effort: env.critiqueEffort,
  });

  return result.chunks.map((c, i) => ({
    id: `c${i + 1}`,
    label: c.label.trim(),
    text: c.text.trim(),
    order: i,
  }));
}

/** Compact chunk listing shared by every agent prompt (and cached across calls). */
export function chunksPromptBlock(chunks: Chunk[]): string {
  return chunks
    .map((c) => `[${c.id}] ${c.label}\n${c.text}`)
    .join('\n\n---\n\n');
}
