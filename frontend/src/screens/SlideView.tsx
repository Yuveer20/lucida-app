import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Assessment, ChunkBreakdown } from '@lucida/shared';
import { Button } from '../ds/index.js';
import { buildSlideMap, findQuoteRange, type Annotation, type AnnotationKind, type SlideGaps } from '../lib/slideMap.js';
import { renderPdfPage, type PageBox } from '../lib/pdf.js';

/**
 * Slide-by-slide view of where an uploaded lesson falls short: the slide
 * itself with numbered pins on the problem phrases, and below it a key that
 * explains each pin plus the suggested changes for that part of the lesson.
 *
 * PDFs uploaded this session are drawn for real with pdf.js; PPTX decks (and
 * PDFs reopened from history, since files are never stored) are shown as a
 * slide card rebuilt from the extracted text.
 */

const eyebrow = {
  font: 'var(--text-eyebrow)',
  letterSpacing: 'var(--tracking-eyebrow)',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
} as const;

const KIND_COLOR: Record<AnnotationKind, string> = {
  teacher: 'var(--teacher-500)',
  expert: 'var(--expert-500)',
  students: 'var(--confidence-low)',
};

const SEVERITY_COLOR: Record<SlideGaps['severity'], string> = {
  clear: 'var(--confidence-high)',
  some: 'var(--confidence-mid)',
  many: 'var(--confidence-low)',
};

const SEVERITY_LABEL: Record<SlideGaps['severity'], string> = {
  clear: 'No issues',
  some: 'Some issues',
  many: 'Many issues',
};

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function Pin({
  a,
  active,
  onActivate,
  style,
}: {
  a: Annotation;
  active: boolean;
  onActivate: (id: string | null, scroll?: boolean) => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={`Issue ${a.n}: ${a.text}`}
      onMouseEnter={() => onActivate(a.id)}
      onMouseLeave={() => onActivate(null)}
      onFocus={() => onActivate(a.id)}
      onBlur={() => onActivate(null)}
      onClick={() => onActivate(a.id, true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 5px',
        borderRadius: 'var(--radius-pill)',
        border: '2px solid var(--surface-card)',
        background: KIND_COLOR[a.kind],
        // Pin colours lighten in dark mode, so the numeral flips with the theme.
        color: 'var(--surface-card)',
        font: '700 11px/1 var(--font-display)',
        cursor: 'pointer',
        boxShadow: active ? `0 0 0 3px ${tint(KIND_COLOR[a.kind], 40)}` : 'var(--shadow-card)',
        transform: active ? 'scale(1.15)' : undefined,
        transition: 'transform var(--duration-fast) var(--ease-standard)',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      {a.n}
    </button>
  );
}

/** Pins with no locatable phrase apply to the slide as a whole — they sit in the slide's top-right corner. */
function CornerPins({
  annotations,
  activeId,
  onActivate,
}: {
  annotations: Annotation[];
  activeId: string | null;
  onActivate: (id: string | null, scroll?: boolean) => void;
}) {
  if (annotations.length === 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        maxWidth: '45%',
        zIndex: 2,
      }}
    >
      <span
        style={{
          font: 'var(--text-mono-xs)',
          color: 'var(--ink-3)',
          background: 'var(--surface-card)',
          padding: '1px 6px',
          borderRadius: 'var(--radius-pill)',
          marginRight: 2,
        }}
      >
        whole slide
      </span>
      {annotations.map((a) => (
        <Pin key={a.id} a={a} active={activeId === a.id} onActivate={onActivate} />
      ))}
    </div>
  );
}

/** Splits slide text into runs, each tagged with the pinned annotations whose quote covers it. */
function highlightSegments(text: string, annotations: Annotation[]) {
  const ranges = annotations
    .map((a) => ({ a, r: a.quote ? findQuoteRange(text, a.quote) : null }))
    .filter((x): x is { a: Annotation; r: { start: number; end: number } } => x.r !== null);

  const cuts = new Set<number>([0, text.length]);
  for (const { r } of ranges) {
    cuts.add(r.start);
    cuts.add(r.end);
  }
  const points = [...cuts].sort((x, y) => x - y);
  const segments: Array<{ text: string; covering: Annotation[]; starting: Annotation[] }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    segments.push({
      text: text.slice(start, end),
      covering: ranges.filter(({ r }) => r.start <= start && r.end >= end).map(({ a }) => a),
      starting: ranges.filter(({ r }) => r.start === start).map(({ a }) => a),
    });
  }
  return { segments, placed: new Set(ranges.map(({ a }) => a.id)) };
}

function TextSlideCard({
  slide,
  activeId,
  onActivate,
}: {
  slide: SlideGaps;
  activeId: string | null;
  onActivate: (id: string | null, scroll?: boolean) => void;
}) {
  const { segments, placed } = useMemo(() => highlightSegments(slide.text, slide.annotations), [slide]);

  // Break the runs into lines (titles and bullets came through as separate
  // lines), keeping each run's highlight as it's split.
  const lines: Array<Array<{ text: string; covering: Annotation[]; starting: Annotation[] }>> = [[]];
  for (const seg of segments) {
    seg.text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      lines[lines.length - 1]!.push({ ...seg, text: part, starting: i === 0 ? seg.starting : [] });
    });
  }
  const nonEmpty = lines.filter((l) => l.some((s) => s.text.trim() || s.starting.length > 0));
  const long = slide.text.length > 420;

  function renderLine(line: (typeof lines)[number]) {
    return line.map((s, i) => {
      const hit = s.covering.find((a) => a.id === activeId) ?? s.covering[0];
      return (
        <span key={i}>
          {s.starting.map((a) => (
            <Pin key={a.id} a={a} active={activeId === a.id} onActivate={onActivate} style={{ marginRight: 4, transform: activeId === a.id ? 'scale(1.15) translateY(-1px)' : 'translateY(-1px)' }} />
          ))}
          {hit ? (
            <mark
              style={{
                background: tint(KIND_COLOR[hit.kind], s.covering.some((a) => a.id === activeId) ? 32 : 16),
                color: 'inherit',
                borderBottom: `2px solid ${KIND_COLOR[hit.kind]}`,
                borderRadius: 2,
                padding: '0 1px',
              }}
            >
              {s.text}
            </mark>
          ) : (
            s.text
          )}
        </span>
      );
    });
  }

  const [title, ...body] = nonEmpty;
  return (
    <div
      className="lucida-slide-card"
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-raised)',
        padding: long ? '28px 32px' : '40px 48px',
        overflowWrap: 'anywhere',
      }}
    >
      <CornerPins
        annotations={slide.annotations.filter((a) => !placed.has(a.id))}
        activeId={activeId}
        onActivate={onActivate}
      />
      {title ? (
        <>
          <div
            className="lucida-slide-title"
            style={{
              font: long ? '600 18px/1.35 var(--font-display)' : 'var(--text-display-md)',
              color: 'var(--text-primary)',
              marginBottom: long ? 12 : 20,
              paddingRight: 60,
            }}
          >
            {renderLine(title)}
          </div>
          <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: long ? 4 : 8 }}>
            {body.map((line, i) => (
              <li
                key={i}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: long ? 14 : 17,
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                }}
              >
                {renderLine(line)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p style={{ font: 'var(--text-body-md)', color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
          No text on this slide.
        </p>
      )}
    </div>
  );
}

function PdfSlide({
  file,
  slide,
  activeId,
  onActivate,
  fallback,
}: {
  file: File;
  slide: SlideGaps;
  activeId: string | null;
  onActivate: (id: string | null, scroll?: boolean) => void;
  fallback: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error' } | { status: 'ready'; aspect: number; boxes: PageBox[][] }
  >({ status: 'loading' });

  // Re-render only when the width changes meaningfully, not on every resize tick.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round((entry?.contentRect.width ?? 0) / 40) * 40;
      setWidth((prev) => (w > 0 && w !== prev ? w : prev));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  const quotes = useMemo(() => slide.annotations.map((a) => a.quote ?? ''), [slide]);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    // A fresh canvas per render: pdf.js refuses concurrent renders into one
    // canvas, and a stale render finishing late must not overwrite this one.
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.display = 'block';
    canvas.setAttribute('aria-label', `Page ${slide.index + 1}`);
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    renderPdfPage(file, slide.index, canvas, width, quotes)
      .then((r) => {
        if (cancelled) return;
        const target = hostRef.current?.querySelector('[data-canvas-slot]');
        target?.replaceChildren(canvas);
        setState({ status: 'ready', aspect: r.aspect, boxes: r.quoteBoxes });
      })
      .catch((err) => {
        console.error('PDF render failed', err);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [file, slide.index, width, quotes]);

  if (state.status === 'error') return <>{fallback}</>;

  const boxes = state.status === 'ready' ? state.boxes : [];
  const unplaced = slide.annotations.filter((_, i) => !boxes[i]?.length);

  // Several findings often quote the same phrase (e.g. the expert and the
  // students both flag one vocab list). Group them so the phrase gets one
  // highlight and its pins line up side by side instead of stacking.
  const groups = new Map<string, { boxes: PageBox[]; members: Annotation[] }>();
  slide.annotations.forEach((a, i) => {
    const bs = boxes[i];
    if (!bs?.length) return;
    const key = bs.map((b) => `${b.left.toFixed(3)},${b.top.toFixed(3)},${b.width.toFixed(3)}`).join('|');
    const g = groups.get(key) ?? { boxes: bs, members: [] };
    g.members.push(a);
    groups.set(key, g);
  });

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-raised)',
        overflow: 'hidden',
        minHeight: state.status === 'ready' ? undefined : 240,
      }}
    >
      <div data-canvas-slot />
      {state.status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: 'var(--text-mono-xs)',
            color: 'var(--ink-3)',
          }}
        >
          Rendering page {slide.index + 1}…
        </div>
      )}
      {state.status === 'ready' &&
        [...groups.entries()].map(([key, { boxes: bs, members }]) => {
          const lead = members.find((m) => m.id === activeId) ?? members[0]!;
          const color = KIND_COLOR[lead.kind];
          const on = members.some((m) => m.id === activeId);
          const first = bs[0]!;
          return (
            <div key={key}>
              {bs.map((b, j) => (
                <div
                  key={j}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: `${b.left * 100}%`,
                    top: `${b.top * 100}%`,
                    width: `${b.width * 100}%`,
                    height: `${b.height * 100}%`,
                    background: tint(color, on ? 34 : 18),
                    borderBottom: `2px solid ${color}`,
                    pointerEvents: 'none',
                    mixBlendMode: 'multiply',
                  }}
                />
              ))}
              {/* Pins sit just left of the phrase, vertically centred on its first line. */}
              {members.map((m, j) => (
                <Pin
                  key={m.id}
                  a={m}
                  active={activeId === m.id}
                  onActivate={onActivate}
                  style={{
                    position: 'absolute',
                    left: `max(2px, calc(${first.left * 100}% - ${(members.length - j) * 22 + 2}px))`,
                    top: `calc(${(first.top + first.height / 2) * 100}% - 10px)`,
                    zIndex: activeId === m.id ? 3 : 2,
                  }}
                />
              ))}
            </div>
          );
        })}
      {state.status === 'ready' && <CornerPins annotations={unplaced} activeId={activeId} onActivate={onActivate} />}
    </div>
  );
}

function KeyEntry({
  a,
  active,
  onActivate,
  sectionLabel,
}: {
  a: Annotation;
  active: boolean;
  onActivate: (id: string | null) => void;
  sectionLabel: string | null;
}) {
  const color = KIND_COLOR[a.kind];
  return (
    <li
      id={`slide-key-${a.id}`}
      onMouseEnter={() => onActivate(a.id)}
      onMouseLeave={() => onActivate(null)}
      style={{
        listStyle: 'none',
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${color}`,
        background: active ? tint(color, 10) : 'var(--surface-card)',
        transition: 'background var(--duration-fast) var(--ease-standard)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          minWidth: 22,
          height: 22,
          borderRadius: 'var(--radius-pill)',
          background: color,
          color: 'var(--surface-card)',
          font: '700 11px/22px var(--font-display)',
          textAlign: 'center',
        }}
      >
        {a.n}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ font: 'var(--text-mono-xs)', color }}>
          {a.sourceLabel}
          {sectionLabel && <span style={{ color: 'var(--text-tertiary)' }}> · {sectionLabel}</span>}
        </div>
        <p style={{ margin: 0, font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{a.text}</p>
        {a.quote && (
          <p style={{ margin: 0, font: 'var(--text-body-sm)', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
            “{a.quote}”
          </p>
        )}
        {a.details.map((d, i) => (
          <p key={i} style={{ margin: 0, fontSize: 12.5, fontFamily: 'var(--font-body)', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            {d}
          </p>
        ))}
      </div>
    </li>
  );
}

export function SlideView({
  assessment,
  pdfFile,
  onOpenChunk,
}: {
  assessment: Assessment;
  /** The uploaded PDF, when it's still in memory from this session. */
  pdfFile: File | null;
  onOpenChunk: (breakdown: ChunkBreakdown) => void;
}) {
  const map = useMemo(() => buildSlideMap(assessment), [assessment]);
  const [index, setIndex] = useState(() => {
    // Open on the first slide that has something to fix.
    const first = map?.slides.findIndex((s) => s.annotations.length > 0) ?? -1;
    return Math.max(first, 0);
  });
  // Hover is transient; a click pins the selection so it survives the
  // scroll to the key entry (which moves the pin out from under the cursor).
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = hoverId ?? selectedId;
  const stripRef = useRef<HTMLDivElement>(null);

  const total = map?.slides.length ?? 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      // The chunk drilldown sits on top of this view; don't flip slides behind it.
      if (document.querySelector('[data-lucida-overlay]')) return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  useEffect(() => {
    setHoverId(null);
    setSelectedId(null);
    stripRef.current
      ?.querySelector(`[data-thumb="${index}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [index]);

  if (!map) return null;

  const slide = map.slides[index]!;
  const unit = assessment.source?.format === 'pdf' ? 'Page' : 'Slide';
  const chunkById = new Map(assessment.chunkBreakdowns.map((b) => [b.chunk.id, b]));
  const showSection = slide.sections.length > 1;

  function activate(id: string | null, scroll = false) {
    if (!scroll) {
      setHoverId(id);
      return;
    }
    // Clicking the selected pin again lets go of it.
    if (id === selectedId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    if (id) document.getElementById(`slide-key-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const card = <TextSlideCard slide={slide} activeId={activeId} onActivate={activate} />;
  const issueCount = map.slides.reduce((n, s) => n + s.annotations.length, 0);
  const flaggedSlides = map.slides.filter((s) => s.annotations.length > 0).length;

  return (
    <div>
      <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
        {issueCount === 0
          ? `No problems pinned to any ${unit.toLowerCase()}.`
          : `${issueCount} issue${issueCount === 1 ? '' : 's'} across ${flaggedSlides} of ${total} ${unit.toLowerCase()}s.`}{' '}
        <span style={{ color: 'var(--text-tertiary)' }}>
          Numbered pins mark each problem; hover a pin or a key entry to see its partner.
        </span>
      </p>

      {/* Thumbnail strip — one tile per slide, coloured by how much needs fixing. */}
      <div
        ref={stripRef}
        role="tablist"
        aria-label={`${unit}s`}
        style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '8px 8px 10px 0', marginBottom: 16 }}
      >
        {map.slides.map((s) => {
          const selected = s.index === index;
          const title = s.text.split('\n').find((l) => l.trim()) ?? '';
          const edge = selected ? 'var(--text-primary)' : 'var(--border-default)';
          return (
            <button
              key={s.index}
              data-thumb={s.index}
              role="tab"
              aria-selected={selected}
              aria-label={`${unit} ${s.index + 1}: ${SEVERITY_LABEL[s.severity]}`}
              title={`${unit} ${s.index + 1} — ${SEVERITY_LABEL[s.severity]}`}
              onClick={() => setIndex(s.index)}
              style={{
                flexShrink: 0,
                width: 112,
                height: 63,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                padding: '6px 8px',
                textAlign: 'left',
                borderRadius: 'var(--radius-sm)',
                // One value per property (no shorthand + side override): React
                // mis-applies that pair when `selected` flips on rerender.
                borderStyle: 'solid',
                borderWidth: selected ? '2px 2px 4px' : '1px 1px 4px',
                borderColor: `${edge} ${edge} ${SEVERITY_COLOR[s.severity]} ${edge}`,
                background: selected ? 'var(--surface-card)' : 'var(--surface-sunken)',
                cursor: 'pointer',
              }}
            >
              <span style={{ font: '700 11px var(--font-display)', color: 'var(--text-tertiary)' }}>{s.index + 1}</span>
              <span
                style={{
                  font: '500 10.5px/1.3 var(--font-body)',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {title}
              </span>
              {s.annotations.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 'var(--radius-pill)',
                    background: SEVERITY_COLOR[s.severity],
                    color: 'var(--surface-card)',
                    font: '700 10px/16px var(--font-display)',
                    padding: '0 4px',
                  }}
                >
                  {s.annotations.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span style={{ font: 'var(--text-heading-md)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {unit} {index + 1} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>of {total}</span>
          </span>
          <span
            style={{
              font: 'var(--text-mono-xs)',
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {assessment.source?.fileName}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ← Prev
          </Button>
          <Button variant="secondary" size="sm" disabled={index === total - 1} onClick={() => setIndex(index + 1)}>
            Next →
          </Button>
        </div>
      </div>

      {pdfFile ? (
        <PdfSlide key={slide.index} file={pdfFile} slide={slide} activeId={activeId} onActivate={activate} fallback={card} />
      ) : (
        card
      )}
      {assessment.source?.format === 'pdf' && !pdfFile && (
        <p style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
          Showing the page's extracted text — the original PDF isn't stored, so the real page only appears right after
          uploading.
        </p>
      )}

      {/* The key: what each pin means, then what to change. */}
      <div style={{ ...eyebrow, margin: '24px 0 10px' }}>Key</div>
      {slide.annotations.length > 0 ? (
        <ol style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slide.annotations.map((a) => (
            <KeyEntry
              key={a.id}
              a={a}
              active={activeId === a.id}
              onActivate={activate}
              sectionLabel={showSection ? chunkById.get(a.chunkId)?.chunk.label ?? null : null}
            />
          ))}
        </ol>
      ) : (
        <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', margin: 0 }}>
          Nothing flagged on this {unit.toLowerCase()} — the simulated class followed it and neither reviewer raised a
          concern.
        </p>
      )}

      {slide.sections.some((s) => s.suggestions.length > 0) && (
        <>
          <div style={{ ...eyebrow, margin: '24px 0 10px' }}>Suggested changes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slide.sections
              .filter((s) => s.suggestions.length > 0)
              .map((s) => {
                const breakdown = chunkById.get(s.chunkId);
                return (
                  <div
                    key={s.chunkId}
                    style={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                        Section {s.order} · {s.label}
                      </span>
                      {breakdown && (
                        <button
                          onClick={() => onOpenChunk(breakdown)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        >
                          Revise &amp; recheck →
                        </button>
                      )}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {s.suggestions.map((sg) => (
                        <li key={sg.id} style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>
                          {sg.text}
                          <span
                            style={{
                              marginLeft: 6,
                              font: 'var(--text-mono-xs)',
                              color: sg.source === 'teacher' ? 'var(--text-teacher)' : 'var(--text-expert)',
                            }}
                          >
                            {sg.source === 'teacher' ? 'Teacher' : sg.principle ?? 'Expert'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {map.unplaced.length > 0 && (
        <details style={{ marginTop: 28 }}>
          <summary style={{ ...eyebrow, cursor: 'pointer' }}>
            {map.unplaced.length} finding{map.unplaced.length === 1 ? '' : 's'} not tied to a specific {unit.toLowerCase()}
          </summary>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {map.unplaced.map((u) => (
              <li key={u.id} style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>
                <span style={{ font: 'var(--text-mono-xs)', color: KIND_COLOR[u.kind] }}>{u.sourceLabel}</span> — {u.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
