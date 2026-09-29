import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Button } from '../ds/index.js';
import { auth, googleProvider } from '../lib/firebase.js';

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--paper-1)', overflow: 'hidden' }}>
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

      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 380,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-raised)',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div>
            <div style={{ font: '700 22px var(--font-display)', color: 'var(--text-primary)', marginBottom: 8 }}>
              Lucida
            </div>
            <p style={{ font: 'var(--text-body-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              Sign in to run assessments and keep a history of every lesson plan you've tested.
            </p>
          </div>

          <Button variant="primary" size="lg" disabled={busy} onClick={handleSignIn}>
            {busy ? 'Signing in…' : 'Continue with Google'}
          </Button>

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
              <strong style={{ color: 'var(--confidence-low)' }}>Sign-in failed.</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
