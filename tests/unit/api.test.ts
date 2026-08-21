import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/auth', () => ({ accessToken: vi.fn(async () => 'jwt-123') }));

import { ApiError, CLIENT_COPY, synthesise } from '../../src/lib/api';

function mockFetch(status: number, body: unknown, json = true) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => { if (!json) throw new SyntaxError('not json'); return body; },
  } as unknown as Response;
  const fn = vi.fn(async () => res);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('synthesise()', () => {
  it('sends only { session_id } with the bearer token', async () => {
    const fn = mockFetch(200, { ok: true, session_id: 's', observer_total: 3, findings: [] });
    await synthesise('s');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/synthesise');
    expect(JSON.parse(String(init.body))).toEqual({ session_id: 's' });
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer jwt-123');
  });

  it('maps a known error code to the calm client copy', async () => {
    mockFetch(409, { ok: false, code: 'TOO_FEW_OBSERVERS', message: 'server text never shown' });
    const err = await synthesise('s').catch((e: unknown) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('TOO_FEW_OBSERVERS');
    expect((err as ApiError).message).toBe(CLIENT_COPY.TOO_FEW_OBSERVERS);
  });

  it('NOT_CREATOR maps to its own calm sentence with no exclamation mark', async () => {
    mockFetch(403, { ok: false, code: 'NOT_CREATOR', message: 'server text never shown' });
    const err = await synthesise('s').catch((e: unknown) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).code).toBe('NOT_CREATOR');
    expect((err as ApiError).message).toBe('Only the person who created the session can synthesise again.');
    expect((err as ApiError).message).toBe(CLIENT_COPY.NOT_CREATOR);
    expect((err as ApiError).message).not.toMatch(/!/);
  });

  it('falls back to the one generic sentence on an unknown code or a non-JSON body', async () => {
    mockFetch(500, { ok: false, code: 'SOMETHING_NEW' });
    const a = await synthesise('s').catch((e: unknown) => e as ApiError);
    expect((a as ApiError).message).toBe(CLIENT_COPY.FALLBACK);
    mockFetch(200, null, false); // the SPA rewrite swallowed /api and returned HTML
    const b = await synthesise('s').catch((e: unknown) => e as ApiError);
    expect((b as ApiError).code).toBe('FALLBACK');
  });

  it('never exposes an exclamation mark or provider text', () => {
    for (const s of Object.values(CLIENT_COPY)) expect(s).not.toMatch(/!/);
  });
});
