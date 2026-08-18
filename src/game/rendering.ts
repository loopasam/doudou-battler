export const CARD_LAYOUT = {
  height: 448,
  statRowHeight: 48,
  statRowStart: 61,
  statRowGap: 63,
  statRowCount: 3,
} as const;

export const GAME_LAYOUT = {
  width: 1280,
  height: 720,
  playerCardX: 390,
  aiCardX: 890,
  cardY: 360,
  nextButtonX: 640,
  nextButtonY: 650,
} as const;

export function getStatRowCenter(index: number): number {
  return CARD_LAYOUT.statRowStart + index * CARD_LAYOUT.statRowGap;
}

export function getLastStatRowBottom(): number {
  return getStatRowCenter(CARD_LAYOUT.statRowCount - 1) + CARD_LAYOUT.statRowHeight / 2;
}

export function getTextResolution(
  devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
): number {
  return Math.min(Math.max(devicePixelRatio, 2), 3);
}
