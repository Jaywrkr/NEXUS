import Phaser from 'phaser';
import { lanternArt } from '../art/props';
import { ConnectableObject } from './ConnectableObject';

export class LanternPiece extends ConnectableObject {
  protected override get sketchKind(): string { return this.kind; }
  private art: Phaser.GameObjects.Graphics;
  private color: number;
  private kind: 'lantern' | 'stage' | 'confetti';
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, label: string, color: number, kind: 'lantern' | 'stage' | 'confetti' = 'lantern') {
    super(scene, x, y, id, 'target');
    this.color = color; this.kind = kind;
    this.art = scene.add.graphics(); this.add(this.art);
    this.addShadow(48, 70, 12);
    this.add(scene.add.text(0, 67, label, { fontFamily: '"Patrick Hand", cursive', fontSize: '14px', color: '#20233a' }).setOrigin(0.5));
    this.draw();
    this.setSize(80, 112);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 80, 112), Phaser.Geom.Rectangle.Contains);
  }
  canInitiate(): boolean { return this.active_ && this.kind !== 'confetti'; }
  activate(): void { if (this.active_) return; this.active_ = true; this.draw(); }
  private draw(): void {
    lanternArt(this.art, this.kind, this.active_, this.color);
  }
}
