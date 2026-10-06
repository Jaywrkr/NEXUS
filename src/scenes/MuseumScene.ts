import Phaser from 'phaser';
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

    this.cameras.main.setBackgroundColor('#20233a');
    this.cameras.main.fadeIn(300, 32, 35, 58);

    this.add
      .text(width / 2, 40, 'Museo Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#f4f1e8',
      })
      .setOrigin(0.5);

    this.memoryText = this.add.text(width / 2, 85, 'Toca un recuerdo para verlo despertar', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#c9cbe0',
    }).setOrigin(0.5);
    const story = this.progress.snapshot().story;
    const discovered = DISCOVERY_IDS.filter(id => story?.discoveries.includes(id)).length;
    const heard = RESIDENTS.filter(r => story?.heard.includes(r.id)).length;
    this.add.text(width / 2, 112, `Sorpresas: ${discovered}/${DISCOVERY_IDS.length} · Habitantes: ${heard}/${RESIDENTS.length}`, {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#c9cbe0',
    }).setOrigin(0.5);
    if (this.progress.hasSeenChapter()) {
      ensureRoundedRectTexture(this, 'museum-ending', 110, 42, 12);
      const ending = this.add.image(width - 70, 40, 'museum-ending').setTint(0x9be37a).setInteractive({ useHandCursor: true });
      this.add.text(width - 70, 40, 'Ver final', { fontFamily: 'sans-serif', fontSize: '16px', color: '#20233a' }).setOrigin(0.5);
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
          fontFamily: 'sans-serif',
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

  private buildVitrina(x: number, y: number, fragment: Souvenir, size: number): void {
    const horizontal = this.scale.width > this.scale.height;
    // Fit eight cabinets without shrinking the souvenirs or their reactions.
    const widthScale = horizontal ? Math.min(1, (this.scale.width - 160) / (DISPLAYED_FRAGMENTS.length - 1) / 138) : 1;
    this.add.rectangle(x, y + 80 * size, 100 * size, 20 * size, 0x3a3d55);
    const glass = this.add.rectangle(x, y, 120 * size * widthScale, 160 * size, 0x4a4e75, 0.3).setName(fragment.id);
    glass.setStrokeStyle(2, 0x8a8dc0, 0.6);

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
          fontFamily: 'sans-serif',
          fontSize: horizontal ? '12px' : '14px',
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

  private drawSouvenir(x: number, y: number, fragment: Souvenir): Phaser.GameObjects.Graphics {
    const art = this.add.graphics({ x, y }).setName(`souvenir-${fragment.id}`);
    art.lineStyle(4, fragment.color, 1);
    art.fillStyle(fragment.color, 1);
    if (fragment.id === 'secret-fragment') {
      art.fillTriangle(0, -35, -26, 0, 26, 0).fillTriangle(-26, 0, 26, 0, 0, 35);
      art.lineStyle(3, 0xffffff, .8).lineBetween(-7, -12, 0, -22);
      return art;
    }
    switch (fragment.id) {
      case 'plaza-fragment':
        art.fillRoundedRect(-18, -30, 36, 44, 8);
        art.lineBetween(0, 14, 0, 35);
        art.lineBetween(-22, 35, 22, 35);
        art.lineBetween(-31, -17, -40, -17);
        art.lineBetween(31, -17, 40, -17);
        art.lineBetween(0, -42, 0, -50);
        art.fillStyle(0xfff8c9, 1);
        art.fillRoundedRect(-9, -22, 18, 28, 5);
        break;
      case 'fountain-fragment':
        art.fillTriangle(0, -40, -23, -2, 23, -2);
        art.fillCircle(0, 0, 23);
        art.lineStyle(3, 0xe5fbff, 1);
        art.lineBetween(-9, -8, -13, 4);
        art.lineStyle(3, fragment.color, 0.7);
        art.strokeEllipse(0, 35, 74, 12);
        break;
      case 'beacon-fragment':
        art.lineBetween(0, -22, -19, 36);
        art.lineBetween(0, -22, 19, 36);
        art.lineBetween(-11, 12, 11, 12);
        art.fillCircle(0, -25, 7);
        art.beginPath();
        art.arc(0, -25, 20, -0.8, 0.8);
        art.strokePath();
        art.beginPath();
        art.arc(0, -25, 20, Math.PI - 0.8, Math.PI + 0.8);
        art.strokePath();
        break;
      case 'bridge-fragment':
        art.fillRoundedRect(-42, 8, 84, 12, 3);
        for (const post of [-36, -12, 12, 36]) art.lineBetween(post, -18, post, 30);
        art.lineBetween(-40, -12, 40, -12);
        art.lineStyle(3, 0x5ee7ff, 0.8);
        art.lineBetween(-38, 43, -12, 39);
        art.lineBetween(-12, 39, 12, 43);
        art.lineBetween(12, 43, 38, 39);
        break;
      case 'garden-fragment':
        art.lineStyle(4, 0x9be37a);
        art.lineBetween(0, -5, 0, 40);
        art.fillStyle(0x9be37a);
        art.fillEllipse(-12, 22, 26, 12);
        art.fillEllipse(12, 10, 26, 12);
        art.fillStyle(fragment.color);
        for (let petal = 0; petal < 5; petal++) {
          const angle = petal * Math.PI * 2 / 5;
          art.fillCircle(Math.cos(angle) * 17, -18 + Math.sin(angle) * 17, 12);
        }
        art.fillStyle(0xfff8c9);
        art.fillCircle(0, -18, 10);
        break;
      case 'workshop-fragment':
        art.fillEllipse(-5, 5, 64, 40).fillCircle(16, -18, 20);
        art.fillStyle(0xffb86c).fillTriangle(30, -22, 46, -14, 29, -8);
        art.fillStyle(0x20233a).fillCircle(20, -23, 3);
        art.fillStyle(0xc7a0ef).fillCircle(-20, 33, 8).fillCircle(20, 33, 8);
        break;
      case 'lantern-fragment':
        art.fillRoundedRect(-23, -32, 46, 48, 8);
        art.lineBetween(0, 16, 0, 38).lineBetween(-24, 38, 24, 38);
        art.fillStyle(0xfff8c9).fillRoundedRect(-12, -22, 24, 27, 4);
        break;
    }
    return art;
  }
}
