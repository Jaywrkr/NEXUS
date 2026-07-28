import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x8b8f8a;
const ON_COLOR = 0x4fb8e0;

export class Fountain extends ConnectableObject {
  private basin: Phaser.GameObjects.Arc;
  private water: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'fountain') {
    super(scene, x, y, id, 'target');

    this.basin = scene.add.circle(0, 20, 46, 0x6b6f78);
    this.water = scene.add.circle(0, 20, 36, OFF_COLOR);

    this.add([this.basin, this.water]);

    this.setSize(92, 92);
    this.setInteractive(new Phaser.Geom.Rectangle(-46, -26, 92, 92), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.water.setFillStyle(ON_COLOR);

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
