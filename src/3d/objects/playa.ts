import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Objetos de la Playa (Fase 16, PLAN_EXPANSION.md).
 */

/** Heladera del kiosco: con energía se prende, enfría y tira burbujitas. */
export class BeachFridge extends Connectable {
  private readonly door: THREE.MeshBasicMaterial;
  private readonly paint: THREE.MeshToonMaterial;
  private readonly bubbles: THREE.Mesh[] = [];
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.55;
    this.label = 'Heladera';
    this.paint = toonUnique('#8e8a99');
    const body = box(1.1, 1.7, 0.8, '', { mat: this.paint, outline: 0.02 });
    body.position.y = 0.85;
    this.group.add(body);
    this.door = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.3), this.door);
    glass.position.set(0, 0.95, 0.41);
    this.group.add(glass);
    for (let i = 0; i < 6; i += 1) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#e8fbff' }));
      b.visible = false;
      this.group.add(b);
      this.bubbles.push(b);
    }
    this.plugAnchor.position.set(0.55, 0.6, 0.3);
  }

  activate(): void {
    this.active_ = true;
    this.paint.color.set('#e0453f');
    this.door.color.set('#bdf3ff');
    for (const b of this.bubbles) b.visible = true;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.bubbles.forEach((b, i) => {
      const k = (this.t * 0.5 + i / this.bubbles.length) % 1;
      b.position.set(Math.sin(i * 2.1) * 0.3, 1.8 + k * 1.2, 0.2 + Math.cos(i) * 0.2);
      b.scale.setScalar(1 - k * 0.6);
    });
  }
}

/** Castillo de arena gigante: dormido es un montoncito; con energía crece y levanta las banderas. */
export class SandCastle extends Connectable {
  private readonly castle = new THREE.Group();
  private readonly flags: THREE.Object3D[] = [];
  private grow = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 1.8;
    this.label = 'Castillo de arena';
    const sand = toon('#e8c886');
    const base = rounded(new THREE.CylinderGeometry(1.9, 2.1, 0.6, 16), sand, 0.02);
    base.position.y = 0.3;
    this.group.add(base);
    const keep = rounded(new THREE.CylinderGeometry(0.8, 0.9, 1.6, 12), sand, 0.02);
    keep.position.y = 0.8;
    this.castle.add(keep);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const tower = rounded(new THREE.CylinderGeometry(0.4, 0.45, 1.2, 10), sand, 0.015);
      tower.position.set(Math.cos(a) * 1.35, 0.6, Math.sin(a) * 1.35);
      this.castle.add(tower);
      const flag = new THREE.Group();
      const pole = box(0.03, 0.6, 0.03, '#6a3e26', { outline: false });
      pole.position.y = 0.3;
      flag.add(pole);
      const cloth = box(0.3, 0.2, 0.02, ['#e0453f', '#4fa8e0', '#ffd23a', '#9be37a'][i], { outline: 0.004 });
      cloth.position.set(0.15, 0.5, 0);
      flag.add(cloth);
      flag.position.set(Math.cos(a) * 1.35, 1.2, Math.sin(a) * 1.35);
      flag.visible = false;
      this.castle.add(flag);
      this.flags.push(flag);
    }
    this.castle.position.y = 0.6;
    this.castle.scale.setScalar(0.35);
    this.group.add(this.castle);
    this.plugAnchor.position.set(1.4, 0.5, 1.2);
  }

  activate(): void {
    this.active_ = true;
    for (const f of this.flags) f.visible = true;
  }

  update(dt: number): void {
    if (!this.active_) return;
    if (this.grow < 1) {
      this.grow = Math.min(1, this.grow + dt * 0.8);
      this.castle.scale.setScalar(0.35 + 0.65 * this.grow);
    }
    this.flags.forEach((f, i) => (f.rotation.y = Math.sin(performance.now() / 300 + i) * 0.3));
  }
}

/** Faro chiquito de la escollera: necesita DOS cables (panel solar y molinito) para prenderse. */
export class SmallLighthouse extends Connectable {
  private inputs = 0;
  private readonly lamp: THREE.MeshBasicMaterial;
  private readonly bands: THREE.MeshToonMaterial[] = [];
  private readonly beam = new THREE.Group();
  private readonly dots: THREE.MeshBasicMaterial[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 1.1;
    this.label = 'Faro chiquito';
    const rock = rounded(new THREE.DodecahedronGeometry(1.6, 0), toon('#7a7468'), 0.03);
    rock.scale.y = 0.4;
    rock.position.y = 0;
    this.group.add(rock);
    for (let i = 0; i < 4; i += 1) {
      const m = toonUnique('#9a96a3');
      m.userData.on = i % 2 ? '#fff3dc' : '#e0453f';
      this.bands.push(m);
      const seg = rounded(new THREE.CylinderGeometry(0.62 - i * 0.07, 0.68 - i * 0.07, 1, 12), m, 0.012);
      seg.position.y = 0.6 + i;
      this.group.add(seg);
    }
    this.lamp = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), this.lamp);
    lamp.position.y = 4.4;
    this.group.add(lamp);
    const cap = rounded(new THREE.ConeGeometry(0.55, 0.6, 12), toon('#e0453f'), 0.01);
    cap.position.y = 5;
    this.group.add(cap);
    // Dos lucecitas en la base: cuántos cables llegaron
    for (const sx of [-0.25, 0.25]) {
      const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
      this.dots.push(m);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m);
      d.position.set(sx, 0.9, 0.66);
      this.group.add(d);
    }
    const ray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 1.2, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    );
    ray.rotation.z = Math.PI / 2;
    ray.position.x = 4.6;
    this.beam.add(ray);
    this.beam.position.y = 4.4;
    this.beam.visible = false;
    this.group.add(this.beam);
    this.plugAnchor.position.set(0, 0.9, 0.7);
  }

  get inputCount(): number {
    return this.inputs;
  }

  activate(): void {
    if (this.active_) return;
    this.dots[Math.min(this.inputs, 1)].color.set('#7cf07a');
    this.inputs += 1;
    if (this.inputs < 2) {
      this.lamp.color.set('#c9a24a');
      return;
    }
    this.active_ = true;
    this.lamp.color.set('#fff6c0');
    for (const m of this.bands) m.color.set(m.userData.on as string);
    this.beam.visible = true;
  }

  update(dt: number): void {
    if (this.active_) this.beam.rotation.y += dt * 1.2;
  }
}
