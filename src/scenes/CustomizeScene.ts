import Phaser from 'phaser';
import { loadAppearance, saveAppearance, OUTFITS, ACCESSORIES, CABLES, type Appearance } from '../data/appearance';
import { nexusPortrait } from '../art/nexusLook';
import { NEXUS_ASSET_KEYS } from '../entities/nexusAssets';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { fadeToScene } from '../utils/sceneTransition';

export class CustomizeScene extends Phaser.Scene {
  private returnScene = 'BootScene';
  private look!: Appearance;
  private preview?: Phaser.GameObjects.Container;
  private name!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private buttons: { image: Phaser.GameObjects.Image; key: 'outfit' | 'accessory' | 'cable'; id: string }[] = [];
  constructor() { super('CustomizeScene'); }
  init(data: { returnScene?: string }): void { this.returnScene = data.returnScene === 'WorldScene' ? 'WorldScene' : 'BootScene'; }
  create(): void {
    const { width, height } = this.scale;
    const mobile = height > width;
    this.look = loadAppearance(); this.buttons = [];
    this.cameras.main.setBackgroundColor('#bed4c6');
    const frame = this.add.graphics();
    frame.fillStyle(0xffefd1).fillRoundedRect(18, 18, width - 36, height - 36, 24);
    frame.lineStyle(2, 0xc49a61).strokeRoundedRect(26, 26, width - 52, height - 52, 20);
    this.add.text(width / 2, 48, 'Mi Nexus', { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#34494e' }).setOrigin(0.5);
    const px = mobile ? width / 2 : width * 0.21;
    const py = mobile ? 265 : 305;
    this.name = this.add.text(px, py + 22, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#34494e', wordWrap: { width: 180 }, align: 'center' }).setOrigin(0.5, 0);
    this.button(px, py + 76, 180, 'Cambiar nombre', () => {
      const name = window.prompt('¿Cómo se llama tu Nexus? (máximo 16 caracteres)', this.look.name);
      if (name !== null) { this.look.name = name; this.refresh(); }
    });
    this.status = this.add.text(width / 2, height - (mobile ? 225 : 125), 'Elige tu estilo. Puedes cambiarlo cuando quieras.', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#59695c', align: 'center', wordWrap: { width: width - 70 },
    }).setOrigin(0.5);
    const choices = [
      { key: 'outfit' as const, label: 'Chaqueta', options: OUTFITS },
      { key: 'accessory' as const, label: 'Accesorio', options: ACCESSORIES },
      { key: 'cable' as const, label: 'Cable de energía', options: CABLES },
    ];
    choices.forEach(({ key, label, options }, row) => {
      const cx = mobile ? width / 2 : width * 0.67;
      const y = mobile ? 385 + row * 115 : 122 + row * 95;
      this.add.text(cx, y - 38, label, { fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#34494e' }).setOrigin(0.5);
      options.forEach((option, index) => {
        const locked = 'reward' in option && !this.look.unlocked.includes(option.reward);
        const x = cx + (index - (options.length - 1) / 2) * 88;
        const button = this.button(x, y, 82, `${option.label}${locked ? ' 🔒' : ''}`, () => {
          if (locked) {
            const stories = { mail: 'el correo de Miga', toys: 'la inspección del pato', flowers: 'el concierto de flores' };
            this.status.setText(`Se consigue al completar ${stories[(option as { reward: keyof typeof stories }).reward]}.`);
            return;
          }
          this.look[key] = option.id; this.status.setText('Elige tu estilo. Puedes cambiarlo cuando quieras.'); this.refresh();
        });
        this.buttons.push({ image: button, key, id: option.id });
      });
    });
    this.button(mobile ? width / 2 : width / 2 - 120, height - (mobile ? 130 : 65), 250, 'Guardar y volver', () => {
      saveAppearance(this.look); fadeToScene(this, this.returnScene);
    });
    this.button(mobile ? width / 2 : width / 2 + 150, height - 65, 170, 'Cancelar', () => fadeToScene(this, this.returnScene));
    this.refresh();
  }
  private refresh(): void {
    // Normalize names and choices before drawing; unlocking is independently persistent.
    const name = Array.from(this.look.name.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 16).join('');
    this.look.name = name || 'Nexus';
    this.preview?.destroy();
    const mobile = this.scale.height > this.scale.width;
    this.preview = nexusPortrait(this, mobile ? this.scale.width / 2 : this.scale.width * 0.21, mobile ? 265 : 305, mobile ? 165 : 155, NEXUS_ASSET_KEYS.idle, this.look);
    this.name.setText(this.look.name);
    this.buttons.forEach(b => b.image.setTint(this.look[b.key] === b.id ? 0x8dd4c5 : 0xe9ddc2));
  }
  private button(x: number, y: number, width: number, text: string, action: () => void): Phaser.GameObjects.Image {
    const key = `wardrobe-button-${width}`;
    ensureRoundedRectTexture(this, key, width, 44, 12);
    const image = this.add.image(x, y, key).setTint(0xe9ddc2).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontFamily: 'sans-serif', fontSize: width < 100 ? '13px' : '17px', color: '#34494e' }).setOrigin(0.5);
    image.on('pointerdown', action);
    return image;
  }
}
