import Phaser from 'phaser';
import { loadSketchWorld, createSketchWorldFrames } from './sketchAtlas';

/** Compatibility frames for the existing plaza physics and animations, now all pencil. */
export const PLAZA = { background: 'plaza-illustration', sprites: 'plaza-sprites', states: 'plaza-states' };
export const PLAZA_FRAME = { generator: 0, lamp: 1, door: 2, miga: 3, bird: 4, leaves: 5 };
export const loadPlazaAssets = loadSketchWorld;
export function createPlazaFrames(scene: Phaser.Scene): void {
  createSketchWorldFrames(scene);
  if (!scene.textures.exists(PLAZA.background)) {
    const t = scene.textures.get('sketch-districts'), f = t.get('0');
    const canvas = scene.textures.createCanvas(PLAZA.background, f.width, f.height)!;
    canvas.getContext().drawImage(t.getSourceImage() as HTMLImageElement, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.width, f.height);
    canvas.refresh();
  }
  for (const [key, active] of [[PLAZA.sprites, false], [PLAZA.states, true]] as const) {
    if (scene.textures.exists(key)) continue;
    const canvas = scene.textures.createCanvas(key, 1536, 1024)!;
    const sources: [string, number][] = [
      [active ? 'sketch-props-on' : 'sketch-props-off', 0],
      [active ? 'sketch-props-on' : 'sketch-props-off', 1],
      [active ? 'sketch-props-on' : 'sketch-props-off', 2],
      ['sketch-residents', 0], ['sketch-residents', active ? 7 : 8], ['sketch-extras', 8],
    ];
    sources.forEach(([source, index], i) => {
      const texture = scene.textures.get(source), frame = texture.get(String(index));
      const x = i % 3 * 512, y = Math.floor(i / 3) * 512;
      canvas.getContext().drawImage(texture.getSourceImage() as HTMLImageElement, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, x, y, 512, 512);
      canvas.add(String(i), 0, x, y, 512, 512);
    });
    canvas.refresh();
  }
}
