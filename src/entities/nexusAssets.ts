import Phaser from 'phaser';

/** Registered pencil poses from the approved character reference. */
export const NEXUS_ASSET_KEYS = {
  idle: 'nexus-idle', walk1: 'nexus-walk-1', walk2: 'nexus-walk-2', celebrate: 'nexus-celebrate',
} as const;
export function loadNexusAssets(scene: Phaser.Scene): void {
  scene.load.image('sketch-nexus-sheet', 'assets/sketch/nexus.webp');
}
/** Extract at runtime: source resolution is never assumed and alpha stays intact. */
export function createNexusFrames(scene: Phaser.Scene): void {
  const source = scene.textures.get('sketch-nexus-sheet').getSourceImage() as HTMLImageElement;
  const w = source.width / 2, h = source.height / 2;
  Object.values(NEXUS_ASSET_KEYS).forEach((key, i) => {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, w, h)!;
    texture.getContext().drawImage(source, i % 2 * w, Math.floor(i / 2) * h, w, h, 0, 0, w, h);
    texture.refresh();
  });
}
