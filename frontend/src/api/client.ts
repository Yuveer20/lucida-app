import type {
  AssessRequest,
  AssessResponse,
  RecheckRequest,
  RecheckResponse,
} from '@lucida/shared';

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const response = await fetch(path, {
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
