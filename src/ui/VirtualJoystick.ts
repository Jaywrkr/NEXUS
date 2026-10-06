import { pencilDiscTexture, pencilCircle, pencilLine } from '../art/modernArt';
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
  private knob: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private vector = new Phaser.Math.Vector2(0, 0);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.centerX = x;
    this.centerY = y;

    pencilDiscTexture(scene, 'pencil-joystick-base', BASE_RADIUS);
    pencilDiscTexture(scene, 'pencil-joystick-knob', KNOB_RADIUS);
    const touch = window.matchMedia('(pointer: coarse)').matches;
    scene.add.image(x, y, 'pencil-joystick-base').setTint(0xf2ead9).setAlpha(.94).setScrollFactor(0).setDepth(50).setVisible(touch);
    const trim = scene.add.graphics().setDepth(50).setScrollFactor(0);
    pencilCircle(trim, x, y, BASE_RADIUS - 6, 0x638f8b, .45);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      pencilLine(trim, x + Math.cos(a) * 34, y + Math.sin(a) * 34, x + Math.cos(a) * 39, y + Math.sin(a) * 39);
    }
    this.knob = scene.add.image(x, y, 'pencil-joystick-knob').setTint(0xa7c2b5).setScrollFactor(0).setDepth(51);
    trim.setVisible(touch); this.knob.setVisible(touch);

    const touchZone = scene.add
      .circle(x, y, TOUCH_ZONE_RADIUS, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(52)
      .setVisible(touch);
    if (touch) touchZone.setInteractive();

    touchZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startDrag(pointer));

    const move = (pointer: Phaser.Input.Pointer): void => this.updateDrag(pointer);
    const end = (pointer: Phaser.Input.Pointer): void => this.endDrag(pointer);
    const reset = (): void => this.reset();
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', end);
    scene.input.on('pointerupoutside', end);
    scene.events.on('pause', reset);
    scene.game.events.on('blur', reset);
    scene.events.once('shutdown', () => {
      scene.input.off('pointermove', move); scene.input.off('pointerup', end); scene.input.off('pointerupoutside', end);
      scene.events.off('pause', reset); scene.game.events.off('blur', reset);
    });
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

    this.reset();
  }

  /** Release any drag before a new attempt starts. */
  reset(): void {
    this.pointerId = null;
    this.vector.set(0, 0);
    this.knob.setPosition(this.centerX, this.centerY);
  }

  getVector(): Phaser.Math.Vector2 {
    return this.vector;
  }
}
