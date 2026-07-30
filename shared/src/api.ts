import type { LessonPlan, Chunk } from "./lesson.js";
import type { AcademicTierId, LearningStyleId, PersonaResult } from "./persona.js";
import type { ChunkHeatmapCell, Suggestion } from "./assessment.js";

export interface AssessRequest {
  rawText: string;
}

export interface AssessResponse {
  lessonPlan: LessonPlan;
  chunks: Chunk[];
  overallComprehensionRate: number;
  tierBreakdown: Record<AcademicTierId, number>;
  styleBreakdown: Record<LearningStyleId, number>;
  heatmapByTier: ChunkHeatmapCell[];
  heatmapByStyle: ChunkHeatmapCell[];
  chunkDrillDowns: Record<string, PersonaResult[]>;
  suggestions: Suggestion[];
  partialFailures: string[];
}

export interface EchoRequest {
  rawText: string;
}

export interface EchoResponse {
  raw: string;
}

export interface ApiError {
  error: string;
}
