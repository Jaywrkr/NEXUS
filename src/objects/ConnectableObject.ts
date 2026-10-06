import Phaser from 'phaser';

export type ConnectableRole = 'source' | 'target';

export abstract class ConnectableObject extends Phaser.GameObjects.Container {
  readonly role: ConnectableRole;
  readonly id: string;
  protected active_ = false;

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, role: ConnectableRole) {
    super(scene, x, y);
    this.id = id;
    this.role = role;
    scene.add.existing(this);
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
