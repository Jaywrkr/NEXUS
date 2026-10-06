import Phaser from 'phaser';
import { OUTFITS, CABLES, type Appearance, loadAppearance } from '../data/appearance';

/** Runtime clothing palette, shared by all four existing poses; face and ears stay intact. */
export function applyNexusPose(image: Phaser.GameObjects.Image, pose: string, look: Appearance): void {
  let key = pose;
  if (look.outfit !== 'turquoise' || look.cable !== 'lime') {
    key = `${pose}-outfit-${look.outfit}-cable-${look.cable}`;
    if (!image.scene.textures.exists(key)) {
      const source = image.scene.textures.get(pose).getSourceImage() as HTMLCanvasElement;
      const texture = image.scene.textures.createCanvas(key, source.width, source.height)!;
      const ctx = texture.getContext();
      ctx.drawImage(source, 0, 0);
      const pixels = ctx.getImageData(0, 0, source.width, source.height);
      const color = OUTFITS.find(o => o.id === look.outfit)!.color;
      const red = color >> 16, green = color >> 8 & 255, blue = color & 255;
      for (let y = Math.floor(source.height * 0.52); y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const i = (y * source.width + x) * 4;
          const [r, g, b, a] = pixels.data.subarray(i, i + 4);
          if (a >= 30 && g > r * 1.1 && r > b * 1.5 && x > source.width * .6) {
            const cable = CABLES.find(c => c.id === look.cable)!;
            const shade = (r + g) / 380;
            pixels.data[i] = Math.min(255, (cable.color >> 16) * shade);
            pixels.data[i+1] = Math.min(255, (cable.color >> 8 & 255) * shade);
            pixels.data[i+2] = Math.min(255, (cable.color & 255) * shade);
            continue;
          }
          if (look.outfit === 'turquoise') continue;
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
/** The wardrobe uses the same pencil drawings as the character sheet. */
export function drawAccessory(scene: Phaser.Scene, look: Appearance): Phaser.GameObjects.Image {
  const frames: Record<string, number> = { bow: 0, antenna: 1, duck: 2, crown: 3 };
  const image = scene.add.image(0, 0, 'sketch-extras', frames[look.accessory] ?? 0);
  image.setVisible(look.accessory !== 'none');
  if (look.accessory === 'bow') image.setPosition(0, -27).setDisplaySize(24, 24);
  if (look.accessory === 'antenna') image.setPosition(0, -77).setDisplaySize(28, 28);
  if (look.accessory === 'duck') image.setPosition(17, 0).setDisplaySize(18, 18);
  if (look.accessory === 'crown') image.setPosition(0, -68).setDisplaySize(40, 40);
  return image;
}
export function nexusPortrait(scene: Phaser.Scene, x: number, y: number, height: number, pose: string, look = loadAppearance()): Phaser.GameObjects.Container {
  const portrait = scene.add.container(x, y);
  const sprite = scene.add.image(0, 0, pose).setOrigin(0.5, 1);
  applyNexusPose(sprite, pose, look);
  sprite.setScale(120 / sprite.height);
  const accessory = drawAccessory(scene, look);
  accessory.y -= 34;
  portrait.add([sprite, accessory]).setScale(height / 120);
  return portrait;
}
