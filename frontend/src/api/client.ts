import type {
  AssessRequest,
  AssessResponse,
  RecheckRequest,
  RecheckResponse,
} from '@lucida/shared';
import { auth } from '../lib/firebase.js';

/**
 * Empty by default — relative paths ('/api/assess') work as-is when frontend
 * and backend share an origin (Vite's dev proxy, or a same-domain deploy).
 * Set VITE_API_URL to the backend's URL once it's on a separate domain
 * (e.g. the frontend on Vercel, the backend on Render).
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

// The backend verifies this token on every protected route — a stale/expired
// cached token would just get a 401 back, not a silent failure, so forcing a
// refresh here isn't necessary for correctness.
async function getToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('You need to be signed in to do this.');
  }
  return token;
}

async function parseErrorResponse(response: Response): Promise<never> {
  let detail = `${response.status} ${response.statusText}`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string };
    detail = [payload.error, payload.detail].filter(Boolean).join(' — ') || detail;
  } catch {
    // response had no JSON body; keep the status line
  }
  throw new Error(detail);
}

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const token = await getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  return (await response.json()) as TRes;
}

export function assess(req: AssessRequest): Promise<AssessResponse> {
  return post<AssessRequest, AssessResponse>('/api/assess', req);
}

export function recheck(req: RecheckRequest): Promise<RecheckResponse> {
  return post<RecheckRequest, RecheckResponse>('/api/recheck', req);
}

export interface ExtractTextResponse {
  text: string;
  count: number;
  format: 'pdf' | 'pptx';
}

/** Uploads a PDF or .pptx for server-side text extraction — does not run an assessment. */
export async function extractText(file: File): Promise<ExtractTextResponse> {
  const token = await getToken();

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/extract-text`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    return parseErrorResponse(response);
  }

  return (await response.json()) as ExtractTextResponse;
}
