import Phaser from 'phaser';

/**
 * Genera (una sola vez por key) una textura blanca de rectángulo redondeado,
 * pensada para tintar con `.setTint(color)` en un Image — así un mismo botón
 * puede tener distintos colores/estados (hover, disabled) sin generar una
 * textura por color.
 */
export function ensureRoundedRectTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  radius: number,
): void {
  if (scene.textures.exists(key)) return;

  const canvasTex = scene.textures.createCanvas(key, width, height);
  const ctx = canvasTex!.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();
  canvasTex!.refresh();
}
