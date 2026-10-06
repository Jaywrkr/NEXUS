import Phaser from 'phaser';
import { screenArt, ART } from '../art/interfaceArt';
import { ProgressSystem } from '../systems/ProgressSystem';
import { fadeToScene } from '../utils/sceneTransition';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { EffectsSettings } from '../systems/EffectsSettings';
import { COLLECTION, type Souvenir } from '../data/collection';
import { DISCOVERY_IDS, RESIDENTS } from '../data/chapter';

const SECRET_FRAGMENT = { id: 'secret-fragment', label: 'Fragmento secreto', memory: '¡Explorar también conecta!', color: 0xb6a0ff };
const DISPLAYED_FRAGMENTS = [...COLLECTION, SECRET_FRAGMENT];

export class MuseumScene extends Phaser.Scene {
  private progress!: ProgressSystem;
  private memoryText!: Phaser.GameObjects.Text;
  private leaving = false;

  constructor() {
    super('MuseumScene');
  }

  create(): void {
    this.leaving = false;
    const { width, height } = this.scale;
    const portrait = height > width;
    this.progress = new ProgressSystem();

    screenArt(this, true);
    this.cameras.main.fadeIn(300, 32, 35, 58);

    const room = this.add.graphics();

    room.lineStyle(1, 0x6b96e5, 0.3);
    for (let x = 52; x < width; x += 68) room.lineBetween(x, 140, x, height - 150);
    room.fillStyle(0x15234e).fillRect(26, height - 160, width - 52, 85);
    room.lineStyle(2, 0x57cdeb, 0.45).lineBetween(27, 139, width - 27, 139);

    this.add
      .text(width / 2, 40, 'Museo Nexus', {
        fontFamily: ART.display,
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.memoryText = this.add.text(width / 2, 93, 'Toca un recuerdo para verlo despertar', {
      fontFamily: ART.body, fontSize: '16px', color: '#b7ccf2',
    }).setOrigin(0.5);
    const story = this.progress.snapshot().story;
    const discovered = DISCOVERY_IDS.filter(id => story?.discoveries.includes(id)).length;
    const heard = RESIDENTS.filter(r => story?.heard.includes(r.id)).length;
    this.add.text(width / 2, 112, `Sorpresas: ${discovered}/${DISCOVERY_IDS.length} · Habitantes: ${heard}/${RESIDENTS.length}`, {
      fontFamily: ART.body, fontSize: '14px', color: '#b7ccf2',
    }).setOrigin(0.5);
    if (this.progress.hasSeenChapter()) {
      ensureRoundedRectTexture(this, 'museum-ending', 110, 42, 12);
      const ending = this.add.image(width - 70, 40, 'museum-ending').setTint(0x8ce8ff).setInteractive({ useHandCursor: true });
      this.add.text(width - 70, 40, 'Ver final', { fontFamily: ART.body, fontSize: '16px', color: '#20233a' }).setOrigin(0.5);
      ending.on('pointerdown', () => { if (this.leaving) return; this.leaving = true; fadeToScene(this, 'EndingScene', [32, 35, 58]); });
    }

    const spacing = Math.min(220, (width - 160) / (DISPLAYED_FRAGMENTS.length - 1));
    const startX = width / 2 - (spacing * (DISPLAYED_FRAGMENTS.length - 1)) / 2;
    const rows = Math.ceil(DISPLAYED_FRAGMENTS.length / 2);
    const compact = portrait && rows > 3;
    const firstRowY = compact ? 190 : 210;
    const lastRowY = height - 290;

    DISPLAYED_FRAGMENTS.forEach((fragment, index) => {
      const lastSingle = DISPLAYED_FRAGMENTS.length % 2 === 1 && index === DISPLAYED_FRAGMENTS.length - 1;
      const x = portrait ? (lastSingle ? width / 2 : width * (index % 2 === 0 ? 0.28 : 0.72)) : startX + index * spacing;
      const y = portrait ? firstRowY + Math.floor(index / 2) * (lastRowY - firstRowY) / Math.max(1, rows - 1) : height / 2;
      this.buildVitrina(x, y, fragment, compact ? 0.75 : 1);
    });

    const allCollected = COLLECTION.every((f) => this.progress.hasFragment(f.id));
    if (allCollected) {
      this.add
        .text(width / 2, portrait ? lastRowY + 145 : height / 2 + 145, '¡Colección completa!', {
          fontFamily: ART.body,
          fontSize: '20px',
          color: '#ffe066',
        })
        .setOrigin(0.5);
    }

    const returnToWorld = (): void => {
      if (this.leaving) return;
      this.leaving = true;
      fadeToScene(this, 'WorldScene', [207, 232, 216]);
    };

    ensureRoundedRectTexture(this, 'museum-return-button', 240, 52, 14);
    const returnButton = this.add
      .image(width / 2, height - 80, 'museum-return-button')
      .setTint(0xffe342)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height - 80, 'Volver al mundo', {
        fontFamily: ART.body,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);
    returnButton.on('pointerover', () => returnButton.setTint(0x8ce8ff));
    returnButton.on('pointerout', () => returnButton.setTint(0xffe342));
    returnButton.on('pointerdown', returnToWorld);

    this.add
      .text(width / 2, height - 32, 'También puedes volver con ESPACIO', {
        fontFamily: ART.body,
        fontSize: '16px',
        color: '#b7ccf2',
      })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', returnToWorld);
  }

  private buildVitrina(x: number, y: number, fragment: Souvenir, size: number): void {
    const horizontal = this.scale.width > this.scale.height;
    // Fit eight cabinets without shrinking the souvenirs or their reactions.
    const widthScale = horizontal ? Math.min(1, (this.scale.width - 160) / (DISPLAYED_FRAGMENTS.length - 1) / 138) : 1;
    this.add.image(x, y, 'sketch-extras', 10).setDisplaySize(148 * size * widthScale, 184 * size);
    const glass = this.add.rectangle(x, y, 120 * size * widthScale, 160 * size, 0xf2ead9, 0).setName(fragment.id);

    if (this.progress.hasFragment(fragment.id)) {
      const souvenir = this.drawSouvenir(x, y, fragment);
      souvenir.setScale(size);
      glass.setName(fragment.id).setInteractive({ useHandCursor: true });
      glass.on('pointerdown', () => {
        this.memoryText.setText(fragment.memory).setColor(`#${fragment.color.toString(16).padStart(6, '0')}`);
        this.tweens.killTweensOf(souvenir);
        souvenir.setScale(size);
        if (!EffectsSettings.isReduced()) {
          this.tweens.add({ targets: souvenir, scaleX: size * 1.18, scaleY: size * 1.18, duration: 220, yoyo: true });
        }
      });

      this.add
        .text(x, y + 100 * size + 2, fragment.label, {
          fontFamily: ART.body,
          fontSize: horizontal ? '12px' : '14px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(x, y, 'Vitrina vacía', {
          fontFamily: ART.body,
          fontSize: horizontal ? '12px' : '14px',
          color: '#b7ccf2',
        })
        .setOrigin(0.5);
    }
  }

  private drawSouvenir(x: number, y: number, fragment: Souvenir): Phaser.GameObjects.Container {
    const frames: Record<string, number> = { 'plaza-fragment': 1, 'fountain-fragment': 3,
      'beacon-fragment': 4, 'bridge-fragment': 5, 'garden-fragment': 7,
      'workshop-fragment': 9, 'lantern-fragment': 12 };
    const image = this.add.image(0, 0, ['secret-fragment', 'bridge-fragment'].includes(fragment.id) ? 'sketch-extras' : 'sketch-props-on',
      fragment.id === 'secret-fragment' ? 9 : fragment.id === 'bridge-fragment' ? 11 : frames[fragment.id]).setDisplaySize(86, 86);
    return this.add.container(x, y, [image]).setName(`souvenir-${fragment.id}`);
  }
}
