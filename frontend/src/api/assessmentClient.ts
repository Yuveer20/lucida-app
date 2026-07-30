import type { AssessRequest, AssessResponse, ApiError } from "@lucida/shared";

async function postJSON<TReq, TRes>(url: string, body: TReq): Promise<TRes> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ApiError;
    throw new Error(err.error ?? `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<TRes>;
}

export function postAssess(rawText: string): Promise<AssessResponse> {
  return postJSON<AssessRequest, AssessResponse>("/api/assess", { rawText });
}

export function postEcho(rawText: string): Promise<{ raw: string }> {
  return postJSON("/api/echo", { rawText });
}
