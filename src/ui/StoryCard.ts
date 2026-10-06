import Phaser from 'phaser';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

/** Brief, dismissible speech. Movement and puzzle input remain active. */
export class StoryCard {
  private panel: Phaser.GameObjects.Image;
  private speaker: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = Math.min(scene.scale.width - 32, 640);
    const x = (scene.scale.width - width) / 2;
    ensureRoundedRectTexture(scene, 'story-card', 640, 100, 16);
    this.panel = scene.add.image(x, 86, 'story-card').setDisplaySize(width, 100).setTint(0x34494e).setAlpha(0.96)
      .setOrigin(0).setDepth(42).setScrollFactor(0).setInteractive();
    this.speaker = scene.add.text(x + 14, 96, '', { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffe066' })
      .setDepth(43).setScrollFactor(0);
    this.message = scene.add.text(x + 14, 120, '', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#f4f1e8', wordWrap: { width: width - 28, useAdvancedWrap: true },
    }).setDepth(43).setScrollFactor(0);
    this.panel.on('pointerdown', () => this.hide());
    this.hide();
  }

  show(speaker: string, message: string): void {
    this.hideTimer?.remove();
    this.speaker.setText(speaker).setVisible(true);
    this.message.setText(message).setVisible(true);
    this.panel.setDisplaySize(this.panel.displayWidth, 46 + this.message.height).setVisible(true);
    this.hideTimer = this.scene.time.delayedCall(6500, () => this.hide());
  }

  hide(): void {
    this.panel.setVisible(false);
    this.speaker.setVisible(false);
    this.message.setVisible(false);
    this.hideTimer?.remove();
  }
}
