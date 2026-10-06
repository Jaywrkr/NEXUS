import Phaser from 'phaser';
import { EffectsSettings } from '../systems/EffectsSettings';
import { ConnectableObject } from './ConnectableObject';

export type EnergySourceVariant = 'active' | 'dim';

export class EnergySource extends ConnectableObject {
  private core: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'energy-source', variant: EnergySourceVariant = 'active') {
    super(scene, x, y, id, 'source');

    const base = scene.add.rectangle(0, 18, 30, 20, 0x555b6e);
    this.glow = scene.add.circle(0, 0, 26, 0xffe38a, 0.25);
    this.core = scene.add.star(0, 0, 6, 10, 20, 0xf4d284);

    base.setFillStyle(0x687c76).setStrokeStyle(2, 0x34494e);
    const detail = scene.add.graphics();
    detail.fillStyle(0xc49a61).fillRoundedRect(-20, 22, 40, 7, 3).fillRoundedRect(-17, 9, 34, 6, 2);
    detail.lineStyle(5,0x243f48,.8).strokeCircle(0,0,26);
    detail.lineStyle(2,0xc49a61).strokeCircle(0,0,26);
    detail.lineStyle(1,0xffefd1,.8).strokeCircle(0,0,23);
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2+Math.PI/4;
      detail.fillStyle(0xd7b779).fillCircle(Math.cos(a)*26,Math.sin(a)*26,3);
      detail.fillStyle(0x243f48).fillCircle(Math.cos(a)*26,Math.sin(a)*26,1);
    }
    detail.fillStyle(0x80d5c8).fillCircle(-9, 20, 2).fillCircle(0, 20, 2).fillCircle(9, 20, 2);
    this.core.setStrokeStyle(1, 0xc49a61);
    this.add([this.glow, base, detail, this.core]);
    this.addShadow(30, 36, 10);

    if (variant === 'active' && !EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.core,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

    if (variant === 'active' && !EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.15, to: 0.4 },
      scale: { from: 0.9, to: 1.1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (variant === 'dim') {
      this.core.setFillStyle(0x9aa0ad).setStrokeStyle(1, 0x65758e);
      this.glow.setVisible(false);
      base.setFillStyle(0x65758e);
    }

    this.setSize(52, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 52, 52), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    this.active_ = true;
  }
}
