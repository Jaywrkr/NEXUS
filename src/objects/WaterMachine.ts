import Phaser from 'phaser';
import { ConnectableObject } from './ConnectableObject';

export class WaterMachine extends ConnectableObject {
  protected override get useSketch(): boolean { return false; }
  protected override get sketchBottom(): number { return 28; }
  override get inputSignal(): 'electricity' | 'water' { return this.kind === 'pump' ? 'electricity' : 'water'; }
  override get outputSignal(): 'water' { return 'water'; }
  readonly kind: 'pump' | 'direct' | 'regulated';
  private art: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private illustration: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene, x: number, y: number, kind: 'pump' | 'direct' | 'regulated') {
    super(scene, x, y, `water-${kind}`, 'target');
    this.kind = kind;
    this.art = scene.add.graphics();
    this.illustration = scene.add.image(0, 28, 'water-machines', kind === 'pump' ? 0 : kind === 'direct' ? 1 : 2).setOrigin(.5, 1);
    this.illustration.setScale(100 / this.illustration.width);
    this.label = scene.add.text(0, 43, '', { fontFamily: '"Patrick Hand", cursive', fontSize: '13px',
      color: '#34494e', backgroundColor: '#f2ead9', padding: { x: 5, y: 2 }, align: 'center' }).setOrigin(.5, 0);
    this.addShadow(28, 64, 12);
    this.add([this.illustration, this.art, this.label]);
    this.setSize(100, 110).setInteractive(new Phaser.Geom.Rectangle(0, 0, 100, 110), Phaser.Geom.Rectangle.Contains);
    this.render();
  }
  override get displayName(): string { return this.kind === 'pump' ? 'Bomba' : this.kind === 'direct' ? 'Válvula directa' : 'Válvula reguladora'; }
  override getPlugPoint(): Phaser.Math.Vector2 { return new Phaser.Math.Vector2(this.x + 44, this.y + 12); }
  override getInputPoint(): Phaser.Math.Vector2 { return new Phaser.Math.Vector2(this.x - 44, this.y + 12); }
  override canInitiate(): boolean { return this.active_; }
  activate(): void { this.setPowered(true); }
  setPowered(active: boolean): void { if (active === this.active_) return; this.active_ = active; this.render(); }
  private render(): void {
    this.illustration.setAlpha(this.active_ ? 1 : .76);
    const blue = this.active_ ? 0x2b9fb6 : 0x849490;
    // The registered illustration supplies the body; port lights show the actual state.
    this.art.clear().fillStyle(this.inputSignal === 'electricity' ? 0xd8a640 : blue).fillCircle(-44, 12, 5)
      .fillStyle(blue).fillCircle(44, 12, 5);
    const pressure = this.active_ ? this.kind === 'regulated' ? 2 : 3 : 0;
    this.label.setText(`${this.displayName}\n${this.kind === 'pump' ? 'Energía → agua' : this.kind === 'direct' ? 'Chorro fuerte' : 'Flujo suave'} · ${pressure} bar`);
  }
}
