import * as THREE from 'three';
import { toon } from '../core/render';
import type { Rect } from './World';
import { FOREST_REGION } from './Forest';
import { FARM_REGION } from './Farm';
import { CERRO_REGION } from './Cerro';
import { ISLA_REGION } from './Isla';

/*
 * Etapa B (rendimiento y aspecto): detalle repetido — matas de pasto y flores. Se dibujan de a cientos
 * con InstancedMesh (un dibujo por celda de 24 m), usan el material del pueblo (empiezan grises y se pintan
 * cuando vuelve la vida) y no tiran sombra. Se arman con una semilla fija: siempre quedan en el mismo lugar.
 */

const CELL = 24;

/** Zonas con pasto y cuántas matas y flores por metro cuadrado. */
const AREAS: { r: Rect; tufts: number; flowers: number }[] = [
  { r: FOREST_REGION, tufts: 0.16, flowers: 0.03 },
  { r: FARM_REGION, tufts: 0.1, flowers: 0.02 },
  { r: CERRO_REGION, tufts: 0.1, flowers: 0.025 },
  { r: { minX: ISLA_REGION.minX + 5, maxX: ISLA_REGION.maxX - 5, minZ: ISLA_REGION.minZ + 6, maxZ: ISLA_REGION.maxZ - 4 }, tufts: 0.16, flowers: 0.03 },
  // Jardín municipal del Centro
  { r: { minX: -26, maxX: 4, minZ: 47, maxZ: 61.5 }, tufts: 0.08, flowers: 0.12 },
];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Mata de pasto: tres hojas finas cruzadas (9 vértices). */
function tuftGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI + 0.3;
    const dx = Math.cos(a) * 0.09;
    const dz = Math.sin(a) * 0.09;
    const lean = (i - 1) * 0.08;
    pos.push(-dx, 0, -dz, dx, 0, dz, lean, 0.32 + i * 0.05, lean * 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Las hojas se ven de los dos lados: normales hacia arriba para que la luz sea pareja
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.count; i += 1) n.setXYZ(i, 0, 1, 0);
  return g;
}

export function buildDetail(scene: THREE.Scene, walkable: (x: number, z: number) => boolean): number {
  const tuft = tuftGeometry();
  const stem = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4);
  stem.translate(0, 0.15, 0);
  const head = new THREE.IcosahedronGeometry(0.09, 0);
  head.translate(0, 0.32, 0);
  const grass = toon('#ffffff').clone();
  grass.side = THREE.DoubleSide;
  // El clon pierde el efecto de vida: se lo devuelve el material compartido
  grass.onBeforeCompile = toon('#ffffff').onBeforeCompile;
  const stemMat = toon('#4f8f3a');
  const headMat = toon('#ffffff');
  const petals = ['#ff6b8a', '#ffd23a', '#fff3dc', '#c7a0ef', '#ff9f43', '#7dd3ff'].map((c) => new THREE.Color(c));
  const cells = new Map<string, { tufts: THREE.Matrix4[]; tuftCol: THREE.Color[]; flowers: THREE.Matrix4[]; flowerCol: THREE.Color[] }>();
  const cell = (x: number, z: number) => {
    const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
    let c = cells.get(key);
    if (!c) {
      c = { tufts: [], tuftCol: [], flowers: [], flowerCol: [] };
      cells.set(key, c);
    }
    return c;
  };
  const r = rng(20261107);
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let total = 0;
  for (const a of AREAS) {
    const area = (a.r.maxX - a.r.minX) * (a.r.maxZ - a.r.minZ);
    for (const [kind, density] of [
      ['tuft', a.tufts],
      ['flower', a.flowers],
    ] as ['tuft' | 'flower', number][]) {
      const n = Math.round(area * density);
      for (let i = 0; i < n; i += 1) {
        const x = a.r.minX + r() * (a.r.maxX - a.r.minX);
        const z = a.r.minZ + r() * (a.r.maxZ - a.r.minZ);
        if (!walkable(x, z)) continue;
        const s = 0.75 + r() * 0.6;
        q.setFromAxisAngle(up, r() * Math.PI * 2);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0.02, z), q, new THREE.Vector3(s, s * (0.8 + r() * 0.5), s));
        const c = cell(x, z);
        if (kind === 'tuft') {
          c.tufts.push(m);
          c.tuftCol.push(new THREE.Color().setHSL(0.26 + r() * 0.07, 0.55, 0.5 + r() * 0.14));
        } else {
          c.flowers.push(m);
          c.flowerCol.push(petals[Math.floor(r() * petals.length)]);
        }
        total += 1;
      }
    }
  }
  const make = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], cols?: THREE.Color[]) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => {
      im.setMatrixAt(i, m);
      if (cols) im.setColorAt(i, cols[i]);
    });
    im.computeBoundingBox();
    im.computeBoundingSphere();
    im.castShadow = false;
    im.receiveShadow = true;
    im.userData.dynamic = true;
    scene.add(im);
  };
  for (const c of cells.values()) {
    make(tuft, grass, c.tufts, c.tuftCol);
    make(stem, stemMat, c.flowers);
    make(head, headMat, c.flowers, c.flowerCol);
  }
  return total;
}
