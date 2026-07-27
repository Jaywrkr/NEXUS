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

  /** Se llama cuando este objeto queda conectado correctamente. */
  abstract activate(): void;
}
