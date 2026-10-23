import type { Assessment, ChunkBreakdown, Persona, Suggestion } from '@lucida/shared';

/**
 * Maps an assessment's findings back onto the pages/slides of the file the
 * lesson was uploaded from.
 *
 * The pipeline never sees slide boundaries — it works on LLM-defined chunks,
 * and findings point at a chunk plus (optionally) a verbatim quote. So the
 * mapping is done here, purely on text:
 *   - a quoted finding lands on the slide that contains its quote;
 *   - an unquoted one lands on the slide its chunk overlaps most.
 *
 * Matching ignores case, curly-vs-straight punctuation and ALL whitespace,
 * because PDF text extraction and the chunker both reflow whitespace freely
 * (and PDF text items often split mid-word), while the characters themselves
 * survive verbatim.
 */

export type AnnotationKind = 'teacher' | 'expert' | 'students';

export interface Annotation {
  id: string;
  /** 1-based number shown on the pin and in the key, unique per slide. */
  n: number;
  kind: AnnotationKind;
  /** Who raised it, e.g. "Teacher", "Expert · Cognitive Load Theory", "4 of 18 students". */
  sourceLabel: string;
  /** The problem itself. */
  text: string;
  /** Extra lines under the problem — e.g. individual students' stuck points. */
  details: string[];
  /** Verbatim span the finding is about, if it could be found on this slide. */
  quote: string | null;
  chunkId: string;
}

export interface SlideSection {
  chunkId: string;
  label: string;
  /** 1-based position of the chunk, matching "Chunk by chunk". */
  order: number;
  suggestions: Suggestion[];
}

export interface SlideGaps {
  index: number;
  text: string;
  annotations: Annotation[];
  /** Chunks (sections) whose suggested changes apply to this slide. */
  sections: SlideSection[];
  /** How many problems are pinned here: none, 1-2, or 3+. */
  severity: 'clear' | 'some' | 'many';
}

export interface SlideMap {
  slides: SlideGaps[];
  /**
   * Findings that couldn't be tied to any slide (their chunk's text no
   * longer resembles the file — e.g. the teacher rewrote the extracted
   * text before submitting). Listed separately rather than silently dropped.
   */
  unplaced: Array<{ id: string; kind: AnnotationKind; sourceLabel: string; text: string; chunkId: string }>;
}

/** Below this many squashed characters a quote matches too much to be trusted for placement. */
const MIN_QUOTE_CHARS = 8;

function squashChar(ch: string): string {
  if (ch === '‘' || ch === '’') return "'";
  if (ch === '“' || ch === '”') return '"';
  if (ch === '–' || ch === '—') return '-';
  return ch.toLowerCase();
}

/**
 * Lower-cased, punctuation-normalised, whitespace-free copy of `text`, plus
 * `map[i]` = index in the original text of squashed character i, so a match
 * in squashed space can be turned back into a highlight range.
 */
export function squashWithMap(text: string): { squashed: string; map: number[] } {
  let squashed = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (/\s/.test(ch)) continue;
    const s = squashChar(ch);
    squashed += s;
    for (let k = 0; k < s.length; k++) map.push(i);
  }
  return { squashed, map };
}

export function squash(text: string): string {
  return squashWithMap(text).squashed;
}

/** Character range [start, end) of `quote` within `text`, or null. Whitespace-insensitive. */
export function findQuoteRange(text: string, quote: string): { start: number; end: number } | null {
  const q = squash(quote);
  if (q.length < MIN_QUOTE_CHARS) return null;
  const { squashed, map } = squashWithMap(text);
  const at = squashed.indexOf(q);
  if (at < 0) return null;
  return { start: map[at]!, end: map[at + q.length - 1]! + 1 };
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 3);
}

/** Fraction of `a`'s distinct content words that also appear in `b`. */
function overlap(aWords: string[], bWordSet: Set<string>): number {
  const distinct = new Set(aWords);
  if (distinct.size === 0) return 0;
  let hits = 0;
  for (const w of distinct) if (bWordSet.has(w)) hits++;
  return hits / distinct.size;
}

/**
 * Which slide a quote sits on. Exact (squashed) containment first; failing
 * that, a quote that straddles a slide boundary is located by its opening
 * stretch; failing that, best word overlap if it's convincing.
 */
function locateQuote(quote: string, squashedPages: string[], pageWordSets: Set<string>[]): number | null {
  const q = squash(quote);
  if (q.length < MIN_QUOTE_CHARS) return null;
  const exact = squashedPages.findIndex((p) => p.includes(q));
  if (exact >= 0) return exact;

  if (q.length >= 40) {
    const head = q.slice(0, 24);
    const byHead = squashedPages.findIndex((p) => p.includes(head));
    if (byHead >= 0) return byHead;
  }

  const qWords = words(quote);
  let best = -1;
  let bestScore = 0;
  pageWordSets.forEach((set, i) => {
    const score = overlap(qWords, set);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return bestScore >= 0.6 ? best : null;
}

/**
 * Assigns each slide to the chunk that covers most of its words, then gives
 * every chunk a "primary" slide (its first assigned one, or — if the chunk's
 * text no longer resembles any slide, e.g. the teacher edited the extracted
 * text heavily — the slide that overlaps its words most).
 */
function assignSlidesToChunks(pages: string[], chunks: ChunkBreakdown[]) {
  const chunkWordSets = chunks.map((b) => new Set(words(b.chunk.text)));
  const slideChunk: Array<string | null> = pages.map((page) => {
    const pWords = words(page);
    let best: string | null = null;
    let bestScore = 0;
    chunks.forEach((b, i) => {
      const score = overlap(pWords, chunkWordSets[i]!);
      if (score > bestScore) {
        bestScore = score;
        best = b.chunk.id;
      }
    });
    return bestScore >= 0.3 ? best : null;
  });

  const pageWordSets = pages.map((p) => new Set(words(p)));
  const primary = new Map<string, number>();
  chunks.forEach((b) => {
    const first = slideChunk.indexOf(b.chunk.id);
    if (first >= 0) {
      primary.set(b.chunk.id, first);
      return;
    }
    const cWords = words(b.chunk.text);
    let best = -1;
    let bestScore = 0;
    pageWordSets.forEach((set, i) => {
      const score = overlap(cWords, set);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0 && bestScore >= 0.2) primary.set(b.chunk.id, best);
  });

  return { slideChunk, primary };
}

interface Draft extends Omit<Annotation, 'n' | 'quote'> {
  quote: string | null;
  slide: number;
}

export function buildSlideMap(assessment: Assessment): SlideMap | null {
  const pages = assessment.source?.pages;
  if (!pages || pages.length === 0) return null;

  const squashedPages = pages.map(squash);
  const pageWordSets = pages.map((p) => new Set(words(p)));
  const { slideChunk, primary } = assignSlidesToChunks(pages, assessment.chunkBreakdowns);
  const personaById = new Map<string, Persona>(assessment.personas.map((p) => [p.id, p]));

  const drafts: Draft[] = [];
  /** Place a finding: on its quote's slide if found, else its chunk's primary slide. */
  function place(chunkId: string, quote: string | null | undefined): { slide: number; quote: string | null } | null {
    if (quote) {
      const slide = locateQuote(quote, squashedPages, pageWordSets);
      if (slide !== null) return { slide, quote };
    }
    const slide = primary.get(chunkId);
    return slide === undefined ? null : { slide, quote: null };
  }

  const unplaced: SlideMap['unplaced'] = [];

  for (const b of assessment.chunkBreakdowns) {
    for (const c of b.teacherCritiques) {
      if (c.stance !== 'concern' || c.qaFlag === 'ungrounded') continue;
      const at = place(b.chunk.id, c.quote);
      const base = { id: c.id, kind: 'teacher' as const, sourceLabel: 'Teacher', text: c.critique };
      if (at) drafts.push({ ...base, details: [], chunkId: b.chunk.id, ...at });
      else unplaced.push({ ...base, chunkId: b.chunk.id });
    }
    for (const c of b.expertCritiques) {
      if (c.stance !== 'concern' || c.qaFlag === 'ungrounded') continue;
      const at = place(b.chunk.id, c.quote);
      const base = { id: c.id, kind: 'expert' as const, sourceLabel: `Expert · ${c.principle}`, text: c.critique };
      if (at) drafts.push({ ...base, details: [], chunkId: b.chunk.id, ...at });
      else unplaced.push({ ...base, chunkId: b.chunk.id });
    }

    // Students who didn't follow the chunk, grouped by the span that lost
    // them — eighteen separate pins for one confusing sentence would bury
    // the slide, but "5 of 18 students lost here" says it plainly.
    const lost = b.studentResults.filter((r) => !r.understood && r.qaFlag !== 'ungrounded');
    const groups = new Map<string, typeof lost>();
    for (const r of lost) {
      const at = place(b.chunk.id, r.quote);
      const key = at ? `${at.slide}|${at.quote ? squash(at.quote) : ''}` : 'none';
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    for (const [key, group] of groups) {
      const first = group[0]!;
      const stuck = [...new Set(group.map((r) => r.stuckPoint?.trim()).filter((s): s is string => Boolean(s)))];
      const who = group
        .map((r) => personaById.get(r.personaId)?.name)
        .filter((n): n is string => Boolean(n));
      const base = {
        id: `students-${b.chunk.id}-${first.id}`,
        kind: 'students' as const,
        sourceLabel: `${group.length} of ${assessment.personas.length} students`,
        text: stuck[0] ?? first.reason,
      };
      const details = [
        ...stuck.slice(1, 3),
        ...(who.length > 0 ? [`Lost: ${who.slice(0, 4).join('; ')}${who.length > 4 ? `; +${who.length - 4} more` : ''}`] : []),
      ];
      if (key === 'none') {
        unplaced.push({ ...base, chunkId: b.chunk.id });
        continue;
      }
      const at = place(b.chunk.id, first.quote)!;
      drafts.push({ ...base, details, chunkId: b.chunk.id, ...at });
    }
  }

  const chunkById = new Map(assessment.chunkBreakdowns.map((b) => [b.chunk.id, b]));
  const slides: SlideGaps[] = pages.map((text, index) => {
    // Pins are numbered in reading order: quoted ones by where their quote
    // starts, whole-slide ones after them.
    const here = drafts
      .filter((d) => d.slide === index)
      .map((d) => ({ d, pos: d.quote ? findQuoteRange(text, d.quote)?.start ?? Infinity : Infinity }))
      .sort((a, b) => a.pos - b.pos);
    const annotations: Annotation[] = here.map(({ d, pos }, i) => ({
      id: d.id,
      n: i + 1,
      kind: d.kind,
      sourceLabel: d.sourceLabel,
      text: d.text,
      details: d.details,
      // A quote located only by word overlap can't be highlighted; keep it out of the overlay.
      quote: Number.isFinite(pos) ? d.quote : null,
      chunkId: d.chunkId,
    }));

    // Suggested changes come from every chunk that has a finding here, plus
    // the chunk this slide belongs to (when it has suggestions at all).
    const chunkIds = new Set(annotations.map((a) => a.chunkId));
    const owner = slideChunk[index];
    if (owner) chunkIds.add(owner);
    const sections: SlideSection[] = [...chunkIds]
      .map((id) => chunkById.get(id))
      .filter((b): b is ChunkBreakdown => Boolean(b))
      .sort((a, b) => a.chunk.order - b.chunk.order)
      .map((b) => ({ chunkId: b.chunk.id, label: b.chunk.label, order: b.chunk.order + 1, suggestions: b.suggestions }));

    const count = annotations.length;
    return { index, text, annotations, sections, severity: count === 0 ? 'clear' : count <= 2 ? 'some' : 'many' };
  });

  return { slides, unplaced };
}
