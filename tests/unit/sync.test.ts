import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getRoster, listMyNotes, getSession, heartbeat } = vi.hoisted(() => ({
  getRoster: vi.fn(async () => [{ participant_id: 'p1', display_name: 'Priya', colour_index: 0, note_count: 2 }]),
  listMyNotes: vi.fn(async () => []),
  getSession: vi.fn(async () => ({ status: 'live' })),
  heartbeat: vi.fn(async () => {}),
}));
vi.mock('../../src/lib/supabase', () => ({ getRoster, listMyNotes, getSession, heartbeat }));

import { HEARTBEAT_MS, POLL_MS } from '../../src/lib/config';
import { startSync } from '../../src/lib/sync';

beforeEach(() => { vi.useFakeTimers(); getRoster.mockClear(); listMyNotes.mockClear(); heartbeat.mockClear(); });
afterEach(() => vi.useRealTimers());

describe('startSync', () => {
  it('ticks immediately, then every POLL_MS; beats every HEARTBEAT_MS', async () => {
    const onRoster = vi.fn();
    const h = startSync({ sessionId: 's', participantId: 'p1', onRoster, onMyNotes: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(getRoster).toHaveBeenCalledTimes(1);
    expect(heartbeat).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(POLL_MS * 3 + 10);
    expect(getRoster).toHaveBeenCalledTimes(4);
    expect(heartbeat.mock.calls.length).toBe(1 + Math.floor((POLL_MS * 3 + 10) / HEARTBEAT_MS));
    expect(onRoster).toHaveBeenLastCalledWith([{ participant_id: 'p1', display_name: 'Priya', colour_index: 0, note_count: 2 }]);
    h.stop();
    await vi.advanceTimersByTimeAsync(POLL_MS * 5);
    expect(getRoster).toHaveBeenCalledTimes(4);
  });

  it('only ever reads the caller\'s own lane', async () => {
    const h = startSync({ sessionId: 's', participantId: 'me', onRoster: vi.fn(), onMyNotes: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(listMyNotes).toHaveBeenCalledWith('s', 'me');
    h.stop();
  });

  it('catches up on visibilitychange and online', async () => {
    const h = startSync({ sessionId: 's', participantId: 'p1', onRoster: vi.fn(), onMyNotes: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(getRoster.mock.calls.length).toBeGreaterThanOrEqual(2);
    h.stop();
  });

  it('swallows transient errors and keeps polling', async () => {
    getRoster.mockRejectedValueOnce(new Error('network'));
    const onError = vi.fn();
    const h = startSync({ sessionId: 's', participantId: 'p1', onRoster: vi.fn(), onMyNotes: vi.fn(), onStatus: vi.fn(), onError });
    await vi.advanceTimersByTimeAsync(POLL_MS + 10);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(getRoster).toHaveBeenCalledTimes(2);
    h.stop();
  });
});
