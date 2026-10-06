import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x6b7280;
const ON_COLOR = 0xffe066;

export class Lamp extends ConnectableObject {
  private bulb: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private pole: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'lamp') {
    super(scene, x, y, id, 'target');

    const base = scene.add.rectangle(0, 46, 26, 10, 0x2a2d36);
    this.pole = scene.add.rectangle(0, 6, 10, 80, 0x3a3d48);
    this.glow = scene.add.circle(0, -40, 32, ON_COLOR, 0);
    this.bulb = scene.add
      .circle(0, -40, 20, OFF_COLOR)
      .setStrokeStyle(3, 0x1b1f3b, 0.4);

    const trim = scene.add.graphics();
    base.setFillStyle(0x243871).setStrokeStyle(2,0x86c8ff);
    this.pole.setFillStyle(0x345c9b);
    this.bulb.setFillStyle(0x7199bf).setStrokeStyle(4,0x1e336b);
    trim.clear().fillStyle(0x243871).fillRoundedRect(-19,39,38,7,2);
    trim.fillStyle(0x14234e).fillTriangle(-25,-55,0,-71,25,-55);
    trim.fillStyle(0x5168c7).fillTriangle(-25,-55,0,-71,0,-55);
    trim.lineStyle(2,0x8be8ff,.8).lineBetween(-3,-19,-3,37);
    trim.lineStyle(2,0xe4f9ff,.8).beginPath().arc(-3,-43,12,Math.PI,Math.PI*1.6).strokePath();
    this.add([base, this.pole, this.glow, this.bulb, trim]);
    this.addShadow(52, 34, 10);

    // Pulso tenue mientras está apagada, para que se note que es interactiva.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.05, to: 0.18 },
      scale: { from: 0.9, to: 1.1 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(64, 130);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 64, 130), Phaser.Geom.Rectangle.Contains);
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
      alpha: 0.55,
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
