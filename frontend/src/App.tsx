import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import type { Assessment, ChunkBreakdown } from '@lucida/shared';
import { assess } from './api/client.js';
import { auth } from './lib/firebase.js';
import { deleteAssessment, listAssessments, saveAssessment } from './lib/history.js';
import { useAuth } from './hooks/useAuth.js';
import { LoginScreen } from './screens/LoginScreen.js';
import { HistoryScreen } from './screens/HistoryScreen.js';
import { UploadScreen } from './screens/UploadScreen.js';
import { ProcessingScreen } from './screens/ProcessingScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { ChunkDrilldown } from './screens/ChunkDrilldown.js';

type Stage = 'upload' | 'processing' | 'results' | 'history';

export function App() {
  const { user, loading: authLoading } = useAuth();

  const [stage, setStage] = useState<Stage>('upload');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [openChunk, setOpenChunk] = useState<ChunkBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [historyItems, setHistoryItems] = useState<Assessment[] | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Reset all local state on sign-out so the next teacher never sees a stale session.
  useEffect(() => {
    if (!user) {
      setStage('upload');
      setAssessment(null);
      setOpenChunk(null);
      setError(null);
      setHistoryItems(null);
    }
  }, [user]);

  async function handleSubmit(text: string, meta: { subject: string; gradeLevel: string }) {
    setStage('processing');
    setError(null);
    try {
      const response = await assess({
        lessonText: text,
        subject: meta.subject || undefined,
        gradeLevel: meta.gradeLevel || undefined,
      });
      setAssessment(response.assessment);
      setStage('results');
      if (user) {
        saveAssessment(user.uid, response.assessment).catch((err) => {
          console.error('Failed to save assessment to history', err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed.');
      setStage('upload');
    }
  }

  function reset() {
    setAssessment(null);
    setOpenChunk(null);
    setError(null);
    setStage('upload');
  }

  async function openHistory() {
    setStage('history');
    if (user) {
      setHistoryItems(null);
      try {
        setHistoryItems(await listAssessments(user.uid));
      } catch (err) {
        console.error('Failed to load history', err);
        setHistoryItems([]);
      }
    }
  }

  async function handleDeleteHistoryItem(assessmentId: string) {
    if (!user) return;
    try {
      await deleteAssessment(user.uid, assessmentId);
      setHistoryItems((items) => items?.filter((a) => a.id !== assessmentId) ?? items);
    } catch (err) {
      console.error('Failed to delete assessment', err);
    }
  }

  if (authLoading) {
    return <div style={{ minHeight: '100vh', background: 'var(--surface-page)' }} />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <button
        onClick={() => setDark((d) => !d)}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 50,
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 12,
          padding: '6px 12px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        {dark ? 'Light mode' : 'Dark mode'}
      </button>

      {stage === 'upload' && (
        <UploadScreen
          onSubmit={handleSubmit}
          error={error}
          user={{ name: user.displayName, email: user.email, photoURL: user.photoURL }}
          onShowHistory={openHistory}
          onSignOut={() => signOut(auth)}
        />
      )}
      {stage === 'processing' && <ProcessingScreen />}
      {stage === 'results' && assessment && (
        <ResultsScreen assessment={assessment} onOpenChunk={setOpenChunk} onReset={reset} />
      )}
      {stage === 'history' && (
        <HistoryScreen
          items={historyItems}
          onOpen={(a) => {
            setAssessment(a);
            setStage('results');
          }}
          onDelete={handleDeleteHistoryItem}
          onBack={reset}
        />
      )}
      {openChunk && assessment && (
        <ChunkDrilldown
          breakdown={openChunk}
          personas={assessment.personas}
          onClose={() => setOpenChunk(null)}
        />
      )}
    </div>
  );
}
