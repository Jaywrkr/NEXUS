import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

/** A switchable destination with a visible powered/off state. */
export class RadioReceiver extends ConnectableObject {
  protected override get sketchKind(): string { return this.id === 'plaza-bulletin' ? 'bulletin' : this.id === 'garden-band' ? 'stage' : 'radio'; }
  protected override get sketchHeight(): number { return 110; }
  protected override get sketchBottom(): number { return 42; }
  private panel: Phaser.GameObjects.Rectangle;
  private indicator: Phaser.GameObjects.Text;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, label: string, color: number) {
    super(scene, x, y, id, 'target');
    this.color = color;
    this.panel = scene.add.rectangle(0, 0, 76, 60, 0x7199bf).setStrokeStyle(3, 0x67b7fa);
    this.indicator = scene.add.text(0, 0, '○', { fontFamily: '"Patrick Hand", cursive', fontSize: '28px', color: '#f4f1e8' }).setOrigin(0.5);
    this.indicator.setVisible(false);
    const antenna = scene.add.rectangle(0, -39, 4, 18, 0x20233a);
    const title = scene.add.text(0, 48, label, { fontFamily: '"Patrick Hand", cursive', fontSize: '14px', color: '#20233a', align: 'center', wordWrap: { width: 135 } }).setOrigin(0.5);
    const trim = scene.add.graphics();
    trim.lineStyle(2, 0xf4faff, 0.65).lineBetween(-32, -24, 30, -24);
    trim.lineStyle(2, 0x14234e, 0.5);
    for (let y = -13; y < 17; y += 6) trim.lineBetween(-30, y, -20, y).lineBetween(20, y, 30, y);
    trim.fillStyle(0x67b7fa).fillCircle(-24, 23, 3).fillCircle(24, 23, 3);
    this.add([antenna, this.panel, trim, this.indicator, title]);
    this.addShadow(38, 80, 12);
    this.setSize(100, 108).setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 108), Phaser.Geom.Rectangle.Contains);
  }

  setPowered(powered: boolean): void {
    this.active_ = powered;
    this.panel.setFillStyle(powered ? this.color : 0x7199bf);
    this.indicator.setText(powered ? '●' : '○').setColor(powered ? '#20233a' : '#f4f1e8');
  }

  activate(): void { this.setPowered(true); }
}
