import { pencilCard, pencilLine } from '../art/modernArt';
import Phaser from 'phaser';
import type { PlazaStep } from '../data/plazaGuide';
import { EffectsSettings } from '../systems/EffectsSettings';

/** Persistent instruction and immediate world-space marker; decoration has no input. */
export class PlazaGuide {
  private panel: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private marker: Phaser.GameObjects.Text;
  private lastKey = '';
  private scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const mobile = scene.scale.height > scene.scale.width;
    const width = mobile ? scene.scale.width - 40 : 420;
    const x = mobile ? 16 : (scene.scale.width - width) / 2;
    const y = mobile ? 195 : scene.scale.height - 108;
    this.panel = scene.add.graphics().setDepth(45).setScrollFactor(0);
    pencilCard(this.panel, x, y, width, 68);
    pencilLine(this.panel, x + 6, y + 5, x + 6, y + 63, 0xc48646, .8);
    this.text = scene.add.text(x + 18, y + 10, '', {
      fontFamily: '"Patrick Hand", cursive', fontSize: '14px', color: '#34332e', lineSpacing: 2,
      wordWrap: { width: width - 36 },
    }).setDepth(46).setScrollFactor(0);
    this.marker = scene.add.text(0, 0, '▼', {
      fontFamily: '"Patrick Hand", cursive', fontSize: '26px', color: '#e6bd65', stroke: '#454239', strokeThickness: 4,
    }).setOrigin(.5, 1).setDepth(18);
  }
  update(step: PlazaStep | null, target?: { x: number; y: number }): void {
    this.panel.setVisible(!!step); this.text.setVisible(!!step); this.marker.setVisible(!!step && !!target);
    if (!step) { this.lastKey = ''; return; }
    const touch = this.scene.sys.game.device.input.touch;
    const control = step.number === 1 ? (touch ? 'Mueve el joystick' : 'Muévete con WASD o las flechas') : '';
    const key = `${step.number}:${step.title}:${touch}`;
    if (key !== this.lastKey) {
      this.text.setText(`${step.number}/6 · ${step.title}\n${control ? control + '. Sigue la señal amarilla.' : step.action}`);
      this.lastKey = key;
    }
    if (target) {
      const view = this.scene.cameras.main.worldView;
      const offLeft = target.x < view.left + 24, offRight = target.x > view.right - 24;
      this.marker.setText(offLeft ? '◀' : offRight ? '▶' : '▼');
      this.marker.setPosition(Phaser.Math.Clamp(target.x, view.left + 24, view.right - 24),
        target.y - (step.target === 'lamp' ? 128 : step.target === 'fragment' ? 45 : 105) + (EffectsSettings.isReduced() ? 0 : Math.sin(this.scene.time.now / 260) * 4));
    }
  }
}
