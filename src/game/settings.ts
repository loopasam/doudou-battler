export type Difficulty = 'easy' | 'medium' | 'hard';
export type ValueDisplayMode = 'stars' | 'rounded' | 'exact';

export interface GameSettings {
  difficulty: Difficulty;
  valueDisplay: ValueDisplayMode;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  difficulty: 'easy',
  valueDisplay: 'stars',
};

export const START_LAYOUT = {
  width: 1280,
  height: 720,
  difficultyY: 232,
  valueDisplayY: 449,
  choiceXs: [260, 640, 1020],
  startButtonX: 640,
  startButtonY: 646,
} as const;

const VALUE_DISPLAY_LABELS: Record<ValueDisplayMode, string> = {
  stars: 'STARS',
  rounded: 'ROUNDED TENS',
  exact: 'EXACT NUMBERS',
};

export function formatStatValue(value: number, mode: ValueDisplayMode): string {
  if (mode === 'stars') {
    const filled = Math.min(Math.max(Math.ceil(value / 20), 1), 5);
    return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
  }

  if (mode === 'rounded') return String(Math.round(value / 10) * 10);
  return String(value);
}

export function getSettingsLabel(settings: GameSettings): string {
  return `${settings.difficulty.toUpperCase()} // ${VALUE_DISPLAY_LABELS[settings.valueDisplay]}`;
}
