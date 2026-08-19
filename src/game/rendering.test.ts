import { describe, expect, it } from 'vitest';
import {
  ACTIVE_SNAKE_OFFSETS,
  BATTLE_TENSION_POSES,
  CARD_LAYOUT,
  GAME_TIMING,
  GAME_LAYOUT,
  LOSER_REACTION_EMOJIS,
  RESULT_EMOJI_STREAM,
  WINNER_CELEBRATION_POSES,
  WINNER_REACTION_EMOJIS,
  WINNER_RESULT_SWAY_POSES,
  getCardBorderTrailPoint,
  getCardDealPose,
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

  it('loops four evenly spaced snake trails around the active card border', () => {
    const outerX = CARD_LAYOUT.width / 2 + 10;
    const outerY = CARD_LAYOUT.height / 2 + 10;
    const samples = Array.from({ length: 101 }, (_, index) => getCardBorderTrailPoint(index / 100));

    expect(ACTIVE_SNAKE_OFFSETS).toEqual([0, 0.25, 0.5, 0.75]);
    expect(ACTIVE_SNAKE_OFFSETS).toHaveLength(4);
    expect(samples[0]).toEqual(samples.at(-1));
    for (const point of samples) {
      expect(Math.abs(point.x) === outerX || Math.abs(point.y) === outerY).toBe(true);
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

  it('leaves time to compare both revealed cards before declaring the winner', () => {
    expect(GAME_TIMING.resultPauseMs).toBeGreaterThanOrEqual(800);
    expect(GAME_TIMING.resultPauseMs).toBeLessThanOrEqual(1_200);
  });

  it('builds neutral battle tension by oscillating both cards in mirrored poses', () => {
    const angles = BATTLE_TENSION_POSES.map(({ angle }) => angle);
    const duration = BATTLE_TENSION_POSES.reduce<number>(
      (total, pose) => total + pose.durationMs,
      GAME_TIMING.battleTensionLeadMs,
    );

    expect(angles.slice(0, 3).map(Math.abs)).toEqual([1.1, 1.8, 2.4]);
    expect(angles.some((angle) => angle < 0)).toBe(true);
    expect(angles.some((angle) => angle > 0)).toBe(true);
    expect(BATTLE_TENSION_POSES.at(-1)).toMatchObject({ offsetX: 0, angle: 0 });
    expect(duration).toBeGreaterThanOrEqual(800);
    expect(duration).toBeLessThanOrEqual(1_200);
  });

  it('celebrates the winner with a short irregular impact shake', () => {
    const angles = WINNER_CELEBRATION_POSES.map(({ angle }) => angle);
    const durations = WINNER_CELEBRATION_POSES.map(({ durationMs }) => durationMs);

    expect(angles.slice(0, -1).some((angle) => angle < 0)).toBe(true);
    expect(angles.slice(0, -1).some((angle) => angle > 0)).toBe(true);
    expect(new Set(angles.map(Math.abs)).size).toBeGreaterThan(3);
    expect(new Set(durations).size).toBeGreaterThan(3);
    expect(WINNER_CELEBRATION_POSES.at(-1)).toMatchObject({
      offsetX: 0,
      angle: 0,
    });
    expect(durations.reduce((total, duration) => total + duration, 0)).toBeLessThanOrEqual(600);
  });

  it('keeps the winner in a smaller uneven sway until card transfer', () => {
    const impactAngles = WINNER_CELEBRATION_POSES.map(({ angle }) => Math.abs(angle));
    const swayAngles = WINNER_RESULT_SWAY_POSES.map(({ angle }) => angle);
    const swayDurations = WINNER_RESULT_SWAY_POSES.map(({ durationMs }) => durationMs);

    expect(swayAngles.some((angle) => angle < 0)).toBe(true);
    expect(swayAngles.some((angle) => angle > 0)).toBe(true);
    expect(Math.max(...swayAngles.map(Math.abs))).toBeLessThan(Math.max(...impactAngles));
    expect(Math.max(...swayAngles.map(Math.abs))).toBeLessThanOrEqual(1.5);
    expect(new Set(swayAngles.map(Math.abs)).size).toBeGreaterThan(2);
    expect(new Set(swayDurations).size).toBe(WINNER_RESULT_SWAY_POSES.length);
    expect(swayDurations.reduce((total, duration) => total + duration, 0)).toBeGreaterThanOrEqual(1_500);
  });

  it('uses six familiar and distinct emotional emojis for each outcome', () => {
    expect(WINNER_REACTION_EMOJIS).toHaveLength(6);
    expect(LOSER_REACTION_EMOJIS).toHaveLength(6);
    expect(new Set(WINNER_REACTION_EMOJIS).size).toBe(6);
    expect(new Set(LOSER_REACTION_EMOJIS).size).toBe(6);
    expect(WINNER_REACTION_EMOJIS).toContain('🥳');
    expect(LOSER_REACTION_EMOJIS).toContain('😤');
    const loserEmojis = new Set<string>(LOSER_REACTION_EMOJIS);
    expect(WINNER_REACTION_EMOJIS.some((emoji) => loserEmojis.has(emoji)))
      .toBe(false);
  });

  it('overlaps staggered emoji cycles to create constant winner and loser streams', () => {
    expect(RESULT_EMOJI_STREAM.winnerParticles).toBeGreaterThanOrEqual(
      WINNER_REACTION_EMOJIS.length,
    );
    expect(RESULT_EMOJI_STREAM.loserParticles).toBeGreaterThanOrEqual(
      LOSER_REACTION_EMOJIS.length,
    );
    expect(
      (RESULT_EMOJI_STREAM.winnerParticles - 1) * RESULT_EMOJI_STREAM.winnerStaggerMs,
    ).toBeLessThan(RESULT_EMOJI_STREAM.winnerDurationMs);
    expect(
      (RESULT_EMOJI_STREAM.loserParticles - 1) * RESULT_EMOJI_STREAM.loserStaggerMs,
    ).toBeLessThan(RESULT_EMOJI_STREAM.loserDurationMs);
  });

  it('deals each next card from its own deck along an inward arc', () => {
    expect(getCardDealPose('player', 0)).toMatchObject({
      x: GAME_LAYOUT.playerDeckX,
      y: GAME_LAYOUT.deckY,
    });
    expect(getCardDealPose('ai', 0)).toMatchObject({
      x: GAME_LAYOUT.aiDeckX,
      y: GAME_LAYOUT.deckY,
    });
    expect(getCardDealPose('player', 1)).toMatchObject({
      x: GAME_LAYOUT.playerCardX,
      y: GAME_LAYOUT.cardY,
      scale: 1,
      rotation: 0,
      alpha: 1,
    });
    expect(getCardDealPose('ai', 1)).toMatchObject({
      x: GAME_LAYOUT.aiCardX,
      y: GAME_LAYOUT.cardY,
      scale: 1,
      rotation: 0,
      alpha: 1,
    });
    expect(getCardDealPose('player', 0.5).y).toBeLessThan(GAME_LAYOUT.cardY);
    expect(getCardDealPose('ai', 0.5).y).toBeLessThan(GAME_LAYOUT.cardY);
    expect(GAME_TIMING.dealMs).toBeGreaterThanOrEqual(750);
  });
});
