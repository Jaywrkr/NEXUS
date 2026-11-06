import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';
import type { StallKind } from '../world/BarrioAlto';

/*
 * Objetos del Barrio Alto y mercado (Fase 15, PLAN_EXPANSION.md).
 */

const STALL: Record<StallKind, { label: string; awning: string; goods: string[] }> = {
  frutas: { label: 'Puesto de frutas', awning: '#e0453f', goods: ['#e0453f', '#ffd23a', '#9be37a', '#ff9f43'] },
  pan: { label: 'Puesto de pan', awning: '#c98e4a', goods: ['#e0b070', '#c98e4a', '#fff3dc'] },
  flores: { label: 'Puesto de flores', awning: '#e77fa6', goods: ['#e77fa6', '#c7a0ef', '#ffd23a', '#fff3dc'] },
  juguetes: { label: 'Puesto de juguetes', awning: '#4fa8e0', goods: ['#4fa8e0', '#ffd23a', '#e0453f', '#9be37a'] },
  telas: { label: 'Puesto de telas', awning: '#c7a0ef', goods: ['#2bb3a8', '#c7a0ef', '#ff9f43'] },
  discos: { label: 'Puesto de discos', awning: '#2bb3a8', goods: ['#2c2838', '#3d3550', '#ffd23a'] },
};

/** Puesto del mercado: gris y cerrado; con energía abre el toldo, se prende y pasa la luz a otro puesto. */
export class MarketStall extends Connectable {
  readonly kind: StallKind;
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly lamps: THREE.MeshBasicMaterial[] = [];
  private readonly awning = new THREE.Group();
  private t = 0;

  constructor(id: string, kind: StallKind, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.kind = kind;
    const info = STALL[kind];
    this.label = info.label;
    const p = (c: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const counter = box(2.8, 1, 1.2, '', { mat: p('#c7a17a'), outline: 0.02 });
    counter.position.set(0, 0.5, -0.3);
    this.group.add(counter);
    for (const sx of [-1.3, 1.3]) {
      const post = box(0.12, 2.6, 0.12, '#3d3550', { outline: 0.006 });
      post.position.set(sx, 1.3, -0.8);
      this.group.add(post);
      const post2 = post.clone();
      post2.position.z = 0.25;
      post2.scale.y = 0.85;
      post2.position.y = 1.1;
      this.group.add(post2);
    }
    // Toldo a rayas (cerrado = caído)
    for (let i = 0; i < 6; i += 1) {
      const stripe = box(0.5, 0.06, 1.6, '', { mat: p(i % 2 ? '#fff3dc' : info.awning), outline: 0.006 });
      stripe.position.set(-1.25 + i * 0.5, 0, 0.8);
      this.awning.add(stripe);
    }
    this.awning.position.set(0, 2.6, -0.8);
    this.awning.rotation.x = 1.1;
    this.group.add(this.awning);
    // Mercadería
    info.goods.forEach((c, i) => {
      const g = rounded(new THREE.SphereGeometry(0.2, 10, 8), p(c), 0.006);
      g.position.set(-0.9 + i * 0.6, 1.15, -0.3);
      this.group.add(g);
    });
    // Foquitos
    for (let i = 0; i < 5; i += 1) {
      const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
      this.lamps.push(m);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m);
      b.position.set(-1.2 + i * 0.6, 2.35, 0.3);
      this.group.add(b);
    }
    this.plugAnchor.position.set(1.2, 0.8, 0.4);
  }

  /** Se alcanza desde el mostrador. */
  distanceFrom(x: number, z: number): number {
    const dx = Math.max(0, Math.abs(x - this.x) - 1.4);
    const dz = Math.max(0, Math.abs(z - (this.z - 0.3)) - 0.6);
    return Math.hypot(dx, dz);
  }

  /** Un puesto prendido le pasa la luz a otro. */
  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.paint) m.color.set(m.userData.on as string);
    this.lamps.forEach((m, i) => m.color.set(i % 2 ? '#ffd23a' : '#fff6c0'));
    this.awning.rotation.x = 0.25;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.awning.rotation.z = Math.sin(this.t * 1.3) * 0.02;
  }
}

/** Proyector del cine: con energía gira el rollo y pasa la película. */
export class Projector extends Connectable {
  private readonly body: THREE.MeshToonMaterial;
  private readonly reels: THREE.Object3D[] = [];
  private readonly beam: THREE.Mesh;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.6;
    this.label = 'Proyector';
    const stand = box(0.8, 1, 0.8, '#3d3550', { outline: 0.015 });
    stand.position.y = 0.5;
    this.group.add(stand);
    this.body = toonUnique('#8e8a99');
    const b = box(0.9, 0.6, 1.1, '', { mat: this.body, outline: 0.015 });
    b.position.y = 1.3;
    this.group.add(b);
    for (const dz of [-0.35, 0.35]) {
      const reel = rounded(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14), toon('#2c2838'), 0.006);
      reel.rotation.z = Math.PI / 2;
      reel.position.set(0, 1.9, dz);
      this.group.add(reel);
      this.reels.push(reel);
    }
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 6, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.beam.rotation.z = Math.PI / 2;
    this.beam.rotation.y = 0.55;
    this.beam.position.set(-2.6, 1.6, -1.6);
    this.beam.visible = false;
    this.group.add(this.beam);
    this.plugAnchor.position.set(0, 0.8, 0.45);
  }

  activate(): void {
    this.active_ = true;
    this.body.color.set('#30406a');
    this.beam.visible = true;
  }

  update(dt: number): void {
    if (this.active_) for (const r of this.reels) r.rotation.x += dt * 3;
  }
}

/** Farol de lectura de la biblioteca: con el mecanismo trabado hasta cerrar su circuito en Voltio. */
export class ReadingLamp extends Connectable {
  private readonly glass: THREE.MeshBasicMaterial;
  private readonly paint: THREE.MeshToonMaterial;
  private readonly book = new THREE.Group();
  private t = 0;
  unlocked = true;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.4;
    this.label = 'Farol de lectura';
    this.paint = toonUnique('#8e8a99');
    const pole = rounded(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 10), this.paint, 0.006);
    pole.position.y = 1.8;
    this.group.add(pole);
    this.glass = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), this.glass);
    lamp.position.y = 3.9;
    this.group.add(lamp);
    // Libro abierto que flota arriba del farol cuando se prende
    for (const s of [-1, 1]) {
      const page = box(0.5, 0.04, 0.6, '#fff3dc', { outline: 0.008 });
      page.position.x = s * 0.26;
      page.rotation.z = -s * 0.3;
      this.book.add(page);
    }
    this.book.position.y = 4.8;
    this.book.visible = false;
    this.group.add(this.book);
    this.plugAnchor.position.set(0.2, 0.8, 0.2);
  }

  activate(): void {
    this.active_ = true;
    this.glass.color.set('#ffe9a6');
    this.paint.color.set('#2bb3a8');
    this.book.visible = true;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.book.rotation.y += dt * 0.8;
    this.book.position.y = 4.8 + Math.sin(this.t * 2) * 0.12;
  }
}
