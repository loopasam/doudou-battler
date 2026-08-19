import { describe, expect, it } from 'vitest';
import {
  CARD_LAYOUT,
  GAME_TIMING,
  GAME_LAYOUT,
  getCardBorderLightPositions,
  getDeckCountsBeforeTransfer,
  getLastStatRowBottom,
  getRoundWinnerLabel,
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

  it('places a continuous light trail just outside the active card', () => {
    const lights = getCardBorderLightPositions();
    const outerX = CARD_LAYOUT.width / 2 + 10;
    const outerY = CARD_LAYOUT.height / 2 + 10;

    expect(lights.length).toBeGreaterThanOrEqual(32);
    for (const light of lights) {
      expect(Math.abs(light.x) === outerX || Math.abs(light.y) === outerY).toBe(true);
    }
  });

  it('gives every result an unmistakable round-winner label', () => {
    expect(getRoundWinnerLabel('player')).toBe('YOU WON THIS ROUND');
    expect(getRoundWinnerLabel('ai')).toBe('AI WON THIS ROUND');
    expect(getRoundWinnerLabel('tie')).toBe('ROUND TIED');
  });

  it('holds the AI thinking state long enough to be perceived', () => {
    expect(GAME_TIMING.aiThinkMs).toBeGreaterThanOrEqual(1_400);
    expect(GAME_TIMING.aiThinkMs).toBeLessThanOrEqual(2_000);
  });
});
