import Phaser from 'phaser';
import { PLAZA, PLAZA_FRAME } from '../art/plazaAssets';
import type { ResidentInfo } from '../data/chapter';

const RESIDENT_FRAME: Record<string, number> = { miga: 0, bombo: 1, vera: 2, 'don-paso': 3, goteo: 4, pipa: 5, lucio: 6 };
/** Individual occupational silhouettes, all from the approved pencil family. */
export class Resident extends Phaser.GameObjects.Container {
  readonly id: string;
  constructor(scene: Phaser.Scene, info: ResidentInfo, y: number, speak: () => void) {
    super(scene, info.x, y);
    this.id = info.id;
    const shadow = scene.add.ellipse(0, 34, 44, 9, 0x34332e, .12);
    const portrait = scene.add.image(0, 36, info.id === 'miga' ? PLAZA.sprites : 'sketch-residents',
      info.id === 'miga' ? PLAZA_FRAME.miga : RESIDENT_FRAME[info.id]).setOrigin(.5, 1).setDisplaySize(128, 128);
    const name = scene.add.text(0, 48, info.name, {
      fontFamily: '"Patrick Hand", cursive', fontSize: '15px', color: '#34332e', backgroundColor: '#f2ead9', padding: { x: 7, y: 2 },
    }).setOrigin(.5);
    this.add([shadow, portrait, name]);
    this.setSize(info.id === 'miga' ? 110 : 72, info.id === 'miga' ? 190 : 100).setDepth(9);
    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.width, this.height), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', speak);
  }
}
