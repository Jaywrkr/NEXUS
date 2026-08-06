import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

export type EnergySourceVariant = 'active' | 'dim';

export class EnergySource extends ConnectableObject {
  private core: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;

  /**
   * variant 'dim': fuente sin brillo animado ni rotación, para usarse como señuelo
   * (parece una fuente más, pero ninguna conexión funciona con ella).
   */
  constructor(scene: Phaser.Scene, x: number, y: number, id = 'energy-source', variant: EnergySourceVariant = 'active') {
    super(scene, x, y, id, 'source');

    const coreColor = variant === 'dim' ? 0x9aa0ad : 0xffd93d;
    const glowColor = variant === 'dim' ? 0xaab0bd : 0xffe38a;

    const base = scene.add.rectangle(0, 18, 30, 20, 0x555b6e);
    this.glow = scene.add.circle(0, 0, 26, glowColor, 0.25);
    this.core = scene.add.star(0, 0, 6, 10, 20, coreColor);

    this.add([this.glow, base, this.core]);
    this.addShadow(30, 36, 10);

    if (variant === 'active') {
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
    }

    this.setSize(52, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(-26, -26, 52, 52), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    this.active_ = true;
  }
}
