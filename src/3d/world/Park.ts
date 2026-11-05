import * as THREE from 'three';
import { box, flat, keepVivid, rounded, toon, withLife } from '../core/render';
import { roomShell, type ReviveRoom } from './MigaHouse';
import { makeGray } from './revive';
import type { Rect } from './World';

/*
 * Distrito Parque de diversiones (Fase 6, PLAN_MAESTRO.md §6), al norte del Centro siguiendo la calle
 * norte-sur. Piso de baldosas de colores, cerco, portón con arco de foquitos, puestos de feria y la
 * casa de los espejos (afuera + habitación en x = 800). Los juegos (objects/rides.ts) se ubican con PARK.
 */

export const PARK_REGION: Rect = { minX: -36, maxX: 36, minZ: -94, maxZ: -52 };
export const PARK_GATE_Z = -52;

export const PARK = {
  carousel: { x: -15, z: -66 },
  carouselSource: { x: -5.5, z: -60 },
  wheel: { x: 17, z: -80 },
  wheelSource: { x: 9, z: -70.5 },
  wheelNodes: [
    { x: 12, z: -64 },
    { x: 20, z: -66.5 },
    { x: 27, z: -64 },
  ],
  coasterStation: { x: -9, z: -82 },
  coasterSource: { x: -4.5, z: -76.5 },
  coasterNodes: [
    { x: -30, z: -70 },
    { x: -22, z: -74 },
    { x: -14, z: -72.5 },
  ],
  /** Recorrido de la montaña rusa (x, altura, z); el primero es la estación. */
  coasterTrack: [
    [-9, 0.9, -82],
    [-9, 1.2, -88],
    [-14, 6.5, -90.5],
    [-22, 7.5, -90.5],
    [-28, 3, -89],
    [-31, 1.6, -84],
    [-30, 4.5, -78.5],
    [-24, 2, -78.5],
    [-18, 4.2, -79],
    [-13, 1.3, -77.5],
  ] as [number, number, number][],
  tita: { x: 3, z: -58.5, faceX: 0, faceZ: -55 },
  mirror: { x: 24, z: -58, w: 8, d: 5, doorX: 25.5 },
  chispi: { x: 3, z: -88 },
};

export const MIRROR_X = 800;

function signTexture(text: string, bg: string, w = 512, h = 128, size = 60): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff3dc';
  g.font = `bold ${size}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, w - 10, h - 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildPark(scene: THREE.Scene, rects: Rect[]): void {
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = PARK_REGION;
  const cx = (R.minX + R.maxX) / 2;
  const cz = (R.minZ + R.maxZ) / 2;
  // Piso: baldosas en damero de dos tonos (se pintan grises hasta que el parque revive)
  const tileA = toon('#e8dcc4', 6);
  const tileB = toon('#d9c7a4', 6);
  add(box(R.maxX - R.minX + 1, 0.1, R.maxZ - R.minZ + 1, '', { mat: tileA, outline: false, cast: false }), cx, 0.05, cz);
  for (let x = R.minX; x < R.maxX; x += 4) {
    for (let z = R.minZ; z < R.maxZ; z += 4) {
      if (((x - R.minX) / 4 + (z - R.minZ) / 4) % 2) continue;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), tileB);
      t.rotation.x = -Math.PI / 2;
      add(t, x + 2, 0.106, z + 2);
    }
  }
  // Camino desde el Centro: la calle norte-sur sigue hasta el portón
  add(box(8, 0.06, 8, '#8a817c', { outline: false, cast: false, brush: 24 }), 0, 0.03, -48);

  // Cerco con barrotes de colores (deja la entrada del sur, en la calle)
  const cols = ['#ff5a6e', '#ffe066', '#5ec8ff', '#7be07a'];
  const post = (x: number, z: number, i: number) => add(box(0.14, 1.3, 0.14, cols[i % 4], { outline: 0.01 }), x, 0.65, z);
  let k = 0;
  for (let x = R.minX; x <= R.maxX; x += 2) {
    post(x, R.minZ - 0.3, k++);
    if (Math.abs(x) > 5) post(x, R.maxZ + 0.3, k++);
  }
  for (let z = R.minZ; z <= R.maxZ; z += 2) {
    post(R.minX - 0.3, z, k++);
    post(R.maxX + 0.3, z, k++);
  }
  for (const [x1, x2] of [
    [R.minX, -5],
    [5, R.maxX],
  ]) add(box(x2 - x1, 0.08, 0.08, '#fff3dc', { outline: false }), (x1 + x2) / 2, 1.2, R.maxZ + 0.3);

  // Portón: arco con letrero y foquitos
  const steel = toon('#3d3550');
  for (const sx of [-1, 1]) {
    add(box(0.8, 5, 0.8, '', { mat: steel, outline: 0.03 }), sx * 5.2, 2.5, PARK_GATE_Z);
    rects.push({ minX: sx * 5.2 - 0.45, maxX: sx * 5.2 + 0.45, minZ: PARK_GATE_Z - 0.45, maxZ: PARK_GATE_Z + 0.45 });
  }
  add(box(11.2, 1.2, 0.5, '#ff5a6e', { outline: 0.03 }), 0, 5.4, PARK_GATE_Z);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), withLife(new THREE.MeshBasicMaterial({ map: signTexture('PARQUE DE DIVERSIONES', '#ff5a6e', 900, 110, 64) })));
  add(sign, 0, 5.4, PARK_GATE_Z + 0.27);
  const bulb = flat('#ffe066');
  for (let i = 0; i < 14; i += 1) add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), bulb), -5.2 + i * 0.8, 6.1, PARK_GATE_Z + 0.3);

  // Puestos de feria (miran a +Z): pochoclo, tiro al blanco, algodón de azúcar
  const stall = (x: number, z: number, name: string, col: string) => {
    add(box(3, 2.2, 2, '#fff3dc', { outline: 0.03, brush: 2 }), x, 1.1, z);
    rects.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1, maxZ: z + 1 });
    for (let i = 0; i < 6; i += 1) add(box(0.5, 0.12, 2.6, i % 2 ? '#fff3dc' : col, { outline: false }), x - 1.25 + i * 0.5, 2.5, z + 0.25);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), withLife(new THREE.MeshBasicMaterial({ map: signTexture(name, col, 420, 100, 48) })));
    add(t, x, 1.75, z + 1.01);
    add(box(2.8, 0.1, 0.6, '#7a4a2e', { outline: 0.01 }), x, 1.0, z + 1.2);
  };
  stall(-30, -58, 'POCHOCLO', '#ff5a6e');
  stall(32, -72, 'TIRO', '#5ec8ff');
  stall(30, -88, 'ALGODÓN', '#ff9ff3');

  // Casa de los espejos: fachada con espejos que brillan y puerta que mira a +Z
  const M = PARK.mirror;
  add(box(M.w, 3.6, M.d, '#5ec8ff', { outline: 0.05, brush: 3 }), M.x, 1.8, M.z);
  rects.push({ minX: M.x - M.w / 2, maxX: M.x + M.w / 2, minZ: M.z - M.d / 2, maxZ: M.z + M.d / 2 });
  add(box(M.w + 0.6, 0.4, M.d + 0.6, '#ff9ff3', { outline: 0.03 }), M.x, 3.8, M.z);
  const doorZ = M.z + M.d / 2;
  add(box(1.8, 2.4, 0.1, '#1d1630', { outline: 0.02 }), M.doorX, 1.2, doorZ + 0.02);
  const mirrorMat = new THREE.MeshBasicMaterial({ color: '#d6f4ff' });
  for (const dx of [-3, -1.6]) add(box(1.1, 2, 0.06, '', { mat: mirrorMat, outline: 0.01 }), M.x + dx, 1.5, doorZ + 0.03);
  const ms = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.8), withLife(new THREE.MeshBasicMaterial({ map: signTexture('ESPEJOS', '#7b4fb0') })));
  add(ms, M.x - 0.6, 3.1, doorZ + 0.03);

  // Faroles de feria y bancos
  for (const [x, z] of [
    [-6, -70],
    [6, -62],
    [-2, -86],
    [24, -70],
  ]) {
    add(rounded(new THREE.CylinderGeometry(0.06, 0.08, 3, 8), steel, 0.01), x, 1.5, z);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), withLife(new THREE.MeshBasicMaterial({ color: '#ffe066' }))), x, 3.1, z);
  }
}

/** La casa de los espejos por dentro (x = 800): pasillos de espejos y la bola de espejos para revivir. */
export function buildMirrorRoom(scene: THREE.Scene, rects: Rect[]): ReviveRoom {
  const RX = MIRROR_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 11,
    d: 8,
    wall: '#d6f4ff',
    low: '#9fd8f2',
    trim: '#ff9ff3',
    floor: ['#2a2146', '#3a3156'],
    base: '#1d1630',
    doorFrom: 802.5,
    doorTo: 804.5,
  });
  const { add, solid, x0, z0 } = k;
  // Espejos: paneles que forman un pequeño laberinto (no tapan el camino a la bola)
  const glass = new THREE.MeshBasicMaterial({ color: '#c9ecff' });
  const frame = toon('#ff9ff3');
  const panel = (x: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    const m = box(1.8, 2.4, 0.08, '', { mat: glass, outline: 0.012 });
    m.position.y = 1.3;
    g.add(m);
    const f = box(1.9, 0.12, 0.14, '', { mat: frame, outline: false });
    f.position.y = 2.55;
    g.add(f);
    g.rotation.y = rotY;
    g.position.set(x, 0, z);
    k.g.add(g);
    const w = Math.abs(Math.cos(rotY)) > 0.5 ? 1.8 : 0.2;
    const d = Math.abs(Math.cos(rotY)) > 0.5 ? 0.2 : 1.8;
    solid(x, z, w, d);
  };
  panel(RX - 3.2, 0.5, 0);
  panel(RX - 1.2, -1.2, Math.PI / 2);
  panel(RX + 2.6, 0.2, 0);
  panel(RX + 0.9, 2.1, Math.PI / 2);
  // Espejos de la pared (deforman: uno ancho, uno alto)
  for (const [x, sx, sy] of [
    [x0 + 0.05, 1, 1.3],
    [x0 + 0.05, 1.4, 0.8],
  ] as [number, number, number][]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * sx, 2 * sy), glass);
    m.rotation.y = Math.PI / 2;
    add(m, x, 1.6, sx > 1.2 ? -1.8 : 1.6);
  }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.4), glass);
  add(back, RX, 1.6, z0 + 0.04);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: 803.5, z: k.z1 - 1.3 },
    exit: { x: 803.5, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-espejos', x: RX - 4.2, z: z0 + 0.9, y: 0.9 },
    source: { x: RX - 4.2, z: 2.6 },
    target: { x: RX + 0.4, z: -2.4 },
    gray,
  };
}
