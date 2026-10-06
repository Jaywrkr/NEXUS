import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';
import { EffectsSettings } from '../systems/EffectsSettings';

export class FlowerBed extends ConnectableObject {
  protected override get sketchKind(): string { return 'flowers'; }
  protected override get sketchHeight(): number { return 154; }
  protected override get sketchBottom(): number { return 52; }
  private soil: Phaser.GameObjects.Rectangle;
  private buds: Phaser.GameObjects.Arc[] = [];
  private flowers: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'garden-bed', 'target');
    this.soil = scene.add.rectangle(0, 20, 110, 52, 0x4166c6).setStrokeStyle(3, 0x243875);
    this.flowers = scene.add.graphics().setVisible(false);
    this.add(this.soil);
    for (const [index, dx] of [-32, 0, 32].entries()) {
      const stem = scene.add.rectangle(dx, 0, 4, 30, 0x628454);
      const bud = scene.add.circle(dx, -18, 6, 0x8b957a);
      this.buds.push(bud);
      this.add([stem, bud]);
      this.flowers.fillStyle([0xffb86c, 0xff9ff3, 0xffe066][index]);
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        this.flowers.fillCircle(dx + Math.cos(angle) * 10, -18 + Math.sin(angle) * 10, 7);
      }
      this.flowers.fillStyle(0xfff8c9);
      this.flowers.fillCircle(dx, -18, 6);
    }
    const trim = scene.add.graphics();
    trim.fillStyle(0x34549b).fillRoundedRect(-59, 31, 118, 14, 3);
    trim.fillStyle(0x7fa9ef).fillRoundedRect(-62, 27, 124, 7, 3);
    trim.lineStyle(1, 0xafe5ff, 0.8).lineBetween(-52, 37, 52, 37);
    for (const x of [-32, 0, 32]) {
      trim.fillStyle(0x70915a).fillEllipse(x - 8, 2, 18, 9).fillEllipse(x + 8, -5, 18, 9);
    }
    this.add([this.flowers, trim]);
    this.addShadow(48, 116, 14);
    this.setSize(124, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 124, 100), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.soil.setFillStyle(0x6ca765);
    this.buds.forEach(bud => bud.setVisible(false));
    this.flowers.setVisible(true);
    if (!EffectsSettings.isReduced()) {
      this.scene.tweens.add({ targets: this.flowers, scale: { from: 0.7, to: 1 }, duration: 400, ease: 'Sine.easeOut' });
    }
  }
}
