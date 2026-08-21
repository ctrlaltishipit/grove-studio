import { describe, expect, it } from 'vitest';
import { ALPHABET, normaliseCode } from '../../src/ds/CodeInput';

describe('join codes — 31-character alphabet, no O/0/I/1/L', () => {
  it('the alphabet excludes the ambiguous characters', () => {
    expect(ALPHABET).toHaveLength(31);
    for (const ch of 'O0I1L') expect(ALPHABET).not.toContain(ch);
  });

  it('normalises case, whitespace and dashes, drops out-of-alphabet characters, caps at six', () => {
    expect(normaliseCode('grv dem')).toBe('GRVDEM');
    expect(normaliseCode(' grv-dem ')).toBe('GRVDEM');
    expect(normaliseCode('GR0VD1LEMX')).toBe('GRVDEM');
    expect(normaliseCode('abcdefgh')).toBe('ABCDEF');
    expect(normaliseCode(undefined)).toBe('');
  });
});
