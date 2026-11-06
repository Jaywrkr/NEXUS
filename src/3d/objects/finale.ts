import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';
import type { Ride } from './rides';

/*
 * Fase 9 (PLAN_MAESTRO.md): el faro del puerto, el bote de Marina y la Gran Chispa que vuelve.
 */

/** Faro: torre a rayas sobre las rocas. Motor trabado (circuito Voltio) y solo prende con toda la ciudad viva. */
export class Lighthouse extends Connectable {
  private readonly stripes: THREE.MeshToonMaterial[] = [];
  private readonly lamp: THREE.MeshBasicMaterial;
  private readonly beam: THREE.Group;
  /** Altura de la lámpara (de ahí sale la Gran Chispa). */
  readonly lampY = 13.2;
  unlocked = false;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 2.2;
    this.label = 'Faro';
    const base = rounded(new THREE.CylinderGeometry(2.6, 2.9, 0.8, 20), toon('#7a706a'), 0.02);
    base.position.y = 0.2;
    this.group.add(base);
    for (let i = 0; i < 5; i += 1) {
      const m = toonUnique('#b9b4ad');
      m.userData.on = i % 2 ? '#fff3dc' : '#e0453f';
      this.stripes.push(m);
      const r0 = 2.1 - i * 0.22;
      const seg = rounded(new THREE.CylinderGeometry(r0 - 0.22, r0, 2.2, 20), m, 0.03);
      seg.position.y = 0.6 + 1.1 + i * 2.2;
      this.group.add(seg);
    }
    // Balcón, sala de la lámpara y techo
    const balcony = rounded(new THREE.CylinderGeometry(1.6, 1.6, 0.18, 20), toon('#2c2838'), 0.012);
    balcony.position.y = 11.7;
    this.group.add(balcony);
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      const bar = box(0.06, 0.7, 0.06, '#2c2838', { outline: false });
      bar.position.set(Math.cos(a) * 1.5, 12.1, Math.sin(a) * 1.5);
      this.group.add(bar);
    }
    this.lamp = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.6, 16), this.lamp);
    lamp.position.y = this.lampY;
    this.group.add(lamp);
    const roof = rounded(new THREE.ConeGeometry(1.25, 1.3, 16), toon('#e0453f'), 0.02);
    roof.position.y = 14.65;
    this.group.add(roof);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), toon('#ffc23a'));
    ball.position.y = 15.4;
    this.group.add(ball);
    // Puerta (mira a −Z… no: a +X, hacia el muelle y la cámara)
    const door = box(0.1, 1.6, 0.9, '#6a3e26', { outline: 0.02 });
    door.position.set(2.2, 1.4, 0);
    this.group.add(door);
    // Haz de luz que gira (solo encendido)
    this.beam = new THREE.Group();
    const beamMat = new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 16, 16, 1, true), beamMat);
      cone.rotation.z = (s * Math.PI) / 2;
      cone.position.x = s * 8.6;
      this.beam.add(cone);
    }
    this.beam.position.y = this.lampY;
    this.beam.visible = false;
    this.group.add(this.beam);
    this.plugAnchor.position.set(2.4, 1, 1.2);
  }

  distanceFrom(x: number, z: number): number {
    return Math.max(0, Math.hypot(x - this.x, z - this.z) - 2.2);
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.stripes) m.color.set(m.userData.on as string);
    this.lamp.color.set('#fff6c0');
    this.beam.visible = true;
  }

  update(dt: number): void {
    if (this.active_) this.beam.rotation.y += dt * 0.9;
  }
}

/** Bote de Marina: varado (gris) en el canal; despierto, el Nexus se sube y da una vuelta por el canal. */
export class CanalBoat extends Connectable implements Ride {
  readonly boardAt: { x: number; z: number };
  private readonly hull = new THREE.Group();
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly seatObj = new THREE.Object3D();
  private readonly route: [number, number][];
  private readonly flag: THREE.Mesh;
  private dist = 0;
  private riding = false;
  private readonly total: number;
  private t = 0;
  /** Metros por segundo. */
  static SPEED = 9;

  constructor(id: string, x: number, z: number, dock: { x: number; z: number }, route: [number, number][]) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0;
    this.label = 'Bote';
    this.boardAt = dock;
    this.route = route;
    let total = 0;
    for (let i = 1; i < route.length; i += 1) total += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
    this.total = total;
    const paint = (c: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const hull = box(1.9, 0.8, 4.2, '', { mat: paint('#3f7fd6'), outline: 0.03 });
    hull.position.y = -0.55;
    this.hull.add(hull);
    const bow = rounded(new THREE.ConeGeometry(0.95, 1.4, 4), paint('#3f7fd6'), 0.02);
    bow.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    bow.scale.set(1, 1, 0.55);
    bow.position.set(0, -0.55, 2.75);
    this.hull.add(bow);
    const deck = box(1.7, 0.08, 4, '', { mat: paint('#fff3dc'), outline: false });
    deck.position.y = -0.13;
    this.hull.add(deck);
    const stripe = box(1.95, 0.14, 4.25, '', { mat: paint('#ffc23a'), outline: false });
    stripe.position.y = -0.3;
    this.hull.add(stripe);
    const cabin = box(1.3, 0.9, 1.2, '', { mat: paint('#fff3dc'), outline: 0.02 });
    cabin.position.set(0, 0.35, -1.2);
    this.hull.add(cabin);
    const mast = rounded(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), toon('#6a3e26'), 0.008);
    mast.position.set(0, 1.1, -1.2);
    this.hull.add(mast);
    this.flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), paint('#ff5a6e'));
    this.flag.position.set(0, 2, -0.85);
    this.flag.rotation.y = Math.PI / 2;
    this.hull.add(this.flag);
    this.seatObj.position.set(0, -0.1, 0.8);
    this.hull.add(this.seatObj);
    this.group.add(this.hull);
    this.plugAnchor.position.set(0, 0, -2);
  }

  /** El bote está en el agua: se lo alcanza desde el embarcadero. */
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

  /** Avanza por el canal; devuelve false al volver al embarcadero. */
  updateRide(dt: number): boolean {
    if (!this.riding) return false;
    this.dist = Math.min(this.total, this.dist + dt * CanalBoat.SPEED);
    this.place(this.dist);
    if (this.dist >= this.total) {
      this.riding = false;
      return false;
    }
    return true;
  }

  /** Posición del bote a `d` metros del comienzo del recorrido. */
  private place(d: number): void {
    let left = d;
    for (let i = 1; i < this.route.length; i += 1) {
      const [ax, az] = this.route[i - 1];
      const [bx, bz] = this.route[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (left <= len || i === this.route.length - 1) {
        const k = len ? Math.min(1, left / len) : 0;
        this.hull.position.set(ax + (bx - ax) * k - this.x, 0, az + (bz - az) * k - this.z);
        if (len) this.hull.rotation.y = Math.atan2(bx - ax, bz - az);
        return;
      }
      left -= len;
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.hull.position.y = Math.sin(this.t * 1.6) * 0.06;
    this.hull.rotation.z = Math.sin(this.t * 1.1) * 0.03;
    if (this.active_) this.flag.rotation.x = Math.sin(this.t * 6) * 0.25;
  }
}

/** La Gran Chispa: sale del faro, sube al cielo y desde ahí devuelve la vida a toda la ciudad. */
export class GranChispa {
  readonly group = new THREE.Group();
  private readonly core: THREE.Mesh;
  private readonly halos: THREE.Mesh[] = [];
  private readonly rays: THREE.Group;
  private t = -1;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();

  constructor() {
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
    this.group.add(this.core);
    for (const [r, c, o] of [
      [1.8, '#ffe066', 0.45],
      [2.8, '#ffb84a', 0.22],
      [4.2, '#7dffef', 0.12],
    ] as [number, string, number][]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false }));
      this.group.add(h);
      this.halos.push(h);
    }
    this.rays = new THREE.Group();
    for (let i = 0; i < 10; i += 1) {
      const ray = box(0.16, 0.16, 6, '#fff3a8', { outline: false });
      ray.position.z = 3.6;
      const holder = new THREE.Group();
      holder.add(ray);
      holder.rotation.set(Math.random() * Math.PI, (i / 10) * Math.PI * 2, 0);
      this.rays.add(holder);
    }
    this.group.add(this.rays);
    this.group.visible = false;
  }

  /** Sale de `from` y sube hasta `to` (tarda ~3 s). */
  launch(from: THREE.Vector3, to: THREE.Vector3): void {
    this.from.copy(from);
    this.to.copy(to);
    this.t = 0;
    this.group.visible = true;
    this.group.position.copy(from);
    this.group.scale.setScalar(0.2);
  }

  /** Ya está arriba, sin animar (partida guardada). */
  park(at: THREE.Vector3): void {
    this.t = 4;
    this.to.copy(at);
    this.group.visible = true;
    this.group.position.copy(at);
    this.group.scale.setScalar(1);
  }

  get risen(): boolean {
    return this.t >= 3;
  }

  update(dt: number, time: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const k = Math.min(1, this.t / 3);
    const e = k * k * (3 - 2 * k);
    if (this.t < 3.2) {
      this.group.position.lerpVectors(this.from, this.to, e);
      this.group.scale.setScalar(0.2 + e * 0.8);
    } else {
      this.group.position.set(this.to.x, this.to.y + Math.sin(time * 1.2) * 0.4, this.to.z);
    }
    this.rays.rotation.y += dt * 0.6;
    this.halos.forEach((h, i) => h.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.08));
  }
}
