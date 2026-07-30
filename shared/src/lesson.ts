export interface LessonPlan {
  id: string;
  rawText: string;
  createdAt: string;
}

export interface Chunk {
  id: string;
  lessonPlanId: string;
  label: string;
  text: string;
  order: number;
}
