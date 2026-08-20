import Phaser from 'phaser';
import { getTextResolution } from './rendering';
import {
  DEFAULT_GAME_SETTINGS,
  START_LAYOUT,
  getSettingsLabel,
  type Difficulty,
  type GameSettings,
  type ValueDisplayMode,
} from './settings';

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

const TEXT_RESOLUTION = getTextResolution();

const DIFFICULTIES: Array<{
  value: Difficulty;
  title: string;
  description: string;
}> = [
  { value: 'easy', title: 'EASY', description: 'More strong cards for you' },
  { value: 'medium', title: 'MEDIUM', description: 'A balanced mix' },
  { value: 'hard', title: 'HARD', description: 'Cards shuffled at random' },
];

const VALUE_DISPLAYS: Array<{
  value: ValueDisplayMode;
  title: string;
  sample: string;
  description: string;
}> = [
  { value: 'stars', title: 'STARS', sample: '★★★☆☆', description: 'Count from one to five' },
  { value: 'rounded', title: 'ROUNDED', sample: '10  ·  20  ·  30', description: 'Friendly tens' },
  { value: 'exact', title: 'EXACT', sample: '26  ·  54  ·  83', description: 'Full number challenge' },
];

export class StartScene extends Phaser.Scene {
  private ui?: Phaser.GameObjects.Container;
  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };

  constructor() {
    super('start');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.settings = { ...DEFAULT_GAME_SETTINGS };
    this.drawBackdrop();
    this.render();
    this.updateAccessibleStatus();
  }

  private render(): void {
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);

    this.addUiText(48, 38, 'DOUDOU // BATTLER', 26, COLORS.paper);
    this.addUiText(640, 66, 'SET UP YOUR BATTLE', 34, COLORS.paper).setOrigin(0.5);
    this.addUiText(640, 103, 'Pick two things, then let the cards fly.', 16, COLORS.muted)
      .setOrigin(0.5);

    this.addUiText(90, 145, '1 // CHOOSE DIFFICULTY', 17, COLORS.player);
    DIFFICULTIES.forEach((option, index) => {
      this.drawChoiceCard(
        START_LAYOUT.choiceXs[index],
        START_LAYOUT.difficultyY,
        300,
        116,
        option.title,
        option.description,
        undefined,
        this.settings.difficulty === option.value,
        COLORS.player,
        () => {
          this.settings.difficulty = option.value;
          this.render();
          this.updateAccessibleStatus();
        },
      );
    });

    this.addUiText(90, 346, '2 // CHOOSE NUMBER STYLE', 17, COLORS.accent);
    VALUE_DISPLAYS.forEach((option, index) => {
      this.drawChoiceCard(
        START_LAYOUT.choiceXs[index],
        START_LAYOUT.valueDisplayY,
        300,
        148,
        option.title,
        option.description,
        option.sample,
        this.settings.valueDisplay === option.value,
        COLORS.accent,
        () => {
          this.settings.valueDisplay = option.value;
          this.render();
          this.updateAccessibleStatus();
        },
      );
    });

    const summary = this.add.rectangle(640, 565, 420, 42, COLORS.panel, 0.95)
      .setStrokeStyle(2, COLORS.line);
    this.ui.add(summary);
    this.addUiText(640, 565, getSettingsLabel(this.settings), 15, COLORS.paper).setOrigin(0.5);
    this.makeStartButton();
  }

  private drawChoiceCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    description: string,
    sample: string | undefined,
    selected: boolean,
    accent: number,
    action: () => void,
  ): void {
    const shadow = this.add.rectangle(x + 7, y + 8, width, height, 0x000000, 0.28);
    const card = this.add.rectangle(
      x,
      y,
      width,
      height,
      selected ? accent : COLORS.panel,
      selected ? 0.16 : 0.94,
    ).setStrokeStyle(selected ? 4 : 2, selected ? accent : COLORS.line);
    this.ui?.add([shadow, card]);

    this.addUiText(x - width / 2 + 22, y - height / 2 + 18, title, 20, selected ? accent : COLORS.paper);
    if (selected) {
      this.addUiText(x + width / 2 - 20, y - height / 2 + 18, '✓ SELECTED', 12, accent)
        .setOrigin(1, 0);
    }

    if (sample) {
      this.addUiText(x, y - 5, sample, sample.includes('★') ? 25 : 20, COLORS.paper)
        .setOrigin(0.5);
      this.addUiText(x, y + 39, description, 13, COLORS.muted).setOrigin(0.5);
    } else {
      this.addUiText(x - width / 2 + 22, y + 22, description, 14, COLORS.muted);
    }

    card.setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setScale(1.025));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerdown', action);
  }

  private makeStartButton(): void {
    const { startButtonX: x, startButtonY: y } = START_LAYOUT;
    const shadow = this.add.rectangle(x + 7, y + 8, 260, 56, 0x000000, 0.35);
    const button = this.add.rectangle(x, y, 260, 56, COLORS.player)
      .setStrokeStyle(3, COLORS.ink);
    const label = this.makeText(x, y, 'START GAME  ›', 17, COLORS.ink).setOrigin(0.5);
    this.ui?.add([shadow, button, label]);

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setScale(1.04);
      label.setScale(1.04);
    });
    button.on('pointerout', () => {
      button.setScale(1);
      label.setScale(1);
    });
    button.on('pointerdown', () => {
      const status = document.querySelector<HTMLElement>('#game-status');
      if (status) status.textContent = `Starting battle. ${getSettingsLabel(this.settings)}.`;
      this.scene.start('battle', { ...this.settings });
    });
  }

  private updateAccessibleStatus(): void {
    const status = document.querySelector<HTMLElement>('#game-status');
    if (!status) return;
    status.textContent = `Game setup. ${getSettingsLabel(this.settings)} selected. Choose a difficulty and number style, then start the game.`;
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2e2a26, 0.65);
    for (let x = 0; x <= START_LAYOUT.width; x += 40) graphics.lineBetween(x, 0, x, 720);
    for (let y = 0; y <= START_LAYOUT.height; y += 40) graphics.lineBetween(0, y, 1280, y);
    graphics.lineStyle(2, COLORS.line, 0.5);
    graphics.strokeRect(24, 24, 1232, 672);
  }

  private addUiText(
    x: number,
    y: number,
    content: string,
    size: number,
    color: number,
  ): Phaser.GameObjects.Text {
    const label = this.makeText(x, y, content, size, color);
    this.ui?.add(label);
    return label;
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
