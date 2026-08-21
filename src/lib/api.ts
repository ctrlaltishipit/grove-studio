// Grove — calls to the serverless functions. The client sends ONLY { session_id }.
// Everything else is read server-side with the service-role key, because a client
// that could assemble other participants' notes would already have violated the
// independence invariant. GROVE-MASTER.md §12.2.
import { accessToken } from './auth';
import type { Finding } from './models';

export type ApiCode =
  | 'BAD_REQUEST' | 'UNAUTHORISED' | 'NOT_A_PARTICIPANT' | 'NOT_CREATOR' | 'SESSION_NOT_FOUND'
  | 'TOO_FEW_OBSERVERS' | 'TOO_FEW_NOTES' | 'LLM_BAD_JSON' | 'LLM_TIMEOUT' | 'INTERNAL' | 'FALLBACK';

export class ApiError extends Error {
  status: number;
  code: ApiCode;
  constructor(status: number, code: ApiCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** The one calm sentence per failure. Provider or database text NEVER reaches an observer. */
export const CLIENT_COPY: Record<ApiCode, string> = {
  BAD_REQUEST: 'Something went wrong with that request. Your notes are saved.',
  UNAUTHORISED: 'Your session expired. Reload the page.',
  NOT_A_PARTICIPANT: 'You are not a participant of this session.',
  NOT_CREATOR: 'Only the person who created the session can synthesise again.',
  SESSION_NOT_FOUND: "Synthesis didn't complete. Your notes are saved. Try again.",
  TOO_FEW_OBSERVERS: 'Synthesis needs at least two observers with notes.',
  TOO_FEW_NOTES: 'Synthesis needs at least 3 notes.',
  LLM_BAD_JSON: "Synthesis didn't complete. Your notes are saved. Try again.",
  LLM_TIMEOUT: "Synthesis didn't complete. Your notes are saved. Try again.",
  INTERNAL: "Synthesis didn't complete. Your notes are saved. Try again.",
  FALLBACK: "Synthesis didn't complete. Your notes are saved. Try again.",
};

export interface SynthesiseResult {
  ok: true;
  session_id: string;
  observer_total: number;
  findings: Finding[];
}

interface ApiPayload { ok?: boolean; code?: string; message?: string }

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await accessToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let payload: ApiPayload | null = null;
  try { payload = (await res.json()) as ApiPayload; } catch { /* non-JSON body (e.g. the SPA rewrite swallowed /api) */ }
  if (!res.ok || !payload?.ok) {
    const code = (payload?.code && payload.code in CLIENT_COPY ? payload.code : 'FALLBACK') as ApiCode;
    throw new ApiError(res.status, code, CLIENT_COPY[code]);
  }
  return payload as T;
}

export const synthesise = (sessionId: string): Promise<SynthesiseResult> =>
  post<SynthesiseResult>('/api/synthesise', { session_id: sessionId });
