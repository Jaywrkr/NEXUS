import Phaser from 'phaser';
import { workshopArt } from '../art/props';
import { ConnectableObject } from './ConnectableObject';
import { EffectsSettings } from '../systems/EffectsSettings';

type Kind = 'motor' | 'duck' | 'bell' | 'parade';

/** The parade joins two distinct completed branches of the toy circuit. */
export class WorkshopPiece extends ConnectableObject {
  protected override get sketchKind(): string { return this.kind; }
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
    this.add(scene.add.text(0, 68, label, { fontFamily: '"Patrick Hand", cursive', fontSize: '14px', color: '#20233a' }).setOrigin(0.5));
    if (kind === 'parade') {
      this.counter = scene.add.text(0, 32, '0/2', { fontFamily: '"Patrick Hand", cursive', fontSize: '16px', color: '#20233a' }).setOrigin(0.5);
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
    workshopArt(this.art, this.kind, this.active_, this.inputs);
    this.counter?.setText(`${this.inputs}/2`);
  }
}
