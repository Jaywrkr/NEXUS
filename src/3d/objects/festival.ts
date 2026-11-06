import * as THREE from 'three';
import { box, rounded, toon, toonUnique } from '../core/render';
import { tween } from '../core/tween';
import { Connectable } from './Connectable';

/*
 * Fase 5 (PLAN_MAESTRO.md): las dos zonas que faltaban del capítulo 1, con la misma lógica que la 2D.
 *  - Taller de Pipa (interior): energía → motor; motor → pato y campana; pato + campana → desfile.
 *  - Faroles de Lucio: energía → inicio; inicio → directo → salida, o inicio → curioso → tímido → salida.
 *    Salida → escenario → confeti cierra el capítulo con la fiesta (necesita todos los preparativos).
 * Todo lo que ya se encendió puede pasar la energía al siguiente (canInitiate cuando está activo).
 */

/** Pieza que pasa la energía cuando está encendida. */
abstract class Relay extends Connectable {
  canInitiate(): boolean {
    return this.active_;
  }
}

/** Motor del taller: un engranaje grande que gira y una chimenea que larga vapor. */
export class Motor extends Relay {
  private readonly gear = new THREE.Group();
  private readonly gear2 = new THREE.Group();
  private readonly lamp: THREE.MeshBasicMaterial;
  private puff: THREE.Mesh[] = [];
  private spin = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.9;
    this.label = 'Motor';
    const base = box(1.8, 0.9, 1.3, '#6f8fcf', { outline: 0.03, brush: 2 });
    base.position.y = 0.45;
    this.group.add(base);
    const top = box(1.9, 0.12, 1.4, '#3d3550', { outline: 0.015 });
    top.position.y = 0.96;
    this.group.add(top);
    const makeGear = (g: THREE.Group, r: number, color: string) => {
      const disc = rounded(new THREE.CylinderGeometry(r, r, 0.14, 18), toon(color), 0.012);
      disc.rotation.x = Math.PI / 2;
      g.add(disc);
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        const tooth = box(0.12, 0.16, 0.14, color, { outline: false });
        tooth.position.set(Math.cos(a) * (r + 0.06), Math.sin(a) * (r + 0.06), 0);
        tooth.rotation.z = a;
        g.add(tooth);
      }
      const hub = rounded(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.2, 10), toon('#3d3550'), 0.01);
      hub.rotation.x = Math.PI / 2;
      g.add(hub);
    };
    makeGear(this.gear, 0.55, '#ffc23a');
    this.gear.position.set(-0.35, 1.55, 0.3);
    this.group.add(this.gear);
    makeGear(this.gear2, 0.32, '#e0563f');
    this.gear2.position.set(0.45, 1.3, 0.32);
    this.group.add(this.gear2);
    const chimney = rounded(new THREE.CylinderGeometry(0.14, 0.18, 0.9, 10), toon('#8b8f9a'), 0.012);
    chimney.position.set(0.6, 1.4, -0.35);
    this.group.add(chimney);
    this.lamp = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), this.lamp);
    bulb.position.set(0.6, 0.6, 0.66);
    this.group.add(bulb);
    for (let i = 0; i < 3; i += 1) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0 }));
      p.position.set(0.6, 1.9, -0.35);
      this.group.add(p);
      this.puff.push(p);
    }
    this.plugAnchor.position.set(-0.9, 0.8, 0.4);
  }

  activate(): void {
    this.active_ = true;
    this.lamp.color.set('#7dff8a');
  }

  update(dt: number, time: number): void {
    if (!this.active_) return;
    this.spin += dt * 2.2;
    this.gear.rotation.z = this.spin;
    this.gear2.rotation.z = -this.spin * 1.7;
    this.puff.forEach((p, i) => {
      const k = (time * 0.6 + i / 3) % 1;
      p.position.y = 1.9 + k * 1.2;
      p.scale.setScalar(0.6 + k);
      (p.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
    });
  }
}

/** El pato supervisor: un pato de juguete que se bambolea cuando tiene energía. */
export class ToyDuck extends Relay {
  private readonly duck = new THREE.Group();
  private readonly body: THREE.MeshToonMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.5;
    this.label = 'Pato supervisor';
    const ped = rounded(new THREE.CylinderGeometry(0.5, 0.55, 0.5, 14), toon('#c7a0ef'), 0.015);
    ped.position.y = 0.25;
    this.group.add(ped);
    this.body = toonUnique('#b8b2a8');
    const b = rounded(new THREE.SphereGeometry(0.35, 14, 10), this.body, 0.015);
    b.scale.set(1.2, 0.85, 1);
    b.position.y = 0.78;
    this.duck.add(b);
    const head = rounded(new THREE.SphereGeometry(0.22, 12, 10), this.body, 0.012);
    head.position.set(0, 1.12, 0.22);
    this.duck.add(head);
    const beak = rounded(new THREE.ConeGeometry(0.09, 0.22, 8), toon('#ff9f43'), 0.008);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.08, 0.48);
    this.duck.add(beak);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), toon('#1d1630'));
      eye.position.set(s * 0.09, 1.18, 0.4);
      this.duck.add(eye);
    }
    // Gorrita de supervisor
    const cap = rounded(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), toon('#2c3f66'), 0.008);
    cap.position.set(0, 1.32, 0.18);
    this.duck.add(cap);
    this.group.add(this.duck);
    this.plugAnchor.position.set(0.4, 0.8, 0.2);
  }

  activate(): void {
    this.active_ = true;
    this.body.color.set('#ffe066');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.duck.rotation.z = Math.sin(this.t * 4) * 0.12;
    this.duck.rotation.y = Math.sin(this.t * 1.3) * 0.5;
  }
}

/** La campana muda: cuando le llega energía, suena y se balancea. */
export class ToyBell extends Relay {
  private readonly bell = new THREE.Group();
  private readonly mat: THREE.MeshToonMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.5;
    this.label = 'Campana';
    for (const s of [-1, 1]) {
      const post = box(0.12, 1.8, 0.12, '#7a4a2e', { outline: 0.012 });
      post.position.set(s * 0.5, 0.9, 0);
      this.group.add(post);
    }
    const beam = box(1.2, 0.14, 0.16, '#7a4a2e', { outline: 0.012 });
    beam.position.y = 1.8;
    this.group.add(beam);
    this.mat = toonUnique('#8e8a99');
    const cup = rounded(new THREE.CylinderGeometry(0.16, 0.36, 0.5, 14, 1, true), this.mat, 0.014);
    cup.position.y = -0.3;
    (cup.material as THREE.Material).side = THREE.DoubleSide;
    this.bell.add(cup);
    const clap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), toon('#3d3550'));
    clap.position.y = -0.55;
    this.bell.add(clap);
    this.bell.position.y = 1.72;
    this.group.add(this.bell);
    this.plugAnchor.position.set(0, 1.3, 0.3);
  }

  activate(): void {
    this.active_ = true;
    this.mat.color.set('#ffc23a');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.bell.rotation.z = Math.sin(this.t * 5) * 0.35 * (0.6 + 0.4 * Math.sin(this.t * 0.7));
  }
}

/**
 * Desfile de juguetes: una pista redonda con tres juguetes. Necesita las DOS entradas
 * (pato y campana), como la antena; con una sola, se prende a medias.
 */
export class ToyParade extends Connectable {
  private inputs = 0;
  private readonly toys = new THREE.Group();
  private readonly lights: THREE.MeshBasicMaterial[] = [];
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 1.1;
    this.label = 'Desfile';
    const track = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.05, 32), toon('#3d3550'));
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.06;
    this.group.add(track);
    const deck = rounded(new THREE.CylinderGeometry(1.15, 1.2, 0.08, 28), toon('#f3d9b1', 2), 0.012);
    deck.position.y = 0.03;
    this.group.add(deck);
    const cols = ['#ff5a6e', '#5ec8ff', '#7be07a'];
    cols.forEach((c, i) => {
      const toy = new THREE.Group();
      const body = box(0.32, 0.28, 0.42, c, { outline: 0.01 });
      body.position.y = 0.24;
      toy.add(body);
      const hat = rounded(new THREE.ConeGeometry(0.1, 0.22, 8), toon('#fff3dc'), 0.008);
      hat.position.y = 0.5;
      toy.add(hat);
      const a = (i / 3) * Math.PI * 2;
      toy.position.set(Math.cos(a) * 0.9, 0.06, Math.sin(a) * 0.9);
      this.toys.add(toy);
    });
    this.group.add(this.toys);
    // Dos foquitos: uno por entrada
    for (const s of [-1, 1]) {
      const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), m);
      l.position.set(s * 0.35, 0.2, 1.15);
      this.group.add(l);
      this.lights.push(m);
    }
    this.plugAnchor.position.set(0, 0.4, 0.9);
  }

  /** Cuántas entradas tiene conectadas (0, 1 o 2). */
  get inputCount(): number {
    return this.inputs;
  }

  activate(): void {
    if (this.inputs >= 2) return;
    this.lights[this.inputs].color.set('#7dff8a');
    this.inputs += 1;
    if (this.inputs === 2) this.active_ = true;
  }

  restore(): void {
    this.inputs = 2;
    this.active_ = true;
    for (const l of this.lights) l.color.set('#7dff8a');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    this.toys.rotation.y = this.t * 1.2;
    this.toys.children.forEach((toy, i) => (toy.position.y = 0.06 + Math.abs(Math.sin(this.t * 6 + i)) * 0.12));
  }
}

/** Farol de la calle de Lucio. `shy` = el farol tímido (se esconde detrás de su pantalla). */
export class LanternPost extends Relay {
  private readonly glass: THREE.MeshBasicMaterial;
  private readonly light: THREE.PointLight;
  private readonly halo: THREE.Mesh;
  private readonly color: string;
  private readonly shy: boolean;
  private readonly head = new THREE.Group();
  private t = Math.random() * 6;

  constructor(id: string, x: number, z: number, label: string, color: string, shy = false) {
    super(id, 'target', x, z);
    this.collideRadius = 0.3;
    this.label = label;
    this.color = color;
    this.shy = shy;
    const base = rounded(new THREE.CylinderGeometry(0.22, 0.3, 0.3, 10), toon('#3d3550'), 0.012);
    base.position.y = 0.15;
    this.group.add(base);
    const pole = rounded(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), toon('#3d3550'), 0.012);
    pole.position.y = 1.25;
    this.group.add(pole);
    this.glass = new THREE.MeshBasicMaterial({ color: '#5a5866' });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 6), this.glass);
    this.head.add(lamp);
    const roof = rounded(new THREE.ConeGeometry(0.3, 0.24, 6), toon('#3d3550'), 0.01);
    roof.position.y = 0.33;
    this.head.add(roof);
    const ring = box(0.48, 0.05, 0.48, '#3d3550', { outline: false });
    ring.position.y = -0.22;
    this.head.add(ring);
    if (shy) {
      // El tímido tiene una pantallita delante, como si se tapara la cara
      const visor = box(0.36, 0.3, 0.04, '#ffb86c', { outline: 0.008 });
      visor.position.set(0, 0.0, 0.24);
      this.head.add(visor);
    }
    this.head.position.y = 2.55;
    this.group.add(this.head);
    this.halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    this.halo.rotation.x = -Math.PI / 2;
    this.halo.position.y = 0.06;
    this.group.add(this.halo);
    this.light = new THREE.PointLight(color, 0, 6, 1.6);
    this.light.position.y = 2.5;
    this.group.add(this.light);
    this.plugAnchor.position.set(0, 2.4, 0.2);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.glass.color.set(this.color);
    (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.32;
    this.light.intensity = 6;
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.active_) return;
    // Los faroles "conversan": se mecen un poquito; el tímido mira para otro lado
    this.head.rotation.z = Math.sin(this.t * 1.6) * 0.06;
    if (this.shy) this.head.rotation.y = Math.sin(this.t * 0.8) * 0.9;
  }
}

/** Escenario de la fiesta: tarima con telón, guirnaldas y dos parlantes. */
export class Stage extends Relay {
  private readonly bulbs: THREE.MeshBasicMaterial[] = [];
  private readonly curtain: THREE.MeshToonMaterial;
  private t = 0;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0;
    this.label = 'Escenario';
    const deck = box(5, 0.6, 3, '#7a4a2e', { outline: 0.03, brush: 2 });
    deck.position.y = 0.3;
    this.group.add(deck);
    const front = box(5.05, 0.1, 0.06, '#ffc23a', { outline: false });
    front.position.set(0, 0.5, 1.52);
    this.group.add(front);
    this.curtain = toonUnique('#8e8a99', 4);
    const back = box(5, 3, 0.15, '', { mat: this.curtain, outline: 0.03 });
    back.position.set(0, 2.1, -1.4);
    this.group.add(back);
    for (const s of [-1, 1]) {
      const post = box(0.2, 3.6, 0.2, '#3d3550', { outline: 0.012 });
      post.position.set(s * 2.5, 1.8, -1.4);
      this.group.add(post);
      const speaker = box(0.7, 1.0, 0.6, '#2c2838', { outline: 0.02 });
      speaker.position.set(s * 2.0, 1.1, 1.0);
      this.group.add(speaker);
      const cone = rounded(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), toon('#8b8f9a'), 0.006);
      cone.rotation.x = Math.PI / 2;
      cone.position.set(s * 2.0, 1.15, 1.31);
      this.group.add(cone);
    }
    for (let i = 0; i < 12; i += 1) {
      const m = new THREE.MeshBasicMaterial({ color: '#5a5866' });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), m);
      b.position.set(-2.4 + i * (4.8 / 11), 3.5 - Math.sin((i / 11) * Math.PI) * 0.3, -1.25);
      this.group.add(b);
      this.bulbs.push(m);
    }
    this.plugAnchor.position.set(-2.2, 0.8, 1.2);
  }

  /** La tarima se puede pisar (y saltar encima). */
  get deckRect(): { minX: number; maxX: number; minZ: number; maxZ: number; h: number } {
    return { minX: this.x - 2.5, maxX: this.x + 2.5, minZ: this.z - 1.5, maxZ: this.z + 1.5, h: 0.6 };
  }

  distanceFrom(x: number, z: number): number {
    const dx = Math.max(Math.abs(x - this.x) - 2.5, 0);
    const dz = Math.max(Math.abs(z - this.z) - 1.5, 0);
    return Math.hypot(dx, dz);
  }

  activate(): void {
    this.active_ = true;
    this.curtain.color.set('#c8452f');
  }

  update(dt: number): void {
    if (!this.active_) return;
    this.t += dt;
    const cols = ['#ffe066', '#ff6b4a', '#7dff8a', '#9be7ff', '#ff9ff3'];
    this.bulbs.forEach((m, i) => m.color.set(cols[(i + Math.floor(this.t * 4)) % cols.length]));
  }
}

/** Cañón de confeti: al conectarlo dispara la fiesta. */
export class ConfettiCannon extends Connectable {
  private readonly barrel = new THREE.Group();
  private readonly bits: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
  private readonly scene: THREE.Scene;
  private t = 0;

  constructor(id: string, x: number, z: number, scene: THREE.Scene) {
    super(id, 'target', x, z);
    this.scene = scene;
    this.collideRadius = 0.6;
    this.label = 'Confeti';
    const wheelMat = toon('#7a4a2e');
    for (const s of [-1, 1]) {
      const w = rounded(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 14), wheelMat, 0.012);
      w.rotation.z = Math.PI / 2;
      w.position.set(s * 0.4, 0.35, 0);
      this.group.add(w);
    }
    const tube = rounded(new THREE.CylinderGeometry(0.28, 0.34, 1.2, 14), toon('#ff9ff3'), 0.014);
    tube.position.y = 0.5;
    this.barrel.add(tube);
    for (const y of [-0.3, 0.1, 0.45]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 14), toon('#ffe066'));
      band.position.y = 0.5 + y;
      this.barrel.add(band);
    }
    this.barrel.position.y = 0.45;
    this.barrel.rotation.x = -0.6;
    this.group.add(this.barrel);
    this.plugAnchor.position.set(0, 0.6, -0.4);
  }

  activate(): void {
    this.active_ = true;
    tween(0.25, (k) => (this.barrel.scale.y = 1 + Math.sin(k * Math.PI) * 0.25));
    this.fire();
  }

  restore(): void {
    this.active_ = true;
  }

  /** Lluvia de confeti (también al festejar de nuevo). */
  fire(): void {
    const cols = ['#ffe066', '#ff6b4a', '#7dff8a', '#9be7ff', '#ff9ff3', '#c7a0ef'];
    for (let i = 0; i < 90; i += 1) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
      m.position.set(this.x, 1.4, this.z);
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.scene.add(m);
      this.bits.push({ m, v: new THREE.Vector3(Math.cos(a) * sp, 7 + Math.random() * 5, Math.sin(a) * sp - 2) });
    }
  }

  update(dt: number): void {
    this.t += dt;
    for (const b of [...this.bits]) {
      b.v.y -= 6 * dt;
      b.v.multiplyScalar(1 - dt * 0.8);
      b.m.position.addScaledVector(b.v, dt);
      b.m.rotation.x += dt * 6;
      b.m.rotation.y += dt * 4;
      if (b.m.position.y < 0.05) {
        this.scene.remove(b.m);
        b.m.geometry.dispose();
        this.bits.splice(this.bits.indexOf(b), 1);
      }
    }
    if (this.active_) this.barrel.rotation.z = Math.sin(this.t * 2) * 0.1;
  }
}

