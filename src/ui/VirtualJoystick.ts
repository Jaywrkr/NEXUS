import Phaser from 'phaser';

const BASE_RADIUS = 46;
const KNOB_RADIUS = 22;
const TOUCH_ZONE_RADIUS = 70;

/**
 * Joystick virtual simple para mover al Nexus en pantallas táctiles.
 * Se ubica fijo en la esquina inferior izquierda y no interfiere con
 * el resto de la interacción (conectar objetos sigue siendo tocar/clic).
 */
export class VirtualJoystick {
  private centerX: number;
  private centerY: number;
  private knob: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private vector = new Phaser.Math.Vector2(0, 0);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.centerX = x;
    this.centerY = y;

    scene.add
      .circle(x, y, BASE_RADIUS, 0x1b1f3b, 0.15)
      .setScrollFactor(0)
      .setDepth(50);

    this.knob = scene.add
      .circle(x, y, KNOB_RADIUS, 0x1b1f3b, 0.35)
      .setScrollFactor(0)
      .setDepth(51);

    const touchZone = scene.add
      .circle(x, y, TOUCH_ZONE_RADIUS, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(52)
      .setInteractive();

    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startDrag(pointer));

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.updateDrag(pointer));
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endDrag(pointer));
    scene.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.endDrag(pointer));
  }

  private startDrag(pointer: Phaser.Input.Pointer): void {
    this.pointerId = pointer.id;
    this.updateDrag(pointer);
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;

    const dx = pointer.x - this.centerX;
    const dy = pointer.y - this.centerY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), BASE_RADIUS);
    const angle = Math.atan2(dy, dx);

    const knobX = this.centerX + Math.cos(angle) * distance;
    const knobY = this.centerY + Math.sin(angle) * distance;
    this.knob.setPosition(knobX, knobY);

    this.vector.set(dx, dy);
    if (distance > 6) {
      this.vector.normalize();
    } else {
      this.vector.set(0, 0);
    }
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;

    this.pointerId = null;
    this.vector.set(0, 0);
    this.knob.setPosition(this.centerX, this.centerY);
  }

  getVector(): Phaser.Math.Vector2 {
    return this.vector;
  }
}
