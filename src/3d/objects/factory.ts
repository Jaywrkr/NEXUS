import * as THREE from 'three';
import { box, rounded, toonUnique } from '../core/render';
import { Connectable } from './Connectable';

/*
 * Piezas de la Fábrica de Chispas (Fase 14, PLAN_EXPANSION.md). Se conectan EN ORDEN (cada una solo
 * pasa la energía si ya está prendida): cintas 1 → 2 → 3 afuera; caldera → engranaje → Gran Máquina adentro.
 */
export type FactoryKind = 'belt' | 'boiler' | 'gear' | 'machine';

const LABELS: Record<FactoryKind, string> = {
  belt: 'Cinta',
  boiler: 'Caldera',
  gear: 'Engranaje',
  machine: 'Gran Máquina',
};

export class FactoryPart extends Connectable {
  readonly kind: FactoryKind;
  private readonly paint: THREE.MeshToonMaterial[] = [];
  private readonly spin = new THREE.Group();
  private readonly lights: THREE.MeshBasicMaterial[] = [];
  private t = 0;

  constructor(id: string, kind: FactoryKind, x: number, z: number, n = 0) {
    super(id, 'target', x, z, 0);
    this.kind = kind;
    this.label = kind === 'belt' ? `${LABELS.belt} ${n}` : LABELS[kind];
    const p = (c: string) => {
      const m = toonUnique('#8e8a99');
      m.userData.on = c;
      this.paint.push(m);
      return m;
    };
    const lamp = () => {
      const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
      this.lights.push(m);
      return m;
    };
    if (kind === 'belt') {
      // Motor de la cinta (la cinta la arma Factory.ts), con número grande
      this.collideRadius = 0.5;
      const motor = box(0.9, 1.1, 0.9, '', { mat: p('#ff9f43'), outline: 0.02 });
      motor.position.y = 0.55;
      this.group.add(motor);
      const wheel = rounded(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), p('#ffd23a'), 0.01);
      wheel.rotation.x = Math.PI / 2;
      this.spin.add(wheel);
      this.spin.position.set(0, 0.6, 0.5);
      this.group.add(this.spin);
      for (let i = 0; i < n; i += 1) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), lamp());
        dot.position.set(-0.2 + i * 0.2, 1.25, 0);
        this.group.add(dot);
      }
      this.plugAnchor.position.set(0, 0.8, 0.5);
    } else if (kind === 'boiler') {
      this.collideRadius = 0.9;
      const tank = rounded(new THREE.CylinderGeometry(0.8, 0.9, 2, 14), p('#c8452f'), 0.02);
      tank.position.y = 1;
      this.group.add(tank);
      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 14), lamp());
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(0, 1.3, 0.86);
      this.group.add(gauge);
      this.plugAnchor.position.set(0.8, 1, 0.5);
    } else if (kind === 'gear') {
      this.collideRadius = 0.8;
      const stand = box(0.3, 1.4, 0.3, '#3d3550', { outline: 0.01 });
      stand.position.y = 0.7;
      this.group.add(stand);
      const gear = rounded(new THREE.CylinderGeometry(1, 1, 0.25, 12), p('#ffd23a'), 0.015);
      gear.rotation.x = Math.PI / 2;
      this.spin.add(gear);
      for (let i = 0; i < 8; i += 1) {
        const tooth = box(0.3, 0.3, 0.25, '', { mat: p('#ffd23a'), outline: false });
        const a = (i / 8) * Math.PI * 2;
        tooth.position.set(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0);
        tooth.rotation.z = a;
        this.spin.add(tooth);
      }
      this.spin.position.y = 1.6;
      this.group.add(this.spin);
      this.plugAnchor.position.set(0.6, 0.8, 0.4);
    } else {
      // La Gran Máquina: donde se hizo la Gran Chispa
      this.collideRadius = 1.4;
      const base = box(2.6, 1.2, 2, '', { mat: p('#30406a'), outline: 0.03 });
      base.position.y = 0.6;
      this.group.add(base);
      const dome = rounded(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), p('#c9ecff'), 0.02);
      dome.position.y = 1.2;
      this.group.add(dome);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), lamp());
      core.position.y = 1.65;
      this.spin.add(core);
      this.group.add(this.spin);
      for (const sx of [-1, 1]) {
        const coil = rounded(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8), p('#ffc23a'), 0.01);
        coil.position.set(sx * 1.1, 2, 0);
        this.group.add(coil);
      }
      this.plugAnchor.position.set(1.2, 0.8, 0.8);
    }
  }

  /** Pasa la energía a la siguiente pieza solo si ya está prendida (y no es la última). */
  canInitiate(): boolean {
    return this.active_ && this.kind !== 'machine';
  }

  activate(): void {
    this.active_ = true;
    for (const m of this.paint) m.color.set(m.userData.on as string);
    for (const l of this.lights) l.color.set(this.kind === 'machine' ? '#fff6c0' : '#7dffef');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    if (this.kind === 'belt') this.spin.rotation.z += dt * 4;
    else if (this.kind === 'gear') this.spin.rotation.z += dt * 1.5;
    else if (this.kind === 'machine') {
      this.spin.rotation.y += dt * 2;
      this.spin.position.y = Math.sin(this.t * 2) * 0.1;
    }
  }
}
