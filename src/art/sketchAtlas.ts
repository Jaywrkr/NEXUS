import Phaser from 'phaser';

/** Alpha-preserving registered grids. Frames derive from actual image dimensions. */
export function gridFrames(scene: Phaser.Scene, key: string, columns: number, rows: number): void {
  const texture = scene.textures.get(key);
  if (texture.has('0')) return;
  const source = texture.getSourceImage() as HTMLImageElement;
  const w = source.width / columns, h = source.height / rows;
  for (let i = 0; i < columns * rows; i++) {
    texture.add(String(i), 0, Math.round(i % columns * w), Math.round(Math.floor(i / columns) * h), Math.round(w), Math.round(h));
  }
}
export function loadSketchAccessories(scene: Phaser.Scene): void {
  scene.load.image('sketch-extras', 'assets/sketch/extras.webp');
}

export const SKETCH_PROP: Record<string, number> = {
  generator: 0, lamp: 1, door: 2, fountain: 3, beacon: 4, bridge: 5,
  sprinkler: 6, flowers: 7, motor: 8, duck: 9, bell: 10, parade: 11,
  lantern: 12, stage: 13, confetti: 14, radio: 15,
};
export const SKETCH_EXTRA: Record<string, number> = {
  mailbox: 4, mail: 5, translator: 6, speaker: 7, plant: 8, star: 9,
  cabinet: 10, deck: 11, moon: 12, sun: 13, filter: 14, bulletin: 15,
};
export function sketchTexture(kind: string, active: boolean): [string, number] {
  return kind in SKETCH_PROP ? [active ? 'sketch-props-on' : 'sketch-props-off', SKETCH_PROP[kind]]
    : ['sketch-extras', SKETCH_EXTRA[kind] ?? SKETCH_EXTRA.star];
}
export function loadSketchWorld(scene: Phaser.Scene): void {
  for (const name of ['districts', 'residents', 'props-off', 'props-on'])
    scene.load.image(`sketch-${name}`, `assets/sketch/${name}.webp`);
}
export function createSketchWorldFrames(scene: Phaser.Scene): void {
  gridFrames(scene, 'sketch-districts', 2, 4);
  gridFrames(scene, 'sketch-residents', 3, 3);
  gridFrames(scene, 'sketch-props-off', 4, 4);
  gridFrames(scene, 'sketch-props-on', 4, 4);
}
