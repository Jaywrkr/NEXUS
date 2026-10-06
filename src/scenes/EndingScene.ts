import Phaser from 'phaser';
import { screenArt, ornament, ART } from '../art/interfaceArt';
import { SIDE_STORIES, storyCompleted, storyEndings } from '../data/sideStories';
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
    screenArt(this, true);
    this.cameras.main.fadeIn(300, 32, 35, 58);
    const party = this.add.graphics();
    ornament(party,width/2,222,Math.min(300,width-140));
    party.fillStyle(0x27e7da, 0.06).fillCircle(width / 2, height * 0.6, portrait ? 180 : 95);
    for (let i = 0; i < 36; i++) {
      const x = i % 2 ? 40 + (i * 13) % 65 : width - 40 - (i * 13) % 65;
      const y = 55 + (i * 61) % (height - 150);
      party.fillStyle([0xffe342, 0xff75be, 0x27e7da][i % 3], 0.7).fillRoundedRect(x, y, 4, 9, 1);
    }
    this.add.text(width / 2, 55, '¡La fiesta funciona!', {
      fontFamily: ART.display, fontSize: '32px', fontStyle: 'bold', color: '#ffe066',
    }).setOrigin(0.5);
    this.add.text(width / 2, 100, `Capítulo 1 · ${CHAPTER_TITLE}`, {
      fontFamily: ART.body, fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    this.add.text(width / 2, 142, 'Miga guardó el manual del pato. El barrio volvió a conectarse.\nEl pato asegura que todo era parte de su plan.', {
      fontFamily: ART.body, fontSize: '18px', color: '#ffffff', align: 'center',
      wordWrap: { width: Math.min(650, width - 64), useAdvancedWrap: true },
    }).setOrigin(0.5, 0);
    const discoveries = DISCOVERY_IDS.filter(id => state.story?.discoveries.includes(id)).length;
    const heard = RESIDENTS.filter(r => state.story?.heard.includes(r.id)).length;
    const memories = COLLECTION.filter(item => state.fragmentsCollected.includes(item.id)).length;
    this.add.text(width / 2, 242, `Recuerdos: ${memories}/${COLLECTION.length} · Sorpresas: ${discoveries}/${DISCOVERY_IDS.length}\nHabitantes: ${heard}/${RESIDENTS.length} · Cables: ${state.connections.length}\nEncargos: ${SIDE_STORIES.filter(s => storyCompleted(s.id, state)).length}/3 · Desenlaces: ${SIDE_STORIES.reduce((n, s) => n + storyEndings(s.id, state), 0)}/6`, {
      fontFamily: ART.body, fontSize: '17px', color: '#8ce8ff', align: 'center',
    }).setOrigin(0.5, 0);
    nexusPortrait(this, width / 2, portrait ? height * 0.66 : height - 135, portrait ? 170 : 100, NEXUS_ASSET_KEYS.celebrate);
    this.add.text(width / 2, portrait ? height - 230 : height - 115, 'Todavía puedes explorar y descubrir bromas.', {
      fontFamily: ART.body, fontSize: '16px', color: '#b7ccf2',
    }).setOrigin(0.5);
    ensureRoundedRectTexture(this, 'ending-button', 240, 52, 14);
    let leaving = false;
    const button = (x: number, y: number, label: string, scene: string, color: number): void => {
      const image = this.add.image(x, y, 'ending-button').setTint(color).setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, { fontFamily: ART.body, fontSize: '20px', fontStyle: 'bold', color: '#20233a' }).setOrigin(0.5);
      image.on('pointerdown', () => { if (leaving) return; leaving = true; fadeToScene(this, scene); });
    };
    button(portrait ? width / 2 : width / 2 - 130, portrait ? height - 160 : height - 75, 'Seguir explorando', 'WorldScene', 0xffe342);
    button(portrait ? width / 2 : width / 2 + 130, portrait ? height - 95 : height - 75, 'Ver recuerdos', 'MuseumScene', 0x8ce8ff);
    this.add.text(width / 2, height - 28, 'Hecho con Luca · Capítulo 1', { fontFamily: ART.body, fontSize: '14px', color: '#b7ccf2' }).setOrigin(0.5);
  }
}
