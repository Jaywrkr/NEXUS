import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { CustomizeScene } from '../scenes/CustomizeScene';
import { WorldScene } from '../scenes/WorldScene';
import { MuseumScene } from '../scenes/MuseumScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#f4f1e8',
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, CustomizeScene, WorldScene, MuseumScene],
};
