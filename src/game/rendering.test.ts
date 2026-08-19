import { describe, expect, it } from 'vitest';
import {
  CARD_LAYOUT,
  GAME_LAYOUT,
  getDeckCountsBeforeTransfer,
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

  it('holds the old deck thickness until captured cards finish moving', () => {
    expect(getDeckCountsBeforeTransfer(11, 9, 'player', 2)).toEqual({ player: 10, ai: 10 });
    expect(getDeckCountsBeforeTransfer(9, 11, 'ai', 2)).toEqual({ player: 10, ai: 10 });
    expect(getDeckCountsBeforeTransfer(9, 9, 'tie', 0)).toEqual({ player: 10, ai: 10 });
    expect(getDeckCountsBeforeTransfer(13, 7, 'player', 4)).toEqual({ player: 10, ai: 8 });
  });

  it('centers the next action between the two cards', () => {
    expect(GAME_LAYOUT.nextButtonX).toBe(GAME_LAYOUT.width / 2);
    expect(GAME_LAYOUT.nextButtonY).toBe(GAME_LAYOUT.cardY);
    expect(GAME_LAYOUT.playerCardX + CARD_LAYOUT.width / 2).toBeLessThan(
      GAME_LAYOUT.nextButtonX - GAME_LAYOUT.nextButtonRadius,
    );
    expect(GAME_LAYOUT.nextButtonX + GAME_LAYOUT.nextButtonRadius).toBeLessThan(
      GAME_LAYOUT.aiCardX - CARD_LAYOUT.width / 2,
    );
  });
});
