import Phaser from 'phaser';
import { nexusPortrait } from '../art/nexusLook';
import { ProgressSystem } from '../systems/ProgressSystem';
import { CHAPTER_TITLE, DISCOVERY_IDS, RESIDENTS } from '../data/chapter';
import { COLLECTION } from '../data/collection';
import { NEXUS_ASSET_KEYS } from '../entities/nexusAssets';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { fadeToScene } from '../utils/sceneTransition';

export class EndingScene extends Phaser.Scene {
  constructor() { super('EndingScene'); }
  create(): void {
    const { width, height } = this.scale;
    const portrait = height > width;
    const state = new ProgressSystem().snapshot();
    this.cameras.main.setBackgroundColor('#20233a');
    this.cameras.main.fadeIn(300, 32, 35, 58);
    const party = this.add.graphics();
    party.fillStyle(0x2d3e47).fillRoundedRect(18, 18, width - 36, height - 36, 24);
    party.lineStyle(1, 0xc49a61, 0.6).strokeRoundedRect(25, 25, width - 50, height - 50, 20);
    party.fillStyle(0xe6c582, 0.06).fillCircle(width / 2, height * 0.6, portrait ? 180 : 95);
    for (let i = 0; i < 36; i++) {
      const x = i % 2 ? 40 + (i * 13) % 65 : width - 40 - (i * 13) % 65;
      const y = 55 + (i * 61) % (height - 150);
      party.fillStyle([0xe9cb73, 0xe7a8c6, 0x86d7cc][i % 3], 0.7).fillRoundedRect(x, y, 4, 9, 1);
    }
    this.add.text(width / 2, 55, '¡La fiesta funciona!', {
      fontFamily: 'sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#ffe066',
    }).setOrigin(0.5);
    this.add.text(width / 2, 100, `Capítulo 1 · ${CHAPTER_TITLE}`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#f4f1e8',
    }).setOrigin(0.5);
    this.add.text(width / 2, 142, 'Miga guardó el manual del pato. El barrio volvió a conectarse.\nEl pato asegura que todo era parte de su plan.', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#f4f1e8', align: 'center',
      wordWrap: { width: Math.min(650, width - 64), useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    const discoveries = DISCOVERY_IDS.filter(id => state.story?.discoveries.includes(id)).length;
    const heard = RESIDENTS.filter(r => state.story?.heard.includes(r.id)).length;
    const memories = COLLECTION.filter(item => state.fragmentsCollected.includes(item.id)).length;
    this.add.text(width / 2, 242, `Recuerdos: ${memories}/${COLLECTION.length} · Sorpresas: ${discoveries}/${DISCOVERY_IDS.length}\nHabitantes: ${heard}/${RESIDENTS.length} · Cables: ${state.connections.length}`, {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#9be37a', align: 'center',
    }).setOrigin(0.5, 0);
    nexusPortrait(this, width / 2, portrait ? height * 0.66 : height - 135, portrait ? 170 : 100, NEXUS_ASSET_KEYS.celebrate);
    this.add.text(width / 2, portrait ? height - 230 : height - 115, 'Todavía puedes explorar y descubrir bromas.', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#c9cbe0',
    }).setOrigin(0.5);
    ensureRoundedRectTexture(this, 'ending-button', 240, 52, 14);
    let leaving = false;
    const button = (x: number, y: number, label: string, scene: string, color: number): void => {
      const image = this.add.image(x, y, 'ending-button').setTint(color).setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, { fontFamily: 'sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#20233a' }).setOrigin(0.5);
      image.on('pointerdown', () => { if (leaving) return; leaving = true; fadeToScene(this, scene); });
    };
    button(portrait ? width / 2 : width / 2 - 130, portrait ? height - 160 : height - 75, 'Seguir explorando', 'WorldScene', 0x9be37a);
    button(portrait ? width / 2 : width / 2 + 130, portrait ? height - 95 : height - 75, 'Ver recuerdos', 'MuseumScene', 0x5ee7ff);
    this.add.text(width / 2, height - 28, 'Hecho con Luca · Capítulo 1', { fontFamily: 'sans-serif', fontSize: '14px', color: '#c9cbe0' }).setOrigin(0.5);
  }
}
