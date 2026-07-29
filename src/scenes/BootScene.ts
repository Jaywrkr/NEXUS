import Phaser from 'phaser';
import { fadeToScene } from '../utils/sceneTransition';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#f4f1e8');
    this.cameras.main.fadeIn(300, 244, 241, 232);

    this.add
      .text(width / 2, height / 2, 'Los Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    this.time.delayedCall(700, () => fadeToScene(this, 'CustomizeScene', [244, 241, 232]));
  }
}
