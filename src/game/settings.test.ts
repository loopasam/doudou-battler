import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS, formatStatValue, getSettingsLabel } from './settings';

describe('game setup settings', () => {
  it('starts with the most kid-friendly setup', () => {
    expect(DEFAULT_GAME_SETTINGS).toEqual({
      difficulty: 'easy',
      valueDisplay: 'stars',
    });
  });

  it('maps card values onto a five-star scale', () => {
    expect(formatStatValue(1, 'stars')).toBe('★☆☆☆☆');
    expect(formatStatValue(20, 'stars')).toBe('★☆☆☆☆');
    expect(formatStatValue(21, 'stars')).toBe('★★☆☆☆');
    expect(formatStatValue(54, 'stars')).toBe('★★★☆☆');
    expect(formatStatValue(100, 'stars')).toBe('★★★★★');
  });

  it('rounds friendly-number mode to the nearest ten', () => {
    expect(formatStatValue(26, 'rounded')).toBe('30');
    expect(formatStatValue(54, 'rounded')).toBe('50');
    expect(formatStatValue(65, 'rounded')).toBe('70');
  });

  it('preserves the full value in exact mode', () => {
    expect(formatStatValue(26, 'exact')).toBe('26');
    expect(formatStatValue(54, 'exact')).toBe('54');
  });

  it('makes the selected setup easy to read in the battle header', () => {
    expect(getSettingsLabel({ difficulty: 'medium', valueDisplay: 'rounded' }))
      .toBe('MEDIUM // ROUNDED TENS');
  });
});
