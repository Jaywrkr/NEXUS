import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

export class EnergySource extends ConnectableObject {
  private core: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'energy-source') {
    super(scene, x, y, id, 'source');

    const base = scene.add.rectangle(0, 18, 30, 20, 0x555b6e);
    this.glow = scene.add.circle(0, 0, 26, 0xffe38a, 0.25);
    this.core = scene.add.star(0, 0, 6, 10, 20, 0xffd93d);

    this.add([this.glow, base, this.core]);
    this.addShadow(30, 36, 10);

    scene.tweens.add({
      targets: this.core,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.15, to: 0.4 },
      scale: { from: 0.9, to: 1.1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(52, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(-26, -26, 52, 52), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    this.active_ = true;
  }
}
