import Phaser from 'phaser';

export const NEXUS_ASSET_KEYS = {
  idle: 'nexus-idle', walk1: 'nexus-walk-1', walk2: 'nexus-walk-2', celebrate: 'nexus-celebrate',
  side1: 'nexus-walk-side-1', side2: 'nexus-walk-side-2', back1: 'nexus-walk-back-1', back2: 'nexus-walk-back-2',
  sideIdle: 'nexus-idle-side', backIdle: 'nexus-idle-back',
} as const;
export function loadNexusAssets(scene: Phaser.Scene): void {
  scene.load.image('sketch-nexus-sheet', 'assets/sketch/nexus.webp');
  scene.load.image('sketch-nexus-directions', 'assets/sketch/nexus-directions.png');
  scene.load.image('sketch-nexus-idle-directions', 'assets/sketch/nexus-idle-directions.png');
}

/** Extract complete cells; align supplementary poses by helmet and planted feet. */
export function createNexusFrames(scene: Phaser.Scene): void {
  const sheets = [
    { sheet: 'sketch-nexus-sheet', cols: 2, rows: 2, keys: [NEXUS_ASSET_KEYS.idle, NEXUS_ASSET_KEYS.walk1, NEXUS_ASSET_KEYS.walk2, NEXUS_ASSET_KEYS.celebrate], normalize: false },
    { sheet: 'sketch-nexus-directions', cols: 2, rows: 2, keys: [NEXUS_ASSET_KEYS.side1, NEXUS_ASSET_KEYS.side2, NEXUS_ASSET_KEYS.back1, NEXUS_ASSET_KEYS.back2], normalize: true },
    { sheet: 'sketch-nexus-idle-directions', cols: 2, rows: 1, keys: [NEXUS_ASSET_KEYS.sideIdle, NEXUS_ASSET_KEYS.backIdle], normalize: true },
  ];
  for (const { sheet, cols, rows, keys, normalize } of sheets) {
    const source = scene.textures.get(sheet).getSourceImage() as HTMLImageElement;
    const w = source.width / cols, h = source.height / rows;
    keys.forEach((key, i) => {
      if (scene.textures.exists(key)) return;
      const texture = scene.textures.createCanvas(key, 640, 640)!;
      const ctx = texture.getContext();
      ctx.drawImage(source, i % cols * w, Math.floor(i / cols) * h, w, h, 0, 0, 640, 640);
      if (normalize) {
        const pixels = ctx.getImageData(0, 0, 640, 640).data;
        let top = 640, bottom = 0;
        for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) if (pixels[(y * 640 + x) * 4 + 3] > 32) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
        let center = 0, count = 0;
        for (let y = top + Math.floor((bottom - top) * .18); y < top + (bottom - top) * .42; y++)
          for (let x = 0; x < 640; x++) if (pixels[(y * 640 + x) * 4 + 3] > 32) { center += x; count++; }
        const scale = 588 / Math.max(1, bottom - top), helmet = count ? center / count : 320;
        ctx.clearRect(0, 0, 640, 640);
        ctx.drawImage(source, i % cols * w, Math.floor(i / cols) * h, w, h,
          320 - helmet * scale, 620 - bottom * scale, 640 * scale, 640 * scale);
      }
      texture.refresh();
    });
  }
}
