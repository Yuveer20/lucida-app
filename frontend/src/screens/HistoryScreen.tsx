import type { Assessment } from '@lucida/shared';

const eyebrow = {
  font: 'var(--text-eyebrow)',
  letterSpacing: 'var(--tracking-eyebrow)',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
} as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function HistoryScreen({
  items,
  onOpen,
  onDelete,
  onBack,
}: {
  /** null while the initial fetch is in flight. */
  items: Assessment[] | null;
  onOpen: (assessment: Assessment) => void;
  onDelete: (assessmentId: string) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 90px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 0',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: 28,
          gap: 16,
        }}
      >
        <div style={{ font: '700 20px var(--font-display)', color: 'var(--text-primary)' }}>Lucida</div>
        <button
          onClick={onBack}
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

      <div style={{ ...eyebrow, marginBottom: 14 }}>History — past assessments</div>

      {items === null && (
        <p style={{ font: 'var(--text-body-md)', color: 'var(--text-secondary)' }}>Loading…</p>
      )}

      {items !== null && items.length === 0 && (
        <p style={{ font: 'var(--text-body-md)', color: 'var(--text-secondary)' }}>
          No assessments yet. Run one and it'll show up here.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
              }}
            >
              <button
                onClick={() => onOpen(a)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--teacher-700)', textTransform: 'uppercase' }}>
                    {a.grade.label}
                  </span>
                  <span style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)' }}>
                    {formatDate(a.createdAt)} · {a.chunkBreakdowns.length} chunks
                  </span>
                </div>
                <span style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{a.grade.meta}</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this assessment? This cannot be undone.')) onDelete(a.id);
                }}
                title="Delete"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  font: 'var(--text-mono-xs)',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
