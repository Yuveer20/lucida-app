import { useEffect, useState } from 'react';

/**
 * Ported from the design system's ProcessingScreen.jsx.
 *
 * The step labels rotate on a timer rather than tracking real pipeline
 * progress: the backend answers one request and the ~40 calls inside it are
 * not streamed. The labels are honest about what the pipeline does, in order,
 * but they are not a progress bar and are not presented as one.
 */
const STEPS = [
  'Chunking lesson into logical sections',
  'Running 18 Student Agent profiles across 10 dimensions',
  'Experienced Teacher agent reviewing',
  'Expert-in-Teaching-Science agent reviewing',
  'Cross-checking for hallucination & drift',
];

export function ProcessingScreen() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '100px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ font: '700 20px var(--font-display)', color: 'var(--text-primary)', marginBottom: 20 }}>
        Lucida
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          border: '2.5px solid var(--border-strong)',
          borderTopColor: 'var(--expert-500)',
          borderRadius: '50%',
          animation: 'lucida-spin 900ms linear infinite',
        }}
      />
      <h2 style={{ font: 'var(--text-heading-lg)', color: 'var(--text-primary)', margin: 0 }}>
        Reading your lesson plan...
      </h2>
      <p
        style={{
          font: 'var(--text-body-sm)',
          color: 'var(--text-tertiary)',
          margin: 0,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {STEPS[i]}
      </p>
      <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-tertiary)', margin: 0, maxWidth: 380 }}>
        This runs around 40 model calls and usually takes a minute or two.
      </p>
    </div>
  );
}
