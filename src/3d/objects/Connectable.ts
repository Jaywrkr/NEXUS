import * as THREE from 'three';

export type Role = 'source' | 'target';

/**
 * Base de todo lo que se puede conectar con el cable (equivalente 3D de ConnectableObject).
 * El grupo se ubica en el piso; `plugAnchor` marca de dónde sale / a dónde llega el cable.
 */
export abstract class Connectable {
  readonly id: string;
  readonly role: Role;
  readonly group = new THREE.Group();
  /** Nombre corto que flota sobre el objeto cuando el Nexus se acerca ("Farola", "Aspersor"...). */
  label = '';
  /** Radio para colisión con el Nexus (0 = se puede atravesar). */
  collideRadius = 0.6;
  protected active_ = false;
  protected readonly plugAnchor = new THREE.Object3D();

  constructor(id: string, role: Role, x: number, z: number, rotY = 0) {
    this.id = id;
    this.role = role;
    this.group.position.set(x, 0, z);
    this.group.rotation.y = rotY;
    this.group.add(this.plugAnchor);
    this.group.userData.connectable = this;
  }

  get isActive(): boolean {
    return this.active_;
  }

  get x(): number {
    return this.group.position.x;
  }

  get z(): number {
    return this.group.position.z;
  }

  /** Distancia en el piso desde un punto hasta el borde del objeto (para el botón de interacción). */
  distanceFrom(x: number, z: number): number {
    return Math.hypot(this.x - x, this.z - z) - this.collideRadius;
  }

  /** Primer toque: ¿puede iniciar una conexión? Por defecto, solo las fuentes. */
  canInitiate(): boolean {
    return this.role === 'source';
  }

  plugPoint(out = new THREE.Vector3()): THREE.Vector3 {
    return this.plugAnchor.getWorldPosition(out);
  }

  /** Se llama al quedar conectado correctamente. */
  abstract activate(): void;

  /** Restaura el estado "ya resuelto" sin animación (progreso guardado). */
  restore(): void {
    this.activate();
  }

  update(_dt: number, _time: number): void {}
}
