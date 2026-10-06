import Phaser from 'phaser';
import { ProgressSystem } from '../systems/ProgressSystem';
import { fadeToScene } from '../utils/sceneTransition';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

const FRAGMENTS = [
  { id: 'plaza-fragment', label: 'Fragmento de la plaza' },
  { id: 'fountain-fragment', label: 'Fragmento de la fuente' },
  { id: 'beacon-fragment', label: 'Fragmento de la antena' },
  { id: 'bridge-fragment', label: 'Fragmento del puente' },
];

const SECRET_FRAGMENT = { id: 'secret-fragment', label: 'Fragmento secreto', memory: '¡Explorar también conecta!', color: 0xb6a0ff };
const DISPLAYED_FRAGMENTS = [...FRAGMENTS, SECRET_FRAGMENT];

export class MuseumScene extends Phaser.Scene {
  private progress!: ProgressSystem;

  constructor() {
    super('MuseumScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const portrait = height > width;
    this.progress = new ProgressSystem();

    this.cameras.main.setBackgroundColor('#20233a');
    this.cameras.main.fadeIn(300, 32, 35, 58);

    this.add
      .text(width / 2, 40, 'Museo Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#f4f1e8',
      })
      .setOrigin(0.5);

    const spacing = Math.min(220, (width - 140) / (DISPLAYED_FRAGMENTS.length - 1));
    const startX = width / 2 - (spacing * (DISPLAYED_FRAGMENTS.length - 1)) / 2;

    const rows = Math.ceil(DISPLAYED_FRAGMENTS.length / 2);
    const firstRowY = 210, lastRowY = height - 290;
    DISPLAYED_FRAGMENTS.forEach((fragment, index) => {
      const x = portrait ? width * (index % 2 === 0 ? 0.28 : 0.72) : startX + index * spacing;
      const y = portrait ? firstRowY + Math.floor(index / 2) * (lastRowY - firstRowY) / Math.max(1, rows - 1) : height / 2;
      this.buildVitrina(x, y, fragment.id, fragment.label);
    });

    const allCollected = FRAGMENTS.every((f) => this.progress.hasFragment(f.id));
    if (allCollected) {
      this.add
        .text(width / 2, portrait ? lastRowY + 145 : height / 2 + 145, '¡Colección completa!', {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#ffe066',
        })
        .setOrigin(0.5);
    }

    let returning = false;
    const returnToWorld = (): void => {
      if (returning) return;
      returning = true;
      fadeToScene(this, 'WorldScene', [207, 232, 216]);
    };

    ensureRoundedRectTexture(this, 'museum-return-button', 240, 52, 14);
    const returnButton = this.add
      .image(width / 2, height - 80, 'museum-return-button')
      .setTint(0x5ee7ff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height - 80, 'Volver al mundo', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);
    returnButton.on('pointerover', () => returnButton.setTint(0x9be37a));
    returnButton.on('pointerout', () => returnButton.setTint(0x5ee7ff));
    returnButton.on('pointerdown', returnToWorld);

    this.add
      .text(width / 2, height - 32, 'También puedes volver con ESPACIO', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c9cbe0',
      })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', returnToWorld);
  }

  private buildVitrina(x: number, y: number, fragmentId: string, label: string): void {
    this.add.rectangle(x, y + 80, 100, 20, 0x3a3d55);
    const glass = this.add.rectangle(x, y, 120, 160, 0x4a4e75, 0.3);
    glass.setStrokeStyle(2, 0x8a8dc0, 0.6);

    if (this.progress.hasFragment(fragmentId)) {
      const shard = this.add.star(x, y, 5, 10, 20, 0xff9ff3);
      this.tweens.add({
        targets: shard,
        angle: 360,
        duration: 5000,
        repeat: -1,
      });

      this.add
        .text(x, y + 100, label, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#f4f1e8',
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(x, y, 'Vitrina vacía', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#8a8dc0',
        })
        .setOrigin(0.5);
    }
  }
}
