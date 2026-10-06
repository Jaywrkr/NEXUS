import { pencilCircle, pencilLine } from '../art/modernArt';
import Phaser from 'phaser';
import { screenArt, ART } from '../art/interfaceArt';
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
  private selected!: Phaser.GameObjects.Graphics;
  private buttons: { image: Phaser.GameObjects.Image; key: 'outfit' | 'accessory' | 'cable'; id: string }[] = [];
  constructor() { super('CustomizeScene'); }
  init(data: { returnScene?: string }): void { this.returnScene = data.returnScene === 'WorldScene' ? 'WorldScene' : 'BootScene'; }
  create(): void {
    const { width, height } = this.scale;
    const mobile = height > width;
    this.look = loadAppearance(); this.buttons = [];
    this.cameras.main.setBackgroundColor('#e9dfca');
    screenArt(this);
    const frame=this.add.graphics();
    const pxPreview=mobile?width/2:width*.21;
    frame.fillStyle(0x729d95,.13).fillCircle(pxPreview,mobile?203:232,mobile?105:111);
    pencilCircle(frame, pxPreview, mobile ? 203 : 232, mobile ? 113 : 119, ART.ink, .3);
    frame.fillStyle(0xf2ead9,.08).fillEllipse(pxPreview,mobile?268:308,125,15);
    if (!mobile) pencilLine(frame, width * .4, 105, width * .4, 365, ART.ink, .3);
    this.add.text(width / 2, 48, 'Mi Nexus', { fontFamily: ART.display, fontSize: '32px', color: '#34332e' }).setOrigin(0.5);
    const px = mobile ? width / 2 : width * 0.21;
    const py = mobile ? 265 : 305;
    this.name = this.add.text(px, py + 22, '', { fontFamily: ART.body, fontSize: '20px', color: '#34332e', align: 'center' }).setOrigin(0.5, 0);
    this.button(px, py + 76, 180, 'Cambiar nombre', () => {
      const name = window.prompt('¿Cómo se llama tu Nexus? (máximo 16 caracteres)', this.look.name);
      if (name !== null) { this.look.name = name; this.refresh(); }
    });
    this.status = this.add.text(width / 2, height - (mobile ? 225 : 125), 'Elige tu estilo. Puedes cambiarlo cuando quieras.', {
      fontFamily: ART.body, fontSize: '15px', color: '#655f50', align: 'center', wordWrap: { width: width - 70 },
    }).setOrigin(0.5);
    this.selected=this.add.graphics();
    const choices = [
      { key: 'outfit' as const, label: 'Chaqueta', options: OUTFITS },
      { key: 'accessory' as const, label: 'Accesorio', options: ACCESSORIES },
      { key: 'cable' as const, label: 'Cable de energía', options: CABLES },
    ];
    choices.forEach(({ key, label, options }, row) => {
      const cx = mobile ? width / 2 : width * 0.67;
      const y = mobile ? 425 + row * 115 : 122 + row * 95;
      this.add.text(cx, y - 38, label, { fontFamily: ART.body, fontSize: '18px', fontStyle: 'bold', color: '#34332e' }).setOrigin(0.5);
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
        if('color' in option) {
          frame.fillStyle(option.color).fillCircle(x,y+31,4);
          frame.lineStyle(1,0x34494e,.2).strokeCircle(x,y+31,4);
        }
        button.setAlpha(locked?.55:1);
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
    this.name.setText(this.look.name).setScale(1);
    if(this.name.width>200)this.name.setScale(200/this.name.width);
    this.selected.clear();
    this.buttons.forEach(b => {
      const chosen=this.look[b.key]===b.id;
      b.image.setTint(chosen?0x9cbdb1:0xd2c6af);
      if (chosen) {
        pencilLine(this.selected, b.image.x - 40, b.image.y + 18, b.image.x + 38, b.image.y + 17, ART.ink, .9);
        pencilLine(this.selected, b.image.x - 35, b.image.y + 21, b.image.x + 29, b.image.y + 20, ART.ink, .4);
      }
    });
  }
  private button(x: number, y: number, width: number, text: string, action: () => void): Phaser.GameObjects.Image {
    const key = `wardrobe-button-${width}`;
    ensureRoundedRectTexture(this, key, width, 44, 12);
    const primary = text === 'Guardar y volver';
    const image = this.add.image(x, y, key).setTint(primary ? 0xe6bd65 : 0xd2c6af).setInteractive({ useHandCursor: true });
    this.add.text(x, y, text, { fontFamily: ART.body, fontSize: width < 100 ? '16px' : '18px', color: primary ? '#34332e' : '#34332e' }).setOrigin(0.5);
    image.on('pointerdown', action);
    return image;
  }
}
