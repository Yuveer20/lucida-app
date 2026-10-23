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

/**
 * The uploaded file a lesson came from, split back into its pages/slides so
 * the results can be shown slide by slide. Only the extracted text is kept
 * — the original file is never stored.
 */
export interface LessonSource {
  format: 'pdf' | 'pptx';
  fileName: string;
  /** Extracted text of each page (PDF) or slide (PPTX), in order. */
  pages: string[];
}
