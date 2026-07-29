import Phaser from 'phaser';

/** Funde a negro-del-color-de-fondo y arranca la escena destino cuando termina. */
export function fadeToScene(
  scene: Phaser.Scene,
  key: string,
  rgb: [number, number, number] = [27, 31, 59],
  duration = 300
): void {
  scene.cameras.main.fadeOut(duration, ...rgb);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key);
  });
}
