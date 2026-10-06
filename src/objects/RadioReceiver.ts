import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

/** A switchable destination with a visible powered/off state. */
export class RadioReceiver extends ConnectableObject {
  private panel: Phaser.GameObjects.Rectangle;
  private indicator: Phaser.GameObjects.Text;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, label: string, color: number) {
    super(scene, x, y, id, 'target');
    this.color = color;
    this.panel = scene.add.rectangle(0, 0, 76, 60, 0x697180).setStrokeStyle(3, 0x20233a);
    this.indicator = scene.add.text(0, 0, '○', { fontFamily: 'sans-serif', fontSize: '28px', color: '#f4f1e8' }).setOrigin(0.5);
    const antenna = scene.add.rectangle(0, -39, 4, 18, 0x20233a);
    const title = scene.add.text(0, 48, label, { fontFamily: 'sans-serif', fontSize: '14px', color: '#20233a', align: 'center', wordWrap: { width: 135 } }).setOrigin(0.5);
    this.add([antenna, this.panel, this.indicator, title]);
    this.addShadow(38, 80, 12);
    this.setSize(100, 108).setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 108), Phaser.Geom.Rectangle.Contains);
  }

  setPowered(powered: boolean): void {
    this.active_ = powered;
    this.panel.setFillStyle(powered ? this.color : 0x697180);
    this.indicator.setText(powered ? '●' : '○').setColor(powered ? '#20233a' : '#f4f1e8');
  }

  activate(): void { this.setPowered(true); }
}
