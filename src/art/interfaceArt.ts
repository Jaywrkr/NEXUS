import Phaser from 'phaser';
import { MODERN, paperTexture, pencilLine, pencilCard, pencilCircle } from './modernArt';

export const ART = { ...MODERN, paper: 0xf2ead9, brass: 0xc48646, teal: 0x638f8b };
type G = Phaser.GameObjects.Graphics;
export function ornament(g: G, x: number, y: number, width: number, color = ART.ink): void {
  pencilLine(g, x - width / 2, y, x + width / 2, y, color, .6);
  pencilLine(g, x - width / 2 + 12, y + 3, x + width / 2 - 6, y + 2, color, .4);
}
export function screenArt(scene: Phaser.Scene, _dark = false, headingRule = true): void {
  const { width, height } = scene.scale, key = `pencil-screen-${width}-${height}`;
  paperTexture(scene, key, width, height);
  scene.add.image(0, 0, key).setOrigin(0).setDepth(-5);
  const edges = scene.add.graphics().setDepth(-4);
  pencilLine(edges, 16, 16, width - 16, 16); pencilLine(edges, 16, height - 16, width - 16, height - 16);
  pencilLine(edges, 16, 16, 16, height - 16); pencilLine(edges, width - 16, 16, width - 16, height - 16);
  for (let i = 0; i < 13; i++) {
    pencilLine(edges, width - 90 + i * 4, height - 70, width - 65 + i * 4, height - 38, ART.teal, .12);
  }
  if (headingRule) ornament(edges, width / 2, 78, Math.min(190, width * .35));
}
export function cardArt(g: G, x: number, y: number, width: number, height: number, accent: number, _dark = false): void {
  pencilCard(g, x, y, width, height);
  pencilLine(g, x + 14, y + 5, x + 65, y + 4, accent, .8);
}
/** Small pencil icons; the illustrated story objects themselves come from the atlas. */
export function emblem(g: G, kind: string, x: number, y: number, color: number, r = 21): void {
  g.fillStyle(ART.paper).fillCircle(x, y, r + 3);
  pencilCircle(g, x, y, r + 3, ART.ink, .4);
  if (kind === 'mail') {
    pencilCard(g, x - 13, y - 8, 26, 17, color);
    pencilLine(g, x - 12, y - 7, x, y + 2); pencilLine(g, x, y + 2, x + 12, y - 7);
  } else if (kind === 'toys') {
    g.fillStyle(color).fillEllipse(x - 2, y + 3, 24, 14).fillCircle(x + 7, y - 6, 8);
    pencilCircle(g, x + 7, y - 6, 8); pencilLine(g, x - 13, y + 8, x + 9, y + 8);
    g.fillStyle(ART.brass).fillTriangle(x + 12, y - 8, x + 20, y - 4, x + 12, y - 1);
    g.fillStyle(ART.ink).fillCircle(x + 9, y - 8, 1.5);
  } else {
    for (let i = 0; i < 5; i++) {
      const px = x + Math.cos(i * 1.256) * 8, py = y + Math.sin(i * 1.256) * 8;
      g.fillStyle(color).fillCircle(px, py, 5); pencilCircle(g, px, py, 5, ART.ink, .3);
    }
    g.fillStyle(ART.brass).fillCircle(x, y, 4);
  }
}
export function typography(scene: Phaser.Scene): void {
  for (const item of scene.children.list) if (item instanceof Phaser.GameObjects.Text) item.setFontFamily(ART.body);
}
