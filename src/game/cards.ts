import type { BattleCard } from './types';

// Each category uses the same ten levels twice. Card totals stay within five points
// of one another, while every card still has a gap of at least 20 between its
// specialty and weakness.
const statLines: Array<[number, number, number]> = [
  [40, 60, 85],
  [45, 65, 75],
  [50, 85, 55],
  [55, 75, 60],
  [60, 45, 85],
  [65, 40, 80],
  [70, 50, 65],
  [75, 45, 65],
  [80, 70, 40],
  [85, 55, 50],
  [40, 80, 70],
  [45, 60, 80],
  [50, 65, 70],
  [55, 85, 50],
  [60, 55, 75],
  [65, 75, 45],
  [70, 80, 40],
  [75, 70, 45],
  [80, 50, 55],
  [85, 40, 60],
];

export const PLACEHOLDER_CARDS: BattleCard[] = statLines.map(
  ([strength, speed, agility], index) => ({
    id: `prototype-${String(index + 1).padStart(2, '0')}`,
    name: `DOUDOU ${String(index + 1).padStart(2, '0')}`,
    stats: { strength, speed, agility },
  }),
);
