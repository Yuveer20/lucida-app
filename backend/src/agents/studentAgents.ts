import type { Chunk, Persona, StudentAgentResult } from '@lucida/shared';
import { DIMENSION_LABELS } from '@lucida/shared';
import { AGENT_ROLES } from '../config/agents.js';
import { PERSONAS } from '../config/personas.js';
import { env } from '../config/env.js';
import { callStructured, mapLimit } from '../llm/client.js';
import { studentSchema } from '../llm/schemas.js';
import { chunksPromptBlock } from '../chunking/chunkLesson.js';
import { toneFor, quoteIsGrounded } from './grounding.js';

interface Reaction {
  personaId: string;
  chunkId: string;
  understood: boolean;
  comprehensionLow: number;
  comprehensionHigh: number;
  reason: string;
  stuckPoint: string | null;
  quote: string | null;
}

interface StudentResponse {
  reactions: Reaction[];
}

interface Pass {
  personaIds: string[];
  pass: number;
  reactions: Reaction[];
}

function personaBlock(personas: Persona[]): string {
  const profiles = personas
    .map((persona) => {
      const dims = Object.entries(persona.dimensions)
        .map(([k, v]) => `  - ${DIMENSION_LABELS[k as keyof typeof DIMENSION_LABELS]}: ${v}`)
        .join('\n');
      return [`id: ${persona.id}`, `${persona.name}`, persona.description, `Profile:`, dims].join(
        '\n',
      );
    })
    .join('\n\n---\n\n');

  if (personas.length === 1) {
    return [
      'You are simulating this student:',
      '',
      profiles,
      '',
      'Report this student\'s reaction to every chunk, in order, using the chunk ids given above.',
      'Set personaId to the id shown above on every reaction.',
    ].join('\n');
  }

  // Batched mode: the failure to guard against is the model averaging the
  // profiles into one generic student and emitting near-identical reactions.
  return [
    `You are simulating ${personas.length} DIFFERENT students independently:`,
    '',
    profiles,
    '',
    'Critical: simulate each student separately, as if you had never seen the others.',
    'These profiles differ sharply, so their reactions to the same chunk should differ too — a chunk that loses one of them may be fine for another.',
    'If you find yourself writing near-identical reasons for two students, you have blurred them together; go back and re-read their individual profiles.',
    '',
    `Report every student's reaction to every chunk. That is ${personas.length} students × each chunk.`,
    'Set personaId on every reaction to the id of the student it belongs to.',
  ].join('\n');
}

/**
 * Split the roster into batches by striding rather than slicing, so each batch
 * contains maximally dissimilar profiles. Adjacent entries in the roster tend
 * to be thematically related; putting those in the same call is exactly where
 * blurring would be hardest to notice.
 */
function batchPersonas(personas: Persona[], perCall: number): Persona[][] {
  if (perCall <= 1) return personas.map((p) => [p]);

  const batchCount = Math.ceil(personas.length / perCall);
  const batches: Persona[][] = Array.from({ length: batchCount }, () => []);
  personas.forEach((persona, i) => batches[i % batchCount]!.push(persona));
  return batches.filter((b) => b.length > 0);
}

/**
 * Runs every persona batch × every pass. Each call is batched across all chunks
 * because a real student's reading of chunk 3 depends on whether chunk 2
 * landed — and because per-chunk calls would scale call count with lesson
 * length (Technical Design §4.1).
 *
 * Call count is `ceil(personas / LUCIDA_PERSONAS_PER_CALL) × LUCIDA_STUDENT_PASSES`.
 */
export async function runStudentAgents(
  chunks: Chunk[],
  personas: Persona[] = PERSONAS,
): Promise<{ results: StudentAgentResult[]; passes: Pass[] }> {
  const chunkBlock = chunksPromptBlock(chunks);
  const batches = batchPersonas(personas, env.personasPerCall);

  const jobs: Array<{ batch: Persona[]; pass: number }> = [];
  for (const batch of batches) {
    for (let pass = 0; pass < env.studentPasses; pass++) {
      jobs.push({ batch, pass });
    }
  }

  const passes = await mapLimit(
    jobs,
    env.concurrency,
    async ({ batch, pass }): Promise<Pass> => {
      const response = await callStructured<StudentResponse>({
        system: AGENT_ROLES.student.system,
        blocks: [
          // Identical across every student call → cached prefix.
          { text: `Lesson chunks:\n\n${chunkBlock}`, cache: true },
          { text: personaBlock(batch) },
        ],
        schema: studentSchema,
        effort: env.studentEffort,
        model: env.studentModel,
        // A batched call has to emit N× the reactions, so the output ceiling
        // has to scale with it or the response truncates mid-array.
        maxTokens: Math.min(32000, 8000 + batch.length * 2500),
      });
      return { personaIds: batch.map((p) => p.id), pass, reactions: response.reactions };
    },
    // Warm the cache with one call before releasing the rest — a cache entry is
    // only readable once the first response has started.
    { warmFirst: true },
  );

  return { results: collapsePasses(chunks, personas, passes), passes };
}

/**
 * Collapse N passes into one result per persona per chunk.
 *
 * Each pass now reports its own low/high band, so a single pass already yields
 * an honest range. Extra passes widen it where they disagree and, past a
 * threshold, mark the result `inconsistent` rather than presenting a settled
 * answer (§4.5, §4.6).
 */
export function collapsePasses(
  chunks: Chunk[],
  personas: Persona[],
  passes: Pass[],
): StudentAgentResult[] {
  const results: StudentAgentResult[] = [];
  const allReactions = passes.flatMap((p) => p.reactions);

  for (const persona of personas) {
    for (const chunk of chunks) {
      const reactions = allReactions.filter(
        (r) => r.personaId === persona.id && r.chunkId === chunk.id,
      );
      if (reactions.length === 0) continue;

      const lows = reactions.map((r) => clamp(Math.min(r.comprehensionLow, r.comprehensionHigh)));
      const highs = reactions.map((r) => clamp(Math.max(r.comprehensionLow, r.comprehensionHigh)));

      // Union of the passes' own bands, so disagreement widens rather than averages.
      const low = Math.min(...lows);
      const high = Math.max(...highs);

      // Disagreement between passes about the midpoint, not the raw width —
      // two passes that both say "40-70" agree, even though the band is wide.
      const mids = reactions.map((r, i) => (lows[i]! + highs[i]!) / 2);
      const spread = mids.length > 1 ? Math.max(...mids) - Math.min(...mids) : 0;
      const centre = mids.reduce((a, b) => a + b, 0) / mids.length;

      const understoodVotes = reactions.filter((r) => r.understood).length;
      const understood = understoodVotes * 2 >= reactions.length;

      const best =
        reactions.find((r) => r.quote && quoteIsGrounded(r.quote, chunk.text)) ?? reactions[0]!;
      const ungrounded = Boolean(best.quote) && !quoteIsGrounded(best.quote!, chunk.text);

      results.push({
        id: `sr-${persona.id}-${chunk.id}`,
        chunkId: chunk.id,
        personaId: persona.id,
        understood,
        confidence: {
          // Floor the width at 10 points: anything narrower asserts more
          // precision than a simulated reaction can carry.
          low: clamp(Math.min(low, centre - 5)),
          high: clamp(Math.max(high, centre + 5)),
          tone: toneFor(centre),
          variance: Math.round(spread),
        },
        reason: best.reason,
        stuckPoint: best.stuckPoint,
        qaFlag: ungrounded ? 'ungrounded' : spread > 35 ? 'inconsistent' : null,
      });
    }
  }

  return results;
}

function clamp(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}
