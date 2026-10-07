import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';
import { EffectsSettings } from '../systems/EffectsSettings';

const OFF_COLOR = 0x9aa0a8;
const ON_COLOR = 0x4fb8e0;

export class Fountain extends ConnectableObject {
  override get inputSignal(): 'water' { return 'water'; }
  override get displayName(): string { return 'Fuente'; }
  pressure = 0;
  private drops: Phaser.GameObjects.Ellipse[] = [];
  protected override get sketchKind(): string { return 'fountain'; }
  protected override get sketchHeight(): number { return 148; }
  protected override get sketchBottom(): number { return 56; }
  private basin: Phaser.GameObjects.Arc;
  private water: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private spout: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'fountain') {
    super(scene, x, y, id, 'target');

    this.glow = scene.add.circle(0, 20, 56, ON_COLOR, 0);
    this.basin = scene.add
      .circle(0, 20, 46, 0x789be0)
      .setStrokeStyle(3, 0x1b1f3b, 0.3);
    this.water = scene.add
      .circle(0, 20, 34, OFF_COLOR)
      .setStrokeStyle(2, 0x1b1f3b, 0.2);
    this.spout = scene.add.circle(0, 4, 11, 0x6786cb);

    const trim = scene.add.graphics();
    trim.lineStyle(3, 0xf4faff, 0.65).beginPath().arc(0, 20, 42, Math.PI, Math.PI * 1.85).strokePath();
    trim.lineStyle(1, 0x657b79, 0.5).strokeEllipse(0, 22, 52, 28).strokeEllipse(0, 22, 35, 18);
    trim.fillStyle(0x91bbff).fillRoundedRect(-8, -14, 16, 30, 5).fillEllipse(0, -14, 30, 10);
    trim.fillStyle(0xf4faff).fillEllipse(-3, -16, 21, 4);
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5;
      trim.lineStyle(1,0x4067ac,.35).lineBetween(Math.cos(a)*36,20+Math.sin(a)*36,Math.cos(a)*45,20+Math.sin(a)*45);
    }
    trim.lineStyle(2,0xaedaff,.7).strokeCircle(0,20,45);
    this.add([this.glow, this.basin, this.water, this.spout, trim]);
    this.addShadow(66, 92, 16);
    for (let i = 0; i < 3; i++) {
      const drop = scene.add.ellipse((i - 1) * 17, -60, 4, 7, 0x75d5e8).setName('flow-effect').setVisible(false);
      this.add(drop); this.drops.push(drop);
    }

    // The full illustration includes the high spout and the wide basin.
    this.setSize(148, 188);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 148, 188), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (!this.active_) this.setFlow(3);
  }

  override getInputPoint(): Phaser.Math.Vector2 { return new Phaser.Math.Vector2(this.x - 38, this.y + 20); }

  setFlow(pressure: number): void {
    if (this.pressure === pressure) return;
    this.pressure = pressure;
    this.active_ = pressure > 0;
    this.water.setFillStyle(this.active_ ? ON_COLOR : OFF_COLOR);
    for (const [i, drop] of this.drops.entries()) {
      this.scene.tweens.killTweensOf(drop);
      drop.setVisible(this.active_ && !EffectsSettings.isReduced()).setAlpha(.8);
      if (this.active_ && !EffectsSettings.isReduced()) this.scene.tweens.add({ targets: drop,
        y: { from: pressure === 3 ? -92 : -52, to: 14 }, alpha: { from: .8, to: .15 },
        delay: i * 160, duration: pressure === 3 ? 550 : 900, repeat: -1, ease: 'Quad.easeIn' });
    }
  }
}
