import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

const CLOSED_COLOR = 0x4a4e5c;
const OPEN_COLOR = 0xffe066;

export class Door extends ConnectableObject {
  private panel: Phaser.GameObjects.Rectangle;
  private frame: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, id = 'door') {
    super(scene, x, y, id, 'target');

    this.frame = scene.add.rectangle(0, 0, 60, 100, 0x2a2d36);
    this.panel = scene.add.rectangle(0, 0, 50, 90, CLOSED_COLOR);

    this.add([this.frame, this.panel]);

    this.setSize(60, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(-30, -50, 60, 100), Phaser.Geom.Rectangle.Contains);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;

    this.scene.tweens.add({
      targets: this.panel,
      scaleX: 0.15,
      duration: 400,
      ease: 'Sine.easeIn',
    });

    this.panel.setFillStyle(OPEN_COLOR);
  }
}
