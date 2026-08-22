import { describe, expect, it } from 'vitest';
import { dueBucket, duePhrase, dueRank, todayIso } from '../../src/lib/due';

// A fixed Saturday 22 Aug 2026, 15:30 IST — late enough in the day that a
// naive UTC implementation would still be on the 22nd, and a naive local one
// might not be. Both bugs show up here.
const NOW = new Date('2026-08-22T10:00:00Z'); // 15:30 IST

describe('dueBucket', () => {
  it('has no opinion about a task with no deadline', () => {
    expect(dueBucket(null, NOW)).toBe('none');
  });
  it('reads today in IST, not UTC', () => {
    expect(dueBucket('2026-08-22', NOW)).toBe('today');
  });
  it('separates tomorrow from the rest of the week', () => {
    expect(dueBucket('2026-08-23', NOW)).toBe('tomorrow');
    expect(dueBucket('2026-08-27', NOW)).toBe('soon');
    expect(dueBucket('2026-09-30', NOW)).toBe('later');
  });
  it('calls yesterday overdue', () => {
    expect(dueBucket('2026-08-21', NOW)).toBe('overdue');
  });
});

describe('duePhrase', () => {
  it('says nothing when there is nothing to say', () => {
    expect(duePhrase(null, NOW)).toBe('');
  });
  it('uses plain words for the near dates', () => {
    expect(duePhrase('2026-08-22', NOW)).toBe('due today');
    expect(duePhrase('2026-08-23', NOW)).toBe('due tomorrow');
    expect(duePhrase('2026-08-21', NOW)).toBe('was due yesterday');
  });
  it('names the weekday inside a week', () => {
    expect(duePhrase('2026-08-18', NOW)).toBe('was due Tuesday');
    expect(duePhrase('2026-08-26', NOW)).toBe('due Wednesday');
  });
  it('switches to a day count once a weekday stops being unambiguous', () => {
    // 12 days late: "was due Monday" would be true of two different Mondays.
    expect(duePhrase('2026-08-10', NOW)).toBe('was due 12 days ago');
  });
  it('never shouts', () => {
    for (const d of ['2026-08-10', '2026-08-21', '2026-08-22', '2026-09-30']) {
      expect(duePhrase(d, NOW)).not.toContain('!');
    }
  });
});

describe('dueRank', () => {
  it('puts what is late above what is merely close', () => {
    const dates = ['2026-09-30', null, '2026-08-22', '2026-08-10', '2026-08-23'];
    const sorted = [...dates].sort((a, b) => dueRank(a, NOW) - dueRank(b, NOW));
    expect(sorted).toEqual(['2026-08-10', '2026-08-22', '2026-08-23', '2026-09-30', null]);
  });
});

describe('todayIso', () => {
  it('is the IST date, so a date input cannot offer yesterday', () => {
    expect(todayIso(NOW)).toBe('2026-08-22');
    // 23:00 IST on the 22nd is still the 22nd, though it is the 23rd in UTC+0
    // only three hours later. The bug this guards is an off-by-one evening.
    expect(todayIso(new Date('2026-08-22T17:30:00Z'))).toBe('2026-08-22');
  });
});
