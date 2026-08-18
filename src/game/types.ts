export const STAT_KEYS = ['strength', 'speed', 'agility'] as const;

export type StatKey = (typeof STAT_KEYS)[number];
export type Side = 'player' | 'ai';
export type RoundWinner = Side | 'tie';
export type GameWinner = Side | 'draw';
export type GamePhase = 'awaiting-choice' | 'resolved' | 'game-over';

export interface BattleCard {
  id: string;
  name: string;
  stats: Record<StatKey, number>;
}

export interface RoundResult {
  stat: StatKey;
  winner: RoundWinner;
  playerCard: BattleCard;
  aiCard: BattleCard;
  capturedCount: number;
}

export interface GameSnapshot {
  round: number;
  chooser: Side;
  phase: GamePhase;
  playerCount: number;
  aiCount: number;
  potCount: number;
  playerCard?: BattleCard;
  aiCard?: BattleCard;
  lastResult?: RoundResult;
  gameWinner?: GameWinner;
}
