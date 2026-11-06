import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';
import type { Ride } from './rides';

/*
 * Objetos de la Montaña nevada y observatorio (Fase 18, PLAN_EXPANSION.md).
 */

type Dock = { x: number; z: number; y: number };

/**
 * Telesilla: sube del campo de nieve a la cima (9 m) y baja. Como la lancha, tiene dos estaciones: se sube
 * donde está la silla y se baja en la otra; si alguien la llama desde la otra estación, viene sola.
 */
export class Chairlift extends Connectable implements Ride {
  private readonly chair = new THREE.Group();
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly seatObj = new THREE.Object3D();
  private readonly docks: [Dock, Dock];
  private readonly route: [number, number, number][];
  private readonly total: number;
  side: 0 | 1 = 0;
  private dist = 0;
  private riding = false;
  static SPEED = 5;

  constructor(id: string, base: Dock, top: Dock, route: [number, number, number][]) {
    super(id, 'target', route[0][0], route[0][2], 0);
    this.collideRadius = 0;
    this.label = 'Telesilla';
    this.docks = [base, top];
    this.route = route;
    let total = 0;
    for (let i = 1; i < route.length; i += 1) total += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1], route[i][2] - route[i - 1][2]);
    this.total = total;
    const p = (c: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const bar = box(0.08, 1.8, 0.08, '#2c2838', { outline: false });
    bar.position.y = 0.9;
    this.chair.add(bar);
    const seat = box(1.4, 0.15, 0.7, '', { mat: p('#e0453f'), outline: 0.015 });
    seat.position.y = 0;
    this.chair.add(seat);
    const back = box(1.4, 0.8, 0.1, '', { mat: p('#e0453f'), outline: 0.015 });
    back.position.set(0, 0.4, -0.32);
    this.chair.add(back);
    const safety = box(1.4, 0.06, 0.06, '', { mat: p('#ffd23a'), outline: false });
    safety.position.set(0, 0.55, 0.34);
    this.chair.add(safety);
    this.seatObj.position.set(0, 0.05, 0.05);
    this.chair.add(this.seatObj);
    this.group.add(this.chair);
    this.plugAnchor.position.set(0, 0.3, 0.3);
    this.place(0);
  }

  setSide(side: 0 | 1): void {
    this.side = side;
    this.riding = false;
    this.dist = 0;
    this.place(0);
  }

  get otherDock(): Dock {
    return this.docks[this.side === 0 ? 1 : 0];
  }

  get boardAt(): Dock {
    return this.docks[this.side];
  }

  /** Se la alcanza desde la estación donde está. */
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

  updateRide(dt: number): boolean {
    if (!this.riding) return false;
    this.dist = Math.min(this.total, this.dist + dt * Chairlift.SPEED);
    this.place(this.dist);
    this.chair.rotation.z = Math.sin(this.dist * 0.8) * 0.04;
    if (this.dist >= this.total) {
      this.riding = false;
      this.side = this.side === 0 ? 1 : 0;
      return false;
    }
    return true;
  }

  private place(d: number): void {
    const r = this.side === 0 ? this.route : [...this.route].reverse();
    let left = d;
    for (let i = 1; i < r.length; i += 1) {
      const [ax, ay, az] = r[i - 1];
      const [bx, by, bz] = r[i];
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      if (left <= len || i === r.length - 1) {
        const k = len ? Math.min(1, left / len) : 0;
        this.chair.position.set(ax + (bx - ax) * k - this.x, ay + (by - ay) * k, az + (bz - az) * k - this.z);
        this.chair.rotation.y = Math.atan2(bx - ax, bz - az) + Math.PI;
        return;
      }
      left -= len;
    }
  }
}

/** Telescopio del observatorio: con energía gira hacia el cielo y marca las Piezas en el mapa. */
export class Telescope extends Connectable {
  private readonly tube = new THREE.Group();
  private readonly paint: THREE.MeshToonMaterial;
  private readonly lens: THREE.MeshBasicMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.8;
    this.label = 'Telescopio';
    const legs = rounded(new THREE.CylinderGeometry(0.15, 0.5, 1.2, 3), toon('#3d3550'), 0.01);
    legs.position.y = 0.6;
    this.group.add(legs);
    this.paint = toonUnique('#8e8a99');
    const tube = rounded(new THREE.CylinderGeometry(0.28, 0.4, 2.4, 14), this.paint, 0.015);
    tube.rotation.x = Math.PI / 2;
    this.tube.add(tube);
    this.lens = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.38, 14), this.lens);
    lens.position.z = -1.21;
    lens.rotation.y = Math.PI;
    this.tube.add(lens);
    this.tube.position.y = 1.4;
    this.tube.rotation.x = 0.2;
    this.group.add(this.tube);
    this.plugAnchor.position.set(0.4, 0.6, 0.4);
  }

  activate(): void {
    this.active_ = true;
    this.paint.color.set('#ffd23a');
    this.lens.color.set('#9fe8ff');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.tube.rotation.x = 0.55 + Math.sin(this.t * 0.4) * 0.08;
    this.tube.rotation.y = Math.sin(this.t * 0.25) * 0.5;
  }
}
