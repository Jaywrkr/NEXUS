import * as THREE from 'three';
import { box, glow, gradientMap, outline, outlineScaled, rounded, toon, toonUnique } from '../core/render';
import { ease, tween } from '../core/tween';
import { Connectable } from './Connectable';

/** Estrella extruida (fragmentos, núcleo de las fuentes). */
export function starGeometry(points: number, inner: number, outer: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: depth * 0.4, bevelSegments: 1 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Fragmento con volumen: dos estrellas cruzadas, para que no se vea "de canto" al girar.
 * El secreto es dorado para distinguirlo en el museo.
 */
export function crystalStar(color: string): THREE.Group {
  const g = new THREE.Group();
  const geo = starGeometry(5, 0.17, 0.38, 0.12);
  const rim = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide });
  for (const ry of [0, Math.PI / 2]) {
    const m = new THREE.Mesh(geo, toon(color));
    m.rotation.y = ry;
    m.castShadow = true;
    outlineScaled(m, 1.12, 1.12, 1.4);
    (m.children[0] as THREE.Mesh).material = rim;
    g.add(m);
  }
  return g;
}

/* ---------- Fuente de energía ---------- */

export type EnergySourceVariant = 'active' | 'dim';

/**
 * Pedestal con un núcleo-estrella dorado que gira y un halo que late.
 * Variante 'dim' = señuelo (Decisión 018): gris, quieta, sin halo; parece una fuente más pero ninguna regla la usa.
 */
export class EnergySource extends Connectable {
  private readonly core: THREE.Mesh;
  private readonly halo: THREE.Mesh | null = null;
  private readonly variant: EnergySourceVariant;

  constructor(id: string, x: number, z: number, variant: EnergySourceVariant = 'active') {
    super(id, 'source', x, z);
    this.variant = variant;
    this.collideRadius = 0.5;

    const base = rounded(new THREE.CylinderGeometry(0.32, 0.42, 0.55, 12), toon('#555b6e', 2), 0.02);
    base.position.y = 0.275;
    this.group.add(base);
    const cap = rounded(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12), toon('#3a3d48'), 0.015);
    cap.position.y = 0.58;
    this.group.add(cap);

    const dim = variant === 'dim';
    this.core = rounded(starGeometry(6, 0.16, 0.32, 0.08), toon(dim ? '#9aa0ad' : '#ffd93d'), 0.015);
    this.core.position.y = 1.0;
    this.group.add(this.core);

    if (!dim) {
      this.halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0.25, depthWrite: false, fog: false }),
      );
      this.halo.position.y = 1.0;
      this.group.add(this.halo);
    }

    this.plugAnchor.position.set(0, 1.0, 0);
  }

  activate(): void {
    this.active_ = true;
  }

  update(_dt: number, time: number): void {
    if (this.variant === 'dim') return;
    this.core.rotation.y = time * 1.05;
    this.core.position.y = 1.0 + Math.sin(time * 2) * 0.05;
    if (this.halo) {
      const k = (Math.sin(time * 3.5) + 1) / 2;
      this.halo.scale.setScalar(0.9 + k * 0.2);
      (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + k * 0.25;
    }
  }
}

/* ---------- Farola ---------- */

/** Farola de la plaza. Es destino de la fuente y, ya encendida, origen hacia la puerta. */
export class StreetLamp extends Connectable {
  private readonly bulb: THREE.Mesh;
  private readonly light: THREE.PointLight;
  private readonly pool: THREE.Mesh;

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.35;

    const base = rounded(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 10), toon('#3a3d48'), 0.015);
    base.position.y = 0.15;
    this.group.add(base);
    const pole = rounded(new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8), toon('#3a3d48'), 0.015);
    pole.position.y = 1.6;
    this.group.add(pole);
    const arm = box(0.09, 0.09, 0.7, '#3a3d48', { outline: 0.015 });
    arm.position.set(0, 3.15, 0.3);
    this.group.add(arm);
    const head = rounded(new THREE.ConeGeometry(0.32, 0.3, 10, 1, true), toon('#2c3040'), 0.015);
    head.position.set(0, 3.05, 0.62);
    this.group.add(head);

    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toonUnique('#5a5f6b'));
    this.bulb.position.set(0, 2.92, 0.62);
    this.group.add(this.bulb);

    this.light = new THREE.PointLight('#ffd27a', 0, 9, 1.6);
    this.light.position.set(0, 2.7, 0.62);
    this.group.add(this.light);

    this.pool = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 24),
      new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0, depthWrite: false }),
    );
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.set(0, 0.03, 0.62);
    this.group.add(this.pool);

    this.plugAnchor.position.set(0, 1.3, 0);
  }

  canInitiate(): boolean {
    return this.active_;
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.bulb.material = glow('#ffe066');
    tween(0.5, (k) => {
      this.light.intensity = k * 9;
      (this.pool.material as THREE.MeshBasicMaterial).opacity = k * 0.35;
    });
  }

  restore(): void {
    this.active_ = true;
    this.bulb.material = glow('#ffe066');
    this.light.intensity = 9;
    (this.pool.material as THREE.MeshBasicMaterial).opacity = 0.35;
  }
}

/* ---------- Puerta ---------- */

/** Puerta en la fachada de la casa apagada. Al conectarse se abre y deja ver la luz de adentro. */
export class Door extends Connectable {
  private readonly hinge = new THREE.Group();
  private readonly inside: THREE.Mesh;

  constructor(id: string, x: number, z: number, rotY = 0) {
    super(id, 'target', x, z, rotY);
    this.collideRadius = 0;

    this.inside = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ color: '#2a2d36' }));
    this.inside.position.set(0, 1.0, 0.0);
    this.group.add(this.inside);

    const frame = box(1.35, 2.3, 0.12, '#f4efe6', { outline: 0.03 });
    frame.position.set(0, 1.12, -0.03);
    this.group.add(frame);
    this.inside.position.z = 0.035;

    this.hinge.position.set(-0.52, 0, 0.07);
    const slab = box(1.04, 2.04, 0.1, '#7a4a2e', { outline: 0.03, brush: 1 });
    slab.position.set(0.52, 1.02, 0);
    this.hinge.add(slab);
    const knob = rounded(new THREE.SphereGeometry(0.05, 8, 6), toon('#f2c14e'), 0.01);
    knob.position.set(0.9, 1.0, 0.07);
    this.hinge.add(knob);
    for (const y of [0.55, 1.45]) {
      const panel = box(0.7, 0.6, 0.02, '#6a3e26', { outline: false });
      panel.position.set(0.52, y, 0.06);
      this.hinge.add(panel);
    }
    this.group.add(this.hinge);

    const step = box(1.8, 0.2, 0.9, '#b8573a', { outline: 0.03 });
    step.position.set(0, 0.1, 0.5);
    this.group.add(step);

    this.plugAnchor.position.set(0.4, 1.1, 0.2);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.inside.material = glow('#ffd77a');
    tween(0.6, (k) => (this.hinge.rotation.y = -k * 1.9), { easing: ease.outBack });
  }

  restore(): void {
    this.active_ = true;
    this.inside.material = glow('#ffd77a');
    this.hinge.rotation.y = -1.9;
  }
}

/* ---------- Fuente de agua ---------- */

/** Pila de piedra seca; al conectarse sube el agua y sale un chorro con gotas. */
export class Fountain extends Connectable {
  private readonly water: THREE.Mesh;
  private readonly jet: THREE.Group;
  private readonly drops: THREE.Mesh[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 2.5;

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.65, 28, 1, true), toon('#cfc2ad', 2));
    ring.position.y = 0.32;
    ring.castShadow = ring.receiveShadow = true;
    outline(ring, 0.03);
    this.group.add(ring);
    const rim = rounded(new THREE.TorusGeometry(2.42, 0.13, 8, 32), toon('#e6dbc6', 2), 0.02);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.65;
    this.group.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.35, 28), toon('#6b6a72', 2));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.08;
    floor.receiveShadow = true;
    this.group.add(floor);

    const column = rounded(new THREE.CylinderGeometry(0.28, 0.4, 1.3, 12), toon('#e6dbc6', 2), 0.02);
    column.position.y = 0.65;
    this.group.add(column);
    const bowl = rounded(new THREE.CylinderGeometry(0.85, 0.35, 0.3, 16), toon('#e6dbc6', 2), 0.02);
    bowl.position.y = 1.4;
    this.group.add(bowl);

    this.water = new THREE.Mesh(
      new THREE.CircleGeometry(2.33, 28),
      new THREE.MeshToonMaterial({ color: '#4fa8e0', gradientMap, transparent: true, opacity: 0.9 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0.09;
    this.water.visible = false;
    this.group.add(this.water);

    this.jet = new THREE.Group();
    this.jet.position.y = 1.5;
    const jetMat = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.85 });
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1.4, 10), jetMat);
    stream.position.y = 0.7;
    this.jet.add(stream);
    for (let i = 0; i < 14; i += 1) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), jetMat);
      d.userData.angle = (i / 14) * Math.PI * 2;
      d.userData.offset = i / 14;
      this.drops.push(d);
      this.jet.add(d);
    }
    this.jet.scale.setScalar(0.001);
    this.jet.visible = false;
    this.group.add(this.jet);

    this.plugAnchor.position.set(0, 0.7, 2.45);
  }

  /** Orienta el punto de enchufe hacia la fuente de energía. */
  facePlug(towardX: number, towardZ: number): void {
    const a = Math.atan2(towardX - this.x, towardZ - this.z);
    this.plugAnchor.position.set(Math.sin(a) * 2.45, 0.7, Math.cos(a) * 2.45);
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.water.visible = true;
    this.jet.visible = true;
    tween(0.8, (k) => {
      this.water.position.y = 0.09 + k * 0.45;
      this.jet.scale.setScalar(Math.max(k, 0.001));
    });
  }

  restore(): void {
    this.active_ = true;
    this.water.visible = true;
    this.water.position.y = 0.54;
    this.jet.visible = true;
    this.jet.scale.setScalar(1);
  }

  update(_dt: number, time: number): void {
    if (!this.active_) return;
    for (const d of this.drops) {
      const t = (time * 0.9 + d.userData.offset) % 1;
      const a = d.userData.angle as number;
      const r = t * 1.6;
      d.position.set(Math.cos(a) * r, 1.4 + t * 1.2 - t * t * 3.1, Math.sin(a) * r);
    }
  }
}

/* ---------- Antena ---------- */

const REQUIRED_BEACON_CONNECTIONS = 2;

/** Torre de antena con plato. Necesita dos conexiones distintas para transmitir. */
export class Beacon extends Connectable {
  private connections = 0;
  private readonly dish: THREE.Mesh;
  private readonly indicators: THREE.Mesh[] = [];
  private readonly waves: THREE.Mesh[] = [];

  constructor(id: string, x: number, z: number) {
    super(id, 'target', x, z);
    this.collideRadius = 1.0;

    const legMat = toon('#5a5f6b');
    for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
      const leg = box(0.12, 4.4, 0.12, '#5a5f6b', { mat: legMat, outline: 0.015 });
      leg.position.set(lx * 0.6, 2.2, lz * 0.6);
      leg.rotation.z = -lx * 0.12;
      leg.rotation.x = lz * 0.12;
      this.group.add(leg);
    }
    for (const y of [1.2, 2.4, 3.5]) {
      const w = 1.25 - y * 0.18;
      const ring = box(w, 0.08, w, '#5a5f6b', { mat: legMat, outline: 0.012 });
      ring.position.y = y;
      this.group.add(ring);
    }

    const panel = box(0.9, 0.7, 0.14, '#3a3d48', { outline: 0.02 });
    panel.position.set(0, 0.8, 0.62);
    this.group.add(panel);
    for (const ix of [-0.2, 0.2]) {
      const ind = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toonUnique('#2a2d36'));
      ind.position.set(ix, 0.85, 0.71);
      this.group.add(ind);
      this.indicators.push(ind);
    }

    this.dish = rounded(new THREE.SphereGeometry(0.9, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), toonUnique('#8b8f9a', 2), 0.02);
    this.dish.material = toonUnique('#8b8f9a', 2);
    (this.dish.material as THREE.Material).side = THREE.DoubleSide;
    this.dish.position.set(0, 4.55, 0.1);
    this.dish.rotation.x = Math.PI / 2 + 0.5;
    this.group.add(this.dish);
    const tip = rounded(new THREE.SphereGeometry(0.1, 8, 6), toon('#3a3d48'), 0.01);
    tip.position.set(0, 4.6, 0.6);
    this.group.add(tip);

    for (let i = 0; i < 3; i += 1) {
      const w = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.04, 6, 24),
        new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0, depthWrite: false, fog: false }),
      );
      w.position.set(0, 5.0, 0.2);
      w.rotation.x = Math.PI / 2;
      this.waves.push(w);
      this.group.add(w);
    }

    this.plugAnchor.position.set(0, 0.8, 0.75);
  }

  get isFullyActive(): boolean {
    return this.connections >= REQUIRED_BEACON_CONNECTIONS;
  }

  get connectionCount(): number {
    return this.connections;
  }

  activate(): void {
    if (this.isFullyActive) return;
    const ind = this.indicators[this.connections];
    ind.material = glow('#7cf07a');
    tween(0.3, (k) => ind.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.6));
    this.connections += 1;
    if (this.connections === 1) {
      (this.dish.material as THREE.MeshToonMaterial).color.set('#f4b631');
      return;
    }
    this.active_ = true;
    (this.dish.material as THREE.MeshToonMaterial).color.set('#5ee7ff');
  }

  restore(): void {
    this.connections = REQUIRED_BEACON_CONNECTIONS;
    this.active_ = true;
    this.indicators.forEach((i) => (i.material = glow('#7cf07a')));
    (this.dish.material as THREE.MeshToonMaterial).color.set('#5ee7ff');
  }

  update(_dt: number, time: number): void {
    if (!this.active_) return;
    this.dish.rotation.z = Math.sin(time * 0.8) * 0.25;
    this.waves.forEach((w, i) => {
      const t = (time * 0.6 + i / 3) % 1;
      w.position.y = 5.0 + t * 2.2;
      w.scale.setScalar(0.6 + t * 2.4);
      (w.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8;
    });
  }
}

/* ---------- Puente ---------- */

/** Palanca en la cabecera del puente: al conectarse, el tablero de madera se despliega sobre el canal. */
export class BridgeLever extends Connectable {
  readonly deck = new THREE.Group();
  private readonly lever = new THREE.Group();
  private readonly lamp: THREE.Mesh;
  private readonly planks: THREE.Mesh[] = [];

  /** deckFromZ/deckToZ: dónde empieza y termina el tablero (en el eje Z del mundo), centrado en deckX. */
  constructor(id: string, x: number, z: number, deckX: number, deckFromZ: number, deckToZ: number) {
    super(id, 'target', x, z);
    this.collideRadius = 0.45;

    const post = box(0.6, 1.0, 0.5, '#5a5f6b', { outline: 0.02 });
    post.position.y = 0.5;
    this.group.add(post);
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toonUnique('#c8452f'));
    this.lamp.position.set(0, 1.08, 0.12);
    this.group.add(this.lamp);
    this.lever.position.set(0, 1.0, -0.05);
    const stick = box(0.07, 0.6, 0.07, '#cfd3da', { outline: 0.012 });
    stick.position.y = 0.3;
    this.lever.add(stick);
    const knob = rounded(new THREE.SphereGeometry(0.09, 10, 8), toon('#e0563f'), 0.012);
    knob.position.y = 0.62;
    this.lever.add(knob);
    this.lever.rotation.x = 0.6;
    this.group.add(this.lever);
    this.plugAnchor.position.set(0, 0.7, 0.3);

    // Tablero: tablones que aparecen uno tras otro
    const len = deckToZ - deckFromZ;
    const n = Math.round(len / 0.55);
    this.deck.position.set(deckX, 0, deckFromZ);
    for (let i = 0; i < n; i += 1) {
      const plank = box(3.0, 0.16, 0.5, i % 2 ? '#a97a52' : '#9b6c45', { outline: 0.02, brush: 1 });
      plank.position.set(0, -0.08, (i + 0.5) * (len / n));
      plank.scale.setScalar(0.001);
      plank.visible = false;
      this.deck.add(plank);
      this.planks.push(plank);
    }
    for (const sx of [-1.55, 1.55]) {
      const rail = box(0.1, 0.1, len, '#7a5a42', { outline: 0.015 });
      rail.position.set(sx, 0.75, len / 2);
      rail.visible = false;
      rail.userData.rail = true;
      this.deck.add(rail);
      for (let p = 0; p <= 4; p += 1) {
        const post2 = box(0.1, 0.8, 0.1, '#7a5a42', { outline: 0.012 });
        post2.position.set(sx, 0.35, (p / 4) * len);
        post2.visible = false;
        post2.userData.rail = true;
        this.deck.add(post2);
      }
    }
  }

  activate(): void {
    if (this.active_) return;
    this.active_ = true;
    this.lamp.material = glow('#7cf07a');
    tween(0.4, (k) => (this.lever.rotation.x = 0.6 - k * 1.2), { easing: ease.outBack });
    this.planks.forEach((p, i) => {
      tween(
        0.25,
        (k) => {
          p.visible = true;
          p.scale.setScalar(Math.max(k, 0.001));
        },
        { delay: 0.2 + i * 0.05, easing: ease.outBack },
      );
    });
    tween(0.01, () => this.deck.children.forEach((c) => c.userData.rail && (c.visible = true)), { delay: 0.2 + this.planks.length * 0.05 });
  }

  restore(): void {
    this.active_ = true;
    this.lamp.material = glow('#7cf07a');
    this.lever.rotation.x = -0.6;
    this.deck.children.forEach((c) => {
      c.visible = true;
      c.scale.setScalar(1);
    });
  }
}

/* ---------- Fragmento ---------- */

/** Coleccionable (estrella rosada que gira y flota). Empieza oculto; se recoge por cercanía. */
export class Fragment {
  readonly id: string;
  readonly group = new THREE.Group();
  private readonly shard: THREE.Group;
  private readonly halo: THREE.Mesh;
  private revealed = false;
  private collected = false;
  private readonly baseY: number;

  constructor(id: string, x: number, y: number, z: number) {
    this.id = id;
    this.baseY = y;
    this.group.position.set(x, y, z);
    this.shard = crystalStar(id === 'secret-fragment' ? '#ffd84a' : '#ff9ff3');
    this.group.add(this.shard);
    this.halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ff9ff3', transparent: true, opacity: 0.25, depthWrite: false, fog: false }),
    );
    this.group.add(this.halo);
    this.group.visible = false;
    this.group.scale.setScalar(0.001);
  }

  get isRevealed(): boolean {
    return this.revealed;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  reveal(animate = true): void {
    if (this.revealed) return;
    this.revealed = true;
    this.group.visible = true;
    if (!animate) {
      this.group.scale.setScalar(1);
      return;
    }
    tween(0.4, (k) => this.group.scale.setScalar(Math.max(k, 0.001)), { easing: ease.outBack });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    tween(0.3, (k) => this.group.scale.setScalar(Math.max(1 - k, 0.001)), { done: () => (this.group.visible = false) });
  }

  update(time: number): void {
    if (!this.revealed || this.collected) return;
    this.shard.rotation.y = time * 1.6;
    this.group.position.y = this.baseY + Math.sin(time * 2.2) * 0.15;
    const k = (Math.sin(time * 4) + 1) / 2;
    this.halo.scale.setScalar(0.9 + k * 0.25);
    (this.halo.material as THREE.MeshBasicMaterial).opacity = 0.15 + k * 0.25;
  }
}
