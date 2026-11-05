import * as THREE from 'three';
import { batchStatic } from '../core/batch';
import { FOG_COLOR, FOG_FAR, FOG_NEAR, LIFE, box, flat, gradientMap, makeSky, outline, outlineScaled, rounded, sharedOutline, toon, toonUnique, withLife } from '../core/render';
import { clamp, pick, rnd } from '../core/util';
import { buildMigaHouse, type InteriorInfo } from './MigaHouse';
import { SKATE_REGION, buildSkatepark, type SkateparkInfo } from './Skatepark';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Altura de la parte de arriba si se puede saltar encima (banco, auto...). Sin h = pared. */
  h?: number;
}

export interface Circle {
  x: number;
  z: number;
  r: number;
  h?: number;
}

/** Cuánto cuelgan los cables entre postes (también lo usa la tirolesa). */
export const ZIP_SAG = 0.8;

/** Margen para considerar que los pies están arriba de una plataforma. */
const ON_TOP = 0.05;

/* Medidas del barrio (metros). +X = este, +Z = sur. La cámara isométrica mira desde +X+Z hacia el noroeste,
   así que las fachadas importantes miran a +Z o +X. */
export const BOUNDS = 45;
/** El barrio crece hacia el sur (distrito del jardín, al otro lado del canal). */
export const BOUNDS_MAX_Z = 63;
/**
 * Por dónde se puede caminar afuera: el Centro, la calle del este y el Skatepark (Fase 1).
 * Fuera de estas zonas el resolve empuja al Nexus al punto más cercano de alguna.
 */
const REGIONS: Rect[] = [
  { minX: -BOUNDS, maxX: BOUNDS, minZ: -BOUNDS, maxZ: BOUNDS_MAX_Z },
  { minX: BOUNDS - 1, maxX: SKATE_REGION.minX + 1, minZ: -(4 + 2.4 - 0.3), maxZ: 4 + 2.4 - 0.3 },
  SKATE_REGION,
];
/** Jardín municipal (zona 5): borde de cercos, entradas al norte y al este. */
export const GARDEN = { minX: -26, maxX: 4, minZ: 47, maxZ: 61.5 };
const ROAD = 4; // media calzada
const WALK = 2.4; // ancho de vereda
export const CANAL_MIN_Z = 30;
export const CANAL_MAX_Z = 36;
export const BRIDGE_X = 18;
const BRIDGE_HALF = 1.6;

const WALLS = ['#f3e3c3', '#f1d3a1', '#ecc79b', '#f6ead2', '#e8d0b5', '#f2cfa6', '#e9dcc0'];
const ROOFS = ['#c4643e', '#b85a36', '#d0784a', '#a9512f'];
const TRIMS = ['#6f8f4e', '#3f6f7a', '#7a4a2e', '#f4efe6', '#8c3b3b'];
const CARS = ['#4e9aa6', '#e8dcc0', '#8c3b3b', '#9cc0e0', '#d9a441', '#5f7f5a'];

/** Zonas reservadas para los puzzles: la decoración aleatoria no se pone encima. */
const RESERVED: Rect[] = [
  { minX: -28, maxX: -8, minZ: -42, maxZ: -8 }, // plaza + casa apagada + fragmento secreto
  { minX: -30, maxX: -10, minZ: 6, maxZ: 26 }, // fuente de agua
  { minX: 10, maxX: 33, minZ: -28, maxZ: -8 }, // antena
  { minX: 6, maxX: 24, minZ: 18, maxZ: 44 }, // puente
  { minX: -28, maxX: 6, minZ: 45.5, maxZ: 64 }, // jardín municipal
];

/** Lo que cambia de color cuando se resuelve la plaza (el mundo empieza "apagado"). */
export interface PlazaRefs {
  ground: THREE.MeshToonMaterial;
  houseWall: THREE.MeshToonMaterial;
  houseRoof: THREE.MeshToonMaterial;
  window: THREE.Mesh;
  treeCrowns: THREE.Mesh[];
}

/**
 * El barrio: cielo, luz, calles, casas de estuco con teja, palmeras, postes con cables,
 * autos, el canal que divide el sur, y la escenografía "apagada" de la plaza.
 */
export class World {
  readonly scene = new THREE.Scene();
  readonly rects: Rect[] = [];
  /** Interiores que se pueden visitar (por ahora, la casa de Miga). */
  readonly interior: InteriorInfo;
  /** Todas las habitaciones visitables (casa de Miga, sala del skatepark...). */
  readonly rooms: InteriorInfo[] = [];
  /** Skatepark: rampitas, barandas, sala, nodos del circuito... */
  readonly skate: SkateparkInfo;
  readonly circles: Circle[] = [];
  readonly sun: THREE.DirectionalLight;
  readonly sky: THREE.Mesh;
  private readonly hemi: THREE.HemisphereLight;
  /** Ánimo del barrio (0 = triste y gris, 1 = todo restaurado): cielo, niebla y luz. Lo fija WorldMode. */
  mood = 0;
  private moodShown = 0;
  private static readonly FOG_ALIVE = new THREE.Color('#9fbbe6');
  private static readonly FOG_GLOOM = new THREE.Color('#a9adb4');
  private static readonly BG_ALIVE = new THREE.Color('#2a4fb0');
  private static readonly BG_GLOOM = new THREE.Color('#5d636e');
  readonly bridgeGap: Rect = { minX: BRIDGE_X - BRIDGE_HALF, maxX: BRIDGE_X + BRIDGE_HALF, minZ: CANAL_MIN_Z - 0.6, maxZ: CANAL_MAX_Z + 0.6 };
  plaza!: PlazaRefs;
  private readonly clouds: THREE.Group[] = [];
  private readonly butterflies: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; cx: number; cz: number; r: number; s: number; p: number }[] = [];
  private readonly swaying: { g: THREE.Object3D; p: number }[] = [];
  /** Cosas que flotan en el canal y se mueven con la corriente (vetas de luz, hojas) y el bote. */
  private readonly drifting: { o: THREE.Object3D; speed: number; p: number }[] = [];
  private boat: THREE.Group | null = null;
  /** Autos estacionados (para ubicar sus luces como cosas para despertar). */
  readonly carSpots: { x: number; z: number; rot: number; roofX: number; roofZ: number }[] = [];
  /** Caños de desagüe del canal (x sobre el muro norte). */
  readonly drainXs = [-36, -14, 6, 32];
  /** Filas de postes con cable (puntos de enganche arriba de cada poste), para la tirolesa. */
  readonly zipLines: THREE.Vector3[][] = [];

  constructor() {
    const s = this.scene;
    s.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
    s.background = new THREE.Color('#2a4fb0');

    this.hemi = new THREE.HemisphereLight('#a8c0f0', '#a07a52', 1.7);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffd9a0', 2.4);
    this.sun.castShadow = true;
    // Sombras de 2048 también en el celular: el área de sombra sigue a la cámara y se ajusta a lo
    // que se ve (setShadowSpan), así cada texel cubre poco y los bordes salen definidos.
    const size = 2048;
    this.sun.shadow.mapSize.set(size, size);
    const sc = this.sun.shadow.camera;
    sc.left = -26;
    sc.right = 26;
    sc.top = 26;
    sc.bottom = -26;
    sc.near = 1;
    sc.far = 140;
    this.sun.shadow.bias = -0.0006;
    s.add(this.sun, this.sun.target);

    this.sky = makeSky();
    this.sky.userData.dynamic = true;
    s.add(this.sky);

    this.buildHorizon();
    this.buildGround();
    this.buildStreets();
    this.buildCanal();
    this.buildPlazaSet();
    this.buildFountainPlaza();
    this.buildAntennaYard();
    this.buildGardenSet();
    this.buildHouses();
    this.buildShops();
    this.buildPolesAndCars();
    this.scatterNature();
    this.buildButterflies();
    this.rects.push(this.bridgeGap);
    this.interior = buildMigaHouse(s, this.rects);
    this.skate = buildSkatepark(s, this.rects);
    this.rooms.push(this.interior, this.skate.room);

    // Rendimiento: toda la escenografía quieta se junta en pocas mallas.
    // Lo que se anima (árbol de la plaza, ventana, mariposas, nubes) queda marcado como dinámico.
    batchStatic(s, sharedOutline);
    this.swaying.splice(0, this.swaying.length, ...this.swaying.filter((w) => w.g.userData.dynamic));
  }

  /* ---------- Colisiones ---------- */

  /** Empuja un círculo (el Nexus) fuera de paredes, objetos y los bordes del barrio. */
  resolve(pos: THREE.Vector3, r: number, extra: Circle[] = [], feetY = 0): void {
    for (const o of this.rects) {
      if (o.h !== undefined && feetY >= o.h - ON_TOP) continue; // va por arriba
      if (pos.x > o.minX - r && pos.x < o.maxX + r && pos.z > o.minZ - r && pos.z < o.maxZ + r) {
        const pen = [pos.x - (o.minX - r), o.maxX + r - pos.x, pos.z - (o.minZ - r), o.maxZ + r - pos.z];
        const m = Math.min(...pen);
        const i = pen.indexOf(m);
        if (i === 0) pos.x = o.minX - r;
        else if (i === 1) pos.x = o.maxX + r;
        else if (i === 2) pos.z = o.minZ - r;
        else pos.z = o.maxZ + r;
      }
    }
    for (const c of [...this.circles, ...extra]) {
      if (c.r <= 0) continue;
      if (c.h !== undefined && feetY >= c.h - ON_TOP) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min && d > 1e-4) {
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    for (const { room } of this.rooms) {
      if (pos.x > room.minX - 8 && pos.x < room.maxX + 8) {
        // Adentro de una casa: las paredes son el límite
        pos.x = clamp(pos.x, room.minX + r, room.maxX - r);
        pos.z = clamp(pos.z, room.minZ + r, room.maxZ - r);
        return;
      }
    }
    World.keepInRegions(pos);
  }

  /** Lleva un punto al lugar caminable más cercano (Centro, calle del este o Skatepark). */
  static keepInRegions(pos: { x: number; z: number }): void {
    let bx = pos.x;
    let bz = pos.z;
    let best = Infinity;
    for (const g of REGIONS) {
      const x = clamp(pos.x, g.minX, g.maxX);
      const z = clamp(pos.z, g.minZ, g.maxZ);
      const d = (x - pos.x) ** 2 + (z - pos.z) ** 2;
      if (d < best) {
        best = d;
        bx = x;
        bz = z;
      }
      if (d === 0) break;
    }
    pos.x = bx;
    pos.z = bz;
  }

  /** ¿El punto está en alguna zona caminable (con margen)? */
  static inRegions(x: number, z: number, margin = 0): boolean {
    return REGIONS.some((g) => x > g.minX + margin && x < g.maxX - margin && z > g.minZ + margin && z < g.maxZ - margin);
  }

  openBridgeGap(): void {
    const i = this.rects.indexOf(this.bridgeGap);
    if (i >= 0) this.rects.splice(i, 1);
  }

  private addRect(cx: number, cz: number, w: number, d: number, rot = 0, h?: number): void {
    const quarter = ((Math.round(rot / (Math.PI / 2)) % 2) + 2) % 2;
    const W = quarter ? d : w;
    const D = quarter ? w : d;
    this.rects.push({ minX: cx - W / 2, maxX: cx + W / 2, minZ: cz - D / 2, maxZ: cz + D / 2, h });
  }

  /**
   * Altura del piso debajo de (x, z) para alguien con los pies a `feetY`: lo más alto de las
   * plataformas (bancos, autos, tachos) que estén debajo y por debajo de los pies.
   */
  groundAt(x: number, z: number, feetY: number, r = 0.2): number {
    let g = 0;
    for (const o of this.rects) {
      if (o.h === undefined || o.h > feetY + ON_TOP) continue;
      if (x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) g = Math.max(g, o.h);
    }
    for (const c of this.circles) {
      if (c.h === undefined || c.h > feetY + ON_TOP) continue;
      if (Math.hypot(x - c.x, z - c.z) < c.r + r) g = Math.max(g, c.h);
    }
    return g;
  }

  /** ¿Se puede pisar este punto? Solo mira obstáculos reales (paredes, canal, objetos), no zonas reservadas. */
  isWalkable(x: number, z: number, margin: number): boolean {
    for (const r of this.rects) {
      if (x > r.minX - margin && x < r.maxX + margin && z > r.minZ - margin && z < r.maxZ + margin) return false;
    }
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return false;
    return World.inRegions(x, z, margin);
  }

  /** Lugar libre para decoración (árboles, arbustos): además evita calles y zonas reservadas. */
  isFree(x: number, z: number, margin: number): boolean {
    if (Math.abs(x) < ROAD + WALK + margin || Math.abs(z) < ROAD + WALK + margin) return false;
    if (z > CANAL_MIN_Z - 1.5 - margin && z < CANAL_MAX_Z + 1.5 + margin) return false;
    for (const r of [...RESERVED, ...this.rects]) {
      if (x > r.minX - margin && x < r.maxX + margin && z > r.minZ - margin && z < r.maxZ + margin) return false;
    }
    for (const c of this.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return false;
    return Math.abs(x) < BOUNDS + 6 && Math.abs(z) < BOUNDS + 6;
  }

  /* ---------- Cielo, horizonte ---------- */

  private buildHorizon(): void {
    for (let i = 0; i < 6; i += 1) {
      const a = rnd() * Math.PI * 2;
      const r = 200 + rnd() * 100;
      const g = new THREE.Group();
      const mat = new THREE.MeshToonMaterial({ color: '#fff6ea', gradientMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25 });
      const n = 4 + Math.floor(rnd() * 4);
      const size = 8 + rnd() * 9;
      for (let k = 0; k < n; k += 1) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat);
        const rr = size * (0.6 + rnd() * 0.6);
        b.scale.set(rr * 1.4, rr * 0.8, rr);
        b.position.set((k - n / 2) * size * 0.9, rnd() * size * 0.4, rnd() * size * 0.6);
        g.add(b);
      }
      g.position.set(Math.cos(a) * r, 55 + rnd() * 50, Math.sin(a) * r);
      g.userData.dynamic = true;
      this.scene.add(g);
      this.clouds.push(g);
    }
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.2;
      const r = 230 + rnd() * 50;
      const h = 30 + rnd() * 50;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), toon(pick(['#6f8fbf', '#7a95bf', '#6a86b0'])));
      const hw = 50 + rnd() * 60;
      hill.scale.set(hw, h, hw * 0.7);
      hill.position.set(Math.cos(a) * r, -h * 0.15, Math.sin(a) * r);
      hill.rotation.y = rnd() * 3;
      this.scene.add(hill);
    }
  }

  /* ---------- Suelo y calles ---------- */

  private plane(x: number, z: number, w: number, d: number, mat: THREE.Material, y: number): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  private buildGround(): void {
    const grass = toon('#6f9e3e', 50);
    // Norte del canal y sur del canal (el canal queda hundido entre ambos)
    this.plane(0, (CANAL_MIN_Z - 400) / 2, 800, 400 + CANAL_MIN_Z, grass, 0);
    this.plane(0, (CANAL_MAX_Z + 400) / 2, 800, 400 - CANAL_MAX_Z, grass, 0);
  }

  private buildStreets(): void {
    const asphalt = toon('#8a817c', 24);
    const walk = toon('#cfc2ad', 30);
    const yellow = flat('#f5c443');
    const white = flat('#f4efe6');
    const roadEndZ = CANAL_MIN_Z - 1.2;

    // Calle este-oeste (z = 0) y calle norte-sur (x = 0), que termina en el canal
    this.plane(0, 0, 120, ROAD * 2, asphalt, 0.02);
    this.plane(0, (roadEndZ - 60) / 2, ROAD * 2, roadEndZ + 60, asphalt, 0.025);
    for (const side of [-1, 1]) {
      const w1 = box(120, 0.08, WALK, '', { mat: walk, outline: false, cast: false });
      w1.position.set(0, 0.04, side * (ROAD + WALK / 2));
      this.scene.add(w1);
      const len = roadEndZ + 60;
      const w2 = box(WALK, 0.08, len, '', { mat: walk, outline: false, cast: false });
      w2.position.set(side * (ROAD + WALK / 2), 0.045, (roadEndZ - 60) / 2);
      this.scene.add(w2);
    }
    // Cruce: asfalto encima de las veredas y cebras
    const cross = box(ROAD * 2 + WALK * 2, 0.1, ROAD * 2 + WALK * 2, '', { mat: asphalt, outline: false, cast: false });
    cross.position.set(0, 0.0, 0);
    this.scene.add(cross);
    for (let i = -2; i <= 2; i += 1) {
      this.plane(i * 1.4, -ROAD - 1.1, 0.7, 2.0, white, 0.06);
      this.plane(i * 1.4, ROAD + 1.1, 0.7, 2.0, white, 0.06);
      this.plane(-ROAD - 1.1, i * 1.4, 2.0, 0.7, white, 0.065);
      this.plane(ROAD + 1.1, i * 1.4, 2.0, 0.7, white, 0.065);
    }
    // Doble línea amarilla
    for (let s = -58; s < 58; s += 4) {
      if (Math.abs(s + 1.5) < ROAD + WALK + 2) continue;
      this.plane(s + 1.5, -0.18, 3, 0.12, yellow, 0.04);
      this.plane(s + 1.5, 0.18, 3, 0.12, yellow, 0.04);
      if (s + 1.5 < roadEndZ - 2) {
        this.plane(-0.18, s + 1.5, 0.12, 3, yellow, 0.045);
        this.plane(0.18, s + 1.5, 0.12, 3, yellow, 0.045);
      }
    }
    // Bordillos rojos
    for (const x0 of [-30, 22]) {
      const c = box(10, 0.1, 0.16, '#c8452f', { outline: false, cast: false });
      c.position.set(x0, 0.09, ROAD + 0.08);
      this.scene.add(c);
    }
  }

  private buildCanal(): void {
    const width = CANAL_MAX_Z - CANAL_MIN_Z;
    const mid = (CANAL_MIN_Z + CANAL_MAX_Z) / 2;
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(800, width),
      withLife(new THREE.MeshToonMaterial({ color: '#3f86c8', gradientMap })),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.9, mid);
    water.receiveShadow = true;
    this.scene.add(water);
    const concrete = toon('#b9b2a6', 20);
    for (const z of [CANAL_MIN_Z + 0.15, CANAL_MAX_Z - 0.15]) {
      const wall = box(800, 1.2, 0.3, '', { mat: concrete, outline: false, cast: false });
      wall.position.set(0, -0.6, z);
      this.scene.add(wall);
    }
    // Barandas a ambos lados, salvo en la cabecera del puente
    const fenceMat = toon('#7a5a42');
    for (const z of [CANAL_MIN_Z - 0.35, CANAL_MAX_Z + 0.35]) {
      for (let x = -60; x <= 60; x += 2.5) {
        if (Math.abs(x - BRIDGE_X) < BRIDGE_HALF + 0.4) continue;
        const post = box(0.12, 0.9, 0.12, '', { mat: fenceMat, outline: 0.012 });
        post.position.set(x, 0.45, z);
        this.scene.add(post);
      }
      for (const [a, b] of [
        [-60, BRIDGE_X - BRIDGE_HALF - 0.4],
        [BRIDGE_X + BRIDGE_HALF + 0.4, 60],
      ]) {
        const rail = box(b - a, 0.1, 0.1, '', { mat: fenceMat, outline: 0.012 });
        rail.position.set((a + b) / 2, 0.82, z);
        this.scene.add(rail);
      }
    }
    // Pilares de piedra en las dos orillas, donde apoya el puente
    for (const z of [CANAL_MIN_Z + 0.2, CANAL_MAX_Z - 0.2]) {
      const pier = box(BRIDGE_HALF * 2 + 0.8, 1.3, 0.7, '#9c938a', { outline: 0.03, brush: 2 });
      pier.position.set(BRIDGE_X, -0.6, z);
      this.scene.add(pier);
      for (const sx of [-1, 1]) {
        const bollard = box(0.45, 1.1, 0.45, '#b9b2a6', { outline: 0.03, brush: 2 });
        bollard.position.set(BRIDGE_X + sx * (BRIDGE_HALF + 0.3), 0.55, z + (z < CANAL_MIN_Z + 1 ? -0.5 : 0.5));
        this.scene.add(bollard);
        const capB = box(0.55, 0.12, 0.55, '#8a8279', { outline: 0.02 });
        capB.position.set(BRIDGE_X + sx * (BRIDGE_HALF + 0.3), 1.16, z + (z < CANAL_MIN_Z + 1 ? -0.5 : 0.5));
        this.scene.add(capB);
        this.circles.push({ x: BRIDGE_X + sx * (BRIDGE_HALF + 0.3), z: z + (z < CANAL_MIN_Z + 1 ? -0.5 : 0.5), r: 0.3 });
      }
    }
    this.buildCanalDetail();
    // Bloqueos permanentes: todo el canal menos el hueco del puente (que se abre al conectarlo)
    this.rects.push({ minX: -100, maxX: BRIDGE_X - BRIDGE_HALF, minZ: CANAL_MIN_Z - 0.6, maxZ: CANAL_MAX_Z + 0.6 });
    this.rects.push({ minX: BRIDGE_X + BRIDGE_HALF, maxX: 100, minZ: CANAL_MIN_Z - 0.6, maxZ: CANAL_MAX_Z + 0.6 });
    // Barrera al final de la calle norte-sur
    const barrier = box(ROAD * 2, 0.5, 0.3, '#f4efe6', { outline: 0.03 });
    barrier.position.set(0, 0.7, CANAL_MIN_Z - 1.0);
    this.scene.add(barrier);
    for (const x of [-ROAD + 0.4, ROAD - 0.4]) {
      const leg = box(0.15, 0.7, 0.15, '#c8452f', { outline: 0.02 });
      leg.position.set(x, 0.35, CANAL_MIN_Z - 1.0);
      this.scene.add(leg);
    }
    for (let i = 0; i < 4; i += 1) {
      const stripe = box(0.6, 0.52, 0.32, '#c8452f', { outline: false });
      stripe.position.set(-ROAD + 1.2 + i * 2, 0.7, CANAL_MIN_Z - 1.0);
      this.scene.add(stripe);
    }
  }

  /** Detalle del canal: bordes de piedra, juntas, caños, juncos, nenúfares, corriente y un bote. */
  private buildCanalDetail(): void {
    const near = (x: number) => Math.abs(x - BRIDGE_X) < BRIDGE_HALF + 0.6;
    // Cordón de piedra clara sobre los muros y juntas entre bloques
    for (const [z, dir] of [[CANAL_MIN_Z, -1], [CANAL_MAX_Z, 1]] as const) {
      const coping = box(130, 0.12, 0.5, '#d6cfc2', { outline: false, cast: false, brush: 6 });
      coping.position.set(0, 0.03, z + dir * 0.05);
      this.scene.add(coping);
      for (let x = -60; x <= 60; x += 2) {
        if (near(x)) continue;
        const joint = box(0.05, 1.1, 0.04, '#9c938a', { outline: false, cast: false });
        joint.position.set(x, -0.55, z - dir * 0.32);
        this.scene.add(joint);
      }
      // Línea de humedad cerca del agua
      const damp = box(130, 0.25, 0.02, '#7d8a86', { outline: false, cast: false });
      damp.position.set(0, -0.78, z - dir * 0.32);
      this.scene.add(damp);
    }
    // Caños de desagüe en el muro norte: su cara hacia el agua es la que ve la cámara (mira hacia +Z)
    for (const x of this.drainXs) {
      const pipe = rounded(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), toon('#6b6f7a'), 0.02);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, -0.35, CANAL_MIN_Z + 0.45);
      this.scene.add(pipe);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), toon('#1d1630'));
      hole.position.set(x, -0.35, CANAL_MIN_Z + 0.71);
      this.scene.add(hole);
    }
    for (const x of [-26, -4, 26]) {
      const ring = rounded(new THREE.TorusGeometry(0.16, 0.035, 6, 12), toon('#5a5f6b'), 0.008);
      ring.position.set(x, -0.25, CANAL_MIN_Z + 0.32);
      this.scene.add(ring);
    }
    // Juncos en las orillas del agua y nenúfares con alguna flor
    const reedMat = toon('#5f8a4a');
    for (let i = 0; i < 26; i += 1) {
      const x = -55 + i * 4.3 + (rnd() - 0.5) * 1.5;
      if (near(x)) continue;
      const z = i % 2 ? CANAL_MIN_Z + 0.55 : CANAL_MAX_Z - 0.55;
      for (let k = 0; k < 4; k += 1) {
        const reed = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.9 + rnd() * 0.5, 4), reedMat);
        reed.position.set(x + (k - 1.5) * 0.12, -0.45, z + (rnd() - 0.5) * 0.2);
        reed.rotation.z = (rnd() - 0.5) * 0.4;
        this.scene.add(reed);
      }
      if (rnd() < 0.5) {
        const cat = rounded(new THREE.CapsuleGeometry(0.04, 0.14, 3, 6), toon('#7a4a2e'), 0);
        cat.position.set(x, 0.0, z);
        this.scene.add(cat);
      }
    }
    for (let i = 0; i < 14; i += 1) {
      const x = -50 + i * 7.5 + (rnd() - 0.5) * 3;
      if (near(x)) continue;
      const z = CANAL_MIN_Z + 1.2 + rnd() * 3.6;
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.35 + rnd() * 0.2, 10, 0.4, Math.PI * 2 - 0.4), toon('#4f8f3a'));
      pad.rotation.set(-Math.PI / 2, 0, rnd() * 6);
      pad.position.set(x, -0.88, z);
      this.scene.add(pad);
      if (rnd() < 0.35) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon('#f4a6c8'));
        lotus.scale.set(1, 0.6, 1);
        lotus.position.set(x, -0.82, z);
        this.scene.add(lotus);
      }
    }
    // Corriente: vetas claras y hojas que viajan por el agua
    const streakMat = withLife(new THREE.MeshBasicMaterial({ color: '#a9d4f2', transparent: true, opacity: 0.55, depthWrite: false }));
    for (let i = 0; i < 22; i += 1) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + rnd() * 1.6, 0.06), streakMat);
      streak.rotation.x = -Math.PI / 2;
      streak.position.set(-60 + rnd() * 120, -0.885, CANAL_MIN_Z + 0.8 + rnd() * 4.4);
      streak.userData.dynamic = true;
      this.scene.add(streak);
      this.drifting.push({ o: streak, speed: 0.9 + rnd() * 0.5, p: rnd() * 10 });
    }
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.12, 6), toon(i % 2 ? '#c07a3a' : '#8aa04a'));
      leaf.scale.set(1.6, 0.8, 1);
      leaf.rotation.x = -Math.PI / 2;
      leaf.position.set(-60 + rnd() * 120, -0.875, CANAL_MIN_Z + 1 + rnd() * 4);
      leaf.userData.dynamic = true;
      this.scene.add(leaf);
      this.drifting.push({ o: leaf, speed: 0.7 + rnd() * 0.3, p: rnd() * 10 });
    }
    // Botecito de madera amarrado cerca de la orilla norte
    const boat = new THREE.Group();
    const hull = box(1.2, 0.35, 2.6, '#b0855c', { outline: 0.03, brush: 1 });
    boat.add(hull);
    const inside = box(1.0, 0.05, 2.3, '#7a5a42', { outline: false });
    inside.position.y = 0.16;
    boat.add(inside);
    // Proa: una cuña más angosta al frente
    const bow = box(0.8, 0.35, 0.5, '#b0855c', { outline: 0.02 });
    bow.position.set(0, 0.02, 1.5);
    boat.add(bow);
    const bowTip = box(0.4, 0.35, 0.35, '#b0855c', { outline: 0.02 });
    bowTip.position.set(0, 0.04, 1.85);
    boat.add(bowTip);
    const seatB = box(1.0, 0.06, 0.3, '#d9b27a', { outline: 0.01 });
    seatB.position.set(0, 0.2, -0.2);
    boat.add(seatB);
    const stripe = box(1.22, 0.08, 2.62, '#e0563f', { outline: false });
    stripe.position.y = 0.1;
    boat.add(stripe);
    for (const sx of [-1, 1]) {
      const oar = box(0.06, 0.04, 1.8, '#d9b27a', { outline: 0.008 });
      oar.position.set(sx * 0.45, 0.24, 0.1);
      oar.rotation.y = sx * 0.15;
      boat.add(oar);
    }
    boat.rotation.y = Math.PI / 2 - 0.15;
    boat.position.set(-8, -0.75, CANAL_MIN_Z + 1.3);
    boat.traverse((o) => (o.userData.dynamic = true));
    this.scene.add(boat);
    this.boat = boat;
    const rope = box(0.03, 0.03, 1.0, '#d9c49a', { outline: false });
    rope.position.set(-6.9, -0.45, CANAL_MIN_Z + 0.75);
    rope.rotation.set(0.6, -0.5, 0);
    this.scene.add(rope);
  }

  /* ---------- Escenografía de cada zona ---------- */

  private buildPlazaSet(): void {
    // Piso de la plaza: gris "apagado" que se entibia al resolverla
    const ground = toonUnique('#a9a49c', 8);
    const floor = box(18, 0.1, 18, '', { mat: ground, outline: false, cast: false });
    floor.position.set(-18, 0.05, -18);
    this.scene.add(floor);
    for (let i = 0; i < 4; i += 1) {
      const tile = box(2, 0.11, 2, '#8f8a83', { outline: false, cast: false });
      tile.position.set(-18 + (i % 2 ? 3 : -3), 0.055, -18 + (i < 2 ? 3 : -3));
      this.scene.add(tile);
    }

    // Casa apagada: estuco gris y techo gris; recupera el color con la plaza
    const wall = toonUnique('#b8b2a8', 3);
    const roof = toonUnique('#6e6a66', 3);
    const house = new THREE.Group();
    house.position.set(-18, 0, -31);
    const w = 10;
    const d = 8;
    const h = 3.6;
    const body = box(w, h, d, '', { mat: wall, outline: 0.06 });
    body.position.y = h / 2;
    house.add(body);
    const roofMesh = this.gable(w, d, 1.9, roof);
    roofMesh.position.y = h;
    house.add(roofMesh);
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.1), new THREE.MeshBasicMaterial({ color: '#2a2d36' }));
    outlineScaled(win, 1.08, 1.08, 1.5);
    win.position.set(-2.4, h * 0.56, d / 2 + 0.04);
    win.userData.dynamic = true;
    house.add(win);
    for (const sx of [-0.95, 0.95]) {
      const sh = box(0.4, 1.45, 0.08, '#5a5f6b', { outline: 0.03 });
      sh.position.set(-2.4 + sx, h * 0.56, d / 2 + 0.08);
      house.add(sh);
    }
    // Detalles quietos de la casa de la plaza (marco, alféizar, zócalo, alero, chimenea).
    // Se apagan/encienden con el círculo de vida como el resto del barrio.
    const winFrame = box(1.75, 1.55, 0.06, '#e8e2d6', { outline: 0.03 });
    winFrame.position.set(-2.4, h * 0.56, d / 2 + 0.01);
    house.add(winFrame);
    const sill = box(1.95, 0.1, 0.28, '#e2d6c2', { outline: 0.025 });
    sill.position.set(-2.4, h * 0.56 - 0.8, d / 2 + 0.12);
    house.add(sill);
    const plinth = box(w + 0.12, 0.45, d + 0.12, '#9c8f80', { outline: 0.03, brush: 2 });
    plinth.position.y = 0.225;
    house.add(plinth);
    const fascia = box(w + 1.3, 0.16, 0.12, '#efe7da', { outline: 0.02 });
    fascia.position.set(0, h + 0.02, d / 2 + 0.62);
    house.add(fascia);
    const chimney = box(0.7, 1.7, 0.7, '#a85a44', { outline: 0.03, brush: 2 });
    chimney.position.set(2.6, h + 1.4, -1.5);
    house.add(chimney);
    const chCap = box(0.9, 0.12, 0.9, '#5a4a44', { outline: 0.02 });
    chCap.position.set(2.6, h + 2.28, -1.5);
    house.add(chCap);
    this.scene.add(house);
    this.addRect(-18, -31, w, d);

    // Árbol sin hojas (las gana al resolver la plaza)
    const tree = new THREE.Group();
    tree.position.set(-10.8, 0, -24.6);
    const trunkMat = toon('#7a5a42', 2);
    for (let i = 0; i < 4; i += 1) {
      const r = 0.32 - i * 0.05;
      const seg = rounded(new THREE.CylinderGeometry(r * 0.85, r, 1.2, 7), trunkMat, 0.02);
      seg.position.y = 0.6 + i * 1.1;
      seg.rotation.z = (i % 2 ? 1 : -1) * 0.08;
      tree.add(seg);
    }
    for (const [bx, by, bz, rz] of [
      [0.6, 3.6, 0, -0.9],
      [-0.6, 3.9, 0.2, 0.9],
      [0.1, 4.2, -0.6, 0.2],
    ]) {
      const branch = rounded(new THREE.CylinderGeometry(0.06, 0.1, 1.4, 6), trunkMat, 0.015);
      branch.position.set(bx, by, bz);
      branch.rotation.z = rz;
      tree.add(branch);
    }
    const crowns: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i += 1) {
      const r = 1.1 + rnd() * 0.9;
      const c = rounded(new THREE.IcosahedronGeometry(r, 1), toon(pick(['#2f5a2b', '#3e6b33', '#4f7f3a', '#5f8f3f']), 2), 0.05);
      const a = rnd() * Math.PI * 2;
      const dd = rnd() * 1.8;
      c.position.set(Math.cos(a) * dd, 4.6 + rnd() * 1.6, Math.sin(a) * dd);
      c.scale.y = 0.75;
      c.visible = false;
      tree.add(c);
      crowns.push(c);
    }
    tree.userData.dynamic = true;
    this.scene.add(tree);
    this.swaying.push({ g: tree, p: 1 });
    this.circles.push({ x: -10.8, z: -24.6, r: 0.4 });

    // Bancas
    for (const [bx, bz, rot] of [
      [-24, -22, Math.PI / 2],
      [-12, -12, 0],
    ]) {
      const bench = new THREE.Group();
      const seat = box(2, 0.12, 0.6, '#a97a52', { outline: 0.02 });
      seat.position.y = 0.5;
      bench.add(seat);
      const back = box(2, 0.5, 0.1, '#a97a52', { outline: 0.02 });
      back.position.set(0, 0.85, -0.28);
      bench.add(back);
      for (const lx of [-0.8, 0.8]) {
        const leg = box(0.1, 0.5, 0.5, '#3a3d48', { outline: 0.012 });
        leg.position.set(lx, 0.25, 0);
        bench.add(leg);
      }
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      this.scene.add(bench);
      this.addRect(bx, bz, 2.1, 0.7, rot, 0.56);
    }

    // Arbustos alrededor del fragmento secreto, detrás de la casa
    for (const [x, z] of [
      [-22.5, -38.5],
      [-13.5, -38.5],
      [-24, -41],
      [-12, -41.5],
    ]) {
      this.bush(x, z, 0.9, rnd() < 0.5);
    }

    this.plaza = { ground, houseWall: wall, houseRoof: roof, window: win, treeCrowns: crowns };
  }

  private buildFountainPlaza(): void {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.1, 40), toon('#e6dbc6', 10));
    disc.position.set(-20, 0.05, 16);
    disc.receiveShadow = true;
    this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8, 0.12, 6, 48), toon('#b8573a'));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-20, 0.1, 16);
    this.scene.add(ring);
    // Baldosas: anillo interior de otro tono y juntas radiales
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.11, 40), toon('#d6c9b0', 8));
    inner.position.set(-20, 0.055, 16);
    inner.receiveShadow = true;
    this.scene.add(inner);
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const joint = box(4.3, 0.02, 0.05, '#bfb29c', { outline: false, cast: false });
      joint.position.set(-20 + Math.cos(a) * 5.8, 0.115, 16 + Math.sin(a) * 5.8);
      joint.rotation.y = -a;
      this.scene.add(joint);
    }
    // Bancos mirando a la fuente y un tacho de basura
    for (const a of [1.75, -1.1]) {
      const bx = -20 + Math.cos(a) * 6.3;
      const bz = 16 + Math.sin(a) * 6.3;
      this.bench(bx, bz, Math.atan2(-Math.cos(a), -Math.sin(a)));
    }
    const bin = rounded(new THREE.CylinderGeometry(0.3, 0.26, 0.8, 12), toon('#4f8f3a'), 0.02);
    bin.position.set(-20 + Math.cos(2.3) * 6.6, 0.4, 16 + Math.sin(2.3) * 6.6);
    this.scene.add(bin);
    const binLid = rounded(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 12), toon('#3a6f2c'), 0.01);
    binLid.position.set(bin.position.x, 0.84, bin.position.z);
    this.scene.add(binLid);
    this.circles.push({ x: bin.position.x, z: bin.position.z, r: 0.35, h: 0.88 });
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      if (Math.abs(a - 3.6) < 0.5) continue; // abertura hacia la fuente de energía
      this.bush(-20 + Math.cos(a) * 9.2, 16 + Math.sin(a) * 9.2, 0.8, true);
    }
  }

  /** Banco de plaza con respaldo; mira hacia +Z antes de girarlo. */
  private bench(x: number, z: number, rot: number): void {
    const g = new THREE.Group();
    const seat = box(2.0, 0.12, 0.6, '#a97a52', { outline: 0.02, brush: 1 });
    seat.position.y = 0.45;
    g.add(seat);
    const back = box(2.0, 0.45, 0.1, '#a97a52', { outline: 0.02, brush: 1 });
    back.position.set(0, 0.78, -0.28);
    back.rotation.x = -0.12;
    g.add(back);
    for (const sx of [-0.85, 0.85]) {
      const leg = box(0.1, 0.45, 0.55, '#3a3d48', { outline: 0.012 });
      leg.position.set(sx, 0.22, 0);
      g.add(leg);
      const arm = box(0.08, 0.06, 0.6, '#3a3d48', { outline: 0.01 });
      arm.position.set(sx * 1.08, 0.66, 0);
      g.add(arm);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(g);
    // En diagonal un rectángulo alineado a los ejes no sirve: un círculo cubre el banco (se puede subir)
    this.circles.push({ x, z, r: 0.95, h: 0.51 });
  }

  private buildAntennaYard(): void {
    const gravel = box(22, 0.08, 18, '#b8aea3', { brush: 20, outline: false, cast: false });
    gravel.position.set(22, 0.04, -18);
    this.scene.add(gravel);
    // Cerca baja de la estación
    const fence = toon('#8b8f9a');
    for (let x = 11.5; x <= 33; x += 2.1) {
      for (const z of [-27.2]) {
        const post = box(0.1, 1.1, 0.1, '', { mat: fence, outline: 0.012 });
        post.position.set(x, 0.55, z);
        this.scene.add(post);
      }
    }
    const rail = box(21.5, 0.08, 0.08, '', { mat: fence, outline: 0.01 });
    rail.position.set(22.2, 1.0, -27.2);
    this.scene.add(rail);
    this.rects.push({ minX: 11, maxX: 33, minZ: -27.5, maxZ: -26.9 });
    // Caseta
    const hut = box(3, 2.4, 2.6, '#e8d0b5', { brush: 2 });
    hut.position.set(31, 1.2, -24.5);
    this.scene.add(hut);
    const hutRoof = box(3.4, 0.2, 3.0, '#5a5f6b');
    hutRoof.position.set(31, 2.5, -24.5);
    this.scene.add(hutRoof);
    this.addRect(31, -24.5, 3, 2.6);
  }

  /* ---------- Distrito del jardín (zona 5) ---------- */

  /**
   * Jardín municipal al sur del canal: cercos de arbustos con dos entradas, caminos de grava,
   * glorieta, bancas, bebedero de pájaros, faroles de jardín y el cartel del Alcalde Goteo.
   * El parterre y el aspersor son objetos conectables (los pone WorldMode).
   */
  private buildGardenSet(): void {
    const g = GARDEN;
    const cx = (g.minX + g.maxX) / 2;
    const cz = (g.minZ + g.maxZ) / 2;
    // Césped propio del jardín y caminos de grava en cruz
    const lawn = box(g.maxX - g.minX, 0.06, g.maxZ - g.minZ, '#7fae4a', { brush: 30, outline: false, cast: false });
    lawn.position.set(cx, 0.03, cz);
    this.scene.add(lawn);
    const gravel = toon('#d8ccb4', 18);
    const pathNS = box(2.2, 0.08, g.maxZ - g.minZ, '', { mat: gravel, outline: false, cast: false });
    pathNS.position.set(-1, 0.04, cz);
    this.scene.add(pathNS);
    const pathEW = box(g.maxX - g.minX, 0.08, 2.0, '', { mat: gravel, outline: false, cast: false });
    pathEW.position.set(cx, 0.045, 51.8);
    this.scene.add(pathEW);
    // Camino desde el puente hasta la entrada este
    const fromBridge = box(2.0, 0.08, 15, '', { mat: gravel, outline: false, cast: false });
    fromBridge.position.set(18, 0.04, 44);
    this.scene.add(fromBridge);
    const toGarden = box(14, 0.08, 2.0, '', { mat: gravel, outline: false, cast: false });
    toGarden.position.set(11, 0.045, 51.8);
    this.scene.add(toGarden);

    // Cercos de arbustos recortados (con huecos para entrar)
    const hedge = toon('#3f6e34', 6);
    const hedgeRun = (x1: number, z1: number, x2: number, z2: number) => {
      const w = Math.max(Math.abs(x2 - x1), 0.9);
      const d = Math.max(Math.abs(z2 - z1), 0.9);
      const m = box(w, 1.0, d, '', { mat: hedge, outline: 0.05 });
      m.position.set((x1 + x2) / 2, 0.5, (z1 + z2) / 2);
      this.scene.add(m);
      this.addRect((x1 + x2) / 2, (z1 + z2) / 2, w, d);
    };
    hedgeRun(g.minX, g.minZ, -3.2, g.minZ); // norte (entrada en x -3..1)
    hedgeRun(1.2, g.minZ, g.maxX, g.minZ);
    hedgeRun(g.minX, g.maxZ, g.maxX, g.maxZ); // sur
    hedgeRun(g.minX, g.minZ, g.minX, g.maxZ); // oeste
    hedgeRun(g.maxX, g.minZ, g.maxX, 50.4); // este (entrada en z 50.4..53.2)
    hedgeRun(g.maxX, 53.2, g.maxX, g.maxZ);
    for (const [x, z] of [
      [g.minX, g.minZ],
      [g.maxX, g.minZ],
      [g.minX, g.maxZ],
      [g.maxX, g.maxZ],
    ]) {
      const ball = rounded(new THREE.IcosahedronGeometry(0.75, 1), toon('#4f7f3a', 2), 0.04);
      ball.position.set(x, 1.15, z);
      this.scene.add(ball);
    }

    // Arco de la entrada este con el cartel del jardín
    const archMat = toon('#f4efe6', 2);
    for (const z of [50.2, 53.4]) {
      const post = box(0.25, 2.6, 0.25, '', { mat: archMat, outline: 0.03 });
      post.position.set(g.maxX + 0.2, 1.3, z);
      this.scene.add(post);
      this.circles.push({ x: g.maxX + 0.2, z, r: 0.2 });
    }
    const beam = box(0.3, 0.3, 3.6, '', { mat: archMat, outline: 0.03 });
    beam.position.set(g.maxX + 0.2, 2.65, 51.8);
    this.scene.add(beam);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.75),
      withLife(new THREE.MeshBasicMaterial({ map: this.signTexture('JARDÍN MUNICIPAL', '#5f7f5a') })),
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(g.maxX + 0.38, 2.65, 51.8);
    this.scene.add(sign);

    // Glorieta (kiosco) en la esquina suroeste
    const gz = { x: -20.5, z: 57.5 };
    const floor = rounded(new THREE.CylinderGeometry(2.4, 2.5, 0.3, 8), toon('#e6dbc6', 3), 0.03);
    floor.position.set(gz.x, 0.15, gz.z);
    this.scene.add(floor);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const col = rounded(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8), toon('#f4efe6'), 0.015);
      col.position.set(gz.x + Math.cos(a) * 2.1, 1.5, gz.z + Math.sin(a) * 2.1);
      this.scene.add(col);
    }
    const roof = rounded(new THREE.ConeGeometry(2.9, 1.5, 8), toon('#c4643e', 3), 0.04);
    roof.position.set(gz.x, 3.4, gz.z);
    roof.rotation.y = Math.PI / 8;
    this.scene.add(roof);
    const finial = rounded(new THREE.SphereGeometry(0.16, 8, 6), toon('#f2c14e'), 0.015);
    finial.position.set(gz.x, 4.25, gz.z);
    this.scene.add(finial);
    this.circles.push({ x: gz.x, z: gz.z, r: 2.4 });

    // Bebedero de pájaros (seco hasta que el jardín revive: lo maneja el color del barrio)
    const bath = new THREE.Group();
    const foot = rounded(new THREE.CylinderGeometry(0.18, 0.28, 0.9, 10), toon('#cfc2ad', 2), 0.02);
    foot.position.y = 0.45;
    bath.add(foot);
    const bowl = rounded(new THREE.CylinderGeometry(0.75, 0.3, 0.28, 16), toon('#e6dbc6', 2), 0.02);
    bowl.position.y = 1.0;
    bath.add(bowl);
    bath.position.set(-20.5, 0, 50.2);
    this.scene.add(bath);
    this.circles.push({ x: -20.5, z: 50.2, r: 0.75 });

    // Bancas y faroles de jardín
    for (const [bx, bz, rot] of [
      [-6, 58.8, Math.PI],
      [-14, 49.2, 0],
    ] as const) {
      const bench = new THREE.Group();
      const seat = box(2, 0.12, 0.6, '#a97a52', { outline: 0.02 });
      seat.position.y = 0.5;
      bench.add(seat);
      const back = box(2, 0.5, 0.1, '#a97a52', { outline: 0.02 });
      back.position.set(0, 0.85, -0.28);
      bench.add(back);
      for (const lx of [-0.8, 0.8]) {
        const leg = box(0.1, 0.5, 0.5, '#3a3d48', { outline: 0.012 });
        leg.position.set(lx, 0.25, 0);
        bench.add(leg);
      }
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      this.scene.add(bench);
      this.addRect(bx, bz, 2.1, 0.7, rot, 0.56);
    }
    for (const [lx, lz] of [
      [1.6, 48.6],
      [-24.4, 48.6],
      [1.6, 60.2],
    ]) {
      const post = rounded(new THREE.CylinderGeometry(0.05, 0.07, 2.0, 8), toon('#2c3040'), 0.012);
      post.position.set(lx, 1.0, lz);
      this.scene.add(post);
      const lantern = box(0.28, 0.32, 0.28, '#f2c14e', { outline: 0.015 });
      lantern.position.set(lx, 2.1, lz);
      this.scene.add(lantern);
      this.circles.push({ x: lx, z: lz, r: 0.15 });
    }

    // Árboles ornamentales y macizos a lo largo del cerco
    this.tree(-24, 60);
    this.bush(2.0, 60.0, 0.8, true); // arbusto (un árbol acá tapaba el aspersor en la vista isométrica)
    for (let i = 0; i < 6; i += 1) this.bush(-24 + i * 4.4, 47.9, 0.55, true);
  }

  /* ---------- Casas ---------- */

  private gable(w: number, d: number, h: number, mat: THREE.Material): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.6, 0);
    shape.lineTo(w / 2 + 0.6, 0);
    shape.lineTo(0, h);
    shape.lineTo(-w / 2 - 0.6, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d + 1.2, bevelEnabled: false });
    geo.translate(0, 0, -(d + 1.2) / 2);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    outlineScaled(m, 1.02, 1.04, 1.02);
    return m;
  }

  /** Ventana con marco, cruz, alféizar y postigos (todo quieto: se agrupa con batchStatic). */
  private windowSet(g: THREE.Group, x: number, y: number, z: number, trim: string, lit: boolean): void {
    const frame = box(1.7, 1.5, 0.08, '#f4efe6', { outline: 0.04 });
    frame.position.set(x, y, z);
    g.add(frame);
    const glass = box(1.44, 1.24, 0.06, lit ? '#ffd77a' : '#3a4a6a', { outline: false });
    glass.position.set(x, y, z + 0.03);
    g.add(glass);
    // Reflejo en diagonal: la ventana deja de ser un rectángulo plano
    if (!lit) {
      const shine = box(0.18, 1.0, 0.01, '#6f86b0', { outline: false });
      shine.position.set(x - 0.3, y + 0.05, z + 0.065);
      shine.rotation.z = 0.5;
      g.add(shine);
    }
    const mullV = box(0.07, 1.24, 0.04, '#f4efe6', { outline: false });
    mullV.position.set(x, y, z + 0.07);
    g.add(mullV);
    const mullH = box(1.44, 0.07, 0.04, '#f4efe6', { outline: false });
    mullH.position.set(x, y, z + 0.07);
    g.add(mullH);
    const sill = box(1.95, 0.1, 0.28, '#e2d6c2', { outline: 0.025 });
    sill.position.set(x, y - 0.8, z + 0.12);
    g.add(sill);
    const lintel = box(1.85, 0.12, 0.14, '#e2d6c2', { outline: 0.02 });
    lintel.position.set(x, y + 0.8, z + 0.05);
    g.add(lintel);
    const slatColor = `#${new THREE.Color(trim).multiplyScalar(0.8).getHexString()}`;
    for (const sx of [-1.08, 1.08]) {
      const sh = box(0.42, 1.5, 0.08, trim, { outline: 0.03 });
      sh.position.set(x + sx, y, z + 0.06);
      g.add(sh);
      // Tablillas del postigo
      for (let i = 0; i < 4; i += 1) {
        const slat = box(0.34, 0.04, 0.03, slatColor, { outline: false });
        slat.position.set(x + sx, y - 0.5 + i * 0.33, z + 0.11);
        g.add(slat);
      }
    }
    // Jardinera con flores bajo la ventana
    if (rnd() < 0.5) {
      const planter = box(1.4, 0.22, 0.28, '#8a5a3a', { outline: 0.02 });
      planter.position.set(x, y - 0.97, z + 0.2);
      g.add(planter);
      for (let i = 0; i < 5; i += 1) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), toon(pick(['#f06292', '#ffd54f', '#ff8a65', '#ba68c8'])));
        f.position.set(x - 0.5 + i * 0.25, y - 0.8, z + 0.2);
        g.add(f);
      }
    }
  }

  private house(cx: number, cz: number, rot: number): void {
    const g = new THREE.Group();
    const w = 8.5 + rnd() * 2.5;
    const h = 3.0 + rnd() * 0.8;
    const d = 7.5 + rnd() * 1.5;
    const trim = pick(TRIMS);
    const body = box(w, h, d, pick(WALLS), { brush: 3 });
    body.position.y = h / 2;
    g.add(body);
    // Zócalo más oscuro y esquineros: le dan peso y forma a la casa
    const plinth = box(w + 0.12, 0.45, d + 0.12, '#9c8f80', { outline: 0.03, brush: 2 });
    plinth.position.y = 0.225;
    g.add(plinth);
    for (const sx of [-1, 1]) {
      const corner = box(0.22, h, 0.22, '#efe7da', { outline: 0.02 });
      corner.position.set(sx * (w / 2 + 0.02), h / 2, d / 2 + 0.02);
      g.add(corner);
    }
    const roofH = 1.5 + rnd() * 0.6;
    const roofColor = pick(ROOFS);
    const roof = this.gable(w, d, roofH, toon(roofColor, 3));
    roof.position.y = h;
    g.add(roof);
    // Alero (tabla blanca bajo el techo) y cumbrera
    const fascia = box(w + 1.3, 0.16, 0.12, '#efe7da', { outline: 0.02 });
    fascia.position.set(0, h + 0.02, d / 2 + 0.62);
    g.add(fascia);
    const ridge = box(0.26, 0.2, d + 1.3, new THREE.Color(roofColor).multiplyScalar(0.75).getStyle(), { outline: 0.02 });
    ridge.position.set(0, h + roofH - 0.02, 0);
    g.add(ridge);
    // Chimenea de ladrillo con tapa
    const chX = w * (rnd() < 0.5 ? -0.25 : 0.25);
    const chimney = box(0.7, 1.6, 0.7, '#a85a44', { outline: 0.03, brush: 2 });
    chimney.position.set(chX, h + roofH * 0.55 + 0.4, -d * 0.18);
    g.add(chimney);
    const chCap = box(0.9, 0.12, 0.9, '#5a4a44', { outline: 0.02 });
    chCap.position.set(chX, h + roofH * 0.55 + 1.24, -d * 0.18);
    g.add(chCap);

    // Puerta: marco, tableros, ventanita, picaporte, escalón y farolito
    const dx = -w * 0.22;
    const zf = d / 2;
    const doorFrame = box(1.4, 2.35, 0.1, '#f4efe6', { outline: 0.04 });
    doorFrame.position.set(dx, 1.175, zf + 0.03);
    g.add(doorFrame);
    const doorCol = pick(['#7a4a2e', '#5a3a24', '#2d5a4e', '#3b4f8a']);
    const door = box(1.1, 2.1, 0.12, doorCol, { outline: 0.03 });
    door.position.set(dx, 1.05, zf + 0.07);
    g.add(door);
    const panelCol = new THREE.Color(doorCol).multiplyScalar(0.78).getStyle();
    for (const py of [0.55, 1.2]) {
      const panel = box(0.75, 0.5, 0.03, panelCol, { outline: false });
      panel.position.set(dx, py, zf + 0.14);
      g.add(panel);
    }
    const peep = box(0.6, 0.3, 0.03, '#ffd77a', { outline: 0.015 });
    peep.position.set(dx, 1.78, zf + 0.14);
    g.add(peep);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#f2c14e'));
    knob.position.set(dx + 0.4, 1.0, zf + 0.17);
    g.add(knob);
    const step = box(1.8, 0.3, 0.9, '#b8573a', { outline: 0.03 });
    step.position.set(dx, 0.15, zf + 0.45);
    g.add(step);
    const lampArm = box(0.06, 0.06, 0.3, '#2c3040', { outline: false });
    lampArm.position.set(dx + 0.95, 2.1, zf + 0.15);
    g.add(lampArm);
    const lampBox = box(0.22, 0.32, 0.22, '#2c3040', { outline: 0.015 });
    lampBox.position.set(dx + 0.95, 2.0, zf + 0.32);
    g.add(lampBox);
    const lampGlass = box(0.16, 0.22, 0.24, '#ffe9a8', { outline: false });
    lampGlass.position.set(dx + 0.95, 1.98, zf + 0.32);
    g.add(lampGlass);
    // Número de la casa
    const plate = box(0.34, 0.24, 0.03, '#2f6fd1', { outline: 0.01 });
    plate.position.set(dx - 0.95, 1.9, zf + 0.05);
    g.add(plate);

    for (const wx of [w * 0.05, w * 0.3]) this.windowSet(g, wx, h * 0.55, zf + 0.03, trim, rnd() < 0.3);
    if (rnd() < 0.5) {
      const gar = box(3.0, 2.3, 0.12, '#f4efe6', { outline: 0.04 });
      gar.position.set(w / 2 - 2, 1.15, zf + 0.04);
      g.add(gar);
      for (let i = 1; i < 5; i += 1) {
        const groove = box(2.9, 0.04, 0.02, '#d8d0c2', { outline: false });
        groove.position.set(w / 2 - 2, i * 0.46, zf + 0.11);
        g.add(groove);
      }
    }
    g.position.set(cx, 0, cz);
    g.rotation.y = rot;
    this.scene.add(g);
    this.addRect(cx, cz, w, d, rot);
    const front = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    for (let i = 0; i < 3; i += 1) {
      const o = (i - 1) * w * 0.3 + (rnd() - 0.5);
      this.bush(cx + front.x * (d / 2 + 1.2) + right.x * o, cz + front.z * (d / 2 + 1.2) + right.z * o, 0.6 + rnd() * 0.3, rnd() < 0.7);
    }
  }

  private buildHouses(): void {
    const E = Math.PI / 2;
    const list: [number, number, number][] = [
      // Noroeste (alrededor de la plaza)
      [-39, -14, E],
      [-39, -28, E],
      [-36, -41, 0],
      // Suroeste (alrededor de la fuente)
      [-39, 12, E],
      [-39, 24, E],
      // Noreste (alrededor de la antena)
      [40, -13, 0],
      [40, -27, 0],
      [10, -40, 0],
      [27, -40, 0],
      // Sureste
      [40, 22, 0],
      // Al sur del canal
      [-34, 41.5, 0],
      [-12, 41.5, 0],
      [36, 41.5, 0],
    ];
    for (const [x, z, r] of list) this.house(x, z, r);
  }

  private signTexture(text: string, bg: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#fff3dc';
    g.font = 'bold 64px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 68);
    g.strokeStyle = '#231a36';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 502, 118);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildShops(): void {
    const shops: [string, string][] = [
      ['HELADOS', '#e77fa6'],
      ['PANADERÍA', '#e0563f'],
      ['JUEGOS', '#2bb3a8'],
      ['TIENDA', '#6f8fcf'],
    ];
    shops.forEach(([name, col], i) => {
      const x = 13 + i * 9;
      const z = ROAD + WALK + 4;
      const b = box(8, 4.2, 7, pick(['#efe6d6', '#f6d9b0', '#e7c9c0']), { brush: 3 });
      b.position.set(x, 2.1, z);
      this.scene.add(b);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), withLife(new THREE.MeshBasicMaterial({ map: this.signTexture(name, col) })));
      sign.position.set(x, 3.4, z + 3.56);
      this.scene.add(sign);
      // Cornisa arriba del local
      const cornice = box(8.4, 0.3, 7.4, '#f4efe6', { outline: 0.03 });
      cornice.position.set(x, 4.3, z);
      this.scene.add(cornice);
      // Toldo a rayas con volado
      const aw = new THREE.Group();
      aw.position.set(x, 2.45, z + 4.2);
      aw.rotation.x = 0.35;
      const awning = box(6.2, 0.22, 1.6, col, { outline: 0.04 });
      aw.add(awning);
      for (let k = 0; k < 6; k += 1) {
        const stripe = box(0.5, 0.03, 1.6, '#fff6e8', { outline: false });
        stripe.position.set(-2.6 + k * 1.04 + 0.26, 0.12, 0);
        aw.add(stripe);
      }
      for (let k = 0; k < 12; k += 1) {
        // Media luna colgando del borde (la mitad de abajo de un círculo, mirando hacia afuera)
        const scallop = new THREE.Mesh(new THREE.CircleGeometry(0.26, 10, Math.PI, Math.PI), toon(k % 2 ? '#fff6e8' : col));
        scallop.rotation.x = -0.35;
        scallop.position.set(-2.84 + k * 0.517, -0.1, 0.81);
        aw.add(scallop);
      }
      this.scene.add(aw);
      // Vidriera con divisiones y zócalo, y puerta vidriada al costado
      const win = box(4.2, 1.7, 0.1, '#30406a', { outline: 0.05 });
      win.position.set(x - 1.0, 1.35, z + 3.52);
      this.scene.add(win);
      for (const mx of [-0.7, 0.7]) {
        const mull = box(0.08, 1.7, 0.06, '#f4efe6', { outline: false });
        mull.position.set(x - 1.0 + mx, 1.35, z + 3.59);
        this.scene.add(mull);
      }
      const winShine = box(0.22, 1.3, 0.01, '#5d77a8', { outline: false });
      winShine.position.set(x - 2.3, 1.4, z + 3.58);
      winShine.rotation.z = 0.45;
      this.scene.add(winShine);
      const base = box(4.4, 0.4, 0.2, '#6b5b52', { outline: 0.02 });
      base.position.set(x - 1.0, 0.2, z + 3.56);
      this.scene.add(base);
      const doorF = box(1.3, 2.3, 0.08, '#f4efe6', { outline: 0.03 });
      doorF.position.set(x + 2.5, 1.15, z + 3.52);
      this.scene.add(doorF);
      const door = box(1.0, 2.1, 0.08, '#30406a', { outline: 0.02 });
      door.position.set(x + 2.5, 1.05, z + 3.58);
      this.scene.add(door);
      const bar = box(0.6, 0.06, 0.06, '#f2c14e', { outline: false });
      bar.position.set(x + 2.5, 1.05, z + 3.66);
      this.scene.add(bar);
      // Macetas en la vereda
      for (const px of [-3.5, 3.5]) {
        const pot = rounded(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 10), toon('#b8573a'), 0.02);
        pot.position.set(x + px, 0.225, z + 4.1);
        this.scene.add(pot);
        const plant = rounded(new THREE.IcosahedronGeometry(0.42, 0), toon('#4f9a4a', 1), 0.02);
        plant.position.set(x + px, 0.75, z + 4.1);
        this.scene.add(plant);
        this.addRect(x + px, z + 4.1, 0.6, 0.6);
      }
      this.addRect(x, z, 8, 7);
    });
  }

  /* ---------- Postes, cables, autos ---------- */

  private pole(x: number, z: number): THREE.Vector3 {
    const p = box(0.26, 8, 0.26, '#7a5a42', { outline: 0.03 });
    p.position.set(x, 4, z);
    this.scene.add(p);
    const cb = box(2.2, 0.16, 0.16, '#7a5a42', { outline: 0.03 });
    cb.position.set(x, 7.4, z);
    this.scene.add(cb);
    this.circles.push({ x, z, r: 0.25 });
    return new THREE.Vector3(x, 7.4, z);
  }

  private wire(a: THREE.Vector3, b: THREE.Vector3, alongX: boolean): void {
    const mat = new THREE.LineBasicMaterial({ color: '#2a2238' });
    for (const off of [-0.9, -0.3, 0.3, 0.9]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i += 1) {
        const t = i / 10;
        const sag = Math.sin(t * Math.PI) * ZIP_SAG;
        pts.push(
          new THREE.Vector3(
            a.x + (b.x - a.x) * t + (alongX ? 0 : off),
            a.y - sag,
            a.z + (b.z - a.z) * t + (alongX ? off : 0),
          ),
        );
      }
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }

  private car(x: number, z: number, rot: number): void {
    // El frente del auto mira a +Z (capó adelante, baúl o caja de carga atrás)
    const g = new THREE.Group();
    const c = pick(CARS);
    const dark = `#${new THREE.Color(c).multiplyScalar(0.7).getHexString()}`;
    const pickup = rnd() < 0.4;
    const body = box(2.0, 0.8, 4.6, c, { brush: 2 });
    body.position.y = 0.75;
    g.add(body);
    const cabZ = pickup ? 0.4 : -0.2;
    const cabD = pickup ? 1.6 : 2.4;
    const cab = box(1.8, 0.75, cabD, c, { brush: 2 });
    cab.position.set(0, 1.5, cabZ);
    g.add(cab);
    // Vidrios: parabrisas, luneta y ventanillas con parantes del color del auto
    const glassCol = '#3b4f7a';
    const side = box(1.82, 0.5, cabD - 0.3, glassCol, { outline: false });
    side.position.set(0, 1.55, cabZ);
    g.add(side);
    for (const dz of [-1, 1]) {
      const pane = box(1.6, 0.5, 0.04, glassCol, { outline: false });
      pane.position.set(0, 1.55, cabZ + dz * (cabD / 2 + 0.01));
      g.add(pane);
    }
    const pillar = box(1.84, 0.52, 0.1, c, { outline: false });
    pillar.position.set(0, 1.55, cabZ + (pickup ? 0 : 0.2));
    g.add(pillar);
    // Reflejo en el parabrisas
    const shine = box(0.14, 0.4, 0.01, '#7c93c4', { outline: false });
    shine.position.set(-0.4, 1.56, cabZ + cabD / 2 + 0.035);
    shine.rotation.z = 0.5;
    g.add(shine);
    // Paragolpes, parrilla, faros, luces de atrás y patentes
    for (const dz of [-1, 1]) {
      const bumper = box(2.08, 0.22, 0.18, '#d8dbe2', { outline: 0.02 });
      bumper.position.set(0, 0.45, dz * 2.36);
      g.add(bumper);
      const plate = box(0.6, 0.18, 0.03, '#f4efe6', { outline: 0.008 });
      plate.position.set(0, 0.66, dz * 2.31);
      g.add(plate);
      const plateTxt = box(0.42, 0.05, 0.01, '#2f3a6a', { outline: false });
      plateTxt.position.set(0, 0.66, dz * 2.33);
      g.add(plateTxt);
      for (const sx of [-0.72, 0.72]) {
        const lamp = box(0.36, 0.2, 0.04, dz > 0 ? '#fff4c8' : '#e0453a', { outline: 0.01 });
        lamp.position.set(sx, 0.9, dz * 2.31);
        g.add(lamp);
      }
    }
    const grille = box(0.8, 0.22, 0.04, '#2a2733', { outline: false });
    grille.position.set(0, 0.88, 2.31);
    g.add(grille);
    for (let i = 0; i < 3; i += 1) {
      const bar = box(0.76, 0.025, 0.02, '#8a8f9a', { outline: false });
      bar.position.set(0, 0.81 + i * 0.07, 2.33);
      g.add(bar);
    }
    // Línea de cintura, puertas, manijas y espejos
    for (const sx of [-1, 1]) {
      const belt = box(0.02, 0.05, 4.4, dark, { outline: false });
      belt.position.set(sx * 1.01, 1.0, 0);
      g.add(belt);
      for (const dzz of pickup ? [cabZ - 0.75, cabZ + 0.75] : [cabZ - 1.15, cabZ, cabZ + 1.15]) {
        const seam = box(0.02, 0.7, 0.03, dark, { outline: false });
        seam.position.set(sx * 1.01, 0.8, dzz);
        g.add(seam);
      }
      for (const dzz of pickup ? [cabZ] : [cabZ - 0.6, cabZ + 0.55]) {
        const handle = box(0.03, 0.05, 0.2, '#d8dbe2', { outline: false });
        handle.position.set(sx * 1.02, 1.05, dzz);
        g.add(handle);
      }
      const mirror = box(0.2, 0.14, 0.12, c, { outline: 0.01 });
      mirror.position.set(sx * 1.05, 1.35, cabZ + cabD / 2 - 0.15);
      g.add(mirror);
    }
    if (pickup) {
      // Caja de carga abierta: piso oscuro y borde
      const bed = box(1.86, 0.06, 2.0, '#2a2733', { outline: false });
      bed.position.set(0, 1.16, -1.25);
      g.add(bed);
      for (const sx of [-0.95, 0.95]) {
        const wall = box(0.1, 0.32, 2.1, c, { outline: 0.012 });
        wall.position.set(sx, 1.3, -1.25);
        g.add(wall);
      }
      const gate = box(2.0, 0.32, 0.1, c, { outline: 0.012 });
      gate.position.set(0, 1.3, -2.25);
      g.add(gate);
      if (rnd() < 0.6) {
        const crate = box(0.7, 0.45, 0.6, '#b0855c', { outline: 0.015, brush: 1 });
        crate.position.set(0.3, 1.42, -1.4);
        crate.rotation.y = 0.2;
        g.add(crate);
      }
    } else if (rnd() < 0.4) {
      // Portaequipaje en el techo
      for (const sx of [-0.6, 0.6]) {
        const rail = box(0.06, 0.06, 1.8, '#2a2733', { outline: false });
        rail.position.set(sx, 1.91, cabZ);
        g.add(rail);
      }
    }
    // Ruedas con taza, arco de rueda oscuro
    for (const [wx, wz] of [
      [1, 1.5],
      [-1, 1.5],
      [1, -1.5],
      [-1, -1.5],
    ]) {
      const arch = box(0.06, 0.5, 1.1, '#2a2733', { outline: false });
      arch.position.set(wx * 1.0, 0.6, wz);
      g.add(arch);
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), toon('#262233'));
      wh.rotation.z = Math.PI / 2;
      wh.position.set(wx, 0.42, wz);
      g.add(wh);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10), toon('#c9ccd4'));
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx * 1.16, 0.42, wz);
      g.add(hub);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6), toon('#8a8f9a'));
      nut.rotation.z = Math.PI / 2;
      nut.position.set(wx * 1.18, 0.42, wz);
      g.add(nut);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(g);
    // Se puede saltar al capó (1.15 m) y desde ahí al techo (1.9 m)
    this.addRect(x, z, 2.1, 4.8, rot, 1.15);
    const roofX = x + Math.sin(rot) * cabZ;
    const roofZ = z + Math.cos(rot) * cabZ;
    this.addRect(roofX, roofZ, 1.8, cabD, rot, 1.9);
    this.carSpots.push({ x, z, rot, roofX, roofZ });
  }

  private buildPolesAndCars(): void {
    let prev: THREE.Vector3 | null = null;
    // Postes del lado sur de la calle: del lado norte tapaban la plaza en la vista isométrica.
    // Cada fila de postes es además un recorrido de tirolesa (zipLines).
    const ew: THREE.Vector3[] = [];
    for (let x = -44; x <= 44; x += 16) {
      const p = this.pole(x + 3, ROAD + WALK - 0.5);
      if (prev) this.wire(prev, p, true);
      prev = p;
      ew.push(p);
    }
    prev = null;
    const ns: THREE.Vector3[] = [];
    for (let z = -44; z <= 24; z += 17) {
      const p = this.pole(ROAD + WALK - 0.5, z + 2);
      if (prev) this.wire(prev, p, false);
      prev = p;
      ns.push(p);
    }
    this.zipLines.push(ew, ns);
    this.car(-34, ROAD - 1.4, Math.PI / 2);
    this.car(-6 - 14, -(ROAD - 1.4), -Math.PI / 2);
    this.car(30, -(ROAD - 1.4), -Math.PI / 2);
    this.car(-(ROAD - 1.4), -36, 0);
    this.car(ROAD - 1.4, 18, Math.PI);
  }

  /* ---------- Naturaleza ---------- */

  private bush(x: number, z: number, r: number, flowers: boolean): void {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i += 1) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.6 + rnd() * 0.5), 0), toon(rnd() < 0.5 ? '#3f6e34' : '#56853d', 2));
      b.position.set((rnd() - 0.5) * r * 1.6, r * 0.6, (rnd() - 0.5) * r * 1.2);
      b.castShadow = true;
      g.add(b);
      if (flowers) {
        for (let k = 0; k < 5; k += 1) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), flat(rnd() < 0.7 ? '#e8327f' : '#ff7aa8'));
          f.position.copy(b.position).add(new THREE.Vector3((rnd() - 0.5) * r, rnd() * 0.6 * r, (rnd() - 0.5) * r));
          g.add(f);
        }
      }
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  private tree(x: number, z: number): void {
    const g = new THREE.Group();
    const h = 4 + rnd() * 2;
    const trunk = toon('#a97a52', 2);
    for (let i = 0; i < 4; i += 1) {
      const r = 0.4 - i * 0.06;
      const s = rounded(new THREE.CylinderGeometry(r * 0.85, r, h / 4 + 0.1, 7), trunk, 0);
      s.position.y = (i + 0.5) * (h / 4);
      g.add(s);
    }
    for (let i = 0; i < 9; i += 1) {
      const r = 1.2 + rnd() * 1.2;
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), toon(pick(['#2f5a2b', '#3e6b33', '#4f7f3a', '#5f8f3f']), 2));
      const a = rnd() * Math.PI * 2;
      const d = rnd() * 2.2;
      c.position.set(Math.cos(a) * d, h + rnd() * 2, Math.sin(a) * d);
      c.scale.y = 0.75;
      c.castShadow = true;
      outline(c, 0.05);
      g.add(c);
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.swaying.push({ g, p: rnd() * 6 });
    this.circles.push({ x, z, r: 0.45 });
  }

  private palm(x: number, z: number): void {
    const g = new THREE.Group();
    const h = 7 + rnd() * 5;
    const seg = 7;
    const trunk = toon('#9b7653', 2);
    let px = 0;
    let pz = 0;
    const lx = (rnd() - 0.5) * 0.08;
    const lz = (rnd() - 0.5) * 0.08;
    for (let i = 0; i < seg; i += 1) {
      const r = 0.32 - i * 0.022;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, h / seg + 0.05, 7), trunk);
      s.position.set(px, (i + 0.5) * (h / seg), pz);
      s.castShadow = true;
      g.add(s);
      px += lx * i * 0.6;
      pz += lz * i * 0.6;
    }
    const top = new THREE.Group();
    top.position.set(px, h, pz);
    const fr = [toon('#3f9152', 2), toon('#5db35a', 2)];
    const leaf = new THREE.ConeGeometry(0.55, 4.0, 4);
    for (let i = 0; i < 9; i += 1) {
      const piv = new THREE.Group();
      piv.rotation.y = -(i / 9) * Math.PI * 2 - rnd() * 0.3;
      const f = new THREE.Mesh(leaf, fr[i % 2]);
      f.scale.set(1, 1, 0.22);
      f.rotation.z = -Math.PI / 2 - 0.55 - rnd() * 0.3;
      f.position.x = 1.8;
      f.castShadow = true;
      outline(f, 0.03);
      piv.add(f);
      top.add(piv);
    }
    g.add(top);
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.swaying.push({ g: top, p: rnd() * 6 });
    this.circles.push({ x, z, r: 0.4 });
  }

  private scatterNature(): void {
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < 46; tries += 1) {
      const x = (rnd() * 2 - 1) * (BOUNDS + 4);
      const z = (rnd() * 2 - 1) * (BOUNDS + 4);
      if (!this.isFree(x, z, 2.2)) continue;
      const roll = rnd();
      if (roll < 0.45) this.tree(x, z);
      else if (roll < 0.7) this.palm(x, z);
      else this.bush(x, z, 0.7 + rnd() * 0.4, rnd() < 0.6);
      placed += 1;
    }
    // Avenida de palmeras a lo largo de la calle este-oeste
    for (let x = -42; x <= 42; x += 12) {
      if (Math.abs(x) < 10 || (x > 8 && x < 46)) continue;
      this.palm(x + 2, ROAD + WALK + 0.9);
    }
  }

  private buildButterflies(): void {
    const colors = ['#ffe066', '#ff9ff3', '#5ee7ff', '#ffffff'];
    for (let i = 0; i < 8; i += 1) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide });
      const wing = new THREE.CircleGeometry(0.12, 6);
      wing.translate(0.12, 0, 0);
      const wl = new THREE.Mesh(wing, mat);
      const wr = new THREE.Mesh(wing, mat);
      wr.rotation.y = Math.PI;
      g.add(wl, wr);
      g.userData.dynamic = true;
      this.scene.add(g);
      this.butterflies.push({ g, wl, wr, cx: (rnd() * 2 - 1) * 35, cz: (rnd() * 2 - 1) * 28, r: 3 + rnd() * 5, s: 0.25 + rnd() * 0.3, p: rnd() * 10 });
    }
  }

  private shadowSpan = 26;

  /** Ajusta el área que cubre la sombra del sol (metros desde el foco): más chica = sombras más nítidas. */
  setShadowSpan(span: number): void {
    const v = Math.round(span * 2) / 2;
    if (v === this.shadowSpan) return;
    this.shadowSpan = v;
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -v;
    sc.right = sc.top = v;
    sc.updateProjectionMatrix();
  }

  /** Ambiente: el sol y el cielo siguen al foco, nubes, viento en árboles, mariposas. */
  update(dt: number, time: number, focus: THREE.Vector3, camPos: THREE.Vector3): void {
    this.sun.position.set(focus.x + 26, 40, focus.z + 12);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sky.position.set(camPos.x, 0, camPos.z);
    this.moodShown += (this.mood - this.moodShown) * Math.min(1, dt * 1.2);
    const m = this.moodShown;
    (this.sky.material as THREE.ShaderMaterial).uniforms.skyLife.value = m;
    FOG_COLOR.copy(World.FOG_GLOOM).lerp(World.FOG_ALIVE, m);
    (this.scene.fog as THREE.Fog).color.copy(FOG_COLOR);
    (this.scene.background as THREE.Color).copy(World.BG_GLOOM).lerp(World.BG_ALIVE, m);
    this.hemi.intensity = 1.35 + 0.35 * m;
    this.sun.intensity = 1.9 + 0.5 * m;
    for (const c of this.clouds) c.position.x += dt * 0.6;
    // Corriente del canal (hacia el este) y el bote que se mece amarrado
    for (const d of this.drifting) {
      d.o.position.x += d.speed * dt;
      if (d.o.position.x > 62) d.o.position.x = -62;
      d.o.position.z += Math.sin(time * 0.6 + d.p) * 0.002;
    }
    if (this.boat) {
      this.boat.position.y = -0.75 + Math.sin(time * 1.3) * 0.04;
      this.boat.rotation.z = Math.sin(time * 1.1) * 0.04;
    }
    for (const s of this.swaying) {
      s.g.rotation.z = Math.sin(time * 0.9 + s.p) * 0.03;
      s.g.rotation.x = Math.sin(time * 0.7 + s.p * 1.3) * 0.02;
    }
    for (const b of this.butterflies) {
      const t = time * b.s + b.p;
      b.g.position.set(b.cx + Math.cos(t) * b.r, 1.2 + Math.sin(t * 2.3) * 0.5, b.cz + Math.sin(t * 1.3) * b.r);
      // Las mariposas solo vuelan donde el barrio ya tiene vida
      const alive = LIFE.at(b.g.position.x, b.g.position.z);
      b.g.visible = alive > 0.3;
      b.g.scale.setScalar(Math.min(1, alive * 1.5));
      b.g.rotation.y = -t;
      const flap = Math.sin(time * 18 + b.p) * 0.9;
      b.wl.rotation.y = flap;
      b.wr.rotation.y = Math.PI - flap;
    }
  }
}
