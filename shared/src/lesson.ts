export interface Chunk {
  id: string;
  /** Short label for the section, e.g. "Intro / hook". */
  label: string;
  /** Verbatim text from the submitted lesson plan. */
  text: string;
  /** Zero-based position in the lesson. */
  order: number;
}

export interface LessonPlan {
  id: string;
  rawText: string;
  createdAt: string;
  chunks: Chunk[];
}
