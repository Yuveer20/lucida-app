export type AcademicTierId = "on_grade" | "struggling" | "advanced" | "high_needs";

export type LearningStyleId = "visual" | "auditory" | "read_write" | "kinesthetic";

export interface Archetype {
  id: string;
  tier: AcademicTierId;
  style: LearningStyleId;
  weight: number;
}

export interface PersonaResult {
  chunkId: string;
  archetypeId: string;
  understood: boolean;
  confidence: number;
  reason: string;
  stuckPoint: string | null;
}
