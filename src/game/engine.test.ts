import { describe, expect, it } from 'vitest';
import { BattleEngine } from './engine';
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

  it('places tied cards into the pot', () => {
    const tiedDeck = [
      card('player-1', 50, 10, 20),
      card('player-2', 40, 20, 30),
      card('ai-1', 50, 30, 40),
      card('ai-2', 60, 40, 50),
    ];
    const result = new BattleEngine(tiedDeck, keepOrder).selectStat('strength');
    expect(result.lastResult?.winner).toBe('tie');
    expect(result.potCount).toBe(2);
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

  it('awards an outstanding tie pot to the surviving AI', () => {
    const potDeck = [
      card('player-1', 10, 20, 30),
      card('player-2', 50, 40, 30),
      card('ai-1', 90, 20, 30),
      card('ai-2', 50, 60, 70),
    ];
    const engine = new BattleEngine(potDeck, keepOrder);
    expect(engine.selectStat('strength').lastResult?.winner).toBe('ai');
    engine.advanceRound();
    expect(engine.selectStat('strength').lastResult?.winner).toBe('tie');
    const final = engine.advanceRound();
    expect(final.gameWinner).toBe('ai');
    expect(final.aiCount).toBe(4);
    expect(final.potCount).toBe(0);
  });

  it('declares a draw when the final two cards tie', () => {
    const tiedPair = [card('player', 50, 20, 30), card('ai', 50, 80, 70)];
    const engine = new BattleEngine(tiedPair, keepOrder);
    engine.selectStat('strength');
    const final = engine.advanceRound();
    expect(final.phase).toBe('game-over');
    expect(final.gameWinner).toBe('draw');
    expect(final.potCount).toBe(2);
  });
});
