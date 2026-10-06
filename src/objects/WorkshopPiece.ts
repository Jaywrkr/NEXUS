import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';
import { EffectsSettings } from '../systems/EffectsSettings';

type Kind = 'motor' | 'duck' | 'bell' | 'parade';

/** The parade joins two distinct completed branches of the toy circuit. */
export class WorkshopPiece extends ConnectableObject {
  private kind: Kind;
  private inputs = 0;
  private art: Phaser.GameObjects.Graphics;
  private counter?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: Kind, label: string) {
    super(scene, x, y, `toy-${kind}`, 'target');
    this.kind = kind;
    this.art = scene.add.graphics();
    this.add(this.art);
    this.addShadow(48, 88, 12);
    this.add(scene.add.text(0, 68, label, { fontFamily: 'sans-serif', fontSize: '14px', color: '#20233a' }).setOrigin(0.5));
    if (kind === 'parade') {
      this.counter = scene.add.text(0, 32, '0/2', { fontFamily: 'sans-serif', fontSize: '16px', color: '#20233a' }).setOrigin(0.5);
      this.add(this.counter);
    }
    this.draw();
    this.setSize(100, 112);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 112), Phaser.Geom.Rectangle.Contains);
  }

  canInitiate(): boolean { return this.active_ && this.kind !== 'parade'; }

  activate(): void {
    if (this.active_) return;
    this.inputs++;
    this.active_ = this.inputs >= (this.kind === 'parade' ? 2 : 1);
    this.draw();
    if (this.active_ && !EffectsSettings.isReduced()) {
      this.scene.tweens.add({ targets: this.art, scale: { from: 0.85, to: 1 }, duration: 250 });
    }
  }

  forceActive(): void { this.inputs = this.kind === 'parade' ? 2 : 1; this.active_ = true; this.draw(); }

  private draw(): void {
    const color = this.active_ ? 0xffe066 : 0x8b8f9d;
    const g = this.art.clear().fillStyle(color).lineStyle(4, 0x4a4e75);
    switch (this.kind) {
      case 'motor':
        g.fillRoundedRect(-32, -24, 64, 48, 6);
        g.fillStyle(0x20233a).fillCircle(0, 0, 17);
        g.lineStyle(4, this.active_ ? 0x5ee7ff : 0xb7bdc6).lineBetween(-10, 0, 10, 0).lineBetween(0, -10, 0, 10);
        break;
      case 'duck':
        g.fillEllipse(-3, 5, 60, 36).fillCircle(14, -16, 19);
        g.fillStyle(0xffb86c).fillTriangle(28, -20, 46, -12, 27, -7);
        g.fillStyle(0x20233a).fillCircle(19, -20, 3);
        g.fillStyle(0x4a4e75).fillCircle(-20, 30, 7).fillCircle(20, 30, 7);
        break;
      case 'bell':
        g.fillTriangle(0, -32, -30, 20, 30, 20).fillRoundedRect(-34, 16, 68, 10, 3);
        g.fillCircle(0, 31, 7);
        break;
      case 'parade':
        g.fillRoundedRect(-42, 12, 84, 10, 3);
        g.lineBetween(-30, 12, -30, -28).lineBetween(30, 12, 30, -28);
        g.fillTriangle(-30, -28, -30, -8, -6, -18).fillTriangle(30, -28, 30, -8, 6, -18);
        g.fillStyle(this.inputs > 0 ? 0x5ee7ff : 0x6b7280).fillCircle(-14, -3, 8);
        g.fillStyle(this.inputs > 1 ? 0xff9ff3 : 0x6b7280).fillCircle(14, -3, 8);
        this.counter?.setText(`${this.inputs}/2`);
        break;
    }
  }
}
