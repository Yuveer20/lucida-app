import type { AcademicTierId, LearningStyleId } from "./persona.js";

export interface ChunkHeatmapCell {
  chunkId: string;
  groupId: AcademicTierId | LearningStyleId;
  comprehensionRate: number;
}

export interface Suggestion {
  chunkId: string;
  text: string;
}
