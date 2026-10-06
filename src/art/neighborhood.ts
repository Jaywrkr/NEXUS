import Phaser from 'phaser';
import { modernTitle } from './modernArt';

/** Seven registered pencil landscapes; decorative drawings never accept input. */
export function drawNeighborhood(scene: Phaser.Scene, height: number): void {
  const starts = [0, 1160, 1840, 2410, 3020, 3860, 4790, 6100];
  const names = ['PLAZA DE MIGA', 'PASEO DEL AGUA', 'CUAC FM', 'DON PASO', 'EL JARDÍN', 'TALLER DE PIPA', 'CAMINO DE LUCIO'];
  for (let zone = 0; zone < 7; zone++) {
    const left = starts[zone], width = starts[zone + 1] - left;
    scene.add.image(left, 0, 'sketch-districts', zone).setOrigin(0).setDisplaySize(width, height).setDepth(4);
    scene.add.text(left + width / 2, height * .20, names[zone], {
      fontFamily: '"Patrick Hand", cursive', fontSize: '17px', color: '#454239',
      backgroundColor: '#f2ead9', padding: { x: 12, y: 3 },
    }).setOrigin(.5).setDepth(5);
  }
}
export function drawSky(scene: Phaser.Scene, _width: number, _height: number): void {
  scene.cameras.main.setBackgroundColor('#e9dfca');
}
export function drawTitleArt(scene: Phaser.Scene, width: number, height: number): void {
  modernTitle(scene, width, height);
}
