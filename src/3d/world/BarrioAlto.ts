import * as THREE from 'three';
import { box, keepVivid, rounded, toon, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Expansión, Fase 15 (PLAN_EXPANSION.md): Barrio Alto y mercado, al este del Skatepark. Un mercado con seis
 * puestos que se pasan la luz entre ellos (cualquier puesto prendido le pasa el cable a otro), un cine que
 * abre cuando el mercado vuelve (adentro, x = 1300, el proyector pasa una película), la biblioteca con un
 * farol de lectura trabado (circuito del Mundo Voltio) y las terrazas: cinco techos escalonados (1 a 5 m)
 * que se suben saltando o con la patineta (rampita al pie), con una tirolesa que baja al mercado.
 */

export const ALTO_REGION: Rect = { minX: 100, maxX: 160, minZ: -32, maxZ: 34 };
/** Desde el Skatepark, por la reja del este. */
export const ALTO_FROM_SKATE: Rect = { minX: 95.5, maxX: 101, minZ: -3, maxZ: 3 };
export const ALTO_X = 1300;

export type StallKind = 'frutas' | 'pan' | 'flores' | 'juguetes' | 'telas' | 'discos';

export const ALTO = {
  marketSource: { x: 104.5, z: 13 },
  stalls: [
    { x: 110, z: 15, kind: 'frutas' },
    { x: 119, z: 15, kind: 'pan' },
    { x: 128, z: 15, kind: 'flores' },
    { x: 110, z: 24, kind: 'juguetes' },
    { x: 119, z: 24, kind: 'telas' },
    { x: 128, z: 24, kind: 'discos' },
  ] as { x: number; z: number; kind: StallKind }[],
  kiosko: { x: 119, z: 19.6, faceX: 121, faceZ: 30 },
  cine: { x: 114, z: -20, w: 14, d: 12, doorX: 114 },
  library: { x: 140, z: -20, w: 16, d: 12 },
  libLamp: { x: 140, z: -11 },
  libSource: { x: 133.5, z: -9.5 },
  libNodes: [
    { x: 135, z: -7.5 },
    { x: 140, z: -6.5 },
    { x: 145, z: -7.5 },
  ],
  luli: { x: 147, z: -11.5, faceX: 141, faceZ: -4 },
  /** Terrazas: cinco techos escalonados de oeste a este. */
  roofs: [1, 2, 3, 4, 5].map((h, i) => ({ minX: 134 + i * 5, maxX: 139 + i * 5, minZ: 8, maxZ: 14, h })) as (Rect & { h: number })[],
  kicker: { x: 131.6, z: 11, dirX: 1, dirZ: 0, halfW: 1.1, halfL: 1.2, ramp: false },
  zipTop: { x: 157.5, z: 11 },
  zipBottom: { x: 132, z: 29 },
  chispi: { x: 150, z: 24 },
  cats: [
    [104, -12],
    [126, -9],
    [153, -20],
    [156, 26],
    [102, 30],
  ] as [number, number][],
};

export interface AltoInfo {
  hall: ReviveRoom & { projector: { x: number; z: number } };
  zipLine: THREE.Vector3[];
  /** Prende el cartel del cine (cuando el mercado vuelve). */
  lightMarquee(): void;
  /** Prende las ventanas de la biblioteca. */
  lightLibrary(): void;
  /** Pantalla del cine: dibuja la película (t en segundos) o la apaga. */
  film(t: number | null): void;
}

function sign(text: string, bg: string, fg: string): THREE.MeshBasicMaterial {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = fg;
  g.font = 'bold 60px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(6, 6, 500, 116);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return withLife(new THREE.MeshBasicMaterial({ map: tex }));
}

export function buildAlto(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): AltoInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = ALTO_REGION;
  // Vereda, avenida y pasaje desde el Skatepark
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 2, '#c9bfae', { outline: false, cast: false, brush: 22 }), (R.minX + R.maxX) / 2, 0.035, (R.minZ + R.maxZ) / 2);
  add(box(R.maxX - R.minX, 0.06, 8, '#4a4656', { outline: false, cast: false, brush: 10 }), (R.minX + R.maxX) / 2, 0.07, 0);
  for (let x = R.minX + 3; x < R.maxX - 2; x += 5) add(box(2.2, 0.05, 0.25, '#fff3dc', { outline: false, cast: false }), x, 0.1, 0);
  const C = ALTO_FROM_SKATE;
  add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#4a4656', { outline: false, cast: false, brush: 6 }), (C.minX + C.maxX) / 2, 0.045, 0);
  // Mercado: baldosas de colores
  for (let i = 0; i < 12; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      if ((i + j) % 2) continue;
      add(box(2.1, 0.04, 2.1, '#e8d2b0', { outline: false, cast: false }), 105.5 + i * 2.2, 0.09, 11 + j * 2.2);
    }
  }
  for (const st of ALTO.stalls) rects.push({ minX: st.x - 1.4, maxX: st.x + 1.4, minZ: st.z - 0.9, maxZ: st.z + 0.3 });
  // Guirnalda que cruza el mercado
  const string = toon('#3d3550');
  for (const z of [19.6]) {
    const pts = [new THREE.Vector3(105, 4, z), new THREE.Vector3(119, 3.2, z), new THREE.Vector3(133, 4, z)];
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.03, 5), string));
    for (const x of [105, 133]) {
      add(rounded(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), string, 0.004), x, 2, z);
      circles.push({ x, z, r: 0.15 });
    }
  }

  // Cine (mira a +Z) con cartel de foquitos
  const K = ALTO.cine;
  add(box(K.w, 8, K.d, '#a0565e', { outline: 0.06, brush: 3 }), K.x, 4, K.z);
  rects.push({ minX: K.x - K.w / 2, maxX: K.x + K.w / 2, minZ: K.z - K.d / 2, maxZ: K.z + K.d / 2 });
  add(box(3, 3.4, 0.12, '#2c2838', { outline: 0.02 }), K.doorX, 1.7, K.z + K.d / 2 + 0.05);
  add(new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), sign('CINE', '#2c2838', '#ffd23a')), K.x, 5.6, K.z + K.d / 2 + 0.06);
  const bulbs: THREE.MeshBasicMaterial[] = [];
  const marquee = new THREE.Group();
  for (let i = 0; i < 18; i += 1) {
    const m = new THREE.MeshBasicMaterial({ color: '#5a5868' });
    bulbs.push(m);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m);
    const t = i / 17;
    b.position.set(-4.6 + t * 9.2, i % 2 ? 4.3 : 6.9, 0.15);
    marquee.add(b);
  }
  marquee.userData.dynamic = true;
  add(marquee, K.x, 0, K.z + K.d / 2);
  // Afiches
  for (const [dx, col] of [
    [-4.5, '#4fa8e0'],
    [4.5, '#ff9f43'],
  ] as [number, string][]) {
    add(box(1.6, 2.2, 0.08, col, { outline: 0.02 }), K.x + dx, 1.9, K.z + K.d / 2 + 0.06);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), toon('#ffd23a'));
    add(star, K.x + dx, 2.1, K.z + K.d / 2 + 0.2);
  }

  // Biblioteca (mira a +Z) con columnas y ventanas
  const L = ALTO.library;
  add(box(L.w, 7, L.d, '#d8cbb0', { outline: 0.06, brush: 3 }), L.x, 3.5, L.z);
  rects.push({ minX: L.x - L.w / 2, maxX: L.x + L.w / 2, minZ: L.z - L.d / 2, maxZ: L.z + L.d / 2 });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(L.w * 0.62, 2.4, 4), toon('#6f5a7a'));
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = L.d / L.w;
  add(roof, L.x, 8.2, L.z);
  for (let i = 0; i < 5; i += 1) {
    add(rounded(new THREE.CylinderGeometry(0.35, 0.4, 5.6, 12), toon('#fff3dc'), 0.01), L.x - 6 + i * 3, 2.8, L.z + L.d / 2 + 0.6);
    circles.push({ x: L.x - 6 + i * 3, z: L.z + L.d / 2 + 0.6, r: 0.4 });
  }
  add(new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), sign('BIBLIOTECA', '#30406a', '#fff3dc')), L.x, 6.2, L.z + L.d / 2 + 0.06);
  const windows: THREE.MeshBasicMaterial[] = [];
  for (let i = 0; i < 4; i += 1) {
    const m = new THREE.MeshBasicMaterial({ color: '#4a4856' });
    windows.push(m);
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), m), L.x - 4.5 + i * 3, 3, L.z + L.d / 2 + 0.07).userData.dynamic = true;
  }

  // Terrazas: cinco techos escalonados con ventanas, macetas y escaleritas pintadas
  const roofCols = ['#f2c14e', '#e77fa6', '#4fa8e0', '#9be37a', '#c7a0ef'];
  ALTO.roofs.forEach((r, i) => {
    const w = r.maxX - r.minX;
    const d = r.maxZ - r.minZ;
    add(box(w, r.h, d, roofCols[i], { outline: 0.04, brush: 3 }), (r.minX + r.maxX) / 2, r.h / 2, (r.minZ + r.maxZ) / 2);
    add(box(w + 0.2, 0.14, d + 0.2, '#6e6a7a', { outline: 0.015 }), (r.minX + r.maxX) / 2, r.h + 0.02, (r.minZ + r.maxZ) / 2);
    rects.push({ ...r });
    for (let k = 0; k < Math.max(1, r.h); k += 1) {
      if (k * 1 + 0.9 > r.h) break;
      add(box(1.1, 0.6, 0.06, '#cfeefa', { outline: 0.01 }), (r.minX + r.maxX) / 2, 0.55 + k, r.maxZ + 0.04);
    }
    add(rounded(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 10), toon('#c8452f'), 0.006), r.minX + 0.6, r.h + 0.3, r.maxZ - 0.6);
  });
  // Rampita al pie de las terrazas (para subir con la patineta)
  const k = ALTO.kicker;
  const shape = new THREE.Shape();
  shape.moveTo(-k.halfL, 0);
  shape.lineTo(k.halfL, 0.55);
  shape.lineTo(k.halfL, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: k.halfW * 2, bevelEnabled: false });
  geo.translate(0, 0, -k.halfW);
  const wedge = new THREE.Mesh(geo, toon('#a8a097', 8));
  wedge.castShadow = wedge.receiveShadow = true;
  add(wedge, k.x, 0.1, k.z);

  // Árboles y bancos de la avenida
  for (const [x, z] of [
    [104, -6],
    [124, -6],
    [150, -6],
    [104, 6],
    [140, 5.5],
    [152, 30],
  ] as [number, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.18, 0.24, 2, 8), toon('#6a3e26'), 0.006), x, 1, z);
    add(rounded(new THREE.IcosahedronGeometry(1.2, 0), toon('#5fae4a'), 0.02), x, 2.6, z);
    circles.push({ x, z, r: 0.35 });
  }

  // Tirolesa: del techo más alto al mercado
  const zipLine: THREE.Vector3[] = [];
  for (const [p, base] of [
    [ALTO.zipTop, 5],
    [ALTO.zipBottom, 0],
  ] as [{ x: number; z: number }, number][]) {
    add(rounded(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 10), string, 0.01), p.x, base + 1.6, p.z);
    add(box(0.8, 0.12, 0.12, '#ffc23a', { outline: 0.01 }), p.x, base + 3.1, p.z);
    if (base === 0) circles.push({ x: p.x, z: p.z, r: 0.22 });
    zipLine.push(new THREE.Vector3(p.x, base + 3.1, p.z));
  }
  const [za, zb] = zipLine;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    pts.push(new THREE.Vector3(za.x + (zb.x - za.x) * t, za.y + (zb.y - za.y) * t - Math.sin(t * Math.PI) * 0.6, za.z + (zb.z - za.z) * t));
  }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 6), toon('#2c2838')));

  const hall = buildHall(scene, rects);
  return {
    hall: hall.info,
    zipLine,
    film: hall.film,
    lightMarquee() {
      bulbs.forEach((m, i) => m.color.set(i % 2 ? '#ffd23a' : '#fff6c0'));
    },
    lightLibrary() {
      for (const m of windows) m.color.set('#ffd88a');
    },
  };
}

/** Sala del cine por dentro: butacas, pantalla y proyector. */
function buildHall(scene: THREE.Scene, rects: Rect[]): { info: AltoInfo['hall']; film: AltoInfo['film'] } {
  const RX = ALTO_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 14,
    d: 9,
    wall: '#a0565e',
    low: '#6a2e36',
    trim: '#ffd23a',
    floor: ['#5a3a46', '#4e3240'],
    base: '#2c2838',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { add, z0 } = k;
  // Butacas (tres filas)
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 6; i += 1) {
      const x = RX - 4.4 + i * 1.3;
      const z = -0.6 + row * 1.4;
      add(box(1, 0.5, 0.8, '#c8452f', { outline: 0.015 }), x, 0.25, z);
      add(box(1, 0.8, 0.15, '#c8452f', { outline: 0.015 }), x, 0.65, z + 0.4);
    }
    rects.push({ minX: RX - 5, maxX: RX + 2.9, minZ: -1 + row * 1.4, maxZ: -0.1 + row * 1.4 + 0.4 });
  }
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);

  // Pantalla: va aparte (no se pone gris) y se dibuja con un canvas
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.6), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(RX - 1, 2.6, z0 + 0.12);
  screen.userData.dynamic = true;
  scene.add(screen);
  const film = (t: number | null) => {
    if (t === null) {
      g.fillStyle = '#1a1622';
      g.fillRect(0, 0, 256, 128);
      tex.needsUpdate = true;
      return;
    }
    // Película: la Gran Chispa cruza el cielo y el Nexus la persigue saltando
    g.fillStyle = '#20305a';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#fff6c0';
    for (let i = 0; i < 14; i += 1) g.fillRect((i * 53 + t * 10) % 256, (i * 29) % 70, 2, 2);
    g.fillStyle = '#5fae4a';
    g.fillRect(0, 104, 256, 24);
    const sx = (t * 50) % 300 - 20;
    g.fillStyle = '#ffd23a';
    g.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + t * 2;
      const r = i % 2 ? 6 : 14;
      g.lineTo(sx + Math.cos(a) * r, 40 + Math.sin(t * 3) * 10 + Math.sin(a) * r);
    }
    g.fill();
    const nx = sx - 40;
    const ny = 92 - Math.abs(Math.sin(t * 5)) * 22;
    g.fillStyle = '#2bb3a8';
    g.fillRect(nx - 7, ny - 4, 14, 16);
    g.fillStyle = '#fff3dc';
    g.beginPath();
    g.arc(nx, ny - 10, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2bb3a8';
    g.fillRect(nx - 6, ny - 26, 3, 10);
    g.fillRect(nx + 3, ny - 26, 3, 10);
    tex.needsUpdate = true;
  };
  film(null);
  return {
    film,
    info: {
      room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
      spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
      exit: { x: RX + 3.5, z: k.z1 - 0.3 },
      spark: { id: 'spark-room-cine', x: RX - 6.2, z: -3.6, y: 0.9 },
      source: { x: RX + 5.6, z: 2.4 },
      target: { x: RX + 5.2, z: -1.6 },
      projector: { x: RX + 5.2, z: -1.6 },
      gray,
    },
  };
}
