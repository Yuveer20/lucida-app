/**
 * Lucida Design System — lesson-domain components.
 * Ported from the Claude Design project `fe1bab0f` (components/lesson/*.jsx).
 */
import type { RubricBand, RubricCategoryId, RubricCategoryScore, Tone } from '@lucida/shared';
import { RUBRIC_CATEGORIES } from '@lucida/shared';

export function ConfidenceRange({
  low,
  high,
  tone = 'mid',
}: {
  low: number;
  high: number;
  tone?: Tone;
}) {
  const colors: Record<Tone, string> = {
    high: 'var(--confidence-high)',
    mid: 'var(--confidence-mid)',
    low: 'var(--confidence-low)',
  };
  const ticks = [25, 50, 75];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-secondary)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 100,
          height: 6,
          background: 'var(--paper-2)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: `${t}%`,
              top: -2,
              width: 1,
              height: 10,
              background: 'var(--paper-3)',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${low}%`,
            width: `${Math.max(0, high - low)}%`,
            height: '100%',
            background: colors[tone],
            borderRadius: 'var(--radius-pill)',
          }}
        />
      </div>
      <span>
        {low}–{high}%
      </span>
    </div>
  );
}

const GLANCE_TONE_LABEL: Record<Tone, string> = {
  high: 'On track',
  mid: 'Could be stronger',
  low: 'Needs a fix',
};

const GLANCE_TONE_COLOR: Record<Tone, string> = {
  high: 'var(--confidence-high)',
  mid: 'var(--confidence-mid)',
  low: 'var(--confidence-low)',
};

const GLANCE_TONE_BG: Record<Tone, string> = {
  high: 'var(--confidence-high-bg)',
  mid: 'var(--confidence-mid-bg)',
  low: 'var(--confidence-low-bg)',
};

const GLANCE_TONE_ORDER: Tone[] = ['high', 'mid', 'low'];

/**
 * One-glance summary of how many chunks landed in each confidence tone — a
 * donut plus a legend, standing in for what used to be a full per-dimension
 * comprehension matrix. The matrix's detail (which specific student groups
 * struggled) now surfaces per-chunk in the "struggled most" line on the
 * chunk list instead of as its own always-visible section.
 */
export function ConfidenceGlance({ tones }: { tones: Tone[] }) {
  const counts: Record<Tone, number> = { high: 0, mid: 0, low: 0 };
  tones.forEach((t) => {
    counts[t] += 1;
  });
  const total = tones.length;

  let cursor = 0;
  const stops = GLANCE_TONE_ORDER.filter((t) => counts[t] > 0).map((t) => {
    const start = (cursor / total) * 100;
    cursor += counts[t];
    const end = (cursor / total) * 100;
    return `${GLANCE_TONE_COLOR[t]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '18px 22px',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-card)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }} aria-hidden="true">
        <div
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${stops.join(', ')})` }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 15,
            borderRadius: '50%',
            background: 'var(--surface-card)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, lineHeight: 1.1, color: 'var(--text-primary)' }}>
            {total}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 9,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            chunks
          </span>
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 180 }}>
        {GLANCE_TONE_ORDER.map((t) => (
          <li
            key={t}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 13.5,
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: GLANCE_TONE_COLOR[t] }} />
            <span style={{ flex: 1 }}>{GLANCE_TONE_LABEL[t]}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {counts[t]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { GLANCE_TONE_LABEL as CHUNK_STATUS_LABEL, GLANCE_TONE_COLOR as CHUNK_STATUS_COLOR, GLANCE_TONE_BG as CHUNK_STATUS_BG };

export function RollCallStrip({
  label,
  students,
}: {
  label: string;
  students: Array<{ name: string; understood: boolean }>;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {label && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            minWidth: 96,
          }}
        >
          {label}
        </span>
      )}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {students.map((s, i) => (
          <span
            key={i}
            title={`${s.name} — ${s.understood ? 'followed this' : 'did not follow this'}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: s.understood ? 'var(--expert-500)' : 'transparent',
              border: '1.5px solid var(--expert-500)',
              display: 'inline-block',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function HeadlineRecommendation({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'baseline' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 13,
              color: 'var(--text-tertiary)',
            }}
          >
            {i + 1}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 20,
              lineHeight: 1.35,
              color: 'var(--text-primary)',
            }}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

/** SOLID/REVISE/REWORK map onto the same three-tone severity scale as everything else on the results page. */
const GRADE_TONE: Record<string, Tone> = { SOLID: 'high', REVISE: 'mid', REWORK: 'low' };

export function GradeStamp({
  label = 'REVISE',
  meta = '2 of 4 chunks flagged',
}: {
  label?: string;
  meta?: string;
}) {
  const tone = GRADE_TONE[label] ?? 'mid';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${GLANCE_TONE_COLOR[tone]}`,
        boxShadow: 'var(--shadow-card)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          alignSelf: 'flex-start',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 13,
          color: GLANCE_TONE_COLOR[tone],
          background: GLANCE_TONE_BG[tone],
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
        {meta}
      </span>
    </div>
  );
}

/**
 * Assessment rubric (Technical Design §4.10) — added after the original
 * design-system port, so it follows the port's conventions (inline styles,
 * CSS-variable tokens only) rather than reusing an existing design-system
 * artboard. Lesson Flow is unbanded — an outlined ring rather than a filled
 * dot — since it's a direct readout of comprehension, not a scored judgment.
 */
const BAND_COLOR: Record<Exclude<RubricBand, null>, string> = {
  strong: 'var(--confidence-high)',
  adequate: 'var(--confidence-mid)',
  'needs-work': 'var(--confidence-low)',
  missing: 'var(--text-tertiary)',
};

export function RubricBandDot({ band, size = 8 }: { band: RubricBand | null; size?: number }) {
  if (band === null) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1.5px solid var(--text-tertiary)',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
    );
  }
  const filled = band !== 'missing';
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-block',
        flexShrink: 0,
        background: filled ? BAND_COLOR[band] : 'transparent',
        border: filled ? 'none' : `1.5px solid ${BAND_COLOR[band]}`,
      }}
    />
  );
}

/**
 * Compact row of 5 dots (ledger rows, e.g. the drill-down's before/after
 * recheck comparison) or, for the lesson-level top tier, a bordered grid —
 * cells with dividing lines like a printed rubric table, each showing the
 * category's literal 0-10 grade rather than a floating dot+label chip.
 */
export function RubricScorecard({ scores, dense = false }: { scores: RubricCategoryScore[]; dense?: boolean }) {
  if (dense) {
    return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {RUBRIC_CATEGORIES.map((cat) => {
          const score = scores.find((s) => s.category === cat.id);
          if (!score) return null;
          return (
            <span key={cat.id} title={`${cat.label}: ${score.note}`}>
              <RubricBandDot band={score.band} />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${RUBRIC_CATEGORIES.length}, 1fr)`,
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
      }}
    >
      {RUBRIC_CATEGORIES.map((cat, i) => {
        const score = scores.find((s) => s.category === cat.id);
        if (!score) return null;
        return (
          <div
            key={cat.id}
            title={`${cat.label}: ${score.note}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '10px 6px',
              textAlign: 'center',
              background: 'var(--paper-2)',
              borderRight: i < RUBRIC_CATEGORIES.length - 1 ? '1px solid var(--border-default)' : 'none',
            }}
          >
            <RubricBandDot band={score.band} size={7} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1,
                color: score.score !== null && score.band ? BAND_COLOR[score.band] : 'var(--text-tertiary)',
              }}
            >
              {score.score !== null ? `${score.score}/10` : '—'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: 10,
                lineHeight: 1.3,
                color: 'var(--text-tertiary)',
              }}
            >
              {cat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full per-category breakdown for the chunk drill-down — band, the agent's
 * justifying note, and (categories 2-4 only) which specific principle drove
 * the score, so a merged rubric row never hides its research trail (PRD §4).
 */
export function RubricDetailList({
  scores,
  principlesByCategory,
}: {
  scores: RubricCategoryScore[];
  principlesByCategory?: Partial<Record<RubricCategoryId, string[]>>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {RUBRIC_CATEGORIES.map((cat) => {
        const score = scores.find((s) => s.category === cat.id);
        if (!score) return null;
        const principles = principlesByCategory?.[cat.id] ?? [];
        return (
          <div key={cat.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ marginTop: 4 }}>
              <RubricBandDot band={score.band} size={9} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                  }}
                >
                  {cat.label}
                </span>
                {score.score !== null && score.band && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      fontSize: 12,
                      color: BAND_COLOR[score.band],
                    }}
                  >
                    {score.score}/10
                  </span>
                )}
              </div>
              <div style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                {score.note}
              </div>
              {principles.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {principles.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--expert-600)',
                        background: 'var(--expert-50)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
