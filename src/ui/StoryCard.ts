import Phaser from 'phaser';

/** Brief, dismissible speech. Movement and puzzle input remain active. */
export class StoryCard {
  private panel: Phaser.GameObjects.Rectangle;
  private speaker: Phaser.GameObjects.Text;
  private message: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const width = Math.min(scene.scale.width - 32, 640);
    const x = (scene.scale.width - width) / 2;
    this.panel = scene.add.rectangle(x, 86, width, 100, 0x20233a, 0.94)
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
    this.panel.setSize(this.panel.width, 46 + this.message.height).setVisible(true);
    this.hideTimer = this.scene.time.delayedCall(6500, () => this.hide());
  }

  hide(): void {
    this.panel.setVisible(false);
    this.speaker.setVisible(false);
    this.message.setVisible(false);
    this.hideTimer?.remove();
  }
}
