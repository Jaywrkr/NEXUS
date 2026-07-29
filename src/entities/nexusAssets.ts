import Phaser from 'phaser';

/**
 * Claves y rutas de los sprites reales del Nexus (ver Decisión 017 y
 * public/assets/nexus/README.md). Todavía NO se usan en el juego —
 * Nexus.ts sigue dibujando el personaje con formas de Phaser hasta que
 * los archivos PNG existan de verdad en esa carpeta.
 *
 * Cuando estén los archivos: llamar loadNexusAssets(this) desde
 * BootScene.preload() y reemplazar Nexus.buildVisual() por un Sprite
 * que use estas claves.
 */
export const NEXUS_ASSET_KEYS = {
  idle: 'nexus-idle',
  walk1: 'nexus-walk-1',
  walk2: 'nexus-walk-2',
  celebrate: 'nexus-celebrate',
} as const;

const ASSET_PATH = 'assets/nexus';

export function loadNexusAssets(scene: Phaser.Scene): void {
  scene.load.image(NEXUS_ASSET_KEYS.idle, `${ASSET_PATH}/nexus-idle.png`);
  scene.load.image(NEXUS_ASSET_KEYS.walk1, `${ASSET_PATH}/nexus-walk-1.png`);
  scene.load.image(NEXUS_ASSET_KEYS.walk2, `${ASSET_PATH}/nexus-walk-2.png`);
  scene.load.image(NEXUS_ASSET_KEYS.celebrate, `${ASSET_PATH}/nexus-celebrate.png`);
}
