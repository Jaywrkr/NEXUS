import Phaser from 'phaser';
import type { ResidentInfo } from '../data/chapter';

/** A readable silhouette and optional speech, not a second puzzle mechanic. */
export class Resident extends Phaser.GameObjects.Container {
  readonly id: string;
  constructor(scene: Phaser.Scene, info: ResidentInfo, y: number, speak: () => void) {
    super(scene, info.x, y);
    this.id = info.id;
    const shadow = scene.add.ellipse(0, 34, 44, 12, 0x000000, 0.16);
    const body = scene.add.rectangle(0, 10, 32, 40, info.color).setStrokeStyle(2, 0x20233a);
    const head = scene.add.circle(0, -18, 22, 0xf4f1e8).setStrokeStyle(2, 0x20233a);
    const face = scene.add.rectangle(0, -18, 28, 15, 0x20233a);
    const eyes = scene.add.graphics();
    eyes.fillStyle(info.color).fillCircle(-7, -18, 3).fillCircle(7, -18, 3);
    const name = scene.add.text(0, 48, info.name, { fontFamily: 'sans-serif', fontSize: '14px', color: '#20233a' }).setOrigin(0.5);
    this.add([shadow, body, head, face, eyes, name]);
    this.setSize(72, 100).setDepth(9);
    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 72, 100), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', speak);
  }
}
