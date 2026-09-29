import type { Tone } from '@lucida/shared';

/**
 * Cheap deterministic half of the grounding check (Technical Design §4.6).
 *
 * Running this in code first means the QA model call only has to adjudicate
 * genuinely ambiguous cases, rather than re-reading every quote in the
 * assessment. Substring matching on normalised whitespace catches the common
 * failure — a fabricated or subtly altered quote — for free.
 */
export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function quoteIsGrounded(quote: string, chunkText: string): boolean {
  const q = normalise(quote);
  if (q.length < 8) return true; // too short to verify meaningfully
  return normalise(chunkText).includes(q);
}

/**
 * Quotes that fail the substring test but share most of their words with the
 * chunk are probably lightly reworded rather than invented — those go to the
 * model for adjudication instead of being dropped outright.
 */
export function isNearMiss(quote: string, chunkText: string): boolean {
  const words = normalise(quote).split(' ').filter((w) => w.length > 3);
  if (words.length === 0) return false;
  const haystack = normalise(chunkText);
  const hits = words.filter((w) => haystack.includes(w)).length;
  return hits / words.length >= 0.6;
}

export function toneFor(score: number): Tone {
  if (score >= 70) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}
