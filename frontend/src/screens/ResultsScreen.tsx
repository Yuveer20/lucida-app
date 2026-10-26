import { useState } from 'react';
import type { Assessment, ChunkBreakdown } from '@lucida/shared';
import {
  CHUNK_STATUS_BG,
  CHUNK_STATUS_COLOR,
  CHUNK_STATUS_LABEL,
  ConfidenceGlance,
  GradeStamp,
  HeadlineRecommendation,
  RubricScorecard,
  Tabs,
} from '../ds/index.js';
import { SlideView } from './SlideView.js';

const eyebrow = {
  font: 'var(--text-eyebrow)',
  letterSpacing: 'var(--tracking-eyebrow)',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
} as const;

/** The one critique that actually explains why a chunk was flagged — its complaint, not a positive aside. */
function chunkReason(b: ChunkBreakdown): string | null {
  const teacherConcern = b.teacherCritiques.find((c) => c.stance === 'concern');
  if (teacherConcern) return teacherConcern.critique;
  return b.expertCritiques.find((c) => c.stance === 'concern')?.critique ?? null;
}

/** Which dimension groups (reading level, language, etc.) didn't understand this chunk, for the "struggled most" line. */
function struggledGroups(chunkId: string, dimensionBreakdowns: Assessment['dimensionBreakdowns']): string[] {
  const labels: string[] = [];
  for (const dim of dimensionBreakdowns) {
    for (const group of dim.groups) {
      const entry = group.perChunk.find((p) => p.chunkId === chunkId);
      if (entry && !entry.understood) labels.push(group.label);
    }
  }
  return labels;
}

const CHUNK_TAB = 'Chunk by chunk';

export function ResultsScreen({
  assessment,
  pdfFile,
  onOpenChunk,
  onReset,
}: {
  assessment: Assessment;
  /** The uploaded PDF, when still in memory from this session — lets the slide view draw real pages. */
  pdfFile: File | null;
  onOpenChunk: (breakdown: ChunkBreakdown) => void;
  onReset: () => void;
}) {
  const hasSlides = (assessment.source?.pages?.length ?? 0) > 0;
  const slideTab = assessment.source?.format === 'pdf' ? 'Page view' : 'Slide view';
  const [view, setView] = useState(hasSlides ? slideTab : CHUNK_TAB);

  return (
    <div style={{ padding: '0 24px 90px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div
          className="lucida-header-toggle-gutter"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 0',
            borderBottom: '1px solid var(--border-default)',
            marginBottom: 28,
            paddingRight: 110,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ font: '700 20px var(--font-display)', color: 'var(--text-primary)' }}>Lucida</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)' }}>
              {assessment.chunkBreakdowns.length} chunks · {assessment.personas.length} student profiles
            </div>
            <button
              onClick={onReset}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                font: 'var(--text-label)',
                color: 'var(--text-tertiary)',
              }}
            >
              New assessment
            </button>
          </div>
        </div>

        {/* Verdict — what to fix first. */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap' }}>
          <GradeStamp label={assessment.grade.label} meta={assessment.grade.meta} />
          <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ ...eyebrow, marginBottom: 2 }}>What to fix first</div>
            {assessment.headlineRecommendations.length > 0 ? (
              <HeadlineRecommendation items={assessment.headlineRecommendations.map((r) => r.text)} />
            ) : (
              <p style={{ font: 'var(--text-body-md)', color: 'var(--text-secondary)', margin: 0 }}>
                No chunk underperformed enough to raise a headline recommendation.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chunk-by-chunk reads more like a scan list than prose, so it gets a
          wider column than the verdict above it. */}
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ ...eyebrow, marginBottom: 10 }}>Lesson at a glance</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
          <ConfidenceGlance tones={assessment.chunkBreakdowns.map((b) => b.confidence.tone)} />
          <div
            style={{
              flex: '1 1 380px',
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Lesson rubric
            </div>
            <RubricScorecard scores={assessment.rubric.scores} />
          </div>
        </div>

        {hasSlides && (
          <div style={{ marginBottom: 20 }}>
            <Tabs tabs={[slideTab, CHUNK_TAB]} active={view} onChange={setView} />
          </div>
        )}

        {view === slideTab ? (
          <SlideView assessment={assessment} pdfFile={pdfFile} onOpenChunk={onOpenChunk} />
        ) : (
          <>
            <div style={{ ...eyebrow, marginBottom: 14 }}>Chunk by chunk — tap any row for the full read</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assessment.chunkBreakdowns.map((b) => {
                const tone = b.confidence.tone;
                const flagged = tone !== 'high';
                const reason = flagged ? chunkReason(b) : null;
                const struggled = flagged ? struggledGroups(b.chunk.id, assessment.dimensionBreakdowns) : [];

                return (
                  <button
                    key={b.chunk.id}
                    onClick={() => onOpenChunk(b)}
                    className="lucida-chunk-row"
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderLeft: `4px solid ${CHUNK_STATUS_COLOR[tone]}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: 10,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            color: CHUNK_STATUS_COLOR[tone],
                            background: CHUNK_STATUS_BG[tone],
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-pill)',
                          }}
                        >
                          {CHUNK_STATUS_LABEL[tone]}
                        </span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                          {b.chunk.order + 1} · {b.chunk.label}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        View full detail →
                      </span>
                    </div>
                    {reason && (
                      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        {reason}
                      </p>
                    )}
                    {struggled.length > 0 && (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'var(--font-body)',
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          color: 'var(--text-tertiary)',
                          fontStyle: 'italic',
                        }}
                      >
                        Struggled most: {struggled.join(', ')}.
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
