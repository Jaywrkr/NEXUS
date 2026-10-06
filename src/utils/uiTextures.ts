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
  // Bevel and inset keyline stay inside the existing hit area. Tint still supplies state.
  const surface = ctx.createLinearGradient(0, 0, 0, height);
  surface.addColorStop(0, '#ffffff');
  surface.addColorStop(0.65, '#f4f4f4');
  surface.addColorStop(1, '#cdcdcd');
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(25,25,25,.22)'; ctx.lineWidth = 1;
  ctx.beginPath();ctx.roundRect(.5,.5,width-1,height-1,Math.max(2,radius-.5));ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();ctx.roundRect(2.5,2.5,width-5,height-7,Math.max(2,radius-2));ctx.stroke();
  canvasTex!.refresh();
}
