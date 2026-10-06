import Phaser from 'phaser';
import { PLAZA, PLAZA_FRAME } from '../art/plazaAssets';
import { EffectsSettings } from '../systems/EffectsSettings';
import { ConnectableObject } from './ConnectableObject';

const PANEL_COLOR = 0x6b4a35;
const DOORWAY_LIGHT = 0xffe38a;

export class Door extends ConnectableObject {
  private illustration?: Phaser.GameObjects.Image;
  private panel: Phaser.GameObjects.Rectangle;
  private frame: Phaser.GameObjects.Rectangle;
  private doorway: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Rectangle;
  private detail: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'door') {
    super(scene, x, y, id, 'target');

    this.glow = scene.add.rectangle(0, 0, 72, 112, DOORWAY_LIGHT, 0);
    this.frame = scene.add
      .rectangle(0, 0, 60, 100, 0x2a2d36)
      .setStrokeStyle(2, 0x1b1f3b, 0.3);
    this.doorway = scene.add.rectangle(0, 0, 50, 90, DOORWAY_LIGHT);
    this.panel = scene.add
      .rectangle(0, 0, 50, 90, PANEL_COLOR)
      .setStrokeStyle(2, 0x3a2418, 0.6);
    this.knob = scene.add.circle(16, 4, 3, 0xffe066);

    this.detail = scene.add.graphics();
    this.frame.setFillStyle(0x496ed0).setStrokeStyle(3,0x14234e);
    this.panel.setFillStyle(0x5779e1).setStrokeStyle(2,0x98beff);
    this.detail.clear().lineStyle(2,0x9bc6ff).strokeRoundedRect(-17,-36,34,30,3);
    this.detail.fillStyle(0x27e7da,.8).fillRoundedRect(-15,-34,30,26,2);
    this.detail.fillStyle(0xffffff,.3).fillTriangle(-15,-34,15,-34,-15,-13);
    this.detail.lineStyle(2,0x344bb0).lineBetween(-17,15,17,15).lineBetween(-17,25,17,25);
    this.knob.setFillStyle(0xffe342);
    this.add([this.glow, this.frame, this.doorway, this.panel, this.detail, this.knob]);
    this.addShadow(54, 54, 12);

    // Pulso tenue mientras está cerrada, para que se note que es interactiva.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.05, to: 0.16 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (id === 'door' && scene.textures.exists(PLAZA.sprites)) {
      for (const object of [this.glow, this.frame, this.doorway, this.panel, this.detail, this.knob]) object.setVisible(false);
      this.illustration = scene.add.image(0, 54, PLAZA.sprites, PLAZA_FRAME.door).setOrigin(.5, 1).setDisplaySize(148, 148);
      this.add(this.illustration);
      scene.tweens.killTweensOf(this.glow);
    }
    this.setSize(116, 150);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 116, 150), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    if (this.illustration) {
      this.illustration.setTexture(PLAZA.states, PLAZA_FRAME.door);
      if (!EffectsSettings.isReduced()) this.scene.tweens.add({ targets: this.illustration, alpha: { from: .5, to: 1 }, duration: 300 });
      return;
    }

    this.scene.tweens.add({
      targets: [this.panel, this.detail, this.knob],
      scaleX: 0.12,
      duration: 400,
      ease: 'Sine.easeIn',
    });

    this.scene.tweens.add({
      targets: this.glow,
      alpha: 0.4,
      duration: 300,
    });
  }
}
