import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

export class LanternPiece extends ConnectableObject {
  private art: Phaser.GameObjects.Graphics;
  private color: number;
  private kind: 'lantern' | 'stage' | 'confetti';
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, label: string, color: number, kind: 'lantern' | 'stage' | 'confetti' = 'lantern') {
    super(scene, x, y, id, 'target');
    this.color = color; this.kind = kind;
    this.art = scene.add.graphics(); this.add(this.art);
    this.addShadow(48, 70, 12);
    this.add(scene.add.text(0, 67, label, { fontFamily: 'sans-serif', fontSize: '14px', color: '#20233a' }).setOrigin(0.5));
    this.draw();
    this.setSize(80, 112);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 80, 112), Phaser.Geom.Rectangle.Contains);
  }
  canInitiate(): boolean { return this.active_ && this.kind !== 'confetti'; }
  activate(): void { if (this.active_) return; this.active_ = true; this.draw(); }
  private draw(): void {
    const g = this.art.clear().fillStyle(this.active_ ? this.color : 0x88929b).lineStyle(4, 0x3d5964);
    if (this.kind === 'lantern') {
      g.fillRoundedRect(-24, -37, 48, 48, 8);
      g.lineBetween(0, 11, 0, 39).lineBetween(-26, 39, 26, 39);
      if (this.active_) g.fillStyle(0xfff8c9).fillRoundedRect(-13, -26, 26, 25, 5);
    } else if (this.kind === 'stage') {
      g.fillRoundedRect(-36, 20, 72, 14, 4);
      g.lineBetween(-30, 20, -30, -35).lineBetween(30, 20, 30, -35);
      g.fillTriangle(-30, -35, -30, -15, -6, -25).fillTriangle(30, -35, 30, -15, 6, -25);
      g.fillCircle(0, 2, 12);
    } else {
      g.fillTriangle(-16, 30, 16, 30, 0, -5);
      if (this.active_) for (let i = 0; i < 8; i++) {
        g.fillStyle([0xffe066, 0xff9ff3, 0x5ee7ff][i % 3]);
        g.fillCircle(Math.cos(i * 2) * 30, -20 + Math.sin(i * 2) * 20, 4);
      }
    }
  }
}
