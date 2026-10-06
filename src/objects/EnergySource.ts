import Phaser from 'phaser';
import { EffectsSettings } from '../systems/EffectsSettings';
import { ConnectableObject } from './ConnectableObject';

export class EnergySource extends ConnectableObject {
  private core: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'energy-source') {
    super(scene, x, y, id, 'source');

    const base = scene.add.rectangle(0, 18, 30, 20, 0x555b6e);
    this.glow = scene.add.circle(0, 0, 26, 0xffe38a, 0.25);
    this.core = scene.add.star(0, 0, 6, 10, 20, 0xf4d284);

    const detail = scene.add.graphics();
    base.setFillStyle(0x345cdd).setStrokeStyle(2,0x14234e);
    detail.clear().fillStyle(0x14234e).fillRoundedRect(-22,21,44,9,3);
    detail.lineStyle(5,0x25356a).strokeCircle(0,0,26);
    detail.lineStyle(2,0x27e7da).strokeCircle(0,0,26);
    detail.fillStyle(0x94fff0).fillCircle(-10,20,2).fillCircle(0,20,2).fillCircle(10,20,2);
    this.glow.setFillStyle(0x27e7da);
    this.core.setStrokeStyle(1,0xfff4a1);
    this.add([this.glow, base, detail, this.core]);
    this.addShadow(30, 36, 10);

    if (!EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.core,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

    if (!EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.15, to: 0.4 },
      scale: { from: 0.9, to: 1.1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(52, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 52, 52), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    this.active_ = true;
  }
}
