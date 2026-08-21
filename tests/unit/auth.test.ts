import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, signInAnonymously } = vi.hoisted(() => ({ getSession: vi.fn(), signInAnonymously: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { auth: { getSession, signInAnonymously } } }));

import { ensureUser, getCachedUser, isPermanent } from '../../src/lib/auth';

beforeEach(() => { getSession.mockReset(); signInAnonymously.mockReset(); });

describe('identity', () => {
  it('getCachedUser never signs in', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await getCachedUser()).toBeNull();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('ensureUser reuses a cached session (the 30/hr/IP cap)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    expect((await ensureUser()).id).toBe('u1');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('ensureUser signs in exactly once when nothing is cached', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({ data: { user: { id: 'anon' } }, error: null });
    expect((await ensureUser()).id).toBe('anon');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('isPermanent is false for anonymous users and null', () => {
    expect(isPermanent(null)).toBe(false);
    expect(isPermanent({ id: 'a', is_anonymous: true } as never)).toBe(false);
    expect(isPermanent({ id: 'a', is_anonymous: false } as never)).toBe(true);
  });
});
