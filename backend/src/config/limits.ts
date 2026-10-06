/**
 * Size/count caps shared between the plain-text path (routes/assess.ts) and
 * the file-upload path (routes/extract.ts). MAX_LESSON_CHARS is backend-only
 * (the JSON-paste path has no frontend counterpart to share it with); the
 * upload-specific caps are re-exported from @lucida/shared so the frontend's
 * pre-check and displayed note can't drift from what the server enforces.
 */
export { MAX_PDF_PAGES, MAX_SLIDES, MAX_UPLOAD_BYTES } from '@lucida/shared';

/** Lesson plans can be long; the default 100kb JSON body limit is not enough. */
export const MAX_LESSON_CHARS = 120_000;
