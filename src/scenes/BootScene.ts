import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#f4f1e8');

    this.add
      .text(width / 2, height / 2, 'Los Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    this.time.delayedCall(700, () => this.scene.start('WorldScene'));
  }
}
