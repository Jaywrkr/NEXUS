import * as THREE from 'three';
import { box, keepVivid, rounded, toon, toonUnique, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Distrito Cerro y cascada (Fase 8, PLAN_MAESTRO.md §6), al oeste: se llega siguiendo la calle este-oeste.
 * - Un cerro con escalones de roca que se suben saltando hasta la meseta del mirador (h = 7,2).
 * - Arriba sale una tirolesa larga que baja hasta el pie del cerro.
 * - Al norte, contra el acantilado, la cascada congelada (se revive con cable, carrera «cable de hielo»).
 * - En la cara sur de la meseta, la entrada a la cueva oscura (interior en x = 900): adentro no se ve nada;
 *   con la capucha ⚡ (Mundo Voltio) aparecen los cristales, que son los nodos de su circuito.
 */

export const CERRO_REGION: Rect = { minX: -100, maxX: -51, minZ: -32, maxZ: 32 };
/** La calle este-oeste sigue desde el Centro hasta el Cerro. */
export const CERRO_CORRIDOR: Rect = { minX: -52, maxX: -44, minZ: -6.1, maxZ: 6.1 };
export const CAVE_X = 900;
export const TOP_H = 7.2;
export const STEP_H = 0.9;

export const CERRO = {
  /** Meseta del mirador. */
  top: { minX: -100, maxX: -83.5, minZ: 10, maxZ: 28 },
  /** Escalones: centro x de cada uno (z = 20), 3 × 3 m, alto 0,9 × (i + 1). */
  steps: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: -64 - i * 3, z: 20, h: STEP_H * (i + 1) })),
  mirador: { x: -91, z: 13.2 },
  zipTop: { x: -88, z: 23.5 },
  zipBottom: { x: -58, z: -14 },
  cascade: { x: -74, z: -31.4 },
  cascadeSource: { x: -64, z: -25.5 },
  cave: { doorX: -93, z: 28 },
  lalo: { x: -57.5, z: 9.5, faceX: -52, faceZ: 12 },
  chispi: { x: -86, z: -14 },
  /** Nodos del circuito de la cueva (cristales) y el Chispi atrapado adentro. */
  caveNodes: [
    { x: CAVE_X - 4, z: -2.6 },
    { x: CAVE_X + 0.5, z: -3 },
    { x: CAVE_X + 4.6, z: 0.2 },
  ],
  caveChispi: { x: CAVE_X - 3.2, z: 1.6 },
};

export interface CaveRoom extends ReviveRoom {
  /** Prende los cristales (al cerrar el circuito de la cueva). */
  light(): void;
}

export interface CerroInfo {
  zipLine: THREE.Vector3[];
  cave: CaveRoom;
}

export function buildCerro(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number }[]): CerroInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = CERRO_REGION;
  // Pasto del cerro y camino de tierra desde la calle
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 2, '#8fae6a', { outline: false, cast: false, brush: 22 }), (R.minX + R.maxX) / 2, 0.035, (R.minZ + R.maxZ) / 2);
  const C = CERRO_CORRIDOR;
  add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ - 4, '#b8a99a', { outline: false, cast: false, brush: 8 }), (C.minX + C.maxX) / 2, 0.04, 0);
  add(box(10, 0.07, 3, '#c9b48a', { outline: false, cast: false, brush: 6 }), -56, 0.045, 0);
  for (let i = 0; i < 6; i += 1) add(box(2.4, 0.06, 2.4, '#c9b48a', { outline: false, cast: false }), -60 - i * 1.6, 0.045, 4 + i * 2.6);

  // Acantilado del norte (la cascada cae por su cara sur)
  const rock = toon('#8a7f76');
  const rockDark = toon('#6e655e');
  add(box(46, 10, 7, '', { mat: rock, outline: 0.06, brush: 4 }), -79, 5, -36.5);
  rects.push({ minX: -102, maxX: -56, minZ: -40, maxZ: -33 });
  for (const [x, w, h] of [
    [-96, 6, 12],
    [-86, 7, 11],
    [-62, 6, 11.5],
  ] as [number, number, number][]) add(box(w, h, 5, '', { mat: rockDark, outline: 0.05 }), x, h / 2, -37.5);

  // La meseta del mirador y sus escalones de roca
  const T = CERRO.top;
  const top = box(T.maxX - T.minX, TOP_H, T.maxZ - T.minZ, '', { mat: rock, outline: 0.06, brush: 4 });
  add(top, (T.minX + T.maxX) / 2, TOP_H / 2, (T.minZ + T.maxZ) / 2);
  add(box(T.maxX - T.minX + 0.2, 0.25, T.maxZ - T.minZ + 0.2, '#7fa65a', { outline: 0.02 }), (T.minX + T.maxX) / 2, TOP_H - 0.05, (T.minZ + T.maxZ) / 2);
  rects.push({ ...T, h: TOP_H });
  for (const s of CERRO.steps) {
    add(box(3, s.h, 3, '', { mat: s.h > 4 ? rockDark : rock, outline: 0.04 }), s.x, s.h / 2, s.z);
    add(box(3.1, 0.18, 3.1, '#7fa65a', { outline: 0.015 }), s.x, s.h - 0.02, s.z);
    rects.push({ minX: s.x - 1.5, maxX: s.x + 1.5, minZ: s.z - 1.5, maxZ: s.z + 1.5, h: s.h });
  }
  // Mirador: baranda, banco y largavista mirando al norte (hacia la ciudad y el parque)
  const M = CERRO.mirador;
  const wood = toon('#a97a52');
  add(box(8, 0.12, 0.12, '', { mat: wood, outline: 0.01 }), M.x, TOP_H + 1, T.minZ + 0.4);
  for (let x = M.x - 4; x <= M.x + 4; x += 2) add(box(0.14, 1, 0.14, '', { mat: wood, outline: 0.01 }), x, TOP_H + 0.5, T.minZ + 0.4);
  add(box(2, 0.12, 0.6, '', { mat: wood, outline: 0.02 }), M.x + 3, TOP_H + 0.5, M.z + 1.4);
  rects.push({ minX: M.x + 2, maxX: M.x + 4, minZ: M.z + 1.1, maxZ: M.z + 1.7, h: TOP_H + 0.56 });
  const scope = new THREE.Group();
  const leg = rounded(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8), toon('#3d3550'), 0.01);
  leg.position.y = 0.55;
  scope.add(leg);
  const tube = rounded(new THREE.CylinderGeometry(0.12, 0.17, 0.8, 12), toon('#ffc23a'), 0.012);
  tube.rotation.x = Math.PI / 2 - 0.25;
  tube.position.set(0, 1.2, -0.1);
  scope.add(tube);
  add(scope, M.x, TOP_H, M.z);
  circles.push({ x: M.x, z: M.z, r: 0.3 });
  // Cartel MIRADOR
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), withLife(new THREE.MeshBasicMaterial({ map: label('MIRADOR', '#4f7a3a') })));
  add(sign, M.x - 4, TOP_H + 1.6, T.minZ + 0.5);

  // Tirolesa larga: poste arriba de la meseta y otro al pie del cerro
  const zipLine: THREE.Vector3[] = [];
  for (const [p, base] of [
    [CERRO.zipTop, TOP_H],
    [CERRO.zipBottom, 0],
  ] as [{ x: number; z: number }, number][]) {
    const post = rounded(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 10), toon('#6a3e26'), 0.012);
    add(post, p.x, base + 1.8, p.z);
    add(box(0.9, 0.14, 0.14, '#ffc23a', { outline: 0.01 }), p.x, base + 3.5, p.z);
    circles.push({ x: p.x, z: p.z, r: 0.25 });
    zipLine.push(new THREE.Vector3(p.x, base + 3.5, p.z));
  }
  const [a, b] = zipLine;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 0.9, a.z + (b.z - a.z) * t));
  }
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.04, 6), toon('#2c2838'));
  scene.add(cable);

  // Entrada de la cueva (cara sur de la meseta, mira a +Z): boca negra con arco de piedras
  const cv = CERRO.cave;
  add(box(3, 3, 0.1, '#0b0814', { outline: false }), cv.doorX, 1.5, cv.z + 0.06);
  for (let i = 0; i <= 8; i += 1) {
    const ang = (i / 8) * Math.PI;
    const stone = rounded(new THREE.DodecahedronGeometry(0.45, 0), rockDark, 0.012);
    add(stone, cv.doorX + Math.cos(ang) * 1.9, 0.3 + Math.sin(ang) * 3, cv.z + 0.3);
  }
  const caveSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.5), new THREE.MeshBasicMaterial({ map: label('CUEVA', '#3d3550') }));
  add(caveSign, cv.doorX + 3, 1.8, cv.z + 0.4);
  add(rounded(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), wood, 0.008), cv.doorX + 3, 0.9, cv.z + 0.35);

  // Pinos (con colisión) y piedras
  const pine = toon('#2f6b45');
  const pineDark = toon('#24563a');
  for (const [x, z, s] of [
    [-55, -20, 1], [-60, -29, 1.2], [-70, -20, 0.9], [-80, -24, 1.1], [-92, -22, 1.3], [-97, -6, 1], [-96, 2, 1.2],
    [-72, 2, 0.9], [-78, -6, 1.1], [-66, 30, 1], [-74, 29, 0.8], [-58, 26, 1.1], [-86, -2, 0.9], [-54, -28, 0.9],
  ] as [number, number, number][]) {
    const g = new THREE.Group();
    const trunk = rounded(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.2 * s, 8), toon('#6a3e26'), 0.01);
    trunk.position.y = 0.6 * s;
    g.add(trunk);
    for (let k = 0; k < 3; k += 1) {
      const cone = rounded(new THREE.ConeGeometry((1.5 - k * 0.38) * s, 1.6 * s, 9), k % 2 ? pineDark : pine, 0.02);
      cone.position.y = (1.5 + k * 0.95) * s;
      g.add(cone);
    }
    add(g, x, 0, z);
    circles.push({ x, z, r: 0.45 * s });
  }
  for (const [x, z, s] of [
    [-63, -8, 0.8], [-82, 6, 1.1], [-90, -28, 0.9], [-53, 18, 0.7],
  ] as [number, number, number][]) {
    add(rounded(new THREE.DodecahedronGeometry(s, 0), rock, 0.02), x, s * 0.6, z);
    circles.push({ x, z, r: s * 0.9 });
  }

  return { zipLine, cave: buildCave(scene, rects) };
}

function label(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 66px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 118);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** La cueva: oscura y gris; sus tres racimos de cristales son los nodos del circuito del Mundo Voltio. */
function buildCave(scene: THREE.Scene, rects: Rect[]): CaveRoom {
  const RX = CAVE_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 13,
    d: 9,
    wall: '#7a6f8a',
    low: '#5a5068',
    trim: '#9be7ff',
    floor: ['#4a4256', '#544a60'],
    base: '#2c2838',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { add, solid, z0 } = k;
  const crystals: THREE.MeshToonMaterial[] = [];
  // Los cristales van en su propio grupo (fuera de makeGray, que copia materiales): se prenden con el circuito
  const cg = new THREE.Group();
  const colors = ['#9be7ff', '#c08cff', '#7dffef'];
  CERRO.caveNodes.forEach((n, i) => {
    for (let j = 0; j < 4; j += 1) {
      const m = toonUnique('#6a6478');
      m.userData.on = colors[i];
      m.color.set('#6a6478');
      crystals.push(m);
      const c = rounded(new THREE.ConeGeometry(0.22 + j * 0.05, 0.9 + j * 0.35, 6), m, 0.012);
      const a = (j / 4) * Math.PI * 2;
      c.position.set(n.x + Math.cos(a) * 0.45, 0.45 + j * 0.17, n.z - 0.9 + Math.sin(a) * 0.3);
      c.rotation.z = Math.cos(a) * 0.3;
      cg.add(c);
    }
    solid(n.x, n.z - 0.9, 1.2, 0.8);
  });
  // Estalactitas y piedras sueltas
  const rockMat = toon('#5a5068');
  for (let i = 0; i < 9; i += 1) {
    const st = rounded(new THREE.ConeGeometry(0.25, 1 + (i % 3) * 0.4, 6), rockMat, 0.01);
    st.rotation.x = Math.PI;
    add(st, RX - 5 + i * 1.25, 3.3 - (i % 3) * 0.2, z0 + 1 + (i % 2) * 1.5);
  }
  for (const [x, z] of [
    [RX - 5.3, 3],
    [RX + 5.6, -3.2],
  ] as [number, number][]) {
    add(rounded(new THREE.DodecahedronGeometry(0.7, 0), rockMat, 0.015), x, 0.45, z);
    solid(x, z, 1.2, 1.2);
  }
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  cg.userData.dynamic = true;
  keepVivid(cg);
  scene.add(cg);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
    exit: { x: RX + 3.5, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-cueva', x: RX + 5.6, z: -3.2, y: 1.6 },
    source: { x: RX, z: 0 },
    target: { x: RX, z: 0 },
    gray,
    light() {
      for (const m of crystals) m.color.set(m.userData.on as string);
    },
  };
}
