import Phaser from 'phaser';
import { ART } from '../art/interfaceArt';
import type { ResidentInfo } from '../data/chapter';

/** A readable silhouette and optional speech, not a second puzzle mechanic. */
export class Resident extends Phaser.GameObjects.Container {
  readonly id: string;
  constructor(scene: Phaser.Scene, info: ResidentInfo, y: number, speak: () => void) {
    super(scene, info.x, y);
    this.id = info.id;
    const shadow = scene.add.ellipse(0, 34, 44, 12, 0x000000, 0.16);
    const art = scene.add.graphics();
    const ink = 0x34494e;
    art.fillStyle(ink).fillRoundedRect(-18, 24, 15, 10, 4).fillRoundedRect(3, 24, 15, 10, 4);
    art.fillStyle(ink).fillRoundedRect(-19, -5, 38, 35, 12);
    art.fillStyle(info.color).fillRoundedRect(-16, -4, 32, 30, 9);
    art.fillStyle(0xffefd1, 0.4).fillRoundedRect(-14, -1, 6, 23, 3);
    art.lineStyle(2, ink, 0.6).lineBetween(0, 0, 0, 25);
    art.fillStyle(ink).fillCircle(0, -22, 24);
    art.fillStyle(0xffefd1).fillCircle(0, -22, 21);
    art.fillStyle(0xe3d3b3).fillEllipse(0, -5, 31, 8);
    art.fillStyle(ink).fillRoundedRect(-16, -30, 32, 17, 7);
    art.fillStyle(info.color).fillEllipse(-7, -23, 5, 7).fillEllipse(7, -23, 5, 7);
    art.fillStyle(0xffefd1).fillCircle(-8, -25, 1).fillCircle(6, -25, 1);
    // Residents keep the Nexus family resemblance, with an individual occupation silhouette.
    if (info.id === 'miga') {
      art.fillStyle(0xb58765).fillRoundedRect(-25, -44, 50, 6, 3).fillRoundedRect(-16, -56, 32, 14, 5);
      art.fillStyle(0x7b9d85).fillRect(-15, -47, 30, 4);
      art.fillStyle(0xe4cfa6).fillRoundedRect(15, 8, 18, 23, 3);
      art.lineStyle(2, ink, 0.5).lineBetween(20, 14, 28, 14).lineBetween(20, 19, 28, 19);
    } else if (info.id === 'bombo') {
      art.lineStyle(5, ink).beginPath().arc(0, -23, 26, Math.PI, Math.PI * 2).strokePath();
      art.fillStyle(0xb58765).fillRoundedRect(-29, -29, 9, 19, 4).fillRoundedRect(20, -29, 9, 19, 4);
      art.fillStyle(0xe4cfa6).fillEllipse(0, 15, 27, 17);
      art.lineStyle(2, ink).lineBetween(-20, 0, 7, 12).lineBetween(20, 0, -7, 12);
    } else if (info.id === 'vera') {
      art.fillStyle(0xa584ad).fillRoundedRect(-23, -48, 43, 9, 4).fillRoundedRect(-12, -55, 30, 11, 4);
      art.lineStyle(3, ink).lineBetween(18, -12, 28, 9);
      art.fillStyle(0xc49a61).fillCircle(28, 9, 5);
    } else if (info.id === 'don-paso') {
      art.fillStyle(0xc49a61).fillRoundedRect(-23, -48, 46, 10, 5).fillRoundedRect(-18, -57, 36, 16, 9);
      art.fillStyle(0xffefd1).fillRect(-2, -53, 4, 9);
      art.lineStyle(3, 0x896d55).lineBetween(25, 4, 25, 33);
    } else if (info.id === 'goteo') {
      art.fillStyle(0x72988e).fillRoundedRect(-25, -47, 50, 6, 3).fillRoundedRect(-14, -62, 28, 17, 4);
      art.fillStyle(0xc49a61).fillRect(-14, -49, 28, 4);
      art.lineStyle(6, 0xe4cfa6).lineBetween(-13, 0, 13, 24);
      art.fillStyle(0xc49a61).fillCircle(10, 21, 4);
    } else if (info.id === 'pipa') {
      art.fillStyle(0x896d55).fillRoundedRect(-22, -48, 44, 9, 5);
      art.lineStyle(3, 0xc49a61).strokeCircle(-9, -44, 7).strokeCircle(9, -44, 7);
      art.fillStyle(0x896d55).fillRoundedRect(-10, 7, 20, 18, 3);
      art.lineStyle(4, ink).lineBetween(25, 2, 25, 24);
      art.lineStyle(3, ink).beginPath().arc(25, 0, 6, 0, Math.PI).strokePath();
    } else {
      art.fillStyle(0x72988e).fillTriangle(-23, -42, 0, -61, 23, -42);
      art.lineStyle(2, ink).lineBetween(20, 7, 28, 7).lineBetween(28, 7, 28, 15);
      art.fillStyle(0xc49a61).fillRoundedRect(21, 14, 15, 18, 3);
      art.fillStyle(0xffe39b).fillRect(25, 17, 7, 10);
    }
    const name = scene.add.text(0, 48, info.name, {
      fontFamily: ART.body, fontSize: '14px', color: '#ffffff', backgroundColor: '#14234e', padding: { x: 7, y: 3 },
    }).setOrigin(0.5);
    this.add([shadow, art, name]);
    this.setSize(72, 100).setDepth(9);
    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 72, 100), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', speak);
  }
}
