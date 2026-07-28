import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const PANEL_COLOR = 0x6b4a35;
const DOORWAY_LIGHT = 0xffe38a;

export class Door extends ConnectableObject {
  private panel: Phaser.GameObjects.Rectangle;
  private frame: Phaser.GameObjects.Rectangle;
  private doorway: Phaser.GameObjects.Rectangle;
  private glow: Phaser.GameObjects.Rectangle;
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

    this.add([this.glow, this.frame, this.doorway, this.panel, this.knob]);

    // Pulso tenue mientras está cerrada, para que se note que es interactiva.
    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.05, to: 0.16 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.setSize(60, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(-30, -50, 60, 100), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.scene.tweens.add({
      targets: [this.panel, this.knob],
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
