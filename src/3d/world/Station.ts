import * as THREE from 'three';
import { box, rounded, toon, withLife } from '../core/render';
import type { Rect } from './World';

/*
 * Distrito Estación (Fase 7, PLAN_MAESTRO.md §6), al sureste: se llega por el sur del canal,
 * hacia el este. Vías este-oeste, andén, el hall de la estación con su reloj y el tren dormido.
 * Las paradas del tren en cada distrito (TRAIN_STOPS) sirven para viajar rápido cuando el tren despierta.
 */

export const STATION_REGION: Rect = { minX: 52, maxX: 94, minZ: 38, maxZ: 62 };
/** Pasaje desde el Centro (sur del canal) hasta la Estación. */
export const STATION_CORRIDOR: Rect = { minX: 44, maxX: 53, minZ: 42.5, maxZ: 48.5 };

export const STATION = {
  train: { x: 82, z: 41 },
  source: { x: 60, z: 48.5 },
  nodes: [
    { x: 58, z: 41 },
    { x: 66, z: 39.2 },
    { x: 90, z: 41 },
  ],
  nora: { x: 67, z: 47.5, faceX: 70, faceZ: 52 },
  hall: { x: 75, z: 56, w: 14, d: 6 },
  chispi: { x: 88, z: 58 },
};

/** Paradas del tren (una por distrito). `need` = flag que hace falta para que aparezca (distritos de más adelante). */
export const TRAIN_STOPS: { id: string; name: string; x: number; z: number; need?: string }[] = [
  { id: 'centro', name: 'Centro', x: -7.5, z: -7.5 },
  { id: 'skatepark', name: 'Skatepark', x: 64, z: 8.6 },
  { id: 'parque', name: 'Parque', x: 8, z: -55 },
  { id: 'estacion', name: 'Estación', x: 72, z: 44.5 },
  { id: 'bosque', name: 'Bosque', x: -50, z: -55, need: 'district-bosque' },
  { id: 'granja', name: 'Granja', x: -50.5, z: 50, need: 'district-granja' },
  { id: 'cerro', name: 'Cerro', x: -55, z: -7.5, need: 'district-cerro' },
  { id: 'puerto', name: 'Puerto', x: 11, z: 70.5, need: 'district-puerto' },
];

function texture(text: string, bg: string, w = 512, h = 128, size = 60): THREE.CanvasTexture {
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

export function buildStation(scene: THREE.Scene, rects: Rect[]): void {
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = STATION_REGION;
  // Piso de adoquines grises y el pasaje
  add(box(R.maxX - R.minX + 1, 0.08, R.maxZ - R.minZ + 1, '#a8a097', { outline: false, cast: false, brush: 18 }), (R.minX + R.maxX) / 2, 0.04, (R.minZ + R.maxZ) / 2);
  const C = STATION_CORRIDOR;
  add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#b8a99a', { outline: false, cast: false, brush: 10 }), (C.minX + C.maxX) / 2, 0.035, (C.minZ + C.maxZ) / 2);
  // Vías este-oeste: balasto, durmientes y dos rieles
  add(box(R.maxX - R.minX + 6, 0.1, 3.2, '#7a706a', { outline: false, cast: false, brush: 12 }), (R.minX + R.maxX) / 2 + 3, 0.09, 41);
  const tie = toon('#6a3e26');
  for (let x = R.minX - 2; x < R.maxX + 6; x += 1.1) add(box(0.3, 0.08, 2.4, '', { mat: tie, outline: false, cast: false }), x, 0.17, 41);
  const rail = toon('#b8bcc6');
  for (const z of [40.3, 41.7]) add(box(R.maxX - R.minX + 8, 0.12, 0.12, '', { mat: rail, outline: 0.008 }), (R.minX + R.maxX) / 2 + 3, 0.26, z);
  // Andén con borde amarillo
  add(box(32, 0.06, 3.4, '#cfc2ad', { outline: false, cast: false, brush: 6 }), 73, 0.11, 44.5);
  add(box(32, 0.08, 0.25, '#ffc23a', { outline: false, cast: false }), 73, 0.13, 42.9);
  // Faroles del andén con techito
  const steel = toon('#3d3550');
  for (const x of [60, 70, 80]) {
    add(rounded(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), steel, 0.01), x, 1.6, 45.8);
    add(box(2.6, 0.12, 1.6, '#c7a17a', { outline: 0.012 }), x, 3.2, 45.2);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), withLife(new THREE.MeshBasicMaterial({ color: '#ffe066' }))), x, 2.95, 45.2);
  }
  // Hall de la estación (mira a +Z), con reloj y cartel
  const H = STATION.hall;
  add(box(H.w, 4.2, H.d, '#c7a17a', { outline: 0.05, brush: 3 }), H.x, 2.1, H.z);
  rects.push({ minX: H.x - H.w / 2, maxX: H.x + H.w / 2, minZ: H.z - H.d / 2, maxZ: H.z + H.d / 2 });
  add(box(H.w + 0.8, 0.4, H.d + 0.8, '#6e5133', { outline: 0.03 }), H.x, 4.4, H.z);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), withLife(new THREE.MeshBasicMaterial({ map: texture('ESTACIÓN', '#6e5133') })));
  add(sign, H.x, 3.5, H.z + H.d / 2 + 0.03);
  const clock = rounded(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 24), toon('#fff3dc'), 0.012);
  clock.rotation.x = Math.PI / 2;
  add(clock, H.x + 4.6, 3.4, H.z + H.d / 2 + 0.08);
  add(box(0.06, 0.45, 0.04, '#1d1630', { outline: false }), H.x + 4.6, 3.52, H.z + H.d / 2 + 0.16);
  add(box(0.32, 0.06, 0.04, '#1d1630', { outline: false }), H.x + 4.72, 3.4, H.z + H.d / 2 + 0.16);
  for (let i = 0; i < 4; i += 1) add(box(1.2, 2.3, 0.08, '#30406a', { outline: 0.02 }), H.x - 4.5 + i * 2.2, 1.2, H.z + H.d / 2 + 0.03);
  // Bancos del andén y una máquina de boletos
  for (const x of [64, 76]) {
    add(box(2.2, 0.12, 0.6, '#a97a52', { outline: 0.02 }), x, 0.5, 46.4);
    add(box(2.2, 0.5, 0.1, '#a97a52', { outline: 0.02 }), x, 0.85, 46.7);
    rects.push({ minX: x - 1.1, maxX: x + 1.1, minZ: 46.1, maxZ: 46.8, h: 0.56 });
  }
  add(box(0.8, 1.5, 0.6, '#2bb3a8', { outline: 0.02 }), 86, 0.75, 47);
  add(box(0.5, 0.3, 0.05, '#ffe066', { outline: false }), 86, 1.2, 47.31);
  rects.push({ minX: 85.6, maxX: 86.4, minZ: 46.7, maxZ: 47.3 });
}
