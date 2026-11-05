import * as THREE from 'three';
import { damp, dampAngle } from '../core/util';
import { CARD_BY_ID, TYPES, type ChispiType } from '../data/chispis';

/*
 * Chispi compañero (Fase 4, PLAN_MAESTRO.md §7). Se elige una carta del álbum y ese Chispi sigue al
 * Nexus por los dos mundos: flota detrás del hombro, salta cuando el Nexus salta, baila con él y,
 * cuando su ayudita tiene algo para mostrar, vuela hasta ahí un ratito y vuelve.
 * Se arma con primitivas del color de su tipo, con un detalle por tipo (antena, pétalos, ruedas…).
 */

function part(geo: THREE.BufferGeometry, color: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  m.castShadow = true;
  return m;
}

/** Modelo 3D del Chispi según su tipo. Mira hacia +Z. */
export function makeBuddy(type: ChispiType): THREE.Group {
  const t = TYPES[type];
  const g = new THREE.Group();
  const body = part(type === 'via' ? new THREE.BoxGeometry(0.6, 0.48, 0.5) : new THREE.SphereGeometry(0.3, 18, 14), t.color);
  if (type === 'agua') body.scale.set(1, 1.15, 1);
  if (type === 'mar') body.scale.set(1.12, 0.92, 1);
  g.add(body);
  for (const ex of [-0.1, 0.1]) {
    const eye = part(new THREE.SphereGeometry(0.045, 8, 6), '#1d1630');
    eye.scale.set(0.8, 1.4, 0.5);
    eye.position.set(ex, 0.04, 0.27);
    g.add(eye);
    const shine = part(new THREE.SphereGeometry(0.015, 6, 4), '#ffffff');
    shine.position.set(ex - 0.012, 0.07, 0.29);
    g.add(shine);
  }
  const smile = part(new THREE.TorusGeometry(0.06, 0.014, 4, 10, Math.PI), '#1d1630');
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.07, 0.28);
  g.add(smile);
  switch (type) {
    case 'luz': {
      for (let i = 0; i < 8; i += 1) {
        const ray = part(new THREE.ConeGeometry(0.06, 0.18, 6), '#fff3a8');
        const a = (i / 8) * Math.PI * 2;
        ray.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, -0.05);
        ray.rotation.z = a - Math.PI / 2;
        g.add(ray);
      }
      break;
    }
    case 'radio': {
      const ant = part(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), '#1d1630');
      ant.position.set(0.1, 0.4, 0);
      ant.rotation.z = -0.3;
      g.add(ant);
      const tip = part(new THREE.SphereGeometry(0.05, 8, 6), '#ff4fd8');
      tip.position.set(0.15, 0.55, 0);
      g.add(tip);
      break;
    }
    case 'flor': {
      for (let i = 0; i < 6; i += 1) {
        const pet = part(new THREE.SphereGeometry(0.1, 8, 6), i % 2 ? '#ffb3da' : '#fff0a8');
        const a = (i / 6) * Math.PI * 2;
        pet.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, -0.06);
        pet.scale.set(1, 1, 0.5);
        g.add(pet);
      }
      break;
    }
    case 'ruedas':
    case 'via': {
      for (const s of [-1, 1]) {
        const wheel = part(new THREE.TorusGeometry(0.09, 0.04, 6, 14), type === 'via' ? '#3d3550' : '#7dff8a');
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(s * 0.2, -0.3, 0);
        g.add(wheel);
      }
      break;
    }
    case 'feria': {
      const hat = part(new THREE.ConeGeometry(0.14, 0.32, 10), '#fff3dc');
      hat.position.y = 0.4;
      g.add(hat);
      const pom = part(new THREE.SphereGeometry(0.05, 8, 6), '#ffe066');
      pom.position.y = 0.58;
      g.add(pom);
      break;
    }
    case 'bosque': {
      for (const s of [-1, 1]) {
        const leaf = part(new THREE.SphereGeometry(0.1, 8, 6), '#4fb04e');
        leaf.scale.set(0.5, 1.4, 0.3);
        leaf.position.set(s * 0.18, 0.34, 0);
        leaf.rotation.z = -s * 0.5;
        g.add(leaf);
      }
      break;
    }
    case 'agua': {
      const top = part(new THREE.ConeGeometry(0.14, 0.24, 12), t.color);
      top.position.y = 0.38;
      g.add(top);
      break;
    }
    case 'mar': {
      const wave = part(new THREE.TorusGeometry(0.31, 0.025, 4, 20, Math.PI), '#ffffff');
      wave.rotation.x = Math.PI / 2;
      wave.position.y = -0.04;
      g.add(wave);
      break;
    }
  }
  // Aura suave
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 14, 10),
    new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  g.add(halo);
  return g;
}

export class Companion {
  readonly root = new THREE.Group();
  readonly id: string;
  readonly type: ChispiType;
  private readonly model: THREE.Group;
  private time = 0;
  /** A dónde vuela un ratito para mostrar algo (ayudita); null = sigue al Nexus. */
  private scout: { x: number; z: number; t: number } | null = null;
  private spin = 0;
  private hop = 0;

  constructor(id: string) {
    this.id = id;
    const card = CARD_BY_ID.get(id)!;
    this.type = card.type;
    this.model = makeBuddy(card.type);
    this.model.scale.setScalar(0.85);
    this.root.add(this.model);
  }

  get name(): string {
    return CARD_BY_ID.get(this.id)!.name;
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  /** Va a mostrar algo por unos segundos (ayudita). */
  show(x: number, z: number, seconds = 3): void {
    this.scout = { x, z, t: seconds };
  }

  get scouting(): boolean {
    return this.scout !== null;
  }

  /** Salta de alegría (al saltar el Nexus, al juntar algo). */
  cheer(): void {
    this.hop = 1;
  }

  /** Lo pone al lado del Nexus de golpe (al entrar a una casa, al cargar). */
  snap(p: THREE.Vector3, heading: number): void {
    this.root.position.set(p.x - Math.sin(heading) * 0.9 + Math.cos(heading) * 0.6, p.y + 1.4, p.z - Math.cos(heading) * 0.9 - Math.sin(heading) * 0.6);
  }

  update(dt: number, p: THREE.Vector3, heading: number, dancing: boolean): void {
    this.time += dt;
    let tx: number;
    let tz: number;
    let ty: number;
    if (this.scout) {
      this.scout.t -= dt;
      tx = this.scout.x;
      tz = this.scout.z;
      ty = 1.6;
      if (this.scout.t <= 0) this.scout = null;
    } else {
      // Detrás y a un costado del Nexus, flotando a la altura del hombro
      tx = p.x - Math.sin(heading) * 0.9 + Math.cos(heading) * 0.6;
      tz = p.z - Math.cos(heading) * 0.9 - Math.sin(heading) * 0.6;
      ty = p.y + 1.4;
    }
    const k = this.scout ? 3 : 5;
    this.root.position.x = damp(this.root.position.x, tx, k, dt);
    this.root.position.z = damp(this.root.position.z, tz, k, dt);
    this.hop = Math.max(0, this.hop - dt * 2.5);
    this.root.position.y = damp(this.root.position.y, ty, 6, dt);
    this.model.position.y = Math.sin(this.time * 3) * 0.08 + Math.sin(this.hop * Math.PI) * 0.4;
    // Mira hacia donde va (o hacia la cámara si está quieto)
    const vx = tx - this.root.position.x;
    const vz = tz - this.root.position.z;
    const want = Math.hypot(vx, vz) > 0.2 ? Math.atan2(vx, vz) : Math.PI / 4;
    if (dancing) this.spin += dt * 9;
    else this.spin = dampAngle(this.spin, 0, 6, dt);
    this.root.rotation.y = dampAngle(this.root.rotation.y, want, 5, dt) + 0;
    this.model.rotation.y = this.spin;
    this.model.rotation.z = Math.sin(this.time * 2.2) * 0.12;
  }
}
