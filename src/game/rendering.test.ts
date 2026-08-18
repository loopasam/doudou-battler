import { describe, expect, it } from 'vitest';
import {
  CARD_LAYOUT,
  getLastStatRowBottom,
  getStatRowCenter,
  getTextResolution,
} from './rendering';

describe('wireframe rendering metrics', () => {
  it('keeps every stat row within the card border', () => {
    expect(getStatRowCenter(0)).toBe(61);
    expect(getLastStatRowBottom()).toBeLessThanOrEqual(CARD_LAYOUT.height / 2 - 10);
  });

  it('renders text at a crisp but memory-bounded resolution', () => {
    expect(getTextResolution()).toBe(2);
    expect(getTextResolution(1)).toBe(2);
    expect(getTextResolution(2.5)).toBe(2.5);
    expect(getTextResolution(4)).toBe(3);
  });
});
