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

  it('creates occasional ties without making them commonplace', () => {
    const possiblePairs = (PLACEHOLDER_CARDS.length * (PLACEHOLDER_CARDS.length - 1)) / 2;

    for (const stat of STAT_KEYS) {
      const frequencies = new Map<number, number>();
      for (const card of PLACEHOLDER_CARDS) {
        frequencies.set(card.stats[stat], (frequencies.get(card.stats[stat]) ?? 0) + 1);
      }

      const tiedPairs = [...frequencies.values()].reduce(
        (total, count) => total + (count * (count - 1)) / 2,
        0,
      );
      const tieRate = tiedPairs / possiblePairs;
      expect(tieRate).toBeGreaterThanOrEqual(0.04);
      expect(tieRate).toBeLessThanOrEqual(0.08);
    }
  });

  it('keeps every card competitive while preserving clear strengths and weaknesses', () => {
    for (const card of PLACEHOLDER_CARDS) {
      const values = STAT_KEYS.map((stat) => card.stats[stat]);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThanOrEqual(20);

      let score = 0;
      let comparisons = 0;
      for (const opponent of PLACEHOLDER_CARDS) {
        if (opponent === card) continue;
        for (const stat of STAT_KEYS) {
          comparisons += 1;
          if (card.stats[stat] > opponent.stats[stat]) score += 1;
          if (card.stats[stat] === opponent.stats[stat]) score += 0.5;
        }
      }

      const matchupRate = score / comparisons;
      expect(matchupRate).toBeGreaterThanOrEqual(0.45);
      expect(matchupRate).toBeLessThanOrEqual(0.55);
    }
  });
});
