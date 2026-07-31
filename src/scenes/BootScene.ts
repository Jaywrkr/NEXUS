import Phaser from 'phaser';
import { fadeToScene } from '../utils/sceneTransition';
import { ProgressSystem } from '../systems/ProgressSystem';
import { loadNexusAssets } from '../entities/nexusAssets';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 52;
const BUTTON_TEXTURE = 'boot-button-bg';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    loadNexusAssets(this);
  }

  create(): void {
    const { width, height } = this.scale;
    const progress = new ProgressSystem();
    const hasProgress = progress.getCollectedFragments().length > 0;

    ensureRoundedRectTexture(this, BUTTON_TEXTURE, BUTTON_WIDTH, BUTTON_HEIGHT, 14);

    this.cameras.main.setBackgroundColor('#f4f1e8');
    this.cameras.main.fadeIn(300, 244, 241, 232);

    this.add
      .text(width / 2, height / 2 - 104, 'Los Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(27, 31, 59, 0.25)', 6, false, true);

    this.add
      .text(width / 2, height / 2 - 50, 'Conecta el mundo', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#5a5e78',
      })
      .setOrigin(0.5);

    const firstButtonY = hasProgress ? height / 2 + 20 : height / 2 + 40;

    if (hasProgress) {
      this.buildButton(width / 2, firstButtonY, 'Continuar', 0x9be37a, () => {
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
      this.buildButton(width / 2, firstButtonY + BUTTON_HEIGHT + 18, 'Nueva partida', 0x5ee7ff, () => {
        const confirmed = window.confirm('¿Seguro que quieres borrar tu progreso y empezar de nuevo?');
        if (!confirmed) return;
        progress.resetProgress();
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
    } else {
      this.buildButton(width / 2, firstButtonY, 'Jugar', 0x5ee7ff, () => {
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
    }
  }

  private buildButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add
      .image(x, y, BUTTON_TEXTURE)
      .setTint(color)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => {
      this.tweens.add({ targets: [button, text], scale: 1.05, duration: 120, ease: 'Sine.easeOut' });
    });
    button.on('pointerout', () => {
      this.tweens.add({ targets: [button, text], scale: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    button.on('pointerdown', () => {
      this.tweens.add({
        targets: [button, text],
        scale: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: onClick,
      });
    });
  }
}
