import type {
  Chunk,
  ChunkBreakdown,
  ChunkRubric,
  ConfidenceRange,
  ExpertAgentCritique,
  LessonRubric,
  RubricBand,
  RubricCategoryId,
  RubricCategoryScore,
  TeacherAgentCritique,
} from '@lucida/shared';
import { RUBRIC_BAND_SEVERITY, RUBRIC_CATEGORY_IDS } from '@lucida/shared';
import { PRINCIPLE_RUBRIC_CATEGORY } from '../config/principles.js';
import type { RawRubricScore } from '../agents/critiqueAgents.js';

function mid(range: ConfidenceRange): number {
  return (range.low + range.high) / 2;
}

function missingScore(category: RubricCategoryId): RubricCategoryScore {
  return {
    category,
    band: 'missing',
    score: 0,
    note: 'The agent did not return a score for this chunk.',
    citedCritiqueIds: [],
  };
}

/** [low, high] the model was told to use for each band — see the rubricScoreSchema prompt. */
const BAND_SCORE_RANGE: Record<RubricBand, [number, number]> = {
  strong: [9, 10],
  adequate: [7, 8],
  'needs-work': [4, 6],
  missing: [0, 3],
};

/**
 * The model is asked to keep band and score consistent, but nothing enforces
 * that at generation time — clamp here rather than trust it, so a stray
 * number never contradicts the band it's displayed next to.
 */
function clampToBand(band: RubricBand, score: number): number {
  const [low, high] = BAND_SCORE_RANGE[band];
  return Math.min(high, Math.max(low, Math.round(score)));
}

/**
 * Builds one chunk's 5-row rubric (Technical Design §4.10) from the agents'
 * raw per-chunk band judgments plus the critiques that justify them.
 * citedCritiqueIds is derived here rather than asked of the agent directly —
 * critiques already carry chunkId + principleId, so the link is a filter over
 * data that already exists, not new model output (PRD §4: "including which
 * specific principle drove a merged rubric category").
 */
export function buildChunkRubric(
  chunk: Chunk,
  chunkConfidence: ConfidenceRange,
  teacherRubric: Array<{ chunkId: string; classroomFit: RawRubricScore }>,
  expertRubric: Array<{
    chunkId: string;
    cognitiveLoad: RawRubricScore;
    visuals: RawRubricScore;
    teachingApproach: RawRubricScore;
  }>,
  teacherCritiques: TeacherAgentCritique[],
  expertCritiques: ExpertAgentCritique[],
): ChunkRubric {
  const teacherEntry = teacherRubric.find((r) => r.chunkId === chunk.id);
  const expertEntry = expertRubric.find((r) => r.chunkId === chunk.id);

  const citesForCategory = (category: RubricCategoryId): string[] =>
    expertCritiques
      .filter((c) => c.chunkId === chunk.id && PRINCIPLE_RUBRIC_CATEGORY[c.principleId] === category)
      .map((c) => c.id);

  const scores: RubricCategoryScore[] = [
    {
      category: 'lessonFlow',
      band: null,
      score: null,
      note: `${chunkConfidence.low}-${chunkConfidence.high}% simulated comprehension (${chunkConfidence.tone} confidence).`,
      citedCritiqueIds: [],
    },
    expertEntry
      ? {
          category: 'cognitiveLoad',
          band: expertEntry.cognitiveLoad.band,
          score: clampToBand(expertEntry.cognitiveLoad.band, expertEntry.cognitiveLoad.score),
          note: expertEntry.cognitiveLoad.note,
          citedCritiqueIds: citesForCategory('cognitiveLoad'),
        }
      : missingScore('cognitiveLoad'),
    expertEntry
      ? {
          category: 'visuals',
          band: expertEntry.visuals.band,
          score: clampToBand(expertEntry.visuals.band, expertEntry.visuals.score),
          note: expertEntry.visuals.note,
          citedCritiqueIds: citesForCategory('visuals'),
        }
      : missingScore('visuals'),
    expertEntry
      ? {
          category: 'teachingApproach',
          band: expertEntry.teachingApproach.band,
          score: clampToBand(expertEntry.teachingApproach.band, expertEntry.teachingApproach.score),
          note: expertEntry.teachingApproach.note,
          citedCritiqueIds: citesForCategory('teachingApproach'),
        }
      : missingScore('teachingApproach'),
    teacherEntry
      ? {
          category: 'classroomFit',
          band: teacherEntry.classroomFit.band,
          score: clampToBand(teacherEntry.classroomFit.band, teacherEntry.classroomFit.score),
          note: teacherEntry.classroomFit.note,
          citedCritiqueIds: teacherCritiques.filter((c) => c.chunkId === chunk.id).map((c) => c.id),
        }
      : missingScore('classroomFit'),
  ];

  return { chunkId: chunk.id, scores };
}

/**
 * Lesson-level rubric: "worst chunk wins" per banded category, so the
 * lesson-level score always points at what to fix first rather than
 * averaging a real problem away (same philosophy as the headline
 * recommendations and the per-chunk confidence combination in §4.5).
 * Lesson Flow instead points at the single lowest-confidence chunk across
 * the whole lesson, mirroring the grade stamp's logic.
 *
 * Requires every breakdown's `.rubric` to already be populated — call after
 * buildChunkRubric has run for each chunk, not before.
 */
export function buildLessonRubric(breakdowns: ChunkBreakdown[]): LessonRubric {
  const scores: RubricCategoryScore[] = [];
  const weakestChunkId: Partial<Record<RubricCategoryId, string>> = {};

  if (breakdowns.length === 0) {
    return { scores: RUBRIC_CATEGORY_IDS.map((category) => missingScore(category)), weakestChunkId };
  }

  for (const category of RUBRIC_CATEGORY_IDS) {
    if (category === 'lessonFlow') {
      let weakest = breakdowns[0]!;
      for (const b of breakdowns) {
        if (mid(b.confidence) < mid(weakest.confidence)) weakest = b;
      }
      weakestChunkId.lessonFlow = weakest.chunk.id;
      scores.push({
        category: 'lessonFlow',
        band: null,
        score: null,
        note: `Weakest chunk: "${weakest.chunk.label}" at ${weakest.confidence.low}-${weakest.confidence.high}% (${weakest.confidence.tone} confidence).`,
        citedCritiqueIds: [],
      });
      continue;
    }

    let worst: { chunkId: string; score: RubricCategoryScore & { band: RubricBand } } | null = null;
    for (const b of breakdowns) {
      const entry = b.rubric.scores.find((s) => s.category === category);
      if (!entry || entry.band === null) continue;
      const scored = entry as RubricCategoryScore & { band: RubricBand };
      if (!worst || RUBRIC_BAND_SEVERITY[scored.band] < RUBRIC_BAND_SEVERITY[worst.score.band]) {
        worst = { chunkId: b.chunk.id, score: scored };
      }
    }

    if (worst) {
      weakestChunkId[category] = worst.chunkId;
      scores.push(worst.score);
    } else {
      scores.push(missingScore(category));
    }
  }

  return { scores, weakestChunkId };
}
