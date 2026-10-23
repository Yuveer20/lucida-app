import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { PDFParse } from 'pdf-parse';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { MAX_LESSON_CHARS, MAX_PDF_PAGES, MAX_SLIDES, MAX_UPLOAD_BYTES } from '../config/limits.js';

export const extractRouter = Router();

// In-memory only — the file is parsed and discarded, never written to disk,
// so there's no filename/path to sanitize and nothing left behind to clean up.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const windowMs = env.rateLimitWindowMinutes * 60_000;
const byUid = (req: { auth?: { uid: string } }) => req.auth?.uid ?? 'unauthenticated';

const extractLimiter = rateLimit({
  windowMs,
  limit: env.rateLimitMaxExtract,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUid,
  message: { error: 'Too many file uploads. Please wait a while before trying again.' },
});

// Keep text runs exactly as written: runs are concatenated directly, so
// trimming would glue words together ("Hello " + "world"), and numeric
// coercion would drop runs like "2024" or turn "007" into 7.
const xmlParser = new XMLParser({ trimValues: false, parseTagValue: false });

/**
 * Walks a parsed slide XML tree collecting every <a:t> text-run value,
 * regardless of nesting. Each <a:p> paragraph becomes its own line so the
 * slide's title/bullet structure survives for the slide view.
 */
function collectPptxText(xml: string): string {
  const lines: string[] = [];
  let current: string[] = [];
  walk(xmlParser.parse(xml));
  flush();
  return lines.join('\n');

  function flush(): void {
    const line = current.join('').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
    current = [];
  }

  function walk(node: unknown): void {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (key === 'a:t' && typeof value === 'string') {
          current.push(value);
        } else if (key === 'a:p') {
          // One paragraph per array entry (or a single object when there's only one).
          for (const paragraph of Array.isArray(value) ? value : [value]) {
            walk(paragraph);
            flush();
          }
        } else {
          walk(value);
        }
      }
    }
  }
}

interface Extracted {
  text: string;
  count: number;
  /** Text of each page/slide on its own, for the results' slide view. */
  pages: string[];
}

async function extractPdf(buffer: Buffer): Promise<Extracted> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // pdf-parse inserts "-- N of M --" page-boundary markers into the joined
    // text, which would show up as clutter in the textarea the teacher
    // reviews before submitting. No documented option to suppress it, so
    // strip the fixed pattern instead.
    const text = result.text.replace(/\n*--\s*\d+\s*of\s*\d+\s*--\n*/g, '\n\n');
    const pages = result.pages.map((p) => p.text.trim());
    return { text, count: result.total, pages };
  } finally {
    await parser.destroy();
  }
}

async function extractPptx(buffer: Buffer): Promise<Extracted> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)![1]);
      const nb = Number(b.match(/slide(\d+)\.xml$/)![1]);
      return na - nb;
    });

  if (slideFiles.length === 0) {
    throw new Error('No slides found in this file.');
  }

  const pages = await Promise.all(
    slideFiles.map(async (name) => collectPptxText(await zip.files[name]!.async('string'))),
  );
  const text = pages.map((page, i) => `Slide ${i + 1}\n${page}`).join('\n\n');

  return { text, count: slideFiles.length, pages };
}

/**
 * First few bytes identify the real format — never trust a client-supplied
 * mimetype or filename extension alone (audit §7: "Do not rely solely on
 * file extensions for security").
 */
function sniffFormat(buffer: Buffer): 'pdf' | 'pptx' | null {
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return 'pptx'; // ZIP signature — OOXML container
  return null;
}

/**
 * Extracts plain text from an uploaded PDF or .pptx and returns it —
 * deliberately does NOT run the assessment itself. The frontend pre-fills
 * the existing textarea with the result so the teacher can review (and fix
 * a bad extraction) before spending real LLM calls on it, same as pasted
 * text always has been.
 */
extractRouter.post('/extract-text', requireAuth, extractLimiter, (req, res) => {
  upload.single('file')(req, res, async (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: `File is too large (limit ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB).`,
        });
        return;
      }
      res.status(400).json({ error: 'Could not read the uploaded file.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const format = sniffFormat(file.buffer);
    if (!format) {
      res.status(400).json({ error: 'Only PDF and PowerPoint (.pptx) files are supported.' });
      return;
    }

    try {
      const { text, count, pages } = format === 'pdf' ? await extractPdf(file.buffer) : await extractPptx(file.buffer);

      const limit = format === 'pdf' ? MAX_PDF_PAGES : MAX_SLIDES;
      const unit = format === 'pdf' ? 'pages' : 'slides';
      if (count > limit) {
        res.status(413).json({
          error: `This ${format === 'pdf' ? 'PDF' : 'slideshow'} has ${count} ${unit}, over the ${limit}-${unit.slice(0, -1)} limit per assessment.`,
        });
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        res.status(422).json({
          error:
            format === 'pdf'
              ? "This PDF doesn't seem to contain selectable text — it may be a scanned image. Try pasting the text directly instead."
              : "This slideshow doesn't seem to contain any text.",
        });
        return;
      }

      if (trimmedText.length > MAX_LESSON_CHARS) {
        res.status(413).json({
          error: `Extracted text is too long (${trimmedText.length} characters, limit ${MAX_LESSON_CHARS}).`,
        });
        return;
      }

      res.json({ text: trimmedText, count, format, pages });
    } catch (parseErr) {
      // eslint-disable-next-line no-console
      console.error('[lucida] file extraction failed:', parseErr instanceof Error ? parseErr.message : parseErr);
      res.status(422).json({
        error: `Could not read this ${format === 'pdf' ? 'PDF' : 'PowerPoint file'} — it may be corrupted or password-protected.`,
      });
    }
  });
});
