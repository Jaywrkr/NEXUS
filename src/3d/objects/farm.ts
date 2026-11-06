import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';
import type { Ride } from './rides';

/*
 * Objetos de la Granja y molinos (Fase 12, PLAN_EXPANSION.md).
 */

/** Molino de viento: gris y quieto; con energía gira y se pinta. Puede tener el motor trabado (Voltio). */
export class Windmill extends Connectable {
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly blades = new THREE.Group();
  unlocked = true;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 2.2;
    this.label = 'Molino';
    const p = (c: string) => {
      const m = toonUnique('#9a96a3');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const tower = rounded(new THREE.CylinderGeometry(1.4, 2.2, 8, 12), p('#fff3dc'), 0.04);
    tower.position.y = 4;
    this.group.add(tower);
    const cap = rounded(new THREE.ConeGeometry(1.8, 1.8, 12), p('#c8452f'), 0.03);
    cap.position.y = 8.9;
    this.group.add(cap);
    const door = box(1, 1.8, 0.1, '#6a3e26', { outline: 0.02 });
    door.position.set(0, 0.9, 2.12);
    this.group.add(door);
    this.blades.position.set(0, 7.6, 1.75);
    for (let i = 0; i < 4; i += 1) {
      const arm = new THREE.Group();
      const bar = box(0.22, 4.4, 0.12, '#6a3e26', { outline: 0.01 });
      bar.position.y = 2.3;
      arm.add(bar);
      const sail = box(1.2, 3.4, 0.05, '', { mat: p('#fff3dc'), outline: 0.01 });
      sail.position.set(0.7, 2.6, 0.04);
      arm.add(sail);
      arm.rotation.z = (i / 4) * Math.PI * 2;
      this.blades.add(arm);
    }
    const hub = rounded(new THREE.SphereGeometry(0.4, 10, 8), p('#ffd23a'), 0.01);
    this.blades.add(hub);
    this.group.add(this.blades);
    this.plugAnchor.position.set(1.4, 1, 1.4);
  }

  distanceFrom(x: number, z: number): number {
    return Math.max(0, Math.hypot(x - this.x, z - this.z) - 2.2);
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.paint) m.color.set(m.userData.on as string);
  }

  update(dt: number): void {
    if (this.active_) this.blades.rotation.z += dt * 1.6;
  }
}

/** Incubadora del granero: con energía se prende la lámpara y nacen pollitos. */
export class Incubator extends Connectable {
  private readonly lamp: THREE.MeshBasicMaterial;
  private readonly eggs: THREE.Mesh[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.7;
    this.label = 'Incubadora';
    const body = box(1.3, 0.9, 0.9, '#e8dcc6', { outline: 0.02 });
    body.position.y = 0.45;
    this.group.add(body);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.8), new THREE.MeshBasicMaterial({ color: '#cfeefa', transparent: true, opacity: 0.5 }));
    lid.position.y = 1.1;
    this.group.add(lid);
    for (let i = 0; i < 3; i += 1) {
      const egg = rounded(new THREE.SphereGeometry(0.13, 10, 8), toon('#fff3dc'), 0.006);
      egg.scale.y = 1.3;
      egg.position.set(-0.35 + i * 0.35, 1.0, 0);
      this.group.add(egg);
      this.eggs.push(egg);
    }
    this.lamp = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.lamp);
    bulb.position.set(0, 1.45, 0);
    this.group.add(bulb);
    this.plugAnchor.position.set(0.7, 0.5, 0.5);
  }

  activate(): void {
    this.active_ = true;
    this.lamp.color.set('#ffb84a');
    for (const e of this.eggs) e.visible = false;
  }
}

/** Regador del invernadero: con energía tira agua y las plantas florecen. */
export class GreenhouseSprinkler extends Connectable {
  private readonly head: THREE.MeshToonMaterial;
  private readonly drops: THREE.Mesh[] = [];
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.3;
    this.label = 'Regador';
    const pipe = box(0.12, 1.2, 0.12, '#3d3550', { outline: 0.006 });
    pipe.position.y = 0.6;
    this.group.add(pipe);
    this.head = toonUnique('#8e8a99');
    const h = rounded(new THREE.CylinderGeometry(0.22, 0.16, 0.2, 10), this.head, 0.008);
    h.position.y = 1.25;
    this.group.add(h);
    for (let i = 0; i < 8; i += 1) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#8fe3ff' }));
      d.visible = false;
      this.group.add(d);
      this.drops.push(d);
    }
    this.plugAnchor.position.set(0, 0.8, 0.2);
  }

  activate(): void {
    this.active_ = true;
    this.head.color.set('#2bb3a8');
    for (const d of this.drops) d.visible = true;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.drops.forEach((d, i) => {
      const k = (this.t * 0.9 + i / this.drops.length) % 1;
      const a = (i / this.drops.length) * Math.PI * 2 + this.t;
      d.position.set(Math.cos(a) * k * 1.6, 1.3 + k * 0.8 - k * k * 1.8, Math.sin(a) * k * 1.6);
    });
  }
}

/** Tractor: dormido (gris); con energía el Nexus se sube y da una vuelta alrededor de los campos. */
export class Tractor extends Connectable implements Ride {
  readonly boardAt: { x: number; z: number };
  private readonly body = new THREE.Group();
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly wheels: THREE.Object3D[] = [];
  private readonly seatObj = new THREE.Object3D();
  private readonly route: [number, number][];
  private readonly total: number;
  private dist = 0;
  private riding = false;
  static SPEED = 6;

  constructor(id: string, dock: { x: number; z: number }, route: [number, number][]) {
    super(id, 'target', route[0][0], route[0][1], 0);
    this.collideRadius = 1.2;
    this.label = 'Tractor';
    this.boardAt = dock;
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
    const hood = box(1.2, 0.9, 1.8, '', { mat: p('#2f8a2e'), outline: 0.02 });
    hood.position.set(0, 0.9, 0.6);
    this.body.add(hood);
    const cab = box(1.3, 1.3, 1.1, '', { mat: p('#2f8a2e'), outline: 0.02 });
    cab.position.set(0, 1.4, -0.7);
    this.body.add(cab);
    const roof = box(1.5, 0.1, 1.3, '', { mat: p('#ffd23a'), outline: 0.01 });
    roof.position.set(0, 2.1, -0.7);
    this.body.add(roof);
    const pipe = box(0.12, 0.7, 0.12, '#2c2838', { outline: 0.006 });
    pipe.position.set(0.35, 1.7, 1.1);
    this.body.add(pipe);
    for (const [wz, r] of [
      [-0.7, 0.75],
      [0.9, 0.45],
    ] as [number, number][]) {
      for (const sx of [-0.8, 0.8]) {
        const w = rounded(new THREE.CylinderGeometry(r, r, 0.35, 14), p('#ffd23a'), 0.01);
        w.rotation.z = Math.PI / 2;
        w.position.set(sx, r, wz);
        this.body.add(w);
        this.wheels.push(w);
      }
    }
    this.seatObj.position.set(0, 1.05, -0.7);
    this.body.add(this.seatObj);
    this.group.add(this.body);
    this.plugAnchor.position.set(0.8, 1, 0);
  }

  /** Se lo alcanza desde el lugar donde se sube. */
  distanceFrom(x: number, z: number): number {
    return Math.min(Math.hypot(x - this.boardAt.x, z - this.boardAt.z), super.distanceFrom(x, z));
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
    this.dist = Math.min(this.total, this.dist + dt * Tractor.SPEED);
    this.place(this.dist);
    for (const w of this.wheels) w.rotation.x += dt * 6;
    if (this.dist >= this.total) {
      this.riding = false;
      return false;
    }
    return true;
  }

  private place(d: number): void {
    let left = d;
    for (let i = 1; i < this.route.length; i += 1) {
      const [ax, az] = this.route[i - 1];
      const [bx, bz] = this.route[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (left <= len || i === this.route.length - 1) {
        const k = len ? Math.min(1, left / len) : 0;
        this.body.position.set(ax + (bx - ax) * k - this.x, 0, az + (bz - az) * k - this.z);
        if (len) this.body.rotation.y = Math.atan2(bx - ax, bz - az);
        return;
      }
      left -= len;
    }
  }
}
