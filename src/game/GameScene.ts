import Phaser from 'phaser';
import { PLACEHOLDER_CARDS } from './cards';
import { BattleEngine } from './engine';
import { STAT_KEYS, type BattleCard, type GameSnapshot, type Side, type StatKey } from './types';

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

export class GameScene extends Phaser.Scene {
  private engine!: BattleEngine;
  private ui!: Phaser.GameObjects.Container;
  private playerCardView?: Phaser.GameObjects.Container;
  private aiCardView?: Phaser.GameObjects.Container;
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
    this.render();
  }

  private render(): void {
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);
    this.playerCardView = undefined;
    this.aiCardView = undefined;

    const state = this.engine.getSnapshot();
    this.drawHeader(state);

    if (state.phase === 'game-over') {
      this.drawGameOver(state);
      return;
    }

    const revealAi = state.phase === 'resolved';
    if (state.playerCard) {
      this.playerCardView = this.drawCard(390, 390, state.playerCard, 'player', true, state);
    }
    if (state.aiCard) {
      this.aiCardView = this.drawCard(890, 390, state.aiCard, 'ai', revealAi, state);
    }

    if (state.phase === 'resolved') {
      this.drawRoundResult(state);
    } else if (state.chooser === 'ai') {
      this.drawAiThinking();
      this.aiTimer = this.time.delayedCall(850, () => {
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

  private drawHeader(state: GameSnapshot): void {
    this.addUiText(48, 42, 'DOUDOU // BATTLER', 28, COLORS.paper);
    this.addUiText(48, 80, `ROUND ${String(state.round).padStart(2, '0')}`, 16, COLORS.muted);

    const chooserColor = state.chooser === 'player' ? COLORS.player : COLORS.ai;
    const chooserText = state.chooser === 'player' ? 'YOUR PICK' : 'AI PICK';
    const badge = this.add.rectangle(640, 58, 164, 38, chooserColor).setStrokeStyle(2, COLORS.ink);
    this.ui.add(badge);
    this.addUiText(640, 58, chooserText, 17, COLORS.ink).setOrigin(0.5);

    this.addUiText(1230, 44, `YOU  ${state.playerCount}`, 18, COLORS.player).setOrigin(1, 0);
    this.addUiText(1230, 72, `AI   ${state.aiCount}`, 18, COLORS.ai).setOrigin(1, 0);
    this.addUiText(1230, 100, `POT  ${state.potCount}`, 14, COLORS.muted).setOrigin(1, 0);
  }

  private drawCard(
    x: number,
    y: number,
    card: BattleCard,
    owner: Side,
    revealed: boolean,
    state: GameSnapshot,
  ): Phaser.GameObjects.Container {
    const group = this.add.container(x, y);
    this.ui.add(group);
    const accent = owner === 'player' ? COLORS.player : COLORS.ai;

    const shadow = this.add.rectangle(10, 12, 318, 448, 0x000000, 0.3);
    const body = this.add.rectangle(0, 0, 318, 448, COLORS.paper).setStrokeStyle(4, accent);
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
      const rowY = 70 + index * 68;
      const canChoose = owner === 'player' && state.phase === 'awaiting-choice' && state.chooser === 'player';
      const selected = state.lastResult?.stat === stat;
      const rowColor = selected ? accent : 0xebe5d9;
      const row = this.add.rectangle(0, rowY, 268, 52, rowColor)
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
    this.render();
    this.cameras.main.shake(180, 0.009);
    this.cameras.main.flash(90, 255, 245, 220, false);

    const winnerView = state.lastResult?.winner === 'player'
      ? this.playerCardView
      : state.lastResult?.winner === 'ai'
        ? this.aiCardView
        : undefined;
    if (winnerView) {
      this.tweens.add({
        targets: winnerView,
        scaleX: 1.065,
        scaleY: 1.065,
        y: winnerView.y - 10,
        duration: 150,
        ease: 'Back.Out',
        yoyo: true,
      });
    }
  }

  private drawRoundResult(state: GameSnapshot): void {
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

    const panel = this.add.rectangle(640, 630, 330, 92, COLORS.panel, 0.97).setStrokeStyle(3, resultColor);
    this.ui.add(panel);
    this.addUiText(640, 608, resultText, 19, resultColor).setOrigin(0.5);
    this.makeButton(640, 650, 190, 34, 'NEXT ROUND  >', COLORS.paper, () => {
      this.engine.advanceRound();
      this.render();
    });
  }

  private drawAiThinking(): void {
    const panel = this.add.rectangle(640, 630, 300, 56, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.ai);
    this.ui.add(panel);
    this.addUiText(640, 630, 'AI IS SCANNING...', 17, COLORS.ai).setOrigin(0.5);
    this.tweens.add({ targets: panel, alpha: 0.55, duration: 260, yoyo: true, repeat: -1 });
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
      fontFamily: 'Courier New, monospace',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    });
  }
}
