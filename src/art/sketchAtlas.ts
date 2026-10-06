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
