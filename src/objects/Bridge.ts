import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const OFF_COLOR = 0x8b8f8a;
const ON_COLOR = 0xffe066;

/**
 * Interruptor que revela un puente sobre una grieta. A diferencia de los
 * demás objetos, activar este además de la reacción visual propia hace
 * que WorldScene despeje el camino (destruye la barrera física).
 */
export class Bridge extends ConnectableObject {
  private post: Phaser.GameObjects.Rectangle;
  private handle: Phaser.GameObjects.Rectangle;
  private knob: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'bridge') {
    super(scene, x, y, id, 'target');

    this.glow = scene.add.circle(0, -10, 30, ON_COLOR, 0);
    this.post = scene.add.rectangle(0, 10, 8, 50, 0x3a3d48);
    this.handle = scene.add.rectangle(0, -10, 4, 22, OFF_COLOR).setOrigin(0.5, 1);
    this.knob = scene.add.circle(0, -10, 5, OFF_COLOR);

    this.add([this.glow, this.post, this.handle, this.knob]);
    this.addShadow(38, 40, 12);

    // Pulso tenue mientras está apagado, para que se note que es interactivo.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.05, to: 0.18 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(44, 80);
    this.setInteractive(new Phaser.Geom.Rectangle(-22, -50, 44, 80), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.knob.setFillStyle(ON_COLOR);

    this.scene.tweens.add({
      targets: this.handle,
      angle: -100,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.4,
      duration: 250,
    });
  }

  /** Restaura visualmente el estado activado sin animar (progreso ya guardado). */
  forceActive(): void {
    this.active_ = true;
    this.knob.setFillStyle(ON_COLOR);
    this.handle.setAngle(-100);
    this.glow.setAlpha(0.4);
  }
}
