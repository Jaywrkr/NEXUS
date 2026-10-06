import Phaser from 'phaser';
import { MODERN as ART } from '../art/modernArt';
import { ensureFlatTexture as ensureRoundedRectTexture } from '../art/modernArt';

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
    this.panel = scene.add.image(x, 86, 'story-card').setDisplaySize(width, 100).setTint(0xf2ead9).setAlpha(0.99)
      .setOrigin(0).setDepth(42).setScrollFactor(0).setInteractive();
    this.speaker = scene.add.text(x + 20, 96, '', { fontFamily: ART.body, fontSize: '16px', fontStyle: 'bold', color: '#557b73' })
      .setDepth(43).setScrollFactor(0);
    this.message = scene.add.text(x + 20, 120, '', {
      fontFamily: ART.body, fontSize: '16px', color: '#34332e', wordWrap: { width: width - 40, useAdvancedWrap: true },
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
