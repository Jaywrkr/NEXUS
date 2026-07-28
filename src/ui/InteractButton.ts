import Phaser from 'phaser';

/**
 * Botón fijo en pantalla para interactuar con el objeto conectable más
 * cercano al Nexus. Facilita el juego táctil: en vez de acertar un toque
 * preciso sobre un objeto pequeño, basta con acercarse y presionar aquí.
 */
export class InteractButton {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private onPressCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.bg = scene.add
      .rectangle(x, y, 190, 56, 0x1b1f3b, 0.88)
      .setStrokeStyle(3, 0x5ee7ff, 0.9)
      .setScrollFactor(0)
      .setDepth(60)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.label = scene.add
      .text(x, y, 'Tocar', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#f4f1e8',
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
