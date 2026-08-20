import { describe, expect, it } from 'vitest';
import { BattleEngine } from './engine';
import { getStatBattleValue, type ValueDisplayMode } from './settings';
import type { BattleCard } from './types';

const card = (
  id: string,
  strength: number,
  speed: number,
  agility: number,
): BattleCard => ({ id, name: id, stats: { strength, speed, agility } });

const deck = [
  card('player-1', 90, 20, 30),
  card('player-2', 40, 80, 50),
  card('ai-1', 60, 70, 40),
  card('ai-2', 50, 30, 95),
];

const keepOrder = () => 0.999999;
const useNumberStyle = (mode: ValueDisplayMode) =>
  (value: number) => getStatBattleValue(value, mode);

describe('BattleEngine', () => {
  it('rejects decks that cannot be split evenly', () => {
    expect(() => new BattleEngine([], keepOrder)).toThrow('even number');
    expect(() => new BattleEngine(deck.slice(0, 3), keepOrder)).toThrow('even number');
  });

  it('deals an even deck between the player and AI', () => {
    const state = new BattleEngine(deck, keepOrder).getSnapshot();
    expect(state.playerCount).toBe(2);
    expect(state.aiCount).toBe(2);
    expect(state.chooser).toBe('player');
  });

  it('awards the cards to the higher stat and alternates chooser', () => {
    const engine = new BattleEngine(deck, keepOrder);
    const result = engine.selectStat('strength');
    expect(result.lastResult?.winner).toBe('player');
    expect(result.playerCount).toBe(3);
    expect(result.aiCount).toBe(1);
    expect(result.chooser).toBe('ai');

    const next = engine.advanceRound();
    expect(next.phase).toBe('awaiting-choice');
    expect(next.round).toBe(2);
    expect(next.chooser).toBe('ai');
  });

  it('lets the AI select its strongest visible stat', () => {
    const engine = new BattleEngine(deck, keepOrder);
    engine.selectStat('strength');
    engine.advanceRound();
    expect(engine.chooseAiStat()).toBe('agility');

    const result = engine.selectStat('agility');
    expect(result.lastResult?.winner).toBe('ai');
    expect(result.chooser).toBe('player');
  });

  it('rejects actions outside their valid phase or chooser', () => {
    const engine = new BattleEngine(deck, keepOrder);
    expect(() => engine.chooseAiStat()).toThrow('AI can only choose');
    expect(() => engine.advanceRound()).toThrow('only advance');

    engine.selectStat('strength');
    expect(() => engine.selectStat('speed')).toThrow('only be selected');
    expect(() => engine.chooseAiStat()).toThrow('AI can only choose');
  });

  it('rejects a round when either deck is unexpectedly empty', () => {
    const engine = new BattleEngine(deck, keepOrder);
    const mutable = engine as unknown as { playerDeck: BattleCard[] };
    mutable.playerDeck = [];
    expect(() => engine.selectStat('strength')).toThrow('Both players need a card');
  });

  it('returns tied cards to the bottom of their original decks', () => {
    const tiedDeck = [
      card('player-1', 50, 10, 20),
      card('player-2', 40, 20, 30),
      card('ai-1', 50, 30, 40),
      card('ai-2', 60, 40, 50),
    ];
    const engine = new BattleEngine(tiedDeck, keepOrder);
    const result = engine.selectStat('strength');
    expect(result.lastResult?.winner).toBe('tie');
    expect(result.chooser).toBe('ai');
    expect(result.playerCount).toBe(2);
    expect(result.aiCount).toBe(2);

    const next = engine.advanceRound();
    expect(next.playerCard?.id).toBe('player-2');
    expect(next.aiCard?.id).toBe('ai-2');
  });

  it('treats matching displayed star tiers as a tie', () => {
    const starDeck = [
      card('player-1', 61, 10, 20),
      card('player-2', 30, 20, 30),
      card('ai-1', 79, 30, 40),
      card('ai-2', 90, 40, 50),
    ];
    const result = new BattleEngine(starDeck, keepOrder, useNumberStyle('stars'))
      .selectStat('strength');
    expect(result.lastResult?.winner).toBe('tie');
    expect(result.playerCount).toBe(2);
    expect(result.aiCount).toBe(2);
  });

  it('treats matching displayed rounded tens as a tie', () => {
    const roundedDeck = [
      card('player-1', 61, 10, 20),
      card('player-2', 30, 20, 30),
      card('ai-1', 64, 30, 40),
      card('ai-2', 90, 40, 50),
    ];
    const result = new BattleEngine(roundedDeck, keepOrder, useNumberStyle('rounded'))
      .selectStat('strength');
    expect(result.lastResult?.winner).toBe('tie');
  });

  it('keeps full precision in exact-number battles', () => {
    const exactDeck = [
      card('player-1', 61, 10, 20),
      card('player-2', 30, 20, 30),
      card('ai-1', 64, 30, 40),
      card('ai-2', 90, 40, 50),
    ];
    const result = new BattleEngine(exactDeck, keepOrder, useNumberStyle('exact'))
      .selectStat('strength');
    expect(result.lastResult?.winner).toBe('ai');
  });

  it('makes AI choices using the displayed number style', () => {
    const roundedDeck = [
      card('player-1', 90, 10, 10),
      card('player-2', 10, 10, 10),
      card('player-3', 10, 10, 10),
      card('ai-1', 10, 10, 10),
      card('ai-2', 10, 69, 71),
      card('ai-3', 10, 10, 10),
    ];
    const engine = new BattleEngine(roundedDeck, keepOrder, useNumberStyle('rounded'));
    engine.selectStat('strength');
    engine.advanceRound();
    expect(engine.chooseAiStat()).toBe('speed');
  });

  it('ends when one side collects the full deck', () => {
    const twoCards = [card('player', 90, 20, 30), card('ai', 10, 80, 70)];
    const engine = new BattleEngine(twoCards, keepOrder);
    engine.selectStat('strength');
    const final = engine.advanceRound();
    expect(final.phase).toBe('game-over');
    expect(final.gameWinner).toBe('player');
    expect(final.playerCount).toBe(2);
  });

  it('keeps a final tied pair in play instead of ending the game', () => {
    const tiedPair = [card('player', 50, 20, 30), card('ai', 50, 80, 70)];
    const engine = new BattleEngine(tiedPair, keepOrder);
    engine.selectStat('strength');
    const next = engine.advanceRound();
    expect(next.phase).toBe('awaiting-choice');
    expect(next.round).toBe(2);
    expect(next.playerCount).toBe(1);
    expect(next.aiCount).toBe(1);
    expect(next.playerCard?.id).toBe('player');
    expect(next.aiCard?.id).toBe('ai');
  });
});
