import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x9aa0a8;
const ON_COLOR = 0x4fb8e0;

export class Fountain extends ConnectableObject {
  private basin: Phaser.GameObjects.Arc;
  private water: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private spout: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'fountain') {
    super(scene, x, y, id, 'target');

    this.glow = scene.add.circle(0, 20, 56, ON_COLOR, 0);
    this.basin = scene.add
      .circle(0, 20, 46, 0x6b6f78)
      .setStrokeStyle(3, 0x1b1f3b, 0.3);
    this.water = scene.add
      .circle(0, 20, 34, OFF_COLOR)
      .setStrokeStyle(2, 0x1b1f3b, 0.2);
    this.spout = scene.add.circle(0, 4, 11, 0x555b6e);

    this.add([this.glow, this.basin, this.water, this.spout]);
    this.addShadow(66, 92, 16);

    // Pulso tenue mientras está apagada, para que se note que es interactiva.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.05, to: 0.16 },
      scale: { from: 0.95, to: 1.08 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(92, 92);
    this.setInteractive(new Phaser.Geom.Rectangle(-46, -26, 92, 92), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.water.setFillStyle(ON_COLOR);

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.4,
      duration: 300,
    });

    this.scene.tweens.add({
      targets: this.water,
      scale: { from: 0.9, to: 1.05 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
