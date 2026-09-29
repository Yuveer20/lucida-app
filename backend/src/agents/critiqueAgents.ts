import type {
  Chunk,
  ExpertAgentCritique,
  RubricBand,
  StudentAgentResult,
  Suggestion,
  TeacherAgentCritique,
} from '@lucida/shared';
import { AGENT_ROLES } from '../config/agents.js';
import { getPrinciple, principlesPromptBlock } from '../config/principles.js';
import { env } from '../config/env.js';
import { callStructured } from '../llm/client.js';
import { expertSchema, teacherSchema } from '../llm/schemas.js';
import { chunksPromptBlock } from '../chunking/chunkLesson.js';

/** One rubric category's raw score as returned by the model, before aggregate.ts turns it into a typed RubricCategoryScore. */
export interface RawRubricScore {
  band: RubricBand;
  score: number;
  note: string;
}

interface TeacherResponse {
  critiques: Array<{
    chunkId: string | null;
    critique: string;
    stance: 'works' | 'concern';
    quote: string | null;
  }>;
  suggestions: Array<{ chunkId: string; text: string }>;
  rubric: Array<{ chunkId: string; classroomFit: RawRubricScore }>;
}

interface ExpertResponse {
  critiques: Array<{
    chunkId: string | null;
    critique: string;
    principleId: string;
    stance: 'works' | 'concern';
    quote: string | null;
  }>;
  suggestions: Array<{ chunkId: string; text: string; principleId: string }>;
  rubric: Array<{
    chunkId: string;
    cognitiveLoad: RawRubricScore;
    visuals: RawRubricScore;
    teachingApproach: RawRubricScore;
  }>;
}

export interface TeacherAgentResult {
  critiques: TeacherAgentCritique[];
  suggestions: Suggestion[];
  rubric: TeacherResponse['rubric'];
}

export interface ExpertAgentResult {
  critiques: ExpertAgentCritique[];
  suggestions: Suggestion[];
  rubric: ExpertResponse['rubric'];
}

/**
 * A short digest of where the simulated classroom struggled, so both critique
 * agents review the lesson with the student results in hand rather than in a
 * vacuum. Deliberately terse — the agents should form their own view, not just
 * restate the student data back.
 */
function studentDigest(chunks: Chunk[], results: StudentAgentResult[]): string {
  return chunks
    .map((c) => {
      const forChunk = results.filter((r) => r.chunkId === c.id);
      if (forChunk.length === 0) return `[${c.id}] no student data`;
      const lost = forChunk.filter((r) => !r.understood).length;
      const stuck = forChunk
        .map((r) => r.stuckPoint)
        .filter((s): s is string => Boolean(s))
        .slice(0, 3);
      return `[${c.id}] ${lost}/${forChunk.length} simulated students did not follow this${
        stuck.length ? `. Reported sticking points: ${stuck.join('; ')}` : ''
      }`;
    })
    .join('\n');
}

export async function runTeacherAgent(
  chunks: Chunk[],
  studentResults: StudentAgentResult[],
): Promise<TeacherAgentResult> {
  const response = await callStructured<TeacherResponse>({
    system: AGENT_ROLES.teacher.system,
    blocks: [
      { text: `Lesson chunks:\n\n${chunksPromptBlock(chunks)}`, cache: true },
      { text: `How a simulated classroom handled it:\n\n${studentDigest(chunks, studentResults)}` },
    ],
    schema: teacherSchema,
    effort: env.critiqueEffort,
  });

  const critiques: TeacherAgentCritique[] = response.critiques.map((c, i) => ({
    id: `tc-${i + 1}`,
    chunkId: c.chunkId,
    critique: c.critique,
    stance: c.stance,
    quote: c.quote,
    qaFlag: null,
  }));

  const suggestions: Suggestion[] = response.suggestions.map((s, i) => ({
    id: `ts-${i + 1}`,
    chunkId: s.chunkId,
    text: s.text,
    source: 'teacher',
    principle: null,
  }));

  return { critiques, suggestions, rubric: response.rubric };
}

export async function runExpertAgent(
  chunks: Chunk[],
  studentResults: StudentAgentResult[],
): Promise<ExpertAgentResult> {
  const response = await callStructured<ExpertResponse>({
    system: AGENT_ROLES.expert.system,
    blocks: [
      { text: `Lesson chunks:\n\n${chunksPromptBlock(chunks)}`, cache: true },
      { text: `Principle registry — cite exactly one id per point:\n\n${principlesPromptBlock()}` },
      { text: `How a simulated classroom handled it:\n\n${studentDigest(chunks, studentResults)}` },
    ],
    schema: expertSchema,
    effort: env.critiqueEffort,
  });

  // The schema's enum makes an unregistered principle id unlikely, but the
  // traceability guarantee is load-bearing enough to re-check in code.
  const critiques: ExpertAgentCritique[] = response.critiques
    .filter((c) => getPrinciple(c.principleId))
    .map((c, i) => ({
      id: `ec-${i + 1}`,
      chunkId: c.chunkId,
      critique: c.critique,
      principleId: c.principleId,
      principle: getPrinciple(c.principleId)!.name,
      stance: c.stance,
      quote: c.quote,
      qaFlag: null,
    }));

  const suggestions: Suggestion[] = response.suggestions
    .filter((s) => getPrinciple(s.principleId))
    .map((s, i) => ({
      id: `es-${i + 1}`,
      chunkId: s.chunkId,
      text: s.text,
      source: 'expert' as const,
      principle: getPrinciple(s.principleId)!.name,
    }));

  return { critiques, suggestions, rubric: response.rubric };
}
