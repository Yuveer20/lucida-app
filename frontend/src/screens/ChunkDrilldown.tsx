import { useState } from 'react';
import type { ChunkBreakdown, ChunkRubric, ExpertAgentCritique, Persona, RecheckResult, RubricCategoryId } from '@lucida/shared';
import { Badge, Button, ConfidenceRange, RubricDetailList, RubricScorecard, Textarea } from '../ds/index.js';
import { recheck } from '../api/client.js';

const label = { font: 'var(--text-label)', color: 'var(--text-tertiary)', marginBottom: 6 } as const;

/**
 * Which principle names justify each rubric category's score, for the
 * drill-down's "why" — cross-referencing citedCritiqueIds (already computed
 * in aggregation/rubric.ts) against the chunk's own expert critiques.
 * Classroom Fit cites teacher critiques, which have no principle field by
 * design (§4.2), so it naturally shows no tags — that's correct, not a gap.
 */
function principlesByCategory(
  rubric: ChunkRubric,
  expertCritiques: ExpertAgentCritique[],
): Partial<Record<RubricCategoryId, string[]>> {
  const map: Partial<Record<RubricCategoryId, string[]>> = {};
  for (const score of rubric.scores) {
    if (score.citedCritiqueIds.length === 0) continue;
    const names = score.citedCritiqueIds
      .map((id) => expertCritiques.find((c) => c.id === id)?.principle)
      .filter((n): n is string => Boolean(n));
    if (names.length > 0) map[score.category] = [...new Set(names)];
  }
  return map;
}

/**
 * Full-depth panel for one chunk, plus the revise-and-recheck loop
 * (Technical Design §4.7). Recheck calls the API for real — it re-runs just
 * this chunk against every agent and returns a before/after plus the
 * recheck-specific QA verdict.
 */
export function ChunkDrilldown({
  breakdown,
  personas,
  onClose,
}: {
  breakdown: ChunkBreakdown;
  personas: Persona[];
  onClose: () => void;
}) {
  const [revision, setRevision] = useState(breakdown.chunk.text);
  const [result, setResult] = useState<RecheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personaName = (id: string) => personas.find((p) => p.id === id)?.name ?? id;
  const dirty = revision.trim() !== breakdown.chunk.text.trim();

  async function runRecheck() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await recheck({
        chunkId: breakdown.chunk.id,
        original: breakdown.chunk,
        revisedText: revision,
        previousConfidence: breakdown.confidence,
        previousCritiques: [
          ...breakdown.teacherCritiques.map((c) => c.critique),
          ...breakdown.expertCritiques.map((c) => c.critique),
        ],
      });
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recheck failed.');
    } finally {
      setBusy(false);
    }
  }

  const struggled = breakdown.studentResults.filter((r) => !r.understood);

  return (
    <div
      data-lucida-overlay
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(43,38,34,0.4)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '90vw',
          height: '100%',
          background: 'var(--surface-page)',
          overflowY: 'auto',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-raised)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              font: 'var(--text-eyebrow)',
              letterSpacing: 'var(--tracking-eyebrow)',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Chunk {breakdown.chunk.order + 1} — {breakdown.chunk.label}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--text-tertiary)',
            }}
          >
            Close ×
          </button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={label}>Lesson text</div>
          <p style={{ font: 'var(--text-body-md)', color: 'var(--text-primary)', margin: 0 }}>
            {breakdown.chunk.text}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
          <div>
            <div style={label}>Comprehension confidence</div>
            <ConfidenceRange
              low={breakdown.confidence.low}
              high={breakdown.confidence.high}
              tone={breakdown.confidence.tone}
            />
          </div>

          <div>
            <div style={label}>Rubric</div>
            <RubricDetailList
              scores={breakdown.rubric.scores}
              principlesByCategory={principlesByCategory(breakdown.rubric, breakdown.expertCritiques)}
            />
          </div>

          {breakdown.teacherCritiques.length > 0 && (
            <div>
              <Badge tone="teacher">Experienced Teacher agent</Badge>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {breakdown.teacherCritiques.map((c) => (
                  <li key={c.id} style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>
                    {c.critique}
                    {c.qaFlag && <QaFlagNote flag={c.qaFlag} />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {breakdown.expertCritiques.length > 0 && (
            <div>
              <Badge tone="expert">Expert-in-Teaching-Science agent</Badge>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {breakdown.expertCritiques.map((c) => (
                  <li key={c.id} style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--expert-600)',
                        background: 'var(--expert-50)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 4,
                      }}
                    >
                      {c.principle}
                    </span>
                    <div>{c.critique}</div>
                    {c.qaFlag && <QaFlagNote flag={c.qaFlag} />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {breakdown.suggestions.length > 0 && (
            <div>
              <div style={label}>Improvement suggestions</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {breakdown.suggestions.map((s) => (
                  <li key={s.id} style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>
                    {s.text}{' '}
                    <span style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)' }}>
                      — {s.principle ?? 'Teacher'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div style={label}>
              Where students got stuck ({struggled.length} of {breakdown.studentResults.length} profiles)
            </div>
            {struggled.length === 0 ? (
              <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                Every simulated profile followed this chunk.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {struggled.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderLeft: '3px solid var(--confidence-low)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div
                      style={{
                        font: 'var(--text-mono-xs)',
                        color: 'var(--text-tertiary)',
                        marginBottom: 4,
                      }}
                    >
                      {personaName(r.personaId)}
                      {r.qaFlag ? ` · flagged ${r.qaFlag}` : ''}
                    </div>
                    <div style={{ font: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{r.reason}</div>
                    {r.stuckPoint && (
                      <div
                        style={{
                          font: 'var(--text-body-sm)',
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                          fontStyle: 'italic',
                        }}
                      >
                        Stuck on: {r.stuckPoint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 24 }}>
          <div style={{ font: 'var(--text-heading-md)', color: 'var(--text-primary)', marginBottom: 10 }}>
            Revise &amp; recheck
          </div>
          <Textarea
            rows={5}
            value={revision}
            onChange={(e) => {
              setRevision(e.target.value);
              setResult(null);
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 10,
              gap: 12,
            }}
          >
            <span style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)' }}>
              {dirty ? 'Edited' : 'Unchanged from the original'}
            </span>
            <Button variant="expert" onClick={runRecheck} disabled={busy || !revision.trim()}>
              {busy ? 'Rechecking…' : 'Recheck this chunk'}
            </Button>
          </div>

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderLeft: '3px solid var(--confidence-low)',
                borderRadius: 'var(--radius-md)',
                font: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              {error}
            </div>
          )}

          {result && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ ...label, marginBottom: 10 }}>Before</div>
              <ConfidenceRange
                low={result.before.low}
                high={result.before.high}
                tone={result.before.tone}
              />
              <div style={{ ...label, marginTop: 12, marginBottom: 10 }}>After</div>
              <ConfidenceRange low={result.after.low} high={result.after.high} tone={result.after.tone} />

              <div style={{ ...label, marginTop: 12, marginBottom: 6 }}>Rubric — before / after</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <RubricScorecard scores={breakdown.rubric.scores} dense />
                <RubricScorecard scores={result.rubric.scores} dense />
              </div>

              <p
                style={{
                  font: 'var(--text-body-sm)',
                  color: result.qa.respondedToRevision
                    ? 'var(--text-secondary)'
                    : 'var(--confidence-low)',
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                {result.qa.respondedToRevision
                  ? `QA pass confirmed this critique responds to your actual revision, not stale or hallucinated feedback. ${result.qa.note}`
                  : `QA warning: ${result.qa.note}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QaFlagNote({ flag }: { flag: string }) {
  return (
    <div
      style={{
        font: 'var(--text-mono-xs)',
        color: 'var(--confidence-low)',
        marginTop: 4,
      }}
    >
      QA flagged this as {flag} — treat it as unverified.
    </div>
  );
}
