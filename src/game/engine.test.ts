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
});
