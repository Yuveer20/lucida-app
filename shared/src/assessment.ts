import type { Chunk, LessonSource } from './lesson.js';
import type { DimensionId, Persona } from './persona.js';

/** Qualitative band. Never a bare percentage — see Technical Design §4.5. */
export type Tone = 'high' | 'mid' | 'low';

/**
 * Comprehension is always a range, never a point estimate. These are simulated
 * reactions, not measured data, and a single decimal-precision number would
 * imply a precision the simulation does not have.
 */
export interface ConfidenceRange {
  low: number;
  high: number;
  tone: Tone;
  /** Spread across repeated Student Agent passes; wider = less settled. */
  variance: number;
}

/** Set by the QA pass (§4.6) when a result could not be trusted as-is. */
export type QaFlag =
  | 'ungrounded'      // the quoted span does not appear in the chunk text
  | 'inconsistent'    // high variance across repeated passes
  | 'stale-recheck';  // a recheck repeated critique that ignores the revision

export interface StudentAgentResult {
  id: string;
  chunkId: string;
  personaId: string;
  understood: boolean;
  confidence: ConfidenceRange;
  reason: string;
  stuckPoint: string | null;
  /** Verbatim span of the chunk that drove this reaction, when one was grounded. Absent on older assessments. */
  quote?: string | null;
  qaFlag: QaFlag | null;
}

/** Which side of the practical/ideal seam a critique sits on. */
export type Stance = 'works' | 'concern';

export interface TeacherAgentCritique {
  id: string;
  /** null = lesson-level rather than tied to one chunk. */
  chunkId: string | null;
  critique: string;
  stance: Stance;
  /** Verbatim span from the chunk this critique reacts to. */
  quote: string | null;
  qaFlag: QaFlag | null;
}

export interface ExpertAgentCritique {
  id: string;
  chunkId: string | null;
  critique: string;
  /** Registry id from backend/src/config/principles.ts. */
  principleId: string;
  principle: string;
  stance: Stance;
  quote: string | null;
  qaFlag: QaFlag | null;
}

/**
 * Never merged into a single verdict — both views are shown, labeled
 * "practically realistic" vs "pedagogically ideal" (§4.4).
 */
export interface Disagreement {
  id: string;
  chunkId: string;
  teacherCritiqueId: string;
  expertCritiqueId: string;
  teacherView: string;
  expertView: string;
  note: string;
}

export interface Suggestion {
  id: string;
  chunkId: string;
  text: string;
  source: 'teacher' | 'expert';
  /** Present when source is 'expert' — the principle that generated it. */
  principle: string | null;
}

/**
 * The 5-category assessment rubric (Technical Design §4.10). Every chunk is
 * scored against one unified scorecard rather than three separate agent
 * reports. Each category is sourced from exactly one agent — no category
 * blends Expert-agent research-backed criteria with Teacher-agent practical
 * judgment, so a "needs-work" score never implies more rigor than it has.
 */
export const RUBRIC_CATEGORY_IDS = [
  'lessonFlow',
  'cognitiveLoad',
  'visuals',
  'teachingApproach',
  'classroomFit',
] as const;

export type RubricCategoryId = (typeof RUBRIC_CATEGORY_IDS)[number];

export interface RubricCategoryMeta {
  id: RubricCategoryId;
  /** Plain-language label shown by default — see Technical Design §4.10. */
  label: string;
  source: 'student' | 'expert' | 'teacher';
}

export const RUBRIC_CATEGORIES: RubricCategoryMeta[] = [
  { id: 'lessonFlow', label: 'Lesson flow', source: 'student' },
  { id: 'cognitiveLoad', label: 'Cognitive load', source: 'expert' },
  { id: 'visuals', label: 'Uses visuals where helpful', source: 'expert' },
  { id: 'teachingApproach', label: 'Teaching approach', source: 'expert' },
  { id: 'classroomFit', label: 'Classroom fit', source: 'teacher' },
];

/**
 * Ordered worst-to-best so `Math.min` over severities finds the weakest
 * result. Lesson Flow is intentionally excluded — it's a direct readout of
 * comprehension, not a scored judgment (see RubricCategoryScore.band).
 */
export type RubricBand = 'missing' | 'needs-work' | 'adequate' | 'strong';

export const RUBRIC_BAND_SEVERITY: Record<RubricBand, number> = {
  missing: 0,
  'needs-work': 1,
  adequate: 2,
  strong: 3,
};

export interface RubricCategoryScore {
  category: RubricCategoryId;
  /**
   * Null only for `lessonFlow`: shown as a visual readout of the weakest
   * chunk's comprehension confidence, not a Strong/Adequate/Needs
   * Work/Missing judgment (Technical Design §4.10).
   */
  band: RubricBand | null;
  /**
   * 0-10, correlated with but more granular than `band` (the model gives both
   * for the same judgment) — null only for `lessonFlow`, same as `band`.
   */
  score: number | null;
  note: string;
  /** Ids of the critiques that justify this score, for the drill-down's "why". */
  citedCritiqueIds: string[];
}

export interface ChunkRubric {
  chunkId: string;
  scores: RubricCategoryScore[];
}

export interface LessonRubric {
  scores: RubricCategoryScore[];
  /** Which chunk drove the lesson-level score for each banded category. */
  weakestChunkId: Partial<Record<RubricCategoryId, string>>;
}

export interface ChunkBreakdown {
  chunk: Chunk;
  confidence: ConfidenceRange;
  studentResults: StudentAgentResult[];
  teacherCritiques: TeacherAgentCritique[];
  expertCritiques: ExpertAgentCritique[];
  disagreements: Disagreement[];
  suggestions: Suggestion[];
  rubric: ChunkRubric;
}

/** One row of the dimension toggle: how each value of a dimension fared. */
export interface DimensionBreakdown {
  dimension: DimensionId;
  label: string;
  groups: Array<{
    value: string;
    label: string;
    personaIds: string[];
    confidence: ConfidenceRange;
    /** Per-chunk understood/not, in chunk order — drives the roll-call strip. */
    perChunk: Array<{ chunkId: string; understood: boolean }>;
  }>;
}

export interface HeadlineRecommendation {
  id: string;
  text: string;
  chunkId: string | null;
  /** 1 = fix first. */
  priority: number;
}

export interface QaReport {
  totalCritiques: number;
  flagged: number;
  flags: Array<{ targetId: string; flag: QaFlag; note: string }>;
}

export interface Assessment {
  id: string;
  lessonPlanId: string;
  createdAt: string;
  personas: Persona[];
  overall: ConfidenceRange;
  /** "REVISE" / "SOLID" — the grade stamp on the results page. */
  grade: { label: string; meta: string };
  headlineRecommendations: HeadlineRecommendation[];
  chunkBreakdowns: ChunkBreakdown[];
  dimensionBreakdowns: DimensionBreakdown[];
  rubric: LessonRubric;
  qa: QaReport;
  /** Present when the lesson was uploaded as a PDF/PPTX — powers the slide view. */
  source?: LessonSource;
}

/** Result of re-running a single revised chunk (§4.7). */
export interface RecheckResult {
  chunkId: string;
  before: ConfidenceRange;
  after: ConfidenceRange;
  studentResults: StudentAgentResult[];
  teacherCritiques: TeacherAgentCritique[];
  expertCritiques: ExpertAgentCritique[];
  suggestions: Suggestion[];
  /**
   * Rubric for the revised chunk. There is no "before" here — the caller
   * already has the original chunk's rubric from the assessment it's
   * comparing against, so only the new one needs to travel over the wire.
   */
  rubric: ChunkRubric;
  /**
   * The recheck-specific QA verdict: did the agents actually respond to the
   * revision, or repeat stale critique?
   */
  qa: {
    respondedToRevision: boolean;
    note: string;
    staleCritiqueIds: string[];
  };
}
