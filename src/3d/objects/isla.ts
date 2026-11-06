import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';
import type { Ride } from './rides';

/*
 * Objetos de la Isla misteriosa (Fase 17, PLAN_EXPANSION.md).
 */

/**
 * Lancha de Marina: va y viene entre el muelle del Puerto y el muelle de la isla. Se sube en el muelle donde
 * está; al llegar, el Nexus baja del otro lado (si se baja a mitad de camino, vuelve al muelle de salida).
 */
export class SeaBoat extends Connectable implements Ride {
  private readonly hull = new THREE.Group();
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly seatObj = new THREE.Object3D();
  private readonly docks: [{ x: number; z: number }, { x: number; z: number }];
  private readonly route: [number, number][];
  private readonly total: number;
  /** 0 = en el Puerto, 1 = en la isla. */
  side: 0 | 1 = 0;
  private dist = 0;
  private riding = false;
  static SPEED = 11;

  constructor(id: string, portDock: { x: number; z: number }, islandDock: { x: number; z: number }, route: [number, number][]) {
    super(id, 'target', route[0][0], route[0][1], 0);
    this.collideRadius = 0;
    this.label = 'Lancha';
    this.docks = [portDock, islandDock];
    this.route = route;
    let total = 0;
    for (let i = 1; i < route.length; i += 1) total += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    this.total = total;
    const p = (c: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const hull = box(2.2, 0.8, 5, '', { mat: p('#fff3dc'), outline: 0.03 });
    hull.position.y = -0.5;
    this.hull.add(hull);
    const bow = rounded(new THREE.ConeGeometry(1.1, 1.6, 4), p('#fff3dc'), 0.02);
    bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    bow.scale.set(1, 1, 0.55);
    bow.position.set(0, -0.5, 3.2);
    this.hull.add(bow);
    const stripe = box(2.25, 0.16, 5.05, '', { mat: p('#e0453f'), outline: false });
    stripe.position.y = -0.3;
    this.hull.add(stripe);
    const glass = box(1.6, 0.6, 0.1, '', { mat: p('#9fd8ff'), outline: 0.01 });
    glass.position.set(0, 0.25, 0.6);
    glass.rotation.x = -0.4;
    this.hull.add(glass);
    const motor = box(0.6, 0.8, 0.6, '', { mat: p('#30406a'), outline: 0.015 });
    motor.position.set(0, 0, -2.7);
    this.hull.add(motor);
    this.seatObj.position.set(0, -0.05, -0.6);
    this.hull.add(this.seatObj);
    this.group.add(this.hull);
    this.plugAnchor.position.set(0, 0, -2);
    this.place(0);
  }

  /** Pone la lancha en un muelle (al cargar la partida o cuando Marina la trae). */
  setSide(side: 0 | 1): void {
    this.side = side;
    this.riding = false;
    this.dist = 0;
    this.place(0);
  }

  /** El otro muelle (adonde lleva). */
  get otherDock(): { x: number; z: number } {
    return this.docks[this.side === 0 ? 1 : 0];
  }

  get boardAt(): { x: number; z: number } {
    return this.docks[this.side];
  }

  /** Se la alcanza desde el muelle donde está. */
  distanceFrom(x: number, z: number): number {
    return Math.hypot(x - this.boardAt.x, z - this.boardAt.z);
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.paint) m.color.set(m.userData.on as string);
  }

  seat(): THREE.Object3D {
    return this.seatObj;
  }

  startRide(): void {
    this.riding = true;
    this.dist = 0;
  }

  stopRide(): void {
    this.riding = false;
    this.dist = 0;
    this.place(0);
  }

  /** Cruza el mar; al llegar cambia de muelle y devuelve false. */
  updateRide(dt: number): boolean {
    if (!this.riding) return false;
    this.dist = Math.min(this.total, this.dist + dt * SeaBoat.SPEED);
    this.place(this.dist);
    this.hull.rotation.z = Math.sin(this.dist * 0.6) * 0.05;
    if (this.dist >= this.total) {
      this.riding = false;
      this.side = this.side === 0 ? 1 : 0;
      return false;
    }
    return true;
  }

  /** Posición a `d` metros desde el muelle de salida (el recorrido va al revés desde la isla). */
  private place(d: number): void {
    const r = this.side === 0 ? this.route : [...this.route].reverse();
    let left = d;
    for (let i = 1; i < r.length; i += 1) {
      const [ax, az] = r[i - 1];
      const [bx, bz] = r[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (left <= len || i === r.length - 1) {
        const k = len ? Math.min(1, left / len) : 0;
        this.hull.position.set(ax + (bx - ax) * k - this.x, 0, az + (bz - az) * k - this.z);
        if (len) this.hull.rotation.y = Math.atan2(bx - ax, bz - az);
        return;
      }
      left -= len;
    }
  }
}

export type RuneKind = 'luna' | 'sol' | 'estrella';

/** Piedra del templo con su símbolo: prendida, pasa la energía a la siguiente. */
export class RuneStone extends Connectable {
  readonly kind: RuneKind;
  private readonly glyph: THREE.MeshBasicMaterial;
  private readonly paint: THREE.MeshToonMaterial;

  constructor(id: string, kind: RuneKind, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.kind = kind;
    this.collideRadius = 0.6;
    this.label = kind === 'luna' ? 'Piedra de la luna' : kind === 'sol' ? 'Piedra del sol' : 'Piedra de la estrella';
    this.paint = toonUnique('#8a8474');
    const stone = box(1, 1.5, 0.7, '', { mat: this.paint, outline: 0.02 });
    stone.position.y = 0.75;
    this.group.add(stone);
    this.glyph = new THREE.MeshBasicMaterial({ color: '#4a4656' });
    let sym: THREE.Mesh;
    if (kind === 'luna') sym = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 6, 14, Math.PI * 1.2), this.glyph);
    else if (kind === 'sol') sym = new THREE.Mesh(new THREE.CircleGeometry(0.24, 14), this.glyph);
    else sym = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), this.glyph);
    sym.position.set(0, 0.95, 0.37);
    if (kind === 'luna') sym.rotation.z = 0.9;
    this.group.add(sym);
    this.plugAnchor.position.set(0.4, 0.6, 0.4);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    this.active_ = true;
    this.paint.color.set('#c8c0aa');
    this.glyph.color.set(this.kind === 'luna' ? '#e8e2ff' : this.kind === 'sol' ? '#ffd23a' : '#7dffef');
  }
}

/** Altar de la chispa antigua: se prende con la piedra de la estrella. */
export class TempleAltar extends Connectable {
  private readonly orb: THREE.MeshBasicMaterial;
  private readonly orbMesh: THREE.Mesh;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.9;
    this.label = 'Altar';
    const base = box(1.8, 0.9, 1.2, '#c8c0aa', { outline: 0.02 });
    base.position.y = 0.45;
    this.group.add(base);
    this.orb = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    this.orbMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), this.orb);
    this.orbMesh.position.y = 1.5;
    this.group.add(this.orbMesh);
    this.plugAnchor.position.set(0.8, 0.5, 0.5);
  }

  activate(): void {
    this.active_ = true;
    this.orb.color.set('#fff6c0');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.orbMesh.rotation.y += dt * 1.5;
    this.orbMesh.position.y = 1.5 + Math.sin(this.t * 2) * 0.15;
  }
}

/** Corazón del volcán (arriba, en el cráter): con energía el volcán se despierta, tranquilo. */
export class VolcanoHeart extends Connectable {
  private readonly core: THREE.MeshBasicMaterial;
  private readonly mesh: THREE.Mesh;
  private t = 0;

  constructor(id: string, x: number, z: number, y: number) {
    super(id, 'target', x, z, 0);
    this.group.position.y = y;
    this.collideRadius = 0.6;
    this.label = 'Corazón del volcán';
    this.core = new THREE.MeshBasicMaterial({ color: '#6a4a40' });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), this.core);
    this.mesh.position.y = 0.6;
    this.group.add(this.mesh);
    const ring = rounded(new THREE.TorusGeometry(0.8, 0.12, 6, 14), toon('#5a4a44'), 0.008);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    this.group.add(ring);
    this.plugAnchor.position.set(0.5, 0.5, 0.5);
  }

  activate(): void {
    this.active_ = true;
    this.core.color.set('#ff9a3a');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.mesh.scale.setScalar(1 + Math.sin(this.t * 3) * 0.08);
  }
}

/** Fuente de energía en altura (el Connectable base siempre queda en el piso). */
export function lift<T extends Connectable>(obj: T, y: number): T {
  obj.group.position.y = y;
  return obj;
}
