import Phaser from 'phaser';
import './style.css';
import { GameScene } from './game/GameScene';
import { StartScene } from './game/StartScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#11100f',
  scene: [StartScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
