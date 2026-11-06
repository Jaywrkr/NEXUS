import * as THREE from 'three';
import { box, flat, keepVivid, rounded, toon, withLife } from '../core/render';
import { roomShell, type ReviveRoom } from './MigaHouse';
import { makeGray } from './revive';
import type { Rect } from './World';

/*
 * Fase 5: el barrio del canal sur (al este del jardín). La calle de los faroles de Lucio, la plaza
 * de la fiesta (escenario y confeti) y el taller de Pipa (edificio afuera + habitación en x = 700).
 * Las posiciones de los objetos conectables están acá para que WorldMode y las pruebas usen las mismas.
 */

export const FESTIVAL = {
  lanternSource: { x: 9.5, z: 52 },
  first: { x: 14, z: 54 },
  direct: { x: 20, z: 50.5 },
  curious: { x: 18.5, z: 59 },
  shy: { x: 24.5, z: 60 },
  exit: { x: 27.5, z: 55 },
  lanternFragment: { x: 27.5, z: 51.2 },
  stage: { x: 32.5, z: 58.5 },
  confetti: { x: 38.5, z: 60.5 },
  lucio: { x: 11.5, z: 58, faceX: 16, faceZ: 56 },
  /** Taller de Pipa: el edificio afuera y su puerta (mira a +Z). */
  workshop: { x: 39.5, z: 51.5, w: 9, d: 5, doorX: 41.5 },
};

export const WORKSHOP_X = 700;

export interface WorkshopRoom extends ReviveRoom {
  motor: { x: number; z: number };
  duck: { x: number; z: number };
  bell: { x: number; z: number };
  parade: { x: number; z: number };
  pipa: { x: number; z: number; faceX: number; faceZ: number };
  fragment: { x: number; z: number };
}

function signTexture(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 60px "Arial Black", Impact, sans-serif';
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

/** Afuera: calle de los faroles, plaza de la fiesta y el edificio del taller. */
export function buildFestivalStreet(scene: THREE.Scene, rects: Rect[]): void {
  const add = (m: THREE.Object3D, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const F = FESTIVAL;
  // Adoquines de la calle de los faroles (una banda que va del oeste al este)
  const stone = toon('#b8a99a', 10);
  add(box(24, 0.06, 11, '', { mat: stone, outline: false, cast: false }), 19, 0.03, 55.5);
  const dot = flat('#9d8f80');
  for (let i = 0; i < 40; i += 1) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(0.22, 6), dot);
    s.rotation.x = -Math.PI / 2;
    add(s, 8 + ((i * 37) % 22), 0.065, 50.5 + ((i * 53) % 10));
  }
  // Plaza de la fiesta (losas claras) bajo el escenario y el confeti
  add(box(12, 0.07, 6.5, '#e8dcc4', { outline: false, cast: false, brush: 6 }), 36, 0.035, 59.3);
  // Banderines entre dos mástiles sobre la plaza de la fiesta
  const pole = toon('#3d3550');
  for (const x of [30.5, 41.5]) add(rounded(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 8), pole, 0.01), x, 2.1, 62.2);
  const cols = ['#ff6b4a', '#ffe066', '#7dff8a', '#9be7ff', '#ff9ff3'];
  for (let i = 0; i < 14; i += 1) {
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), withLife(new THREE.MeshToonMaterial({ color: cols[i % cols.length] })));
    flag.rotation.x = Math.PI;
    const t = (i + 0.5) / 14;
    add(flag, 30.5 + t * 11, 3.9 - Math.sin(t * Math.PI) * 0.6, 62.2);
  }

  // Taller de Pipa: galpón con techo de chapa, portón y cartel; la puerta mira a +Z
  const W = F.workshop;
  const shell = box(W.w, 3.4, W.d, '#c7a0ef', { brush: 3, outline: 0.05 });
  add(shell, W.x, 1.7, W.z);
  rects.push({ minX: W.x - W.w / 2, maxX: W.x + W.w / 2, minZ: W.z - W.d / 2, maxZ: W.z + W.d / 2 });
  for (let i = 0; i < 9; i += 1) add(box(1.0, 0.12, W.d + 0.8, i % 2 ? '#8b8f9a' : '#a3a8b3', { outline: 0.01 }), W.x - W.w / 2 + 0.5 + i, 3.5, W.z);
  const doorZ = W.z + W.d / 2;
  add(box(2.2, 2.5, 0.1, '#3d3550', { outline: 0.02 }), W.doorX, 1.25, doorZ + 0.02);
  add(box(2.4, 0.18, 0.2, '#ffc23a', { outline: 0.01 }), W.doorX, 2.6, doorZ + 0.08);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.0), withLife(new THREE.MeshBasicMaterial({ map: signTexture('TALLER PIPA', '#7b4fb0') })));
  add(sign, W.x - 2.2, 2.6, doorZ + 0.03);
  // Ruedas, cajas y un engranaje gigante de adorno al costado
  add(box(1.0, 0.8, 1.0, '#c98f5a', { outline: 0.03 }), W.x - 3.6, 0.4, doorZ + 1.0);
  add(box(0.7, 0.55, 0.7, '#d29a63', { outline: 0.03 }), W.x - 3.5, 1.08, doorZ + 1.0);
  rects.push({ minX: W.x - 4.1, maxX: W.x - 3.1, minZ: doorZ + 0.5, maxZ: doorZ + 1.5, h: 0.8 });
  const gear = rounded(new THREE.CylinderGeometry(0.8, 0.8, 0.18, 14), toon('#ffc23a'), 0.014);
  gear.rotation.z = Math.PI / 2;
  add(gear, W.x + W.w / 2 + 0.12, 2.2, W.z);
}

/** El taller por dentro (x = 700): mesa de trabajo, herramientas, cajas de juguetes. */
export function buildWorkshopRoom(scene: THREE.Scene, rects: Rect[]): WorkshopRoom {
  const RX = WORKSHOP_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 12,
    d: 9,
    wall: '#e3d4f5',
    low: '#c7a0ef',
    trim: '#ffc23a',
    floor: ['#a8a097', '#b8b0a6'],
    base: '#3d3550',
    doorFrom: 703,
    doorTo: 705,
  });
  const { add, solid, x0, z0, z1 } = k;
  // Mesa de trabajo contra la pared norte, con herramientas y un plano
  add(box(3.6, 0.12, 1.2, '#a8703f', { outline: 0.03 }), RX - 3.2, 0.9, z0 + 0.8);
  for (const dx of [-1.6, 1.6]) add(box(0.12, 0.88, 0.12, '#6a3e26', { outline: 0.01 }), RX - 3.2 + dx, 0.44, z0 + 0.8);
  solid(RX - 3.2, z0 + 0.8, 3.6, 1.2, 0.96);
  add(box(1.2, 0.02, 0.8, '#5ec8ff', { outline: 0.005 }), RX - 3.6, 0.97, z0 + 0.8);
  add(box(0.6, 0.1, 0.16, '#8b8f9a', { outline: 0.01 }), RX - 2.3, 1.02, z0 + 0.9);
  // Tablero de herramientas en la pared norte
  add(box(3.0, 1.4, 0.06, '#c98f5a', { outline: 0.02 }), RX - 3.2, 2.2, z0 + 0.04);
  for (let i = 0; i < 6; i += 1) add(box(0.12, 0.5, 0.06, ['#e0563f', '#8b8f9a', '#ffc23a'][i % 3], { outline: 0.005 }), RX - 4.3 + i * 0.45, 2.2, z0 + 0.1);
  // Cajas de juguetes apiladas en la esquina noreste (se puede saltar)
  add(box(1.2, 0.8, 1.2, '#ff9f43', { outline: 0.03 }), RX + 5, 0.4, z0 + 0.9);
  add(box(0.9, 0.6, 0.9, '#5ec8ff', { outline: 0.03 }), RX + 5, 1.1, z0 + 0.9);
  solid(RX + 5, z0 + 0.9, 1.2, 1.2, 0.8);
  // Planos y un póster del desfile en la pared oeste
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.1), new THREE.MeshBasicMaterial({ map: signTexture('¡DESFILE!', '#ff5a6e') }));
  poster.rotation.y = Math.PI / 2;
  add(poster, x0 + 0.03, 2.0, 1.4);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: z1 + 0.2 },
    spawn: { x: 704, z: z1 - 1.3 },
    exit: { x: 704, z: z1 - 0.3 },
    spark: { id: 'spark-room-taller', x: RX + 5, z: z0 + 0.9, y: 0.8 + 0.9 },
    source: { x: RX - 4.5, z: 2.4 },
    target: { x: RX + 0.4, z: -2.4 },
    motor: { x: RX + 0.4, z: -2.4 },
    duck: { x: RX + 2.9, z: -2.6 },
    bell: { x: RX + 4.2, z: -0.6 },
    parade: { x: RX + 1.2, z: 1.2 },
    pipa: { x: RX - 3.4, z: -1.3, faceX: RX, faceZ: 1 },
    fragment: { x: RX - 1, z: 3.3 },
    gray,
  };
}
