import Phaser from 'phaser';
import { PLACEHOLDER_CARDS } from './cards';
import { BattleEngine } from './engine';
import {
  CARD_LAYOUT,
  GAME_TIMING,
  GAME_LAYOUT,
  getCardBorderTrailPoint,
  getCardDealPose,
  getDeckCountsBeforeTransfer,
  getRoundWinnerLabel,
  getStatRowCenter,
  getTextResolution,
  type DeckCounts,
} from './rendering';
import { STAT_KEYS, type BattleCard, type GameSnapshot, type Side, type StatKey } from './types';

interface RenderOptions {
  revealAi?: boolean;
  showResult?: boolean;
  deckCounts?: DeckCounts;
  status?: 'revealing' | 'transferring' | 'dealing';
}

const COLORS = {
  background: 0x11100f,
  panel: 0x1c1a18,
  paper: 0xf4f1e8,
  ink: 0x171512,
  muted: 0xa79f91,
  player: 0xffcc4d,
  ai: 0xff6b5f,
  accent: 0x62d9c8,
  line: 0x575047,
};

const LABELS: Record<StatKey, string> = {
  strength: 'STRENGTH',
  speed: 'SPEED',
  agility: 'AGILITY',
};

const TEXT_RESOLUTION = getTextResolution();

export class GameScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private ui!: Phaser.GameObjects.Container;
  private playerCardView?: Phaser.GameObjects.Container;
  private aiCardView?: Phaser.GameObjects.Container;
  private playerDeckView?: Phaser.GameObjects.Container;
  private aiDeckView?: Phaser.GameObjects.Container;
  private aiTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('battle');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.drawBackdrop();
    this.startGame();
  }

  private startGame(): void {
    this.aiTimer?.remove(false);
    this.engine = new BattleEngine(PLACEHOLDER_CARDS);
    this.playCardDeal();
  }

  private render(options: RenderOptions = {}): void {
    this.tweens.killAll();
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);
    this.playerCardView = undefined;
    this.aiCardView = undefined;
    this.playerDeckView = undefined;
    this.aiDeckView = undefined;

    const state = this.engine.getSnapshot();
    const isResolved = state.phase === 'resolved';
    const revealAi = options.revealAi ?? isResolved;
    const showResult = options.showResult ?? isResolved;
    const deckCounts = options.deckCounts ?? { player: state.playerCount, ai: state.aiCount };
    const allowInteraction = options.status !== 'dealing';
    this.drawHeader(state, deckCounts);
    this.drawDeckStacks(state, deckCounts);
    this.updateAccessibleStatus(state, options.status);

    if (state.phase === 'game-over') {
      this.drawGameOver(state);
      return;
    }

    if (state.playerCard) {
      this.playerCardView = this.drawCard(
        GAME_LAYOUT.playerCardX,
        GAME_LAYOUT.cardY,
        state.playerCard,
        'player',
        true,
        state,
        allowInteraction,
      );
    }
    if (state.aiCard) {
      this.aiCardView = this.drawCard(
        GAME_LAYOUT.aiCardX,
        GAME_LAYOUT.cardY,
        state.aiCard,
        'ai',
        revealAi,
        state,
        allowInteraction,
      );
    }

    if (state.phase === 'resolved') {
      if (showResult) {
        this.drawRoundResult(state, deckCounts);
      } else if (options.status === 'transferring') {
        this.drawTransferStatus(state);
      } else {
        this.drawRevealStatus();
      }
    } else if (options.status === 'dealing') {
      this.drawDealStatus();
    } else if (state.chooser === 'ai') {
      this.drawAiThinking();
      this.aiTimer = this.time.delayedCall(GAME_TIMING.aiThinkMs, () => {
        const stat = this.engine.chooseAiStat();
        this.resolveRound(stat);
      });
    } else {
      this.addUiText(640, 660, 'PICK A STAT ON YOUR CARD', 18, COLORS.player).setOrigin(0.5);
    }
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2e2a26, 0.65);
    for (let x = 0; x <= 1280; x += 40) {
      graphics.lineBetween(x, 0, x, 720);
    }
    for (let y = 0; y <= 720; y += 40) {
      graphics.lineBetween(0, y, 1280, y);
    }
    graphics.lineStyle(2, COLORS.line, 0.5);
    graphics.strokeRect(24, 24, 1232, 672);
  }

  private updateAccessibleStatus(
    state: GameSnapshot,
    transition?: RenderOptions['status'],
  ): void {
    const status = document.querySelector<HTMLElement>('#game-status');
    if (!status) return;

    if (transition === 'revealing') {
      status.textContent = `Round ${state.round}. Revealing AI card.`;
      return;
    }

    if (transition === 'transferring' && state.lastResult) {
      const destination = state.lastResult.winner === 'player'
        ? 'your deck'
        : state.lastResult.winner === 'ai'
          ? 'the AI deck'
          : 'the pot';
      status.textContent = `Round ${state.round}. Moving cards to ${destination}.`;
      return;
    }

    if (transition === 'dealing') {
      status.textContent = `Round ${state.round}. Dealing cards from both decks.`;
      return;
    }

    if (state.phase === 'game-over') {
      const outcome = state.gameWinner === 'player'
        ? 'You win.'
        : state.gameWinner === 'ai'
          ? 'AI wins.'
          : 'The game is a draw.';
      status.textContent = `Game over. ${outcome} Final score: you ${state.playerCount}, AI ${state.aiCount}.`;
      return;
    }

    if (state.phase === 'resolved' && state.lastResult) {
      const outcome = state.lastResult.winner === 'player'
        ? 'You win the round.'
        : state.lastResult.winner === 'ai'
          ? 'AI wins the round.'
          : 'The round is tied.';
      const nextPicker = state.chooser === 'player' ? 'you' : 'AI';
      status.textContent = `Round ${state.round} resolved. ${outcome} Next picker: ${nextPicker}.`;
      return;
    }

    const picker = state.chooser === 'player' ? 'Your pick' : 'AI pick';
    status.textContent = `Round ${state.round}. ${picker}. You have ${state.playerCount} cards and AI has ${state.aiCount} cards.`;
  }

  private drawHeader(state: GameSnapshot, deckCounts: DeckCounts): void {
    this.addUiText(48, 42, 'DOUDOU // BATTLER', 28, COLORS.paper);
    this.addUiText(48, 80, `ROUND ${String(state.round).padStart(2, '0')}`, 16, COLORS.muted);

    const chooserColor = state.chooser === 'player' ? COLORS.player : COLORS.ai;
    const chooserText = state.chooser === 'player' ? 'YOUR PICK' : 'AI PICK';
    const badge = this.add.rectangle(640, 58, 164, 38, chooserColor).setStrokeStyle(2, COLORS.ink);
    this.ui.add(badge);
    this.addUiText(640, 58, chooserText, 17, COLORS.ink).setOrigin(0.5);

    this.addUiText(1230, 44, `YOU  ${deckCounts.player}`, 18, COLORS.player).setOrigin(1, 0);
    this.addUiText(1230, 72, `AI   ${deckCounts.ai}`, 18, COLORS.ai).setOrigin(1, 0);
    this.addUiText(1230, 100, `POT  ${state.potCount}`, 14, COLORS.muted).setOrigin(1, 0);
  }

  private drawDeckStacks(state: GameSnapshot, counts: DeckCounts): void {
    this.playerDeckView = this.drawDeckStack(
      GAME_LAYOUT.playerDeckX,
      GAME_LAYOUT.deckY,
      'player',
      counts.player,
      state.chooser === 'player' && state.phase === 'awaiting-choice',
    );
    this.aiDeckView = this.drawDeckStack(
      GAME_LAYOUT.aiDeckX,
      GAME_LAYOUT.deckY,
      'ai',
      counts.ai,
      state.chooser === 'ai' && state.phase === 'awaiting-choice',
    );
  }

  private drawDeckStack(
    x: number,
    y: number,
    owner: Side,
    count: number,
    active: boolean,
  ): Phaser.GameObjects.Container {
    const group = this.add.container(x, y);
    this.ui.add(group);
    const accent = owner === 'player' ? COLORS.player : COLORS.ai;
    const direction = owner === 'player' ? 1 : -1;
    const visibleLayers = Math.min(count, 18);
    const totalOffset = Math.max(visibleLayers - 1, 0);

    this.addDeckText(
      group,
      0,
      -130,
      owner === 'player' ? 'YOUR DECK' : 'AI DECK',
      12,
      active ? accent : COLORS.muted,
    ).setOrigin(0.5);

    if (visibleLayers === 0) {
      const empty = this.add.rectangle(0, -4, 100, 146, COLORS.panel, 0.18)
        .setStrokeStyle(2, accent, 0.35);
      group.add(empty);
    }

    for (let index = 0; index < visibleLayers; index += 1) {
      const offsetX = direction * (index - totalOffset / 2) * 1.25;
      const offsetY = (index - totalOffset / 2) * 2.8;
      const layer = this.add.rectangle(offsetX, offsetY, 100, 146, COLORS.panel)
        .setStrokeStyle(2, accent, index === visibleLayers - 1 ? 1 : 0.68);
      group.add(layer);

      if (index === visibleLayers - 1) {
        const inset = this.add.rectangle(offsetX, offsetY, 78, 120, COLORS.ink)
          .setStrokeStyle(1, accent, 0.72);
        const stripeOne = this.add.rectangle(offsetX, offsetY - 24, 54, 3, accent, 0.72);
        const stripeTwo = this.add.rectangle(offsetX, offsetY + 24, 54, 3, accent, 0.72);
        const mark = this.makeText(offsetX, offsetY, owner === 'player' ? 'P' : 'AI', 25, accent)
          .setOrigin(0.5);
        group.add([inset, stripeOne, stripeTwo, mark]);
      }
    }

    const countBadge = this.add.circle(0, 118, 26, active ? accent : COLORS.paper)
      .setStrokeStyle(3, COLORS.ink);
    const countLabel = this.makeText(0, 118, String(count), 20, COLORS.ink).setOrigin(0.5);
    group.add([countBadge, countLabel]);
    return group;
  }

  private addDeckText(
    group: Phaser.GameObjects.Container,
    x: number,
    y: number,
    content: string,
    size: number,
    color: number,
  ): Phaser.GameObjects.Text {
    const text = this.makeText(x, y, content, size, color);
    group.add(text);
    return text;
  }

  private drawCard(
    x: number,
    y: number,
    card: BattleCard,
    owner: Side,
    revealed: boolean,
    state: GameSnapshot,
    allowInteraction = true,
  ): Phaser.GameObjects.Container {
    const group = this.add.container(x, y);
    this.ui.add(group);
    const accent = owner === 'player' ? COLORS.player : COLORS.ai;
    const active = allowInteraction && state.phase === 'awaiting-choice' && state.chooser === owner;

    if (active) {
      this.drawActiveCardTrail(group, owner, accent);
    }

    const shadow = this.add.rectangle(10, 12, CARD_LAYOUT.width, CARD_LAYOUT.height, 0x000000, 0.3);
    const body = this.add.rectangle(0, 0, CARD_LAYOUT.width, CARD_LAYOUT.height, COLORS.paper)
      .setStrokeStyle(4, accent);
    group.add([shadow, body]);

    if (!revealed) {
      const inner = this.add.rectangle(0, 0, 282, 412, COLORS.panel).setStrokeStyle(2, accent);
      const mark = this.makeText(0, -8, '?', 110, accent).setOrigin(0.5);
      const label = this.makeText(0, 94, 'CLASSIFIED', 16, COLORS.muted).setOrigin(0.5);
      group.add([inner, mark, label]);
      return group;
    }

    const ownerLabel = this.makeText(-132, -202, owner === 'player' ? 'PLAYER CARD' : 'AI CARD', 13, COLORS.ink);
    const idLabel = this.makeText(132, -202, card.id.slice(-2), 13, COLORS.ink).setOrigin(1, 0);
    const artBox = this.add.rectangle(0, -92, 268, 162, 0xddd7c9).setStrokeStyle(2, COLORS.ink);
    const cross = this.add.graphics();
    cross.lineStyle(2, COLORS.muted, 0.8);
    cross.lineBetween(-134, -173, 134, -11);
    cross.lineBetween(134, -173, -134, -11);
    const prototype = this.makeText(0, -92, 'ARTWORK\nPLACEHOLDER', 18, COLORS.ink)
      .setOrigin(0.5)
      .setAlign('center');
    const name = this.makeText(-134, 4, card.name, 24, COLORS.ink);
    group.add([ownerLabel, idLabel, artBox, cross, prototype, name]);

    STAT_KEYS.forEach((stat, index) => {
      const rowY = getStatRowCenter(index);
      const canChoose = allowInteraction
        && owner === 'player'
        && state.phase === 'awaiting-choice'
        && state.chooser === 'player';
      const selected = state.lastResult?.stat === stat;
      const rowColor = selected ? accent : 0xebe5d9;
      const row = this.add.rectangle(0, rowY, 268, CARD_LAYOUT.statRowHeight, rowColor)
        .setStrokeStyle(2, selected ? accent : COLORS.ink);
      const label = this.makeText(-118, rowY, LABELS[stat], 15, COLORS.ink).setOrigin(0, 0.5);
      const value = this.makeText(118, rowY, String(card.stats[stat]), 24, COLORS.ink).setOrigin(1, 0.5);
      group.add([row, label, value]);

      if (canChoose) {
        row.setInteractive({ useHandCursor: true });
        row.on('pointerover', () => {
          row.setFillStyle(accent);
          group.setScale(1.012);
        });
        row.on('pointerout', () => {
          row.setFillStyle(rowColor);
          group.setScale(1);
        });
        row.on('pointerdown', () => this.resolveRound(stat));
      }
    });

    return group;
  }

  private resolveRound(stat: StatKey): void {
    const state = this.engine.selectStat(stat);
    this.playAiReveal(state);
  }

  private playAiReveal(state: GameSnapshot): void {
    const result = state.lastResult;
    if (!result) {
      this.render();
      return;
    }

    const deckCounts = getDeckCountsBeforeTransfer(
      state.playerCount,
      state.aiCount,
      result.winner,
      result.capturedCount,
    );
    this.render({
      revealAi: false,
      showResult: false,
      deckCounts,
      status: 'revealing',
    });
    const hiddenCard = this.aiCardView;
    if (!hiddenCard) {
      this.finishRoundReveal(state, deckCounts);
      return;
    }

    this.tweens.add({
      targets: hiddenCard,
      scaleX: 0.04,
      duration: 360,
      ease: 'Sine.In',
      onComplete: () => {
        this.cameras.main.flash(90, 255, 245, 220, false);
        this.render({
          revealAi: true,
          showResult: false,
          deckCounts,
          status: 'revealing',
        });
        const revealedCard = this.aiCardView;
        if (!revealedCard) {
          this.finishRoundReveal(state, deckCounts);
          return;
        }

        revealedCard.setScale(0.04, 1);
        this.tweens.add({
          targets: revealedCard,
          scaleX: 1,
          duration: 460,
          ease: 'Back.Out',
          onComplete: () => this.time.delayedCall(
            GAME_TIMING.resultPauseMs,
            () => this.finishRoundReveal(state, deckCounts),
          ),
        });
      },
    });
  }

  private finishRoundReveal(state: GameSnapshot, deckCounts: DeckCounts): void {
    this.render({ revealAi: true, showResult: true, deckCounts });
    this.cameras.main.shake(150, 0.007);

    const winner = state.lastResult?.winner;
    const winnerView = winner === 'player'
      ? this.playerCardView
      : winner === 'ai'
        ? this.aiCardView
        : undefined;
    const loserView = winner === 'player'
      ? this.aiCardView
      : winner === 'ai'
        ? this.playerCardView
        : undefined;

    if (winnerView) {
      const winnerColor = winner === 'player' ? COLORS.player : COLORS.ai;
      this.drawWinnerCardGlow(winnerView, winnerColor);

      if (loserView) {
        this.tweens.add({
          targets: loserView,
          alpha: 0.46,
          scaleX: 0.975,
          scaleY: 0.975,
          y: loserView.y + 8,
          duration: 300,
          ease: 'Sine.Out',
        });
      }

      this.tweens.add({
        targets: winnerView,
        scaleX: 1.055,
        scaleY: 1.055,
        y: winnerView.y - 12,
        duration: 240,
        ease: 'Back.Out',
      });
    } else if (winner === 'tie') {
      if (this.playerCardView) this.drawWinnerCardGlow(this.playerCardView, COLORS.accent);
      if (this.aiCardView) this.drawWinnerCardGlow(this.aiCardView, COLORS.accent);
    }
  }

  private playCardTransfer(state: GameSnapshot, deckCounts: DeckCounts): void {
    const result = state.lastResult;
    if (!result) {
      this.render();
      return;
    }

    this.render({
      revealAi: true,
      showResult: false,
      deckCounts,
      status: 'transferring',
    });
    this.cameras.main.shake(130, 0.006);

    const destination = result.winner === 'player'
      ? { x: GAME_LAYOUT.playerDeckX, y: GAME_LAYOUT.deckY + 70 }
      : result.winner === 'ai'
        ? { x: GAME_LAYOUT.aiDeckX, y: GAME_LAYOUT.deckY + 70 }
        : { x: GAME_LAYOUT.width / 2, y: 620 };
    const cards = [this.playerCardView, this.aiCardView].filter(
      (card): card is Phaser.GameObjects.Container => Boolean(card),
    );

    if (cards.length === 0) {
      this.finishCardTransfer(state);
      return;
    }

    let completedCards = 0;
    cards.forEach((card, index) => {
      const startX = card.x;
      const startY = card.y;
      const controlX = (startX + destination.x) / 2;
      const controlY = result.winner === 'tie' ? 560 : 610;
      const finalRotation = destination.x < startX ? -0.42 : 0.42;

      this.tweens.addCounter({
        from: 0,
        to: 1,
        delay: index * 130,
        duration: 860,
        ease: 'Cubic.InOut',
        onUpdate: (tween) => {
          const progress = Number(tween.getValue());
          const inverse = 1 - progress;
          card.x = inverse * inverse * startX
            + 2 * inverse * progress * controlX
            + progress * progress * destination.x;
          card.y = inverse * inverse * startY
            + 2 * inverse * progress * controlY
            + progress * progress * destination.y;
          card.rotation = finalRotation * progress;
          card.setScale(1 - progress * 0.83);
          card.alpha = 1 - Math.pow(progress, 3) * 0.94;
        },
        onComplete: () => {
          completedCards += 1;
          if (completedCards === cards.length) {
            this.finishCardTransfer(state);
          }
        },
      });
    });
  }

  private finishCardTransfer(state: GameSnapshot): void {
    const result = state.lastResult;
    const nextState = this.engine.advanceRound();
    if (nextState.phase === 'game-over') {
      this.render();
      return;
    }

    const receivingSide = result?.winner === 'player' || result?.winner === 'ai'
      ? result.winner
      : undefined;
    this.playCardDeal(receivingSide, result?.winner === 'tie');
  }

  private playCardDeal(receivingSide?: Side, tied = false): void {
    this.render({ status: 'dealing' });
    const receivingDeck = receivingSide === 'player'
      ? this.playerDeckView
      : receivingSide === 'ai'
        ? this.aiDeckView
        : undefined;

    if (receivingDeck) {
      this.tweens.add({
        targets: receivingDeck,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 170,
        ease: 'Back.Out',
        yoyo: true,
      });
    } else if (tied) {
      this.cameras.main.flash(120, 98, 217, 200, false);
    }

    const cards: Array<{ view: Phaser.GameObjects.Container; owner: Side }> = [];
    if (this.playerCardView) cards.push({ view: this.playerCardView, owner: 'player' });
    if (this.aiCardView) cards.push({ view: this.aiCardView, owner: 'ai' });
    if (cards.length === 0) {
      this.render();
      return;
    }

    cards.forEach(({ view, owner }) => {
      const pose = getCardDealPose(owner, 0);
      view.setPosition(pose.x, pose.y);
      view.setScale(pose.scale);
      view.setRotation(pose.rotation);
      view.setAlpha(pose.alpha);
    });

    this.time.delayedCall(GAME_TIMING.dealSettleMs, () => {
      let completedCards = 0;
      cards.forEach(({ view, owner }, index) => {
        this.tweens.addCounter({
          from: 0,
          to: 1,
          delay: index * 90,
          duration: GAME_TIMING.dealMs,
          ease: 'Cubic.Out',
          onUpdate: (tween) => {
            const pose = getCardDealPose(owner, Number(tween.getValue()));
            view.setPosition(pose.x, pose.y);
            view.setScale(pose.scale);
            view.setRotation(pose.rotation);
            view.setAlpha(pose.alpha);
          },
          onComplete: () => {
            completedCards += 1;
            if (completedCards === cards.length) this.render();
          },
        });
      });
    });
  }

  private drawRevealStatus(): void {
    const panel = this.add.rectangle(640, 630, 250, 52, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.accent);
    this.ui.add(panel);
    this.addUiText(640, 630, 'REVEALING...', 16, COLORS.accent).setOrigin(0.5);
  }

  private drawTransferStatus(state: GameSnapshot): void {
    const result = state.lastResult;
    if (!result) return;
    const destination = result.winner === 'player'
      ? 'YOUR DECK'
      : result.winner === 'ai'
        ? 'AI DECK'
        : 'POT';
    const color = result.winner === 'player'
      ? COLORS.player
      : result.winner === 'ai'
        ? COLORS.ai
        : COLORS.accent;
    const panel = this.add.rectangle(640, 630, 310, 52, COLORS.panel, 0.96)
      .setStrokeStyle(2, color);
    this.ui.add(panel);
    this.addUiText(640, 630, `CARDS  →  ${destination}`, 16, color).setOrigin(0.5);
  }

  private drawDealStatus(): void {
    const panel = this.add.rectangle(640, 630, 330, 54, COLORS.panel, 0.96)
      .setStrokeStyle(2, COLORS.accent);
    this.ui.add(panel);
    this.addUiText(640, 630, 'DEALING NEXT CARDS...', 16, COLORS.accent).setOrigin(0.5);
  }

  private drawRoundResult(state: GameSnapshot, deckCounts: DeckCounts): void {
    const result = state.lastResult;
    if (!result) return;

    const resultText = result.winner === 'tie'
      ? 'TIE // CARDS TO POT'
      : result.winner === 'player'
        ? `YOU WIN // +${result.capturedCount}`
        : `AI WINS // +${result.capturedCount}`;
    const resultColor = result.winner === 'player'
      ? COLORS.player
      : result.winner === 'ai'
        ? COLORS.ai
        : COLORS.accent;

    const winnerBanner = this.add.rectangle(640, 110, 374, 58, COLORS.panel, 0.98)
      .setStrokeStyle(4, resultColor);
    const winnerBannerInner = this.add.rectangle(640, 110, 354, 40, resultColor, 0.12)
      .setStrokeStyle(1, resultColor, 0.55);
    this.ui.add([winnerBanner, winnerBannerInner]);
    this.addUiText(640, 110, getRoundWinnerLabel(result.winner), 23, resultColor).setOrigin(0.5);

    this.tweens.add({
      targets: winnerBanner,
      alpha: 0.62,
      duration: 430,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    const panel = this.add.rectangle(640, 630, 330, 62, COLORS.panel, 0.97)
      .setStrokeStyle(3, resultColor);
    this.ui.add(panel);
    this.addUiText(640, 630, resultText, 19, resultColor).setOrigin(0.5);

    const actionLabel = state.chooser === 'ai' ? 'START\nAI' : 'NEXT\nROUND';
    this.makeCircleButton(
      GAME_LAYOUT.nextButtonX,
      GAME_LAYOUT.nextButtonY,
      GAME_LAYOUT.nextButtonRadius,
      actionLabel,
      resultColor,
      () => {
        this.playCardTransfer(state, deckCounts);
      },
    );
  }

  private drawAiThinking(): void {
    const panel = this.add.rectangle(640, 630, 300, 56, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.ai);
    this.ui.add(panel);
    this.addUiText(640, 630, 'AI IS SCANNING...', 17, COLORS.ai).setOrigin(0.5);
    this.tweens.add({ targets: panel, alpha: 0.55, duration: 260, yoyo: true, repeat: -1 });
  }

  private drawActiveCardTrail(
    group: Phaser.GameObjects.Container,
    owner: Side,
    accent: number,
  ): void {
    const halo = this.add.rectangle(
      0,
      0,
      CARD_LAYOUT.width + 20,
      CARD_LAYOUT.height + 20,
      accent,
      0.035,
    ).setStrokeStyle(3, accent, 0.5);
    group.add(halo);

    this.tweens.add({
      targets: halo,
      alpha: 0.28,
      scaleX: 1.025,
      scaleY: 1.018,
      duration: 720,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    const segmentCount = 16;
    const trail = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const head = this.add.circle(0, 0, 6.5, accent)
      .setStrokeStyle(2, COLORS.paper, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD);
    group.add([trail, head]);

    const drawTrail = (progress: number): void => {
      const points = Array.from(
        { length: segmentCount },
        (_, index) => getCardBorderTrailPoint(progress - index * 0.0055),
      );
      trail.clear();
      for (let index = segmentCount - 2; index >= 0; index -= 1) {
        const strength = 1 - index / (segmentCount - 1);
        trail.lineStyle(2.5 + strength * 5.5, accent, 0.12 + strength * 0.82);
        trail.lineBetween(
          points[index].x,
          points[index].y,
          points[index + 1].x,
          points[index + 1].y,
        );
      }
      head.setPosition(points[0].x, points[0].y);
    };

    drawTrail(0);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2_250,
      repeat: -1,
      onUpdate: (tween) => {
        drawTrail(Number(tween.getValue()));
      },
    });

    const turnTag = this.add.rectangle(0, -260, 226, 34, COLORS.panel, 0.98)
      .setStrokeStyle(2, accent);
    const turnText = this.makeText(
      0,
      -260,
      owner === 'player' ? 'YOUR TURN  //  CHOOSE' : 'AI TURN  //  THINKING',
      14,
      accent,
    ).setOrigin(0.5);
    group.add([turnTag, turnText]);
  }

  private drawWinnerCardGlow(
    group: Phaser.GameObjects.Container,
    color: number,
  ): void {
    const outerGlow = this.add.rectangle(
      0,
      0,
      CARD_LAYOUT.width + 18,
      CARD_LAYOUT.height + 18,
      color,
      0.025,
    ).setStrokeStyle(7, color, 0.92).setBlendMode(Phaser.BlendModes.ADD);
    group.add(outerGlow);

    this.tweens.add({
      targets: outerGlow,
      alpha: 0.32,
      scaleX: 1.035,
      scaleY: 1.025,
      duration: 520,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private drawGameOver(state: GameSnapshot): void {
    const won = state.gameWinner === 'player';
    const title = state.gameWinner === 'draw' ? 'STALEMATE' : won ? 'VICTORY' : 'DEFEAT';
    const color = state.gameWinner === 'draw' ? COLORS.accent : won ? COLORS.player : COLORS.ai;
    const panel = this.add.rectangle(640, 390, 620, 390, COLORS.panel, 0.98).setStrokeStyle(4, color);
    this.ui.add(panel);
    this.addUiText(640, 285, title, 54, color).setOrigin(0.5);
    this.addUiText(640, 350, `${state.playerCount}  :  ${state.aiCount}`, 32, COLORS.paper).setOrigin(0.5);
    this.addUiText(640, 400, 'FINAL CARD COUNT', 15, COLORS.muted).setOrigin(0.5);
    this.makeButton(640, 485, 230, 52, 'PLAY AGAIN', color, () => this.startGame());
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    action: () => void,
  ): void {
    const button = this.add.rectangle(x, y, width, height, color).setStrokeStyle(2, COLORS.ink);
    this.ui.add(button);
    const text = this.addUiText(x, y, label, 15, COLORS.ink).setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setScale(1.04);
      text.setScale(1.04);
    });
    button.on('pointerout', () => {
      button.setScale(1);
      text.setScale(1);
    });
    button.on('pointerdown', action);
  }

  private makeCircleButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    color: number,
    action: () => void,
  ): void {
    const shadow = this.add.circle(x + 7, y + 9, radius, 0x000000, 0.38);
    const ring = this.add.circle(x, y, radius + 9, COLORS.panel, 0)
      .setStrokeStyle(2, color, 0.72);
    const button = this.add.circle(x, y, radius, color).setStrokeStyle(4, COLORS.ink);
    const text = this.makeText(x, y - 3, label, 15, COLORS.ink)
      .setOrigin(0.5)
      .setAlign('center')
      .setLineSpacing(2);
    const arrow = this.makeText(x, y + 37, '›', 23, COLORS.ink).setOrigin(0.5);
    this.ui.add([shadow, ring, button, text, arrow]);

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setScale(1.06);
      text.setScale(1.06);
      arrow.setScale(1.06);
      ring.setScale(1.08).setAlpha(1);
    });
    button.on('pointerout', () => {
      button.setScale(1);
      text.setScale(1);
      arrow.setScale(1);
      ring.setScale(1).setAlpha(0.72);
    });
    button.on('pointerdown', action);

    this.tweens.add({
      targets: ring,
      scaleX: 1.1,
      scaleY: 1.1,
      alpha: 0.16,
      duration: 820,
      ease: 'Sine.Out',
      yoyo: true,
      repeat: -1,
    });
  }

  private addUiText(
    x: number,
    y: number,
    content: string,
    size: number,
    color: number,
  ): Phaser.GameObjects.Text {
    const text = this.makeText(x, y, content, size, color);
    this.ui.add(text);
    return text;
  }

  private makeText(
    x: number,
    y: number,
    content: string,
    size: number,
    color: number,
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, content, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
      resolution: TEXT_RESOLUTION,
    }).setResolution(TEXT_RESOLUTION);
  }
}
