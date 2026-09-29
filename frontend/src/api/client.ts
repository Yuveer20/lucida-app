import type {
  AssessRequest,
  AssessResponse,
  RecheckRequest,
  RecheckResponse,
} from '@lucida/shared';

/**
 * Empty by default — relative paths ('/api/assess') work as-is when frontend
 * and backend share an origin (Vite's dev proxy, or a same-domain deploy).
 * Set VITE_API_URL to the backend's URL once it's on a separate domain
 * (e.g. the frontend on Vercel, the backend on Render).
 */
const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { error?: string; detail?: string };
      detail = [payload.error, payload.detail].filter(Boolean).join(' — ') || detail;
    } catch {
      // response had no JSON body; keep the status line
    }
    throw new Error(detail);
  }

  return (await response.json()) as TRes;
}

export function assess(req: AssessRequest): Promise<AssessResponse> {
  return post<AssessRequest, AssessResponse>('/api/assess', req);
}

export function recheck(req: RecheckRequest): Promise<RecheckResponse> {
  return post<RecheckRequest, RecheckResponse>('/api/recheck', req);
}
