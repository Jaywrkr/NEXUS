import * as THREE from 'three';
import { box, keepVivid, rounded, toon, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Expansión, Fase 18 (PLAN_EXPANSION.md): Montaña nevada y observatorio, al norte del Parque. Un campo de
 * nieve con pinos, muñecos de nieve dormidos y rampas de nieve para la patineta-trineo; la montaña (una meseta
 * a 9 m) se sube por una escalera larga de piedras o con la telesilla (que se despierta con cable), y se baja
 * por dos tirolesas en cadena (cima → saliente → campo). Arriba, el observatorio (adentro, x = 1500): su
 * puerta se destraba con un circuito del Mundo Voltio y su telescopio marca en el mapa las Piezas que faltan.
 */

export const NIEVE_REGION: Rect = { minX: -30, maxX: 40, minZ: -156, maxZ: -98 };
/** Desde el Parque, por el norte (hueco en el cerco). */
export const NIEVE_FROM_PARK: Rect = { minX: -3, maxX: 3, minZ: -99, maxZ: -93.5 };
export const NIEVE_X = 1500;

/** La meseta de la cima (se pisa a 9 m). */
export const SUMMIT: Rect & { h: number } = { minX: -10, maxX: 14, minZ: -154, maxZ: -134, h: 9 };
/** Escalera de piedras por la cara este: diez escalones de 0,9 m hacia el norte. */
export const SUMMIT_STEPS: (Rect & { h: number })[] = Array.from({ length: 10 }, (_, i) => ({
  minX: 14,
  maxX: 16.6,
  minZ: -135 - 2 * i,
  maxZ: -133 - 2 * i,
  h: Math.round(0.9 * (i + 1) * 10) / 10,
}));
/** Saliente de roca a mitad de las tirolesas. */
export const LEDGE: Rect & { h: number } = { minX: -25, maxX: -19, minZ: -121, maxZ: -115, h: 4.5 };

export const NIEVE = {
  liftBase: { x: 24, z: -108.5, y: 0 },
  liftTop: { x: 11.2, z: -136.5, y: 9 },
  liftSource: { x: 27.5, z: -106 },
  liftRoute: [
    [24, 1.6, -111],
    [19, 6, -121],
    [14, 10, -131],
    [11.2, 10.4, -135],
  ] as [number, number, number][],
  observatory: { x: 2, z: -146, r: 3.6 },
  domeNodes: [
    { x: -2, z: -104 },
    { x: 4, z: -102 },
    { x: 10, z: -104 },
  ],
  lupa: { x: 19, z: -105.5, faceX: 22, faceZ: -100 },
  snowmen: [
    [-20, -110],
    [-6, -126],
    [30, -118],
    [34, -140],
    [-24, -150],
  ] as [number, number][],
  chispi: { x: 28, z: -128 },
  ramps: [
    { x: -14, z: -112, dirX: 1, dirZ: 0, halfW: 1.4, halfL: 1.2, ramp: false },
    { x: 4, z: -116, dirX: -1, dirZ: 0, halfW: 1.4, halfL: 1.2, ramp: false },
    { x: 30, z: -132, dirX: 0, dirZ: 1, halfW: 1.4, halfL: 1.2, ramp: false },
  ],
  zipPoles: [
    { x: -8, z: -136.6, base: 9 },
    { x: -22, z: -118, base: 4.5 },
    { x: -24, z: -103.5, base: 0 },
  ],
};

export interface NieveInfo {
  hall: ReviveRoom & { telescope: { x: number; z: number } };
  zipLine: THREE.Vector3[];
  /** Abre la cúpula del observatorio (cuando se prende el telescopio). */
  openDome(): void;
}

export function buildNieve(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): NieveInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = NIEVE_REGION;
  add(box(R.maxX - R.minX + 2, 0.1, R.maxZ - R.minZ + 2, '#eef4fa', { outline: false, cast: false, brush: 26 }), (R.minX + R.maxX) / 2, 0.04, (R.minZ + R.maxZ) / 2);
  const C = NIEVE_FROM_PARK;
  add(box(C.maxX - C.minX, 0.08, C.maxZ - C.minZ, '#dfe8f0', { outline: false, cast: false, brush: 6 }), 0, 0.05, (C.minZ + C.maxZ) / 2);
  // Cartel de la entrada
  add(box(0.15, 2.6, 0.15, '#6a3e26', { outline: 0.008 }), -3.6, 1.3, -97);
  add(box(0.15, 2.6, 0.15, '#6a3e26', { outline: 0.008 }), 3.6, 1.3, -97);
  add(new THREE.Mesh(new THREE.PlaneGeometry(7, 1.1), withLife(new THREE.MeshBasicMaterial({ map: label('MONTAÑA', '#30406a') }))), 0, 2.5, -96.9);

  // La montaña: meseta de 9 m con nieve arriba y picos atrás
  const S = SUMMIT;
  add(box(S.maxX - S.minX, S.h, S.maxZ - S.minZ, '#8a8e9a', { outline: 0.06, brush: 5 }), (S.minX + S.maxX) / 2, S.h / 2, (S.minZ + S.maxZ) / 2);
  add(box(S.maxX - S.minX + 0.4, 0.3, S.maxZ - S.minZ + 0.4, '#f6f9fc', { outline: 0.03 }), (S.minX + S.maxX) / 2, S.h + 0.02, (S.minZ + S.maxZ) / 2);
  rects.push({ ...S });
  for (const [x, z, r, h] of [
    [-22, -168, 14, 22],
    [6, -172, 18, 28],
    [32, -166, 12, 18],
  ] as [number, number, number, number][]) {
    const peak = rounded(new THREE.ConeGeometry(r, h, 7), toon('#7a7e8c'), 0.05);
    add(peak, x, h / 2, z);
    const cap = rounded(new THREE.ConeGeometry(r * 0.38, h * 0.38, 7), toon('#f6f9fc'), 0.03);
    add(cap, x, h - h * 0.19, z);
  }
  // Escalera de piedras
  for (const s of SUMMIT_STEPS) {
    add(box(s.maxX - s.minX, s.h, s.maxZ - s.minZ, '#7a7468', { outline: 0.02 }), (s.minX + s.maxX) / 2, s.h / 2, (s.minZ + s.maxZ) / 2);
    add(box(s.maxX - s.minX + 0.1, 0.12, s.maxZ - s.minZ + 0.1, '#f6f9fc', { outline: false }), (s.minX + s.maxX) / 2, s.h + 0.02, (s.minZ + s.maxZ) / 2);
    rects.push({ ...s });
  }
  // Saliente de las tirolesas
  const L = LEDGE;
  add(box(L.maxX - L.minX, L.h, L.maxZ - L.minZ, '#7a7468', { outline: 0.04, brush: 4 }), (L.minX + L.maxX) / 2, L.h / 2, (L.minZ + L.maxZ) / 2);
  add(box(L.maxX - L.minX + 0.2, 0.15, L.maxZ - L.minZ + 0.2, '#f6f9fc', { outline: 0.01 }), (L.minX + L.maxX) / 2, L.h + 0.02, (L.minZ + L.maxZ) / 2);
  rects.push({ ...L });

  // Pinos con nieve
  for (let i = 0; i < 20; i += 1) {
    const x = R.minX + 3 + ((i * 31) % (R.maxX - R.minX - 6));
    const z = R.minZ + 3 + ((i * 47) % (R.maxZ - R.minZ - 6));
    if (x > S.minX - 3 && x < S.maxX + 5 && z > S.minZ - 3 && z < S.maxZ + 3) continue;
    if (x > L.minX - 3 && x < L.maxX + 3 && z > L.minZ - 3 && z < L.maxZ + 3) continue;
    if (Math.abs(x) < 6 && z > -112) continue;
    if (x > 16 && x < 30 && z > -125 && z < -100) continue;
    if (NIEVE.ramps.some((k) => Math.hypot(k.x - x, k.z - z) < 4) || NIEVE.snowmen.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 3)) continue;
    add(rounded(new THREE.CylinderGeometry(0.2, 0.28, 1.4, 8), toon('#6a4a32'), 0.006), x, 0.7, z);
    for (let k = 0; k < 3; k += 1) {
      add(rounded(new THREE.ConeGeometry(1.6 - k * 0.4, 1.6, 8), toon('#2f6a4a'), 0.02), x, 1.6 + k * 1, z);
      add(rounded(new THREE.ConeGeometry(0.9 - k * 0.25, 0.5, 8), toon('#f6f9fc'), 0.01), x, 2.2 + k * 1, z);
    }
    circles.push({ x, z, r: 0.5 });
  }
  // Rampas de nieve (la patineta salta)
  const snow = toon('#f6f9fc', 6);
  for (const k of NIEVE.ramps) {
    const shape = new THREE.Shape();
    shape.moveTo(-k.halfL, 0);
    shape.lineTo(k.halfL, 0.6);
    shape.lineTo(k.halfL, 0);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: k.halfW * 2, bevelEnabled: false });
    geo.translate(0, 0, -k.halfW);
    const wedge = new THREE.Mesh(geo, snow);
    wedge.rotation.y = Math.atan2(-k.dirZ, k.dirX);
    add(wedge, k.x, 0.05, k.z);
  }
  // Iglú
  const igloo = rounded(new THREE.SphereGeometry(2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#f6f9fc'), 0.02);
  add(igloo, 34, 0, -150);
  circles.push({ x: 34, z: -150, r: 2 });

  // Telesilla: estación de abajo, torres y cable
  add(box(3.4, 0.3, 3, '#c7a17a', { outline: 0.02 }), NIEVE.liftBase.x + 0.3, 3, NIEVE.liftBase.z - 2.2);
  for (const dx of [-1.4, 1.8]) add(box(0.25, 3, 0.25, '#30406a', { outline: 0.01 }), NIEVE.liftBase.x + dx, 1.5, NIEVE.liftBase.z - 3.2);
  for (const [x, z, h] of [
    [19.4, -121, 7.2],
    [14.4, -131, 11.2],
  ] as [number, number, number][]) {
    add(box(0.35, h, 0.35, '#30406a', { outline: 0.015 }), x + 1.2, h / 2, z);
    add(box(2.6, 0.2, 0.2, '#30406a', { outline: 0.01 }), x + 0.2, h, z);
    circles.push({ x: x + 1.2, z, r: 0.3 });
  }
  const pts = NIEVE.liftRoute.map(([x, y, z]) => new THREE.Vector3(x, y + 1.8, z));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.04, 5), toon('#2c2838')));

  // Tirolesas en cadena: cima → saliente → campo
  const rope = toon('#3d3550');
  const zipLine = NIEVE.zipPoles.map((p) => {
    add(rounded(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 10), rope, 0.01), p.x, p.base + 1.6, p.z);
    add(box(0.8, 0.12, 0.12, '#ffc23a', { outline: 0.01 }), p.x, p.base + 3.1, p.z);
    if (p.base === 0) circles.push({ x: p.x, z: p.z, r: 0.22 });
    return new THREE.Vector3(p.x, p.base + 3.1, p.z);
  });
  for (let i = 1; i < zipLine.length; i += 1) {
    const [za, zb] = [zipLine[i - 1], zipLine[i]];
    const cps: THREE.Vector3[] = [];
    for (let k = 0; k <= 20; k += 1) {
      const t = k / 20;
      cps.push(new THREE.Vector3(za.x + (zb.x - za.x) * t, za.y + (zb.y - za.y) * t - Math.sin(t * Math.PI) * 0.6, za.z + (zb.z - za.z) * t));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cps), 40, 0.035, 6), toon('#2c2838')));
  }

  // Observatorio en la cima (puerta a +Z) con cúpula que se abre
  const O = NIEVE.observatory;
  add(rounded(new THREE.CylinderGeometry(O.r, O.r, 3, 18), toon('#e8e2d6'), 0.03), O.x, S.h + 1.5, O.z);
  circles.push({ x: O.x, z: O.z, r: O.r });
  const dome = new THREE.Group();
  for (const s of [-1, 1]) {
    const half = rounded(new THREE.SphereGeometry(O.r, 18, 10, s < 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2), withLife(toon('#9aa6c0')), 0.03);
    half.userData.side = s;
    dome.add(half);
  }
  dome.userData.dynamic = true;
  add(dome, O.x, S.h + 3, O.z);
  add(box(1.6, 2.4, 0.12, '#30406a', { outline: 0.02 }), O.x, S.h + 1.2, O.z + O.r - 0.02);
  const scope = rounded(new THREE.CylinderGeometry(0.35, 0.5, 3, 12), toon('#30406a'), 0.02);
  scope.rotation.x = -0.7;
  scope.visible = false;
  scope.userData.dynamic = true;
  add(scope, O.x, S.h + 4.4, O.z - 0.6);

  const hall = buildObservatory(scene, rects);
  return {
    hall,
    zipLine,
    openDome() {
      for (const h of dome.children) h.position.x = (h.userData.side as number) * 1.2;
      scope.visible = true;
    },
  };
}

/** Observatorio por dentro: piso redondo, estrellas pintadas y el telescopio. */
function buildObservatory(scene: THREE.Scene, rects: Rect[]): NieveInfo['hall'] {
  const RX = NIEVE_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 12,
    d: 9,
    wall: '#30406a',
    low: '#1d2a4a',
    trim: '#ffd23a',
    floor: ['#4a5470', '#424a64'],
    base: '#1d1630',
    doorFrom: RX + 2,
    doorTo: RX + 4,
  });
  const { add, z0 } = k;
  // Estrellas pintadas en la pared del fondo
  for (let i = 0; i < 16; i += 1) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12 + (i % 3) * 0.05, 0), new THREE.MeshBasicMaterial({ color: '#fff6c0' }));
    add(s, RX - 5.5 + ((i * 7) % 11), 1.6 + ((i * 5) % 4) * 0.55, z0 + 0.12);
  }
  // Mapa de las Piezas en la pared (se llena cuando se prende el telescopio)
  add(box(3, 2, 0.06, '#1d1630', { outline: 0.02 }), RX + 3.5, 2.4, z0 + 0.08);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: RX + 3, z: k.z1 - 1.3 },
    exit: { x: RX + 3, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-observatorio', x: RX - 5, z: 3.2, y: 0.9 },
    source: { x: RX - 4.6, z: 2.4 },
    target: { x: RX - 0.5, z: -1.2 },
    telescope: { x: RX - 0.5, z: -1.2 },
    gray,
  };
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
