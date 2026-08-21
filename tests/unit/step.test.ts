import { describe, expect, it } from 'vitest';
import { step } from '../../src/lib/step';

describe('step() — the ladder has three steps, by construction', () => {
  it('maps counts to ladder steps and never invents a fourth', () => {
    expect(step(1)).toBe('1');
    expect(step(2)).toBe('2');
    expect(step(3)).toBe('3');
    expect(step(4)).toBe('3');
    expect(step(5)).toBe('3');
    expect(step(12)).toBe('3');
  });
});
