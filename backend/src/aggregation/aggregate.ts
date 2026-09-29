import type {
  Assessment,
  Chunk,
  ChunkBreakdown,
  ConfidenceRange,
  DimensionBreakdown,
  DimensionId,
  Disagreement,
  ExpertAgentCritique,
  HeadlineRecommendation,
  Persona,
  QaReport,
  StudentAgentResult,
  Suggestion,
  TeacherAgentCritique,
} from '@lucida/shared';
import { DIMENSION_IDS, DIMENSION_LABELS } from '@lucida/shared';
import { DIMENSION_WEIGHTS } from '../config/agents.js';
import { toneFor } from '../agents/grounding.js';
import type { ExpertAgentResult, TeacherAgentResult } from '../agents/critiqueAgents.js';
import { buildChunkRubric, buildLessonRubric } from './rubric.js';

function mid(range: ConfidenceRange): number {
  return (range.low + range.high) / 2;
}

function clamp(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * Combine several ranges into one. The result's width is the mean width of its
 * inputs plus the spread *between* them — combining a confident 80-85 and a
 * confident 30-35 must not produce a confident 55-60, because the class is
 * genuinely split (§4.5).
 */
export function combineRanges(ranges: ConfidenceRange[]): ConfidenceRange {
  if (ranges.length === 0) {
    return { low: 0, high: 0, tone: 'low', variance: 0 };
  }

  const mids = ranges.map(mid);
  const mean = mids.reduce((a, b) => a + b, 0) / mids.length;
  const meanWidth = ranges.reduce((a, r) => a + (r.high - r.low), 0) / ranges.length;
  const between = Math.max(...mids) - Math.min(...mids);
  const pad = Math.max(5, meanWidth / 2 + between / 4);

  return {
    low: clamp(mean - pad),
    high: clamp(mean + pad),
    tone: toneFor(mean),
    variance: Math.round(between),
  };
}

export function buildChunkBreakdowns(
  chunks: Chunk[],
  studentResults: StudentAgentResult[],
  teacherCritiques: TeacherAgentCritique[],
  expertCritiques: ExpertAgentCritique[],
  disagreements: Disagreement[],
  suggestions: Suggestion[],
  teacherRubric: TeacherAgentResult['rubric'],
  expertRubric: ExpertAgentResult['rubric'],
): ChunkBreakdown[] {
  return chunks.map((chunk) => {
    const results = studentResults.filter((r) => r.chunkId === chunk.id);
    const confidence = combineRanges(results.map((r) => r.confidence));
    const chunkTeacherCritiques = teacherCritiques.filter((c) => c.chunkId === chunk.id);
    const chunkExpertCritiques = expertCritiques.filter((c) => c.chunkId === chunk.id);
    return {
      chunk,
      confidence,
      studentResults: results,
      teacherCritiques: chunkTeacherCritiques,
      expertCritiques: chunkExpertCritiques,
      disagreements: disagreements.filter((d) => d.chunkId === chunk.id),
      suggestions: suggestions.filter((s) => s.chunkId === chunk.id),
      rubric: buildChunkRubric(
        chunk,
        confidence,
        teacherRubric,
        expertRubric,
        chunkTeacherCritiques,
        chunkExpertCritiques,
      ),
    };
  });
}

/**
 * One breakdown per dimension, each grouping the personas that share a value
 * for it. This is what the results-page dimension toggle iterates over, and
 * what makes a stuck point attributable to a specific secondary factor —
 * the whole reason composite personas were chosen over a two-tier model
 * (PRD §5a).
 */
export function buildDimensionBreakdowns(
  chunks: Chunk[],
  personas: Persona[],
  studentResults: StudentAgentResult[],
): DimensionBreakdown[] {
  const ordered = [...DIMENSION_IDS].sort(
    (a, b) => (DIMENSION_WEIGHTS[b] ?? 0) - (DIMENSION_WEIGHTS[a] ?? 0),
  );

  return ordered.map((dimension: DimensionId) => {
    const values = new Map<string, Persona[]>();
    for (const persona of personas) {
      const value = String(persona.dimensions[dimension]);
      const list = values.get(value) ?? [];
      list.push(persona);
      values.set(value, list);
    }

    const groups = [...values.entries()].map(([value, groupPersonas]) => {
      const ids = new Set(groupPersonas.map((p) => p.id));
      const groupResults = studentResults.filter((r) => ids.has(r.personaId));

      return {
        value,
        label: humanise(value),
        personaIds: [...ids],
        confidence: combineRanges(groupResults.map((r) => r.confidence)),
        perChunk: chunks.map((c) => {
          const forChunk = groupResults.filter((r) => r.chunkId === c.id);
          const understoodCount = forChunk.filter((r) => r.understood).length;
          return {
            chunkId: c.id,
            understood: forChunk.length > 0 && understoodCount * 2 >= forChunk.length,
          };
        }),
      };
    });

    return { dimension, label: DIMENSION_LABELS[dimension], groups };
  });
}

/**
 * Headline recommendations: the weakest chunks first, each paired with the
 * strongest suggestion already written for it. No extra model call — the
 * agents produced the imperative sentence, ranking it is arithmetic.
 *
 * Suggestions from the Expert Agent are preferred at equal chunk weakness
 * because they carry a named principle, which is what makes the headline
 * traceable rather than assertive.
 */
export function buildHeadlines(breakdowns: ChunkBreakdown[]): HeadlineRecommendation[] {
  const weakest = [...breakdowns]
    .filter((b) => b.suggestions.length > 0)
    .sort((a, b) => mid(a.confidence) - mid(b.confidence))
    .slice(0, 3);

  return weakest.map((b, i) => {
    const suggestion =
      b.suggestions.find((s) => s.source === 'expert') ?? (b.suggestions[0] as Suggestion);
    return {
      id: `hr-${i + 1}`,
      text: suggestion.text,
      chunkId: b.chunk.id,
      priority: i + 1,
    };
  });
}

function gradeFor(overall: ConfidenceRange, breakdowns: ChunkBreakdown[]): Assessment['grade'] {
  const flagged = breakdowns.filter((b) => b.confidence.tone !== 'high').length;
  const label = overall.tone === 'high' ? 'SOLID' : overall.tone === 'mid' ? 'REVISE' : 'REWORK';
  const meta =
    flagged === 0
      ? 'no chunks flagged'
      : `${flagged} of ${breakdowns.length} chunk${breakdowns.length === 1 ? '' : 's'} flagged`;
  return { label, meta };
}

function humanise(value: string): string {
  return value
    .split('-')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function buildAssessment(args: {
  lessonPlanId: string;
  chunks: Chunk[];
  personas: Persona[];
  studentResults: StudentAgentResult[];
  teacherCritiques: TeacherAgentCritique[];
  expertCritiques: ExpertAgentCritique[];
  disagreements: Disagreement[];
  suggestions: Suggestion[];
  teacherRubric: TeacherAgentResult['rubric'];
  expertRubric: ExpertAgentResult['rubric'];
  qa: QaReport;
}): Assessment {
  const chunkBreakdowns = buildChunkBreakdowns(
    args.chunks,
    args.studentResults,
    args.teacherCritiques,
    args.expertCritiques,
    args.disagreements,
    args.suggestions,
    args.teacherRubric,
    args.expertRubric,
  );

  const overall = combineRanges(chunkBreakdowns.map((b) => b.confidence));

  return {
    id: `as-${Date.now().toString(36)}`,
    lessonPlanId: args.lessonPlanId,
    createdAt: new Date().toISOString(),
    personas: args.personas,
    overall,
    grade: gradeFor(overall, chunkBreakdowns),
    headlineRecommendations: buildHeadlines(chunkBreakdowns),
    chunkBreakdowns,
    dimensionBreakdowns: buildDimensionBreakdowns(args.chunks, args.personas, args.studentResults),
    rubric: buildLessonRubric(chunkBreakdowns),
    qa: args.qa,
  };
}
