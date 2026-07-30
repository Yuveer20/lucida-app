import type { AcademicTierId, LearningStyleId } from "@lucida/shared";

export const TIER_LABELS: Record<AcademicTierId, string> = {
  on_grade: "On-grade",
  struggling: "Struggling",
  advanced: "Advanced",
  high_needs: "High-needs",
};

export const STYLE_LABELS: Record<LearningStyleId, string> = {
  visual: "Visual",
  auditory: "Auditory",
  read_write: "Read/Write",
  kinesthetic: "Kinesthetic",
};

export const TIER_ORDER: AcademicTierId[] = ["on_grade", "struggling", "advanced", "high_needs"];
export const STYLE_ORDER: LearningStyleId[] = ["visual", "auditory", "read_write", "kinesthetic"];
