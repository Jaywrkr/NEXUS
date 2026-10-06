import Phaser from 'phaser';
import { OUTFITS, type Appearance, loadAppearance } from '../data/appearance';

/** Runtime clothing palette, shared by all four existing poses; face and ears stay intact. */
export function applyNexusPose(image: Phaser.GameObjects.Image, pose: string, look: Appearance): void {
  let key = pose;
  if (look.outfit !== 'turquoise') {
    key = `${pose}-outfit-${look.outfit}`;
    if (!image.scene.textures.exists(key)) {
      const source = image.scene.textures.get(pose).getSourceImage() as HTMLImageElement;
      const texture = image.scene.textures.createCanvas(key, source.width, source.height)!;
      const ctx = texture.getContext();
      ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, source.width, source.height);
      const color = OUTFITS.find(o => o.id === look.outfit)!.color;
      const red = color >> 16, green = color >> 8 & 255, blue = color & 255;
      for (let y = Math.floor(source.height * 0.47); y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const i = (y * source.width + x) * 4;
          const [r, g, b, a] = pixels.data.subarray(i, i + 4);
          if (a < 30 || g < 35 || b < 35 || g < r * 1.3 || b < r * 1.3 || Math.abs(g - b) > 90) continue;
          const shade = (g + b) / 2 / 170;
          pixels.data[i] = Math.min(255, red * shade);
          pixels.data[i + 1] = Math.min(255, green * shade);
          pixels.data[i + 2] = Math.min(255, blue * shade);
        }
      }
      ctx.putImageData(pixels, 0, 0);
      texture.refresh();
    }
  }
  image.setTexture(key);
}
export function drawAccessory(g: Phaser.GameObjects.Graphics, look: Appearance): void {
  g.clear();
  const ink = 0x34494e;
  if (look.accessory === 'bow') {
    g.fillStyle(0xe991ae).fillTriangle(-12, -23, -12, -9, 0, -16).fillTriangle(12, -23, 12, -9, 0, -16);
    g.fillStyle(0xffefd1).fillCircle(0, -16, 3);
  } else if (look.accessory === 'antenna') {
    g.lineStyle(3, ink).lineBetween(0, -70, 0, -92);
    g.fillStyle(0xffdf76).fillCircle(0, -95, 5);
    g.lineStyle(1, 0xffefd1).strokeCircle(0, -95, 5);
  } else if (look.accessory === 'duck') {
    g.fillStyle(0xffdf76).fillEllipse(19, 2, 12, 9).fillCircle(23, -3, 5);
    g.fillStyle(0xe69a66).fillTriangle(27, -5, 31, -2, 27, 0);
    g.fillStyle(ink).fillCircle(24, -4, 1);
  } else if (look.accessory === 'crown') {
    g.fillStyle(0xd8a254).fillTriangle(-20, -71, -22, -88, -7, -78).fillTriangle(-7, -78, 0, -92, 8, -78).fillTriangle(8, -78, 22, -88, 20, -71);
    g.fillStyle(0xffdf76).fillRoundedRect(-20, -77, 40, 8, 2);
    g.fillStyle(0x86d7cc).fillCircle(0, -74, 2);
  }
}
export function nexusPortrait(scene: Phaser.Scene, x: number, y: number, height: number, pose: string, look = loadAppearance()): Phaser.GameObjects.Container {
  const portrait = scene.add.container(x, y);
  const sprite = scene.add.image(0, 0, pose).setOrigin(0.5, 1);
  applyNexusPose(sprite, pose, look);
  sprite.setScale(120 / sprite.height);
  const accessory = scene.add.graphics({ y: -34 });
  drawAccessory(accessory, look);
  portrait.add([sprite, accessory]).setScale(height / 120);
  return portrait;
}
