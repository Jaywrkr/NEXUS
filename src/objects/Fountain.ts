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
      .circle(0, 20, 46, 0x789be0)
      .setStrokeStyle(3, 0x1b1f3b, 0.3);
    this.water = scene.add
      .circle(0, 20, 34, OFF_COLOR)
      .setStrokeStyle(2, 0x1b1f3b, 0.2);
    this.spout = scene.add.circle(0, 4, 11, 0x6786cb);

    const trim = scene.add.graphics();
    trim.lineStyle(3, 0xf4faff, 0.65).beginPath().arc(0, 20, 42, Math.PI, Math.PI * 1.85).strokePath();
    trim.lineStyle(1, 0x657b79, 0.5).strokeEllipse(0, 22, 52, 28).strokeEllipse(0, 22, 35, 18);
    trim.fillStyle(0x91bbff).fillRoundedRect(-8, -14, 16, 30, 5).fillEllipse(0, -14, 30, 10);
    trim.fillStyle(0xf4faff).fillEllipse(-3, -16, 21, 4);
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5;
      trim.lineStyle(1,0x4067ac,.35).lineBetween(Math.cos(a)*36,20+Math.sin(a)*36,Math.cos(a)*45,20+Math.sin(a)*45);
    }
    trim.lineStyle(2,0xaedaff,.7).strokeCircle(0,20,45);
    this.add([this.glow, this.basin, this.water, this.spout, trim]);
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
    this.setInteractive(new Phaser.Geom.Rectangle(0, 20, 92, 92), Phaser.Geom.Rectangle.Contains);
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
