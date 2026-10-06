import { sketchTexture } from '../art/sketchAtlas';
import Phaser from 'phaser';

export type ConnectableRole = 'source' | 'target';

export abstract class ConnectableObject extends Phaser.GameObjects.Container {
  readonly role: ConnectableRole;
  readonly id: string;
  protected active_ = false;
  private sketchImage?: Phaser.GameObjects.Image;
  private sketchStatus?: Phaser.GameObjects.Text;
  protected get sketchKind(): string { return 'generator'; }
  protected get sketchHeight(): number { return 112; }
  protected get sketchBottom(): number { return 43; }
  protected get sketchCount(): string | undefined { return undefined; }

  /** Rendering only: preserve object identities, inputs, counters and save state. */
  private syncSketch(): void {
    if (!this.scene.textures.exists('sketch-props-off')) return;
    const [key, frame] = sketchTexture(this.sketchKind, this.active_);
    if (!this.sketchImage) {
      this.sketchImage = this.scene.add.image(0, this.sketchBottom, key, frame).setOrigin(.5, 1);
      this.sketchImage.setScale(this.sketchHeight / this.sketchImage.height);
      this.sketchStatus = this.scene.add.text(this.sketchHeight * .28, this.sketchBottom - 12, '', {
        fontFamily: '"Patrick Hand", cursive', fontSize: '15px', color: '#34332e',
        backgroundColor: '#f2ead9', padding: { x: 4, y: 1 },
      }).setOrigin(.5);
      this.addAt(this.sketchImage, 0);
      this.add(this.sketchStatus);
    }
    for (const child of this.list) {
      if (child !== this.sketchImage && child !== this.sketchStatus && !(child instanceof Phaser.GameObjects.Text))
        (child as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }
    this.sketchImage.setTexture(key, frame);
    this.sketchImage.setScale(this.sketchHeight / this.sketchImage.height);
    this.sketchStatus!.setText(this.sketchCount ?? (this.name === 'dim-source' ? '×' : this.active_ ? '✓' : this.role === 'source' ? '↗' : '○'));
    // A grounded non-functional source stays visibly inert.
    this.sketchImage.setTint(this.name === 'dim-source' ? 0xa8aaa0 : 0xffffff);
  }

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, role: ConnectableRole) {
    super(scene, x, y);
    this.id = id;
    this.role = role;
    scene.add.existing(this);
    scene.events.on('postupdate', this.syncSketch, this);
    this.once('destroy', () => scene.events.off('postupdate', this.syncSketch, this));
  }

  /** Punto donde debe llegar/salir el cable, en coordenadas de mundo. */
  getPlugPoint(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.x, this.y);
  }

  get isActive(): boolean {
    return this.active_;
  }

  /** Indica si este objeto puede iniciar una conexión (primer clic). */
  canInitiate(): boolean {
    return this.role === 'source';
  }

  /** Sombra pintada en la base del objeto, para que se sienta apoyado en el piso. */
  protected addShadow(offsetY: number, width = 40, height = 12): void {
    const ambient=this.scene.add.ellipse(3,offsetY+2,width*1.28,height*1.5,0x243f48,.06);
    const shadow=this.scene.add.ellipse(2,offsetY,width,height,0x243f48,.13);
    const contact=this.scene.add.ellipse(0,offsetY-1,width*.62,height*.55,0x243f48,.12);
    this.addAt(ambient,0);this.addAt(shadow,1);this.addAt(contact,2);
  }

  /** Se llama cuando este objeto queda conectado correctamente. */
  abstract activate(): void;
}
