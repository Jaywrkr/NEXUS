import Phaser from 'phaser';

/** Funde a papel y arranca la escena destino cuando termina. */
export function fadeToScene(
  scene: Phaser.Scene,
  key: string,
  rgb: [number, number, number] = [238, 229, 210],
  duration = 300
): void {
  scene.cameras.main.fadeOut(duration, ...rgb);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key);
  });
}
