import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_CARDS } from './cards';
import { STAT_KEYS } from './types';

describe('placeholder card deck contract', () => {
  it('contains exactly 20 uniquely identified cards', () => {
    expect(PLACEHOLDER_CARDS).toHaveLength(20);
    expect(new Set(PLACEHOLDER_CARDS.map((card) => card.id)).size).toBe(20);
  });

  it('gives every card all three stats on the 1–100 scale', () => {
    for (const card of PLACEHOLDER_CARDS) {
      expect(Object.keys(card.stats).sort()).toEqual([...STAT_KEYS].sort());
      for (const stat of STAT_KEYS) {
        expect(card.stats[stat]).toBeGreaterThanOrEqual(1);
        expect(card.stats[stat]).toBeLessThanOrEqual(100);
      }
    }
  });
});
