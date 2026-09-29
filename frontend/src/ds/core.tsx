/**
 * Lucida Design System — core components.
 * Ported from the Claude Design project `fe1bab0f` (components/core/*.jsx),
 * converted from React.createElement to JSX and given prop types.
 */
import type { CSSProperties, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'teacher' | 'expert' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const base: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition:
      'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: disabled ? 0.5 : 1,
  };

  const sizes: Record<ButtonSize, CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '10px 18px', fontSize: 15 },
    lg: { padding: '13px 24px', fontSize: 16 },
  };

  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: { background: 'var(--action-primary)', color: 'var(--text-on-inverse)' },
    teacher: { background: 'var(--teacher-500)', color: '#fff' },
    expert: { background: 'var(--expert-500)', color: '#fff' },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-strong)',
    },
    ghost: { background: 'transparent', color: 'var(--text-primary)' },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant] }}
    >
      {children}
    </button>
  );
}

export type BadgeTone = 'neutral' | 'teacher' | 'expert' | 'high' | 'mid' | 'low';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, CSSProperties> = {
    neutral: { background: 'var(--paper-2)', color: 'var(--text-secondary)' },
    teacher: { background: 'var(--teacher-50)', color: 'var(--text-teacher)' },
    expert: { background: 'var(--expert-50)', color: 'var(--text-expert)' },
    high: { background: '#EAF3EB', color: 'var(--confidence-high)' },
    mid: { background: '#FBF1DE', color: 'var(--confidence-mid)' },
    low: { background: '#F8E7E4', color: 'var(--confidence-low)' },
  };

  return (
    <span
      style={{
        ...tones[tone],
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 'var(--radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        display: 'inline-block',
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  padding = 'var(--space-6)',
  raised = false,
}: {
  children: ReactNode;
  padding?: string;
  raised?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding,
        boxShadow: raised ? 'var(--shadow-raised)' : 'var(--shadow-card)',
      }}
    >
      {children}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        borderBottom: '1px solid var(--border-default)',
        overflowX: 'auto',
      }}
    >
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            padding: '10px 4px',
            marginBottom: -1,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: t === active ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: t === active ? '2px solid var(--expert-500)' : '2px solid transparent',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export function Tag({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-pill)',
        padding: '4px 10px 4px 12px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        color: 'var(--text-secondary)',
      }}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
