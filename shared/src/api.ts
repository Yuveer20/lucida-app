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

/**
 * Upload limits for /api/extract-text — a single source of truth so the
 * frontend's pre-check, its displayed note, and the backend's actual
 * enforcement can't drift apart (see backend/src/config/limits.ts).
 */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_PDF_PAGES = 40;
export const MAX_SLIDES = 40;
