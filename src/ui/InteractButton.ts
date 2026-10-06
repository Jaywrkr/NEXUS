import Phaser from 'phaser';
import { MODERN as ART } from '../art/modernArt';
import { ensureFlatTexture as ensureRoundedRectTexture } from '../art/modernArt';

/**
 * Botón fijo en pantalla para interactuar con el objeto conectable más
 * cercano al Nexus. Facilita el juego táctil: en vez de acertar un toque
 * preciso sobre un objeto pequeño, basta con acercarse y presionar aquí.
 */
export class InteractButton {
  private bg: Phaser.GameObjects.Image;
  private label: Phaser.GameObjects.Text;
  private onPressCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureRoundedRectTexture(scene, 'interact-button', 190, 56, 16);
    this.bg = scene.add
      .image(x, y, 'interact-button').setTint(0x14234e)
      .setScrollFactor(0)
      .setDepth(60)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.label = scene.add
      .text(x, y, 'Tocar', {
        fontFamily: ART.body,
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(61)
      .setVisible(false);

    this.bg.on('pointerdown', () => this.onPressCallback?.());
  }

  show(label: string): void {
    this.label.setText(label);
    this.bg.setVisible(true);
    this.label.setVisible(true);
  }

  hide(): void {
    this.bg.setVisible(false);
    this.label.setVisible(false);
  }

  onPress(callback: () => void): void {
    this.onPressCallback = callback;
  }
}
