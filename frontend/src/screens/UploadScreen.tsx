import { useEffect, useRef, useState } from 'react';
import { Button } from '../ds/index.js';

/**
 * Ported from the design system's UploadScreen.jsx. The ghost margin notes are
 * decorative — they preview the dual-margin idea that the results page makes
 * literal — and are hidden below 1020px and under prefers-reduced-motion.
 */
const HOW_IT_WORKS = [
  {
    title: 'Paste your lesson',
    body: 'Drop in a lesson plan as plain text — Lucida splits it into chunks automatically.',
    icon: (
      <path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z M6 6.5h12V20a1 1 0 01-1 1H7a1 1 0 01-1-1V6.5z M9 11h6M9 14h6M9 17h3.5" />
    ),
  },
  {
    title: 'A simulated classroom reacts',
    body: '18 student profiles read it chunk by chunk, alongside a practical Teacher agent and a learning-science Expert agent.',
    icon: <path d="M7 9a2 2 0 100-4 2 2 0 000 4zM12 9a2 2 0 100-4 2 2 0 000 4zM17 9a2 2 0 100-4 2 2 0 000 4zM4 18c0-2.5 1.4-4 3-4s3 1.5 3 4M9 18c0-2.5 1.4-4 3-4s3 1.5 3 4M14 18c0-2.5 1.4-4 3-4s3 1.5 3 4" />,
  },
  {
    title: 'See where it breaks, revise, recheck',
    body: 'Every chunk gets a plain-English verdict and a rubric score you can revise and recheck instantly.',
    icon: <path d="M4 20l1-4L15.5 5.5l3 3L8 19l-4 1z M13.5 7l3 3" />,
  },
] as const;

const MARGIN_NOTES = [
  { side: 'left', top: '20%', rot: -3, color: 'var(--teacher-500)', tag: 'Teacher', note: 'good hook — jump to an example' },
  { side: 'right', top: '40%', rot: 2, color: 'var(--expert-500)', tag: 'Cognitive Load Theory', note: 'watch new-term density' },
  { side: 'left', top: '62%', rot: 2, color: 'var(--teacher-500)', tag: 'Teacher', note: 'kids like pair work here' },
  { side: 'right', top: '82%', rot: -2, color: 'var(--expert-500)', tag: 'Retrieval Practice', note: 'spacing beats repetition' },
] as const;

export function UploadScreen({
  onSubmit,
  error,
  user,
  onShowHistory,
  onSignOut,
}: {
  onSubmit: (text: string, meta: { subject: string; gradeLevel: string }) => void;
  error?: string | null;
  user: { name: string | null; email: string | null; photoURL: string | null };
  onShowHistory: () => void;
  onSignOut: () => void;
}) {
  const [text, setText] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const iconStroke = {
    stroke: 'currentColor',
    strokeWidth: 1.5,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;

  const metaInput = {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    background: 'var(--surface-card)',
    color: 'var(--text-primary)',
    outline: 'none',
  } as const;

  return (
    <div style={{ background: 'var(--paper-1)' }}>
      <div
        className="lucida-header-toggle-gutter"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 130px 0 24px',
          height: 60,
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--surface-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ font: '700 19px var(--font-display)', color: 'var(--text-primary)' }}>Lucida</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <span
              style={{
                font: 'var(--text-label)',
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--expert-500)',
                paddingBottom: 19,
                marginBottom: -20,
              }}
            >
              New assessment
            </span>
            <button
              onClick={onShowHistory}
              style={{
                font: 'var(--text-label)',
                color: 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              History
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ color: 'var(--text-tertiary)' }}>
            <path {...iconStroke} d="M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title={user.email ?? undefined}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: user.photoURL ? `url(${user.photoURL}) center/cover no-repeat` : 'var(--paper-2)',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {!user.photoURL && (user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 200,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-raised)',
                  padding: 6,
                  zIndex: 60,
                }}
              >
                {user.email && (
                  <div
                    style={{
                      padding: '6px 10px 8px',
                      font: 'var(--text-mono-xs)',
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-default)',
                      marginBottom: 4,
                      wordBreak: 'break-all',
                    }}
                  >
                    {user.email}
                  </div>
                )}
                <button
                  className="lucida-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    font: 'var(--text-label)',
                    color: 'var(--confidence-low)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero section — the paste-your-lesson box. Dotted graph background
          and decorative margin notes are scoped to just this region. */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          className="lucida-graph-bg"
          style={{
            position: 'absolute',
            inset: '-56px',
            backgroundImage:
              'linear-gradient(var(--paper-3) 1px, transparent 1px), linear-gradient(90deg, var(--paper-3) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />

        {MARGIN_NOTES.map((m, i) => (
          <div
            key={i}
            className="lucida-drift"
            style={
              {
                position: 'absolute',
                top: m.top,
                [m.side]: 'max(1%, calc(50% - 460px))',
                maxWidth: 150,
                '--r': `${m.rot}deg`,
                transform: `rotate(${m.rot}deg)`,
                animationDelay: `${i * 0.7}s`,
                opacity: 0.55,
                pointerEvents: 'none',
              } as React.CSSProperties
            }
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: m.color,
                marginBottom: 3,
              }}
            >
              {m.tag}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontStyle: m.side === 'left' ? 'italic' : 'normal',
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.4,
                color: m.color,
                borderLeft: `2px solid ${m.color}`,
                paddingLeft: 8,
              }}
            >
              {m.note}
            </div>
          </div>
        ))}

        <div
          style={{
            position: 'relative',
            maxWidth: 680,
            margin: '0 auto',
            padding: '56px 24px 64px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div>
            <h1 style={{ font: 'var(--text-display-lg)', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Test your lesson before you teach it.
            </h1>
            <p style={{ font: 'var(--text-body-md)', color: 'var(--text-secondary)', margin: 0 }}>
              Paste your lesson plan below. A simulated classroom of 18 student profiles and two agents — a
              practical teacher, a learning-science expert — will read it chunk by chunk.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input
              style={{ ...metaInput, flex: '1 1 200px' }}
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <input
              style={{ ...metaInput, flex: '1 1 160px' }}
              placeholder="Grade level (optional)"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            />
          </div>

          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              boxShadow: focused
                ? '0 0 0 3px var(--expert-200), var(--shadow-raised)'
                : 'var(--shadow-card)',
              transition: 'box-shadow var(--duration-md) var(--ease-standard)',
            }}
          >
            <textarea
              rows={14}
              placeholder="Paste your lesson plan..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                lineHeight: 1.55,
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                resize: 'vertical',
                display: 'block',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-card)',
                borderLeft: '3px solid var(--confidence-low)',
                border: '1px solid var(--border-default)',
                font: 'var(--text-body-sm)',
                color: 'var(--text-secondary)',
              }}
            >
              <strong style={{ color: 'var(--confidence-low)' }}>Assessment failed.</strong> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <span style={{ font: 'var(--text-mono-xs)', color: 'var(--text-tertiary)' }}>
              {text.trim() ? `${text.trim().split(/\s+/).length} words` : 'Nothing pasted yet'}
            </span>
            <Button
              variant="primary"
              size="lg"
              disabled={!text.trim()}
              onClick={() => onSubmit(text, { subject, gradeLevel })}
            >
              Run assessment
            </Button>
          </div>
        </div>
      </div>

      {/* About band — sits below the paste-your-lesson box, as its own
          solid bar (matches the reference sketch: box, then this bar). */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          background: 'var(--surface-card)',
          borderTop: '1px solid var(--border-default)',
          borderBottom: '1px solid var(--border-default)',
          padding: '40px 24px',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ font: 'var(--text-eyebrow)', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>
              About Lucida
            </div>
            <p style={{ font: 'var(--text-body-md)', color: 'var(--text-primary)', margin: 0, maxWidth: 640 }}>
              Lucida runs your lesson plan through a simulated classroom before you ever teach it — so you find
              out where students get lost while it's still just a draft.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                style={{
                  background: 'var(--paper-1)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 20px 22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" style={{ color: 'var(--expert-500)', flexShrink: 0 }}>
                    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      {step.icon}
                    </g>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {step.title}
                </div>
                <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Free space — same dotted background as the hero section, giving the
          page room to breathe below the About bar before it ends (matches
          the reference sketch). */}
      <div
        className="lucida-graph-bg"
        style={{
          height: 140,
          backgroundImage:
            'linear-gradient(var(--paper-3) 1px, transparent 1px), linear-gradient(90deg, var(--paper-3) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.6,
        }}
      />
    </div>
  );
}
