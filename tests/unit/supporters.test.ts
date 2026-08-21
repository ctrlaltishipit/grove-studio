import { describe, expect, it } from 'vitest';
import { buildSupporters } from '../../src/lib/supporters';

describe('buildSupporters() — from get_finding_observers() rows, ids only', () => {
  it('groups participant ids by finding', () => {
    const m = buildSupporters([
      { finding_id: 'f1', participant_id: 'p1' },
      { finding_id: 'f1', participant_id: 'p2' },
      { finding_id: 'f2', participant_id: 'p2' },
    ]);
    expect([...m.get('f1') ?? []].sort()).toEqual(['p1', 'p2']);
    expect([...m.get('f2') ?? []]).toEqual(['p2']);
    expect(m.get('f3')).toBeUndefined();
  });

  it('counts a participant once per finding even if several of their notes support it', () => {
    const m = buildSupporters([
      { finding_id: 'f1', participant_id: 'p1' },
      { finding_id: 'f1', participant_id: 'p1' },
    ]);
    expect(m.get('f1')?.size).toBe(1);
  });

  it('is empty for no rows', () => {
    expect(buildSupporters([]).size).toBe(0);
  });
});
