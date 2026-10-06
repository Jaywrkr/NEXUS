import Phaser from 'phaser';
import { screenArt, ornament, ART } from '../art/interfaceArt';
import { ProgressSystem } from '../systems/ProgressSystem';
import { fadeToScene } from '../utils/sceneTransition';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { EffectsSettings } from '../systems/EffectsSettings';
import { COLLECTION, type Souvenir } from '../data/collection';
import { DISCOVERY_IDS, RESIDENTS } from '../data/chapter';

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

    const spacing = Math.min(220, (width - 160) / (COLLECTION.length - 1));
    const startX = width / 2 - (spacing * (COLLECTION.length - 1)) / 2;
    const rows = Math.ceil(COLLECTION.length / 2);
    const compact = portrait && rows > 3;
    const firstRowY = compact ? 190 : 210;
    const lastRowY = height - 290;

    COLLECTION.forEach((fragment, index) => {
      const lastSingle = COLLECTION.length % 2 === 1 && index === COLLECTION.length - 1;
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
    const cabinet = this.add.graphics({ x, y }).setScale(size);
    cabinet.fillStyle(0x0b1636,.3).fillRoundedRect(-61,-78,130,178,12);
    cabinet.fillStyle(fragment.color, 0.06).fillTriangle(-24, -90, -64, 72, 64, 72).fillTriangle(24, -90, -64, 72, 64, 72);
    cabinet.fillStyle(0x1f326a).fillRoundedRect(-65, -85, 130, 174, 12);
    cabinet.lineStyle(2, 0x57cdeb, 0.8).strokeRoundedRect(-65, -85, 130, 174, 12);
    cabinet.fillStyle(0x57cdeb).fillRoundedRect(-32, -91, 64, 7, 3);
    cabinet.fillStyle(0x345cdd).fillRoundedRect(-64, 73, 128, 15, 4);
    cabinet.fillStyle(0x91bfff).fillRect(-61, 73, 122, 4);
    cabinet.lineStyle(2, 0xffefd1, 0.12).lineBetween(-48, -67, -28, -40).lineBetween(-48, -48, -37, -33);
    cabinet.fillStyle(fragment.color, 0.09).fillEllipse(0, 30, 90, 22);
    ornament(cabinet,0,85,78,0x91bfff);
    const glass = this.add.rectangle(x, y, 120 * size, 160 * size, 0x719ee4, 0.08).setName(fragment.id);
    glass.setStrokeStyle(1, 0x9cd7ff, 0.25);

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
          fontSize: '14px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(x, y, 'Vitrina vacía', {
          fontFamily: ART.body,
          fontSize: '14px',
          color: '#b7ccf2',
        })
        .setOrigin(0.5);
    }
  }

  private drawSouvenir(x: number, y: number, fragment: Souvenir): Phaser.GameObjects.Graphics {
    const art = this.add.graphics({ x, y }).setName(`souvenir-${fragment.id}`);
    art.lineStyle(4, fragment.color, 1);
    art.fillStyle(fragment.color, 1);
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
        art.lineStyle(3, 0xffe342, 0.8);
        art.lineBetween(-38, 43, -12, 39);
        art.lineBetween(-12, 39, 12, 43);
        art.lineBetween(12, 43, 38, 39);
        break;
      case 'garden-fragment':
        art.lineStyle(4, 0x8ce8ff);
        art.lineBetween(0, -5, 0, 40);
        art.fillStyle(0x8ce8ff);
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
