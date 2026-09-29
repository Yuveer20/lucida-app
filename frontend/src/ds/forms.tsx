/**
 * Lucida Design System — form controls.
 * Ported from the Claude Design project `fe1bab0f` (components/forms/*.jsx).
 */
import type { ChangeEvent, CSSProperties } from 'react';

const base: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

export function Input({
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={base}
      onFocus={(e) => (e.target.style.borderColor = 'var(--focus-ring)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
    />
  );
}

export function Textarea({
  placeholder,
  value,
  onChange,
  rows = 10,
}: {
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
}) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
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
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--focus-ring)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
    />
  );
}

export function Select({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        background: 'var(--surface-card)',
        color: 'var(--text-primary)',
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
