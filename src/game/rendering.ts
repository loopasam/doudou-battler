export const CARD_LAYOUT = {
  width: 318,
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
  playerDeckX: 108,
  aiDeckX: 1172,
  deckY: 360,
  nextButtonX: 640,
  nextButtonY: 360,
  nextButtonRadius: 66,
} as const;

export const GAME_TIMING = {
  aiThinkMs: 1_550,
} as const;

export interface CardBorderLightPosition {
  x: number;
  y: number;
}

export interface DeckCounts {
  player: number;
  ai: number;
}

export function getStatRowCenter(index: number): number {
  return CARD_LAYOUT.statRowStart + index * CARD_LAYOUT.statRowGap;
}

export function getLastStatRowBottom(): number {
  return getStatRowCenter(CARD_LAYOUT.statRowCount - 1) + CARD_LAYOUT.statRowHeight / 2;
}

export function getCardBorderLightPositions(): CardBorderLightPosition[] {
  const outerX = CARD_LAYOUT.width / 2 + 10;
  const outerY = CARD_LAYOUT.height / 2 + 10;
  const segments = 9;
  const positions: CardBorderLightPosition[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const x = -outerX + (outerX * 2 * index) / segments;
    positions.push({ x, y: -outerY }, { x, y: outerY });
  }

  for (let index = 1; index < segments; index += 1) {
    const y = -outerY + (outerY * 2 * index) / segments;
    positions.push({ x: -outerX, y }, { x: outerX, y });
  }

  return positions;
}

export function getRoundWinnerLabel(winner: 'player' | 'ai' | 'tie'): string {
  if (winner === 'player') return 'YOU WON THIS ROUND';
  if (winner === 'ai') return 'AI WON THIS ROUND';
  return 'ROUND TIED';
}

export function getTextResolution(
  devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
): number {
  return Math.min(Math.max(devicePixelRatio, 2), 3);
}

export function getDeckCountsBeforeTransfer(
  playerCount: number,
  aiCount: number,
  winner: 'player' | 'ai' | 'tie',
  capturedCount: number,
): DeckCounts {
  if (winner === 'player') {
    return {
      player: playerCount - capturedCount + 1,
      ai: aiCount + 1,
    };
  }

  if (winner === 'ai') {
    return {
      player: playerCount + 1,
      ai: aiCount - capturedCount + 1,
    };
  }

  return {
    player: playerCount + 1,
    ai: aiCount + 1,
  };
}
