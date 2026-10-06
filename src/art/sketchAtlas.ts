import Phaser from 'phaser';

/** Alpha-preserving registered grids. Frames derive from actual image dimensions. */
export function gridFrames(scene: Phaser.Scene, key: string, columns: number, rows: number, registrationMate?: string): void {
  const texture = scene.textures.get(key);
  if (texture.has('0')) return;
  const source = texture.getSourceImage() as HTMLImageElement;
  const w = source.width / columns, h = source.height / rows;
  const registration = document.createElement('canvas');
  registration.width = source.width; registration.height = source.height;
  const ctx = registration.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
  let matePixels: Uint8ClampedArray | undefined;
  if (registrationMate) {
    const mate = scene.textures.get(registrationMate).getSourceImage() as HTMLImageElement;
    ctx.clearRect(0, 0, source.width, source.height);
    ctx.drawImage(mate, 0, 0, source.width, source.height);
    matePixels = ctx.getImageData(0, 0, source.width, source.height).data;
  }
  for (let i = 0; i < columns * rows; i++) {
    const left = Math.round(i % columns * w), top = Math.round(Math.floor(i / columns) * h);
    const right = Math.round((i % columns + 1) * w), bottom = Math.round((Math.floor(i / columns) + 1) * h);
    let x1 = right, y1 = bottom, x2 = left, y2 = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      const alpha = (y * source.width + x) * 4 + 3;
      if (pixels[alpha] <= 3 && (!matePixels || matePixels[alpha] <= 3)) continue;
      x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
    }
    // Frame metadata registers the silhouette's feet, without rewriting the source image.
    texture.add(String(i), 0, x1 < x2 ? x1 : left, y1 < y2 ? y1 : top,
      x1 < x2 ? x2 - x1 + 1 : right - left, y1 < y2 ? y2 - y1 + 1 : bottom - top);
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
  for (const name of ['residents', 'props-off', 'props-on'])
    scene.load.image(`sketch-${name}`, `assets/sketch/${name}.webp`);
  for (let i = 0; i < 8; i++) scene.load.image(`sketch-district-${i}`, `assets/sketch/district-${i}.webp`);
}
export function createSketchWorldFrames(scene: Phaser.Scene): void {
  if (!scene.textures.exists('sketch-districts')) {
    const atlas = scene.textures.createCanvas('sketch-districts', 1024, 1152)!;
    for (let i = 0; i < 8; i++) {
      const source = scene.textures.get(`sketch-district-${i}`).getSourceImage() as HTMLImageElement;
      atlas.getContext().drawImage(source, i % 2 * 512, Math.floor(i / 2) * 288, 512, 288);
    }
    atlas.refresh();
  }
  gridFrames(scene, 'sketch-districts', 2, 4);
  gridFrames(scene, 'sketch-residents', 3, 3);
  gridFrames(scene, 'sketch-props-off', 4, 4, 'sketch-props-on');
  gridFrames(scene, 'sketch-props-on', 4, 4, 'sketch-props-off');
}
