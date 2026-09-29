import type { Assessment, ConfidenceRange, RecheckResult } from './assessment.js';
import type { Chunk } from './lesson.js';

export interface AssessRequest {
  lessonText: string;
  /** Optional context that sharpens chunking and agent calibration. */
  gradeLevel?: string;
  subject?: string;
}

export interface AssessResponse {
  assessment: Assessment;
}

export interface RecheckRequest {
  chunkId: string;
  /** The chunk as originally submitted. */
  original: Chunk;
  /** The teacher's revised text for that chunk. */
  revisedText: string;
  /** Prior confidence, so the response can show a before/after. */
  previousConfidence: ConfidenceRange;
  /** Prior critiques, so the QA pass can detect stale repetition. */
  previousCritiques: string[];
}

export interface RecheckResponse {
  result: RecheckResult;
}

export interface ApiError {
  error: string;
  detail?: string;
}
