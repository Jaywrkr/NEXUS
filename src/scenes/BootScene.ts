import { gridFrames, loadSketchAccessories } from '../art/sketchAtlas';
import Phaser from 'phaser';
import { loadPlazaAssets, createPlazaFrames } from '../art/plazaAssets';
import { MODERN as ART, ensureFlatTexture } from '../art/modernArt';
import { nexusPortrait, prepareNexusAppearance } from '../art/nexusLook';
import { drawTitleArt } from '../art/neighborhood';
import { fadeToScene } from '../utils/sceneTransition';
import { ProgressSystem } from '../systems/ProgressSystem';
import { EffectsSettings } from '../systems/EffectsSettings';
import { NEXUS_ASSET_KEYS, loadNexusAssets, createNexusFrames } from '../entities/nexusAssets';
const ensureRoundedRectTexture = ensureFlatTexture;
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
    loadSketchAccessories(this);
    loadPlazaAssets(this);
    this.load.image('water-machines', 'assets/sketch/water-machines.png');
  }

  create(): void {
    createNexusFrames(this);
    prepareNexusAppearance(this);
    gridFrames(this, 'sketch-extras', 4, 4);
    createPlazaFrames(this);
    gridFrames(this, 'water-machines', 3, 1);
    const { width, height } = this.scale;
    const progress = new ProgressSystem();
    const hasProgress = progress.hasProgress();

    ensureRoundedRectTexture(this, BUTTON_TEXTURE, BUTTON_WIDTH, BUTTON_HEIGHT, 14);

    this.cameras.main.setBackgroundColor('#f4f1e8');
    drawTitleArt(this, width, height);
    const portrait = height > width;
    const menuX = portrait ? width / 2 : width * .68;
    nexusPortrait(this, portrait ? width / 2 : width * .25,
      portrait ? height / 2 - 168 : height * 0.78, portrait ? 170 : 225, NEXUS_ASSET_KEYS.idle);
    this.add.text(menuX, height / 2 - 18, 'Conecta · descubre · celebra', {
      fontFamily: ART.body, fontSize: '14px', color: '#557b73',
    }).setOrigin(0.5);
    this.cameras.main.fadeIn(300, 238, 229, 210);

    this.add
      .text(menuX, height / 2 - 104, 'Los Nexus', {
        fontFamily: ART.display,
        fontSize: '54px',
        fontStyle: 'bold italic',
        color: '#34332e',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 'rgba(0,0,0,0)', 0);

    this.add
      .text(menuX, height / 2 - 50, `Capítulo 1 · ${CHAPTER_TITLE}`, {
        fontFamily: ART.body,
        fontSize: '18px',
        color: '#655f50',
      })
      .setOrigin(0.5);

    const firstButtonY = hasProgress ? height / 2 + 20 : height / 2 + 40;

    if (hasProgress) {
      this.buildButton(menuX, firstButtonY, 'Continuar', 0xe6bd65, () => {
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
      this.buildButton(menuX, firstButtonY + BUTTON_HEIGHT + 18, 'Nueva partida', 0xb8c8b8, () => {
        const confirmed = window.confirm('¿Seguro que quieres borrar tu progreso y empezar de nuevo?');
        if (!confirmed) return;
        progress.resetProgress();
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
    } else {
      this.buildButton(menuX, firstButtonY, 'Jugar', 0xe6bd65, () => {
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
    }

    this.buildButton(menuX, height / 2 + 143, 'Mi Nexus', 0xb8c8b8, () => {
      this.scene.start('CustomizeScene', { returnScene: 'BootScene' });
    });

    const effectsLabel = (): string => `Efectos suaves: ${EffectsSettings.isReduced() ? 'Sí' : 'No'}`;
    ensureRoundedRectTexture(this, 'effects-toggle', 260, 44, 12);
    const effectsButton = this.add.image(width / 2, height - 65, 'effects-toggle')
      .setTint(0xe7dbc1).setInteractive({ useHandCursor: true });
    const effectsText = this.add.text(width / 2, height - 65, effectsLabel(), {
      fontFamily: ART.body, fontSize: '18px', color: '#454239',
    }).setOrigin(0.5);
    effectsButton.on('pointerdown', () => {
      EffectsSettings.setReduced(!EffectsSettings.isReduced());
      effectsText.setText(effectsLabel());
    });
    this.add.text(width / 2, height - 28, 'Sin flashes ni sacudidas al activarlos', {
      fontFamily: ART.body, fontSize: '14px', color: '#655f50',
    }).setOrigin(0.5);

  }

  private buildButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add
      .image(x, y, BUTTON_TEXTURE)
      .setTint(color)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontFamily: ART.body,
        fontSize: '20px',
        fontStyle: 'bold italic',
        color: '#34332e',
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
