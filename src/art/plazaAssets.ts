import Phaser from 'phaser';

export const PLAZA = { background: 'plaza-illustration', sprites: 'plaza-sprites', states: 'plaza-states' };
export const PLAZA_FRAME = { generator: 0, lamp: 1, door: 2, miga: 3, bird: 4, leaves: 5 };
export function loadPlazaAssets(scene: Phaser.Scene): void {
  scene.load.image(PLAZA.background, 'assets/plaza/plaza.webp');
  scene.load.spritesheet(PLAZA.sprites, 'assets/plaza/sprites.webp', { frameWidth: 512, frameHeight: 512 });
  scene.load.spritesheet(PLAZA.states, 'assets/plaza/states.webp', { frameWidth: 512, frameHeight: 512 });
}
