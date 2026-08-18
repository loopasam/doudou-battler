import type { BattleCard } from './types';

const statLines: Array<[number, number, number]> = [
  [86, 34, 48],
  [44, 91, 63],
  [62, 57, 88],
  [73, 76, 39],
  [51, 68, 82],
  [95, 29, 42],
  [38, 84, 74],
  [69, 45, 93],
  [78, 61, 55],
  [57, 96, 36],
  [83, 52, 67],
  [47, 73, 90],
  [92, 41, 59],
  [64, 87, 46],
  [55, 64, 79],
  [88, 48, 71],
  [41, 79, 85],
  [76, 56, 94],
  [67, 89, 51],
  [59, 70, 77],
];

export const PLACEHOLDER_CARDS: BattleCard[] = statLines.map(
  ([strength, speed, agility], index) => ({
    id: `prototype-${String(index + 1).padStart(2, '0')}`,
    name: `DOUDOU ${String(index + 1).padStart(2, '0')}`,
    stats: { strength, speed, agility },
  }),
);
