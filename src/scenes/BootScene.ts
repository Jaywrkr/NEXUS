import Phaser from 'phaser';
import { drawTitleArt } from '../art/neighborhood';
import { fadeToScene } from '../utils/sceneTransition';
import { ProgressSystem } from '../systems/ProgressSystem';
import { EffectsSettings } from '../systems/EffectsSettings';
import { NEXUS_ASSET_KEYS, loadNexusAssets } from '../entities/nexusAssets';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { CHAPTER_TITLE } from '../data/chapter';

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
    const hasProgress = progress.hasProgress();

    ensureRoundedRectTexture(this, BUTTON_TEXTURE, BUTTON_WIDTH, BUTTON_HEIGHT, 14);

    this.cameras.main.setBackgroundColor('#f4f1e8');
    drawTitleArt(this, width, height);
    const portrait = height > width;
    const hero = this.add.image(portrait ? width / 2 : width / 2 - 305,
      portrait ? height / 2 - 168 : height * 0.78, NEXUS_ASSET_KEYS.idle).setOrigin(0.5, 1);
    hero.setScale((portrait ? 170 : 175) / hero.height);
    this.add.text(width / 2, height / 2 - 18, 'Conecta · descubre · celebra', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#8a7351',
    }).setOrigin(0.5);
    this.cameras.main.fadeIn(300, 244, 241, 232);

    this.add
      .text(width / 2, height / 2 - 104, 'Los Nexus', {
        fontFamily: 'Georgia, serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setShadow(0, 3, 'rgba(27, 31, 59, 0.25)', 6, false, true);

    this.add
      .text(width / 2, height / 2 - 50, `Capítulo 1 · ${CHAPTER_TITLE}`, {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#59695c',
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

    const effectsLabel = (): string => `Efectos suaves: ${EffectsSettings.isReduced() ? 'Sí' : 'No'}`;
    ensureRoundedRectTexture(this, 'effects-toggle', 260, 44, 12);
    const effectsButton = this.add.image(width / 2, height - 65, 'effects-toggle')
      .setTint(0xe2ddf0).setInteractive({ useHandCursor: true });
    const effectsText = this.add.text(width / 2, height - 65, effectsLabel(), {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#1b1f3b',
    }).setOrigin(0.5);
    effectsButton.on('pointerdown', () => {
      EffectsSettings.setReduced(!EffectsSettings.isReduced());
      effectsText.setText(effectsLabel());
    });
    this.add.text(width / 2, height - 28, 'Sin flashes ni sacudidas al activarlos', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#59695c',
    }).setOrigin(0.5);
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
