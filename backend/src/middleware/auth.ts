import type { NextFunction, Request, Response } from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Verifies a Firebase ID token on every protected route.
 *
 * Firebase Auth on the frontend only gates which screen renders — it never
 * travels with the actual fetch() to this backend unless the frontend
 * explicitly attaches it (see frontend/src/api/client.ts), and nothing here
 * checked it until now. Firestore security rules do not help either: they
 * only protect direct Firestore access from the client SDK, not a separate
 * Express API. Without this, /assess and /recheck — each ~20+ billed LLM
 * calls — were reachable by anyone on the internet with no login at all
 * (audit Critical #1).
 *
 * No local-dev bypass flag on purpose: an env var that skips auth is exactly
 * the kind of thing that gets copy-pasted into a production environment by
 * accident. Local dev uses the same real service account as prod, the same
 * way ANTHROPIC_API_KEY already has to be set locally to run anything.
 */

interface DecodedAuth {
  uid: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: DecodedAuth;
  }
}

function loadServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON — paste the full downloaded service-account JSON as a single-line value.',
    );
  }
}

const serviceAccount = loadServiceAccount();

if (serviceAccount && getApps().length === 0) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializeApp({ credential: cert(serviceAccount as any) });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!serviceAccount) {
    // Fail closed: an unconfigured deploy must reject requests, not silently
    // skip the check it exists to perform.
    // eslint-disable-next-line no-console
    console.error('[lucida] FIREBASE_SERVICE_ACCOUNT is not set — rejecting request to a protected route.');
    res.status(503).json({ error: 'Server authentication is not configured.' });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) {
    res.status(401).json({ error: 'Sign in required.' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.auth = { uid: decoded.uid };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}
