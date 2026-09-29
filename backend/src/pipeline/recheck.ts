import type { Chunk, RecheckRequest, RecheckResult } from '@lucida/shared';
import { PERSONAS } from '../config/personas.js';
import { env } from '../config/env.js';
import { callStructured } from '../llm/client.js';
import { recheckQaSchema } from '../llm/schemas.js';
import { AGENT_ROLES } from '../config/agents.js';
import { runStudentAgents } from '../agents/studentAgents.js';
import { runExpertAgent, runTeacherAgent } from '../agents/critiqueAgents.js';
import { combineRanges } from '../aggregation/aggregate.js';
import { buildChunkRubric } from '../aggregation/rubric.js';

interface RecheckQaResponse {
  respondedToRevision: boolean;
  note: string;
  staleCritiques: string[];
}

/**
 * Revise-and-recheck (Technical Design §4.7).
 *
 * Re-runs only the revised chunk against the same agents, then runs the
 * recheck-specific QA check (§4.6): if an agent repeats a prior critique that
 * the revision already addressed, that is evidence it is not actually
 * re-reading the revision, and the result is marked rather than presented as a
 * fresh verdict.
 */
export async function recheckChunk(req: RecheckRequest): Promise<RecheckResult> {
  const revised: Chunk = {
    ...req.original,
    text: req.revisedText.trim(),
    order: 0,
  };

  if (!revised.text) throw new Error('Revised chunk text is empty.');

  const chunks = [revised];
  const { results: studentResults } = await runStudentAgents(chunks, PERSONAS);

  const [teacher, expert] = await Promise.all([
    runTeacherAgent(chunks, studentResults),
    runExpertAgent(chunks, studentResults),
  ]);

  const after = combineRanges(studentResults.map((r) => r.confidence));
  const newCritiques = [
    ...teacher.critiques.map((c) => ({ id: c.id, text: c.critique })),
    ...expert.critiques.map((c) => ({ id: c.id, text: c.critique })),
  ];

  const qa = await checkRecheck(req, revised, newCritiques);

  for (const id of qa.staleCritiques) {
    const target =
      teacher.critiques.find((c) => c.id === id) ?? expert.critiques.find((c) => c.id === id);
    if (target) target.qaFlag = 'stale-recheck';
  }

  return {
    chunkId: req.chunkId,
    before: req.previousConfidence,
    after,
    studentResults,
    teacherCritiques: teacher.critiques,
    expertCritiques: expert.critiques,
    suggestions: [...teacher.suggestions, ...expert.suggestions],
    rubric: buildChunkRubric(
      revised,
      after,
      teacher.rubric,
      expert.rubric,
      teacher.critiques,
      expert.critiques,
    ),
    qa: {
      respondedToRevision: qa.respondedToRevision,
      note: qa.note,
      staleCritiqueIds: qa.staleCritiques,
    },
  };
}

async function checkRecheck(
  req: RecheckRequest,
  revised: Chunk,
  newCritiques: Array<{ id: string; text: string }>,
): Promise<RecheckQaResponse> {
  if (newCritiques.length === 0) {
    return { respondedToRevision: true, note: 'No critiques were raised on the revision.', staleCritiques: [] };
  }

  const system = [
    AGENT_ROLES.qa.system,
    '',
    'This is a RECHECK. The teacher revised one chunk and the agents reviewed the new version.',
    'Your specific job: decide whether each new critique is actually responding to the revised text, or is stale — repeating a prior complaint that the revision already fixed, or describing something only the original said.',
    'A critique about a genuinely remaining problem is NOT stale, even if it resembles a prior one.',
  ].join('\n');

  try {
    return await callStructured<RecheckQaResponse>({
      system,
      blocks: [
        {
          text: [
            `ORIGINAL chunk text:\n${req.original.text}`,
            ``,
            `REVISED chunk text:\n${revised.text}`,
            ``,
            `Critiques raised on the ORIGINAL:\n${req.previousCritiques.map((c) => `- ${c}`).join('\n') || '(none recorded)'}`,
            ``,
            `Critiques raised on the REVISION:\n${newCritiques.map((c) => `- [${c.id}] ${c.text}`).join('\n')}`,
          ].join('\n'),
        },
      ],
      schema: recheckQaSchema,
      effort: env.critiqueEffort,
    });
  } catch {
    return {
      respondedToRevision: false,
      note: 'The recheck QA pass could not be completed, so this result is unverified.',
      staleCritiques: [],
    };
  }
}
