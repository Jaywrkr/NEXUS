import Phaser from 'phaser';
import { PLAZA, PLAZA_FRAME } from '../art/plazaAssets';
import { EffectsSettings } from '../systems/EffectsSettings';
import { ConnectableObject } from './ConnectableObject';

export type EnergySourceVariant = 'active' | 'dim';

export class EnergySource extends ConnectableObject {
  protected override get sketchKind(): string { return 'generator'; }
  protected override get sketchHeight(): number { return 98; }
  protected override get sketchBottom(): number { return 32; }
  private core: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'energy-source', variant: EnergySourceVariant = 'active') {
    super(scene, x, y, id, 'source');

    const base = scene.add.rectangle(0, 18, 30, 20, 0x555b6e);
    this.glow = scene.add.circle(0, 0, 26, 0xffe38a, 0.25);
    this.core = scene.add.star(0, 0, 6, 10, 20, 0xf4d284);

    const detail = scene.add.graphics();
    base.setFillStyle(0x345cdd).setStrokeStyle(2,0x14234e);
    detail.clear().fillStyle(0x14234e).fillRoundedRect(-22,21,44,9,3);
    detail.lineStyle(5,0x25356a).strokeCircle(0,0,26);
    detail.lineStyle(2,0x27e7da).strokeCircle(0,0,26);
    detail.fillStyle(0x94fff0).fillCircle(-10,20,2).fillCircle(0,20,2).fillCircle(10,20,2);
    this.glow.setFillStyle(0x27e7da);
    this.core.setStrokeStyle(1,0xfff4a1);
    this.add([this.glow, base, detail, this.core]);
    this.addShadow(30, 36, 10);

    if (variant === 'active' && !EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.core,
      angle: 360,
      duration: 6000,
      repeat: -1,
    });

    if (variant === 'active' && !EffectsSettings.isReduced()) scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.15, to: 0.4 },
      scale: { from: 0.9, to: 1.1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (variant === 'dim') {
      this.setName('dim-source');
      this.core.setFillStyle(0x9aa0ad).setStrokeStyle(1, 0x65758e);
      this.glow.setVisible(false);
      base.setFillStyle(0x65758e);
    }

    if (id === 'energy-source' && scene.textures.exists(PLAZA.sprites)) {
      base.setVisible(false); detail.setVisible(false); this.core.setVisible(false);
      this.add(scene.add.image(0, 32, PLAZA.sprites, PLAZA_FRAME.generator).setOrigin(.5, 1).setDisplaySize(98, 98));
      this.setSize(90, 140);
      this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 90, 140), Phaser.Geom.Rectangle.Contains);
      return;
    }
    this.setSize(52, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 52, 52), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    this.active_ = true;
  }
}
