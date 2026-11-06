import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Objetos del Bosque de las luciérnagas (Fase 11, PLAN_EXPANSION.md).
 */

/** Palanca del puente colgante: con energía, las tablas se arman y se cruza el arroyo. */
export class RopeBridgeLever extends Connectable {
  private readonly knob: THREE.MeshToonMaterial;
  private readonly arm = new THREE.Group();

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 0.35;
    this.label = 'Palanca del puente';
    const base = box(0.7, 0.5, 0.5, '#6a4a32', { outline: 0.02 });
    base.position.y = 0.25;
    this.group.add(base);
    this.knob = toonUnique('#8e8a99');
    const stick = box(0.08, 0.8, 0.08, '#3d3550', { outline: 0.006 });
    stick.position.y = 0.4;
    this.arm.add(stick);
    const ball = rounded(new THREE.SphereGeometry(0.13, 10, 8), this.knob, 0.01);
    ball.position.y = 0.82;
    this.arm.add(ball);
    this.arm.position.y = 0.45;
    this.arm.rotation.z = 0.7;
    this.group.add(this.arm);
    this.plugAnchor.position.set(0, 0.6, 0.3);
  }

  activate(): void {
    this.active_ = true;
    this.knob.color.set('#7be07a');
    this.arm.rotation.z = -0.7;
  }
}

/** Fogón del claro: apagado y gris; con energía se prende y el claro del bosque revive. */
export class Campfire extends Connectable {
  private readonly flames: THREE.Mesh[] = [];
  private readonly embers: THREE.MeshBasicMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z, 0);
    this.collideRadius = 1.0;
    this.label = 'Fogón';
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const stone = rounded(new THREE.DodecahedronGeometry(0.25, 0), toon('#7a706a'), 0.01);
      stone.position.set(Math.cos(a) * 0.85, 0.15, Math.sin(a) * 0.85);
      this.group.add(stone);
    }
    for (let i = 0; i < 4; i += 1) {
      const log = rounded(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 8), toon('#6a3e26'), 0.01);
      log.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI, 0);
      log.position.y = 0.25;
      this.group.add(log);
    }
    this.embers = new THREE.MeshBasicMaterial({ color: '#4a4452' });
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 12), this.embers);
    coal.position.y = 0.08;
    this.group.add(coal);
    for (const [c, s] of [
      ['#ff9f43', 0.45],
      ['#ffd23a', 0.32],
      ['#fff3a8', 0.18],
    ] as [string, number][]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(s, s * 2.6, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
      f.position.y = 0.3 + s * 1.3;
      f.visible = false;
      this.group.add(f);
      this.flames.push(f);
    }
    this.plugAnchor.position.set(0.9, 0.4, 0.6);
  }

  activate(): void {
    this.active_ = true;
    this.embers.color.set('#ff6b3a');
    for (const f of this.flames) f.visible = true;
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.flames.forEach((f, i) => {
      f.scale.set(1 + Math.sin(this.t * 9 + i) * 0.08, 1 + Math.sin(this.t * 7 + i * 2) * 0.15, 1 + Math.cos(this.t * 8 + i) * 0.08);
      f.rotation.y = this.t * (1 + i);
    });
  }
}
