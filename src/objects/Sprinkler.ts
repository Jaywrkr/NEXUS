import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

/** Receives energy, then becomes the source for the garden's watering cable. */
export class Sprinkler extends ConnectableObject {
  private nozzle: Phaser.GameObjects.Arc;
  private water: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'garden-sprinkler', 'target');
    const base = scene.add.rectangle(0, 24, 54, 16, 0x657b70);
    const pipe = scene.add.rectangle(0, 2, 12, 40, 0x657b70);
    this.nozzle = scene.add.circle(0, -18, 14, 0x88958c).setStrokeStyle(3, 0x1b1f3b, 0.4);
    this.water = scene.add.graphics().setVisible(false);
    this.water.lineStyle(3, 0x4fb8e0, 0.85);
    for (const dx of [-32, -16, 16, 32]) {
      this.water.lineBetween(0, -24, dx, -42);
      this.water.fillStyle(0x4fb8e0);
      this.water.fillCircle(dx, -36, 3);
    }
    const trim = scene.add.graphics();
    trim.lineStyle(2, 0xffefd1, 0.55).lineBetween(-3, 0, -3, 17);
    trim.fillStyle(0xc49a61).fillRoundedRect(-10, 10, 20, 5, 2).fillRoundedRect(-20, 19, 40, 5, 2);
    trim.lineStyle(2, 0xc49a61).strokeCircle(0, -18, 10);
    this.add([base, pipe, this.nozzle, trim, this.water]);
    this.addShadow(36, 64, 12);
    this.setSize(88, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 88, 100), Phaser.Geom.Rectangle.Contains);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.nozzle.setFillStyle(0x5ee7ff);
    this.water.setVisible(true);
  }
}
