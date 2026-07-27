import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x555b6e;
const ON_COLOR = 0xffe066;

export class Lamp extends ConnectableObject {
  private bulb: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private pole: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'lamp') {
    super(scene, x, y, id, 'target');

    this.pole = scene.add.rectangle(0, 20, 8, 60, 0x3a3d48);
    this.glow = scene.add.circle(0, -10, 22, ON_COLOR, 0);
    this.bulb = scene.add.circle(0, -10, 14, OFF_COLOR);

    this.add([this.pole, this.glow, this.bulb]);

    this.setSize(44, 90);
    this.setInteractive(new Phaser.Geom.Rectangle(-22, -45, 44, 90), Phaser.Geom.Rectangle.Contains);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.bulb.setFillStyle(ON_COLOR);

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.5,
      duration: 250,
      yoyo: false,
    });

    this.scene.tweens.add({
      targets: this.bulb,
      scale: { from: 1, to: 1.3 },
      duration: 150,
      yoyo: true,
      repeat: 1,
    });
  }
}
