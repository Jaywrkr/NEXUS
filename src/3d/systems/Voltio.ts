import * as THREE from 'three';
import { makeNode } from '../objects/skate';
import type { SkateparkInfo } from '../world/Skatepark';

/*
 * Mundo Voltio (Fase 1, PLAN_MAESTRO.md §3). Con la capucha puesta el Nexus entra a los cables de la
 * ciudad: el mismo mapa en negro con líneas de neón (post-proceso en render.ts). Ahí no se conecta:
 * se dibuja con la estela de luz.
 *   - Cerrar un círculo con la estela rompe lo que quede adentro: la jaula de Estática de un Chispi
 *     (se rescata) o una Estática que deambula (se vuelve chispitas).
 *   - Tocar los tres nodos del circuito de la sala del skatepark cierra el circuito y afuera se abre la persiana.
 *   - Si una Estática te toca: "¡bzzzt!" y volvés al mundo normal (sin castigo).
 *   - La barra de voltaje ⚡ baja mientras estás adentro; al vaciarse volvés solo. Afuera se recarga.
 */

export const MAX_VOLT = 30;
const TRAIL_LIFE = 4; // segundos que dura la estela
const TRAIL_STEP = 0.3; // metros entre puntos
const TRAIL_MAX = 140;
const NODE_REACH = 1.3;
const STATIC_REACH = 0.85;
const STATIC_RESPAWN = 25;
const AREA = { minX: 69, maxX: 94, minZ: -12, maxZ: 12 };

export interface VoltioHooks {
  /** Se rescató un Chispi (jaula rota). */
  rescue(id: string, x: number, z: number): void;
  /** Se cerró un circuito (id = el flag que abre algo afuera: 'sala-open', 'cartas-open'). */
  circuit(id: string): void;
  /** Una Estática tocó al Nexus. */
  zap(): void;
  /** Se rompió una Estática encerrándola. */
  staticBroken(x: number, z: number): void;
  /** Se cerró un círculo con la estela (para el sonido). */
  loop(): void;
  /** Se encendió un nodo (n de total). */
  node(n: number, total: number): void;
}

interface Static {
  g: THREE.Group;
  x: number;
  z: number;
  tx: number;
  tz: number;
  dead: number;
  phase: number;
}

/** Un circuito del Mundo Voltio: sus nodos y la puerta del mundo normal que abre. */
export interface Circuit {
  id: string;
  nodes: { x: number; z: number }[];
  door: { x: number; z: number };
}

interface TrailPoint {
  x: number;
  z: number;
  t: number;
}

/** Chispi de ruedas: bolita de luz con cara y dos ruedas (criatura original). */
export function makeChispi(color = '#9be7ff'): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshBasicMaterial({ color }));
  body.position.y = 0.62;
  g.add(body);
  for (const ex of [-0.13, 0.13]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#1d1630' }));
    eye.scale.set(0.8, 1.4, 0.5);
    eye.position.set(ex, 0.7, 0.38);
    g.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 10, Math.PI), new THREE.MeshBasicMaterial({ color: '#1d1630' }));
  smile.rotation.z = Math.PI;
  smile.position.set(0, 0.55, 0.4);
  g.add(smile);
  for (const wx of [-0.28, 0.28]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 6, 14), new THREE.MeshBasicMaterial({ color: '#ff9f43' }));
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(wx, 0.18, 0);
    g.add(wheel);
  }
  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
  spark.position.set(0, 1.12, 0);
  g.add(spark);
  return g;
}

function makeStatic(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshBasicMaterial({ color: '#2a0a2a' }));
  core.position.y = 0.8;
  g.add(core);
  const spikes = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshBasicMaterial({ color: '#ff4fd8', wireframe: true }));
  spikes.position.y = 0.8;
  g.add(spikes);
  for (const ex of [-0.14, 0.14]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
    eye.position.set(ex, 0.88, 0.4);
    g.add(eye);
  }
  return g;
}

/** ¿El punto está dentro del polígono? (ray casting) */
function inside(x: number, z: number, poly: { x: number; z: number }[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) c = !c;
  }
  return c;
}

function segmentHit(
  p1: { x: number; z: number },
  p2: { x: number; z: number },
  p3: { x: number; z: number },
  p4: { x: number; z: number },
): { x: number; z: number } | null {
  const d = (p2.x - p1.x) * (p4.z - p3.z) - (p2.z - p1.z) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p3.x - p1.x) * (p4.z - p3.z) - (p3.z - p1.z) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.z - p1.z) - (p3.z - p1.z) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + (p2.x - p1.x) * t, z: p1.z + (p2.z - p1.z) * t };
}

export class Voltio {
  active = false;
  voltage = MAX_VOLT;
  /** 0..1 para el fundido del post-proceso. */
  amount = 0;
  readonly group = new THREE.Group();
  private readonly trail: TrailPoint[] = [];
  private readonly trailGeo = new THREE.BufferGeometry();
  private readonly trailPos = new Float32Array(TRAIL_MAX * 2 * 3);
  private readonly trailCol = new Float32Array(TRAIL_MAX * 2 * 3);
  private readonly statics: Static[] = [];
  private readonly nodes: { x: number; z: number; lit: boolean; ring: THREE.Mesh; core: THREE.Mesh; circuit: string }[] = [];
  private readonly circuits: Circuit[];
  private readonly done = new Set<string>();
  private cage: { g: THREE.Group; chispi: THREE.Group; x: number; z: number } | null = null;
  private loops: { mesh: THREE.Mesh; t: number }[] = [];
  private time = 0;
  /** Para las pruebas: cuántos círculos se cerraron. */
  loopsClosed = 0;

  private readonly hooks: VoltioHooks;

  constructor(scene: THREE.Scene, skate: SkateparkInfo, circuits: Circuit[], hooks: VoltioHooks, state: { rescued: boolean; circuits: string[] }) {
    this.hooks = hooks;
    this.circuits = circuits;
    this.group.visible = false;
    scene.add(this.group);

    // Piso de grilla del mundo de los cables
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 160),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: `varying vec3 wp; void main(){ wp = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
        fragmentShader: `varying vec3 wp; uniform float time;
          void main(){
            vec2 g = abs(fract(wp.xz / 2.0 - 0.5) - 0.5) / fwidth(wp.xz / 2.0);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            float pulse = 0.5 + 0.5 * sin(wp.x * 0.15 + wp.z * 0.1 - time * 2.0);
            vec3 c = mix(vec3(0.1, 0.75, 1.0), vec3(0.9, 0.2, 0.8), pulse) * line * 0.7;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.set(25, 0.14, 5);
    grid.renderOrder = 1;
    this.group.add(grid);

    // Estela: una cinta vertical de luz que se apaga con el tiempo
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailCol, 3));
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_MAX - 1; i += 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.trailGeo.setIndex(idx);
    const trailMesh = new THREE.Mesh(
      this.trailGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    trailMesh.frustumCulled = false;
    this.group.add(trailMesh);

    // Estáticas que deambulan por el skatepark
    for (let i = 0; i < 2; i += 1) {
      const g = makeStatic();
      const s: Static = { g, x: 0, z: 0, tx: 0, tz: 0, dead: 0, phase: i * 2 };
      this.placeStatic(s, i === 0 ? 86 : 78, i === 0 ? -6 : 6);
      this.group.add(g);
      this.statics.push(s);
    }

    // Circuitos: tres nodos cada uno (la sala del skatepark, la tienda de cartas...)
    for (const c of circuits) {
      for (const n of c.nodes) {
        const node = makeNode();
        node.g.position.set(n.x, 0.1, n.z);
        this.group.add(node.g);
        this.nodes.push({ x: n.x, z: n.z, lit: false, ring: node.ring, core: node.core, circuit: c.id });
      }
      if (state.circuits.includes(c.id)) {
        this.done.add(c.id);
        for (const n of this.nodes) if (n.circuit === c.id) this.lightNode(n);
        this.drawBeams(c);
      }
    }

    // Rueditas, atrapado en una jaula de Estática
    if (!state.rescued) {
      const g = new THREE.Group();
      const chispi = makeChispi();
      g.add(chispi);
      const bars = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), new THREE.MeshBasicMaterial({ color: '#ff4fd8', wireframe: true }));
      bars.position.y = 0.7;
      g.add(bars);
      g.position.set(skate.chispi.x, 0.1, skate.chispi.z);
      this.group.add(g);
      this.cage = { g, chispi, x: skate.chispi.x, z: skate.chispi.z };
    }
  }

  private placeStatic(s: Static, x?: number, z?: number): void {
    s.x = x ?? AREA.minX + Math.random() * (AREA.maxX - AREA.minX);
    s.z = z ?? AREA.minZ + Math.random() * (AREA.maxZ - AREA.minZ);
    s.tx = s.x;
    s.tz = s.z;
    s.g.position.set(s.x, 0.1, s.z);
    s.g.visible = true;
  }

  /** Posiciones de las Estáticas vivas (para las pruebas). */
  get staticSpots(): { x: number; z: number }[] {
    return this.statics.filter((s) => s.dead <= 0).map((s) => ({ x: s.x, z: s.z }));
  }

  get chispiCaged(): boolean {
    return this.cage !== null;
  }

  /** Nodos prendidos de un circuito (por defecto, el de la sala del skatepark). */
  litNodes(id = 'sala-open'): number {
    return this.nodes.filter((n) => n.lit && n.circuit === id).length;
  }

  enter(): void {
    this.active = true;
    this.group.visible = true;
    this.trail.length = 0;
    // Los nodos se apagan al salir si su circuito no se cerró
    for (const n of this.nodes) if (!this.done.has(n.circuit)) this.unlightNode(n);
  }

  exit(): void {
    this.active = false;
    this.trail.length = 0;
    this.updateTrailMesh();
  }

  update(dt: number, time: number, p: THREE.Vector3): void {
    this.time = time;
    const target = this.active ? 1 : 0;
    this.amount += (target - this.amount) * Math.min(1, dt * 6);
    if (Math.abs(this.amount - target) < 0.01) this.amount = target;
    this.group.visible = this.amount > 0.02;
    if (!this.active) {
      this.voltage = Math.min(MAX_VOLT, this.voltage + dt * 2);
      for (const l of this.loops) l.mesh.visible = false;
      return;
    }
    ((this.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.time.value = time;
    this.voltage = Math.max(0, this.voltage - dt);

    // Estela
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) >= TRAIL_STEP) {
      this.trail.push({ x: p.x, z: p.z, t: time });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
      this.checkLoop();
    }
    while (this.trail.length && time - this.trail[0].t > TRAIL_LIFE) this.trail.shift();
    this.updateTrailMesh();

    // Círculos cerrados que se apagan
    for (const l of this.loops) {
      l.t += dt;
      (l.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - l.t / 0.7));
      l.mesh.visible = l.t < 0.7;
    }
    this.loops = this.loops.filter((l) => {
      if (l.t < 0.7) return true;
      this.group.remove(l.mesh);
      l.mesh.geometry.dispose();
      return false;
    });

    // Estáticas: flotan hacia un punto al azar; si tocan al Nexus, bzzzt
    for (const s of this.statics) {
      if (s.dead > 0) {
        s.dead -= dt;
        if (s.dead <= 0) this.placeStatic(s);
        continue;
      }
      if (Math.hypot(s.tx - s.x, s.tz - s.z) < 0.3) {
        s.tx = AREA.minX + Math.random() * (AREA.maxX - AREA.minX);
        s.tz = AREA.minZ + Math.random() * (AREA.maxZ - AREA.minZ);
      }
      const d = Math.hypot(s.tx - s.x, s.tz - s.z) || 1;
      s.x += ((s.tx - s.x) / d) * 1.4 * dt;
      s.z += ((s.tz - s.z) / d) * 1.4 * dt;
      s.phase += dt;
      s.g.position.set(s.x + Math.sin(s.phase * 13) * 0.04, 0.1 + Math.sin(s.phase * 3) * 0.15, s.z);
      s.g.rotation.y += dt * 2;
      s.g.children[1].rotation.x += dt * 3;
      if (Math.hypot(s.x - p.x, s.z - p.z) < STATIC_REACH && p.y < 1.6) {
        this.hooks.zap();
        return;
      }
    }

    // Nodos del circuito
    for (const n of this.nodes) {
      n.core.rotation.y += dt * 2;
      n.core.position.y = 1.1 + Math.sin(time * 3 + n.x) * 0.1;
      if (!n.lit && Math.hypot(n.x - p.x, n.z - p.z) < NODE_REACH) {
        this.lightNode(n);
        const c = this.circuits.find((k) => k.id === n.circuit)!;
        const lit = this.litNodes(c.id);
        this.hooks.node(lit, c.nodes.length);
        if (lit === c.nodes.length && !this.done.has(c.id)) {
          this.done.add(c.id);
          this.drawBeams(c);
          this.hooks.circuit(c.id);
        }
      }
    }

    // La jaula vibra; el Chispi mira al Nexus
    if (this.cage) {
      const c = this.cage;
      c.g.children[1].rotation.y += dt * 1.5;
      c.g.children[1].rotation.x = Math.sin(time * 2) * 0.2;
      c.chispi.rotation.y = Math.atan2(p.x - c.x, p.z - c.z);
      c.chispi.position.y = Math.sin(time * 4) * 0.06;
    }
  }

  private lightNode(n: { lit: boolean; ring: THREE.Mesh; core: THREE.Mesh }): void {
    n.lit = true;
    (n.ring.material as THREE.MeshBasicMaterial).color.set('#7dffef');
    (n.core.material as THREE.MeshBasicMaterial).color.set('#ffe066');
  }

  private unlightNode(n: { lit: boolean; ring: THREE.Mesh; core: THREE.Mesh }): void {
    n.lit = false;
    (n.ring.material as THREE.MeshBasicMaterial).color.set('#ff4fd8');
    (n.core.material as THREE.MeshBasicMaterial).color.set('#ff4fd8');
  }

  /** Rayos de luz que unen los nodos y llegan a la puerta que abren. */
  private drawBeams(c: Circuit): void {
    const pts = [...c.nodes.map((n) => new THREE.Vector3(n.x, 1.1, n.z)), new THREE.Vector3(c.door.x, 1.4, c.door.z + 0.3)];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = a.distanceTo(b);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 6), new THREE.MeshBasicMaterial({ color: '#7dffef' }));
      beam.position.copy(a).lerp(b, 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.group.add(beam);
    }
  }

  /** ¿El último tramo de la estela cruzó uno anterior? Entonces se cerró un círculo. */
  private checkLoop(): void {
    const n = this.trail.length - 1;
    if (n < 4) return;
    const a = this.trail[n - 1];
    const b = this.trail[n];
    for (let i = 0; i < n - 3; i += 1) {
      const hit = segmentHit(a, b, this.trail[i], this.trail[i + 1]);
      if (!hit) continue;
      const poly = [hit, ...this.trail.slice(i + 1, n)];
      let area = 0;
      for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) area += (poly[j].x + poly[k].x) * (poly[j].z - poly[k].z);
      if (Math.abs(area / 2) < 1.2) return;
      this.closeLoop(poly);
      this.trail.splice(0, this.trail.length - 1);
      return;
    }
  }

  private closeLoop(poly: { x: number; z: number }[]): void {
    this.loopsClosed += 1;
    this.hooks.loop();
    // Destello del área encerrada
    const shape = new THREE.Shape(poly.map((q) => new THREE.Vector2(q.x, -q.z)));
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color: '#ff9cf0', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.2;
    this.group.add(mesh);
    this.loops.push({ mesh, t: 0 });

    for (const s of this.statics) {
      if (s.dead > 0 || !inside(s.x, s.z, poly)) continue;
      s.dead = STATIC_RESPAWN;
      s.g.visible = false;
      this.hooks.staticBroken(s.x, s.z);
    }
    if (this.cage && inside(this.cage.x, this.cage.z, poly)) {
      const c = this.cage;
      this.cage = null;
      this.group.remove(c.g);
      this.hooks.rescue('rueditas', c.x, c.z);
    }
  }

  private updateTrailMesh(): void {
    const n = this.trail.length;
    const now = this.time;
    const cyan = [0.25, 1.0, 1.0];
    for (let i = 0; i < n; i += 1) {
      const q = this.trail[i];
      const k = Math.max(0, 1 - (now - q.t) / TRAIL_LIFE);
      const o = i * 6;
      this.trailPos.set([q.x, 0.15, q.z, q.x, 0.75, q.z], o);
      const c = [cyan[0] * k, cyan[1] * k, cyan[2] * k];
      this.trailCol.set([...c, c[0] * 0.3, c[1] * 0.3, c[2] * 0.6], o);
    }
    this.trailGeo.setDrawRange(0, Math.max(0, (n - 1) * 6));
    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.color.needsUpdate = true;
  }
}
