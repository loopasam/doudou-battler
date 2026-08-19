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
  resultPauseMs: 850,
  dealSettleMs: 220,
  dealMs: 820,
} as const;

export interface CardBorderPoint {
  x: number;
  y: number;
}

export interface CardDealPose {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  alpha: number;
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

export function getCardBorderTrailPoint(progress: number): CardBorderPoint {
  const outerX = CARD_LAYOUT.width / 2 + 10;
  const outerY = CARD_LAYOUT.height / 2 + 10;
  const width = outerX * 2;
  const height = outerY * 2;
  const perimeter = (width + height) * 2;
  let distance = (((progress % 1) + 1) % 1) * perimeter;

  if (distance <= width) {
    return { x: -outerX + distance, y: -outerY };
  }

  distance -= width;
  if (distance <= height) {
    return { x: outerX, y: -outerY + distance };
  }

  distance -= height;
  if (distance <= width) {
    return { x: outerX - distance, y: outerY };
  }

  distance -= width;
  return { x: -outerX, y: outerY - distance };
}

export function getCardDealPose(owner: 'player' | 'ai', progress: number): CardDealPose {
  const t = Math.min(Math.max(progress, 0), 1);
  const inverse = 1 - t;
  const startX = owner === 'player' ? GAME_LAYOUT.playerDeckX : GAME_LAYOUT.aiDeckX;
  const endX = owner === 'player' ? GAME_LAYOUT.playerCardX : GAME_LAYOUT.aiCardX;
  const controlX = (startX + endX) / 2;
  const controlY = GAME_LAYOUT.cardY - 150;
  const startingRotation = owner === 'player' ? 0.18 : -0.18;

  return {
    x: inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX,
    y: inverse * inverse * GAME_LAYOUT.deckY
      + 2 * inverse * t * controlY
      + t * t * GAME_LAYOUT.cardY,
    scale: 0.18 + t * 0.82,
    rotation: t === 1 ? 0 : startingRotation * inverse,
    alpha: 0.24 + t * 0.76,
  };
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
