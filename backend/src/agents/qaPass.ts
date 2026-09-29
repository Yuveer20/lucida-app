import type {
  Chunk,
  ExpertAgentCritique,
  QaReport,
  StudentAgentResult,
  TeacherAgentCritique,
} from '@lucida/shared';
import { AGENT_ROLES } from '../config/agents.js';
import { env } from '../config/env.js';
import { callStructured } from '../llm/client.js';
import { qaSchema } from '../llm/schemas.js';
import { isNearMiss, quoteIsGrounded } from './grounding.js';

interface QaResponse {
  verdicts: Array<{ id: string; grounded: boolean; note: string }>;
}

interface Candidate {
  id: string;
  chunkId: string;
  quote: string;
  critique: string;
}

/**
 * Consolidated QA / hallucination pass (Technical Design §4.6).
 *
 * Three tiers, cheapest first:
 *   1. Quote matches the chunk verbatim → grounded, no call.
 *   2. Quote shares most words with the chunk → ambiguous, send to the model.
 *   3. Quote shares almost nothing with the chunk → ungrounded, no call.
 *
 * Only tier 2 costs a request, which is what keeps this to the single
 * consolidated call budgeted in §4.9 rather than one call per critique.
 */
export async function runQaPass(
  chunks: Chunk[],
  teacherCritiques: TeacherAgentCritique[],
  expertCritiques: ExpertAgentCritique[],
  studentResults: StudentAgentResult[],
): Promise<QaReport> {
  const chunkText = new Map(chunks.map((c) => [c.id, c.text]));
  const flags: QaReport['flags'] = [];
  const ambiguous: Candidate[] = [];

  const check = (
    id: string,
    chunkId: string | null,
    quote: string | null,
    critique: string,
    apply: (flag: 'ungrounded') => void,
  ) => {
    if (!chunkId || !quote) return;
    const text = chunkText.get(chunkId);
    if (!text) return;

    if (quoteIsGrounded(quote, text)) return;

    if (isNearMiss(quote, text)) {
      ambiguous.push({ id, chunkId, quote, critique });
      return;
    }

    apply('ungrounded');
    flags.push({
      targetId: id,
      flag: 'ungrounded',
      note: 'The quoted span does not appear in this chunk.',
    });
  };

  for (const c of teacherCritiques) {
    check(c.id, c.chunkId, c.quote, c.critique, (f) => (c.qaFlag = f));
  }
  for (const c of expertCritiques) {
    check(c.id, c.chunkId, c.quote, c.critique, (f) => (c.qaFlag = f));
  }

  if (ambiguous.length > 0) {
    const verdicts = await adjudicate(chunks, ambiguous);
    for (const v of verdicts) {
      if (v.grounded) continue;
      const target =
        teacherCritiques.find((c) => c.id === v.id) ?? expertCritiques.find((c) => c.id === v.id);
      if (target) target.qaFlag = 'ungrounded';
      flags.push({ targetId: v.id, flag: 'ungrounded', note: v.note });
    }
  }

  // Student results were already flagged during pass collapsing (§4.5) — fold
  // those into the same report so the UI has one place to look.
  for (const r of studentResults) {
    if (!r.qaFlag) continue;
    flags.push({
      targetId: r.id,
      flag: r.qaFlag,
      note:
        r.qaFlag === 'inconsistent'
          ? 'Repeated passes disagreed sharply about this chunk; treat as unsettled.'
          : 'The quoted span does not appear in this chunk.',
    });
  }

  return {
    totalCritiques: teacherCritiques.length + expertCritiques.length + studentResults.length,
    flagged: flags.length,
    flags,
  };
}

async function adjudicate(
  chunks: Chunk[],
  candidates: Candidate[],
): Promise<QaResponse['verdicts']> {
  const chunkMap = new Map(chunks.map((c) => [c.id, c]));
  const listing = candidates
    .map((c) => {
      const chunk = chunkMap.get(c.chunkId)!;
      return [
        `id: ${c.id}`,
        `chunk text: ${chunk.text}`,
        `claimed quote: ${c.quote}`,
        `critique: ${c.critique}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  try {
    const response = await callStructured<QaResponse>({
      system: AGENT_ROLES.qa.system,
      blocks: [
        {
          text: `Judge each critique below. The quote did not match the chunk exactly — decide whether it is a fair light rewording of something the chunk genuinely says (grounded) or a claim the chunk does not support (ungrounded).\n\n${listing}`,
        },
      ],
      schema: qaSchema,
      effort: env.critiqueEffort,
    });
    return response.verdicts;
  } catch {
    // A failed QA call must not fail the assessment, but it must also not
    // silently upgrade unverified critiques to trusted — so they stay flagged.
    return candidates.map((c) => ({
      id: c.id,
      grounded: false,
      note: 'QA pass could not be completed; treated as unverified.',
    }));
  }
}
