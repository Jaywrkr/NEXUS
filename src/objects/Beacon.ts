import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x8b8f8a;
const PARTIAL_COLOR = 0xb9d4e0;
const ON_COLOR = 0x7ee0ff;
const INDICATOR_OFF = 0x6b7280;
const INDICATOR_ON = 0x4fd1ff;

const REQUIRED_CONNECTIONS = 2;

/**
 * Antena que necesita DOS conexiones (de dos fuentes distintas) para
 * activarse por completo. Sigue usando únicamente la acción de
 * conectar, solo que esta vez el objetivo pide más de un cable.
 */
export class Beacon extends ConnectableObject {
  private dish: Phaser.GameObjects.Ellipse;
  private glow: Phaser.GameObjects.Arc;
  private indicators: Phaser.GameObjects.Arc[] = [];
  private connections = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'beacon') {
    super(scene, x, y, id, 'target');

    this.glow = scene.add.circle(0, -10, 46, ON_COLOR, 0);
    const pole = scene.add.rectangle(0, 30, 8, 60, 0x3a3d48);
    this.dish = scene.add
      .ellipse(0, -10, 66, 40, OFF_COLOR)
      .setStrokeStyle(3, 0x1b1f3b, 0.35);

    this.add([this.glow, pole, this.dish]);
    this.addShadow(62, 50, 14);

    for (let i = 0; i < REQUIRED_CONNECTIONS; i += 1) {
      const indicator = scene.add.circle(-10 + i * 20, 54, 6, INDICATOR_OFF);
      this.indicators.push(indicator);
      this.add(indicator);
    }

    // Pulso tenue mientras no está totalmente activa.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.04, to: 0.14 },
      scale: { from: 0.95, to: 1.1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(80, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(-40, -50, 80, 100), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.connections >= REQUIRED_CONNECTIONS) return;

    this.indicators[this.connections].setFillStyle(INDICATOR_ON);
    this.scene.tweens.add({
      targets: this.indicators[this.connections],
      scale: { from: 1, to: 1.5 },
      duration: 150,
      yoyo: true,
    });

    this.connections += 1;

    if (this.connections === 1) {
      this.dish.setFillStyle(PARTIAL_COLOR);
      return;
    }

    this.active_ = true;
    this.dish.setFillStyle(ON_COLOR);

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.45,
      duration: 300,
    });

    this.scene.tweens.add({
      targets: this.dish,
      angle: { from: -6, to: 6 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Restaura visualmente el estado completo sin animar (progreso ya guardado). */
  forceFullyActive(): void {
    this.connections = REQUIRED_CONNECTIONS;
    this.active_ = true;
    this.indicators.forEach((i) => i.setFillStyle(INDICATOR_ON));
    this.dish.setFillStyle(ON_COLOR);
    this.glow.setAlpha(0.45);
  }

  get isFullyActive(): boolean {
    return this.connections >= REQUIRED_CONNECTIONS;
  }
}
