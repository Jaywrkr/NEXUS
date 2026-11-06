import * as THREE from 'three';
import { box, keepVivid, rounded, toon, toonUnique, withLife } from '../core/render';
import { makeGray } from './revive';
import { roomShell, type ReviveRoom } from './MigaHouse';
import type { Rect } from './World';

/*
 * Expansión, Fase 12 (PLAN_EXPANSION.md): Granja y molinos, al suroeste (al sur del canal, oeste de la casa
 * del Nexus). Tres molinos que se prenden con cable (el tercero con el motor trabado: circuito del Mundo
 * Voltio), el granero (interior en x = 1100 con la incubadora), el invernadero, el maizal-laberinto, los
 * campos que crecen cuando giran los molinos y el tractor que da la vuelta a los campos.
 */

export const FARM_REGION: Rect = { minX: -104, maxX: -48, minZ: 40, maxZ: 100 };
/** Desde el Centro (al sur del canal, al oeste de la casa del Nexus). */
export const FARM_FROM_CENTRO: Rect = { minX: -49, maxX: -44, minZ: 42, maxZ: 47 };
/** Desde el Puerto, por su lado oeste. */
export const FARM_FROM_PORT: Rect = { minX: -50, maxX: -39, minZ: 74, maxZ: 80 };
export const BARN_X = 1100;

export const FARM = {
  barn: { x: -60, z: 56, w: 10, d: 7, doorX: -58 },
  greenhouse: { x: -74, z: 48, w: 8, d: 5 },
  sprinkler: { x: -74, z: 52.6 },
  sprinklerSource: { x: -68, z: 53 },
  mills: [
    { x: -96, z: 50, source: { x: -90, z: 54 } },
    { x: -96, z: 68, source: { x: -90, z: 64 } },
    { x: -62, z: 95, source: { x: -56, z: 90 } },
  ],
  /** Nodos del circuito del Mundo Voltio del tercer molino (motor trabado). */
  millNodes: [
    { x: -66, z: 86 },
    { x: -58, z: 84 },
    { x: -54, z: 96 },
  ],
  fields: { minX: -74, maxX: -58, minZ: 66, maxZ: 82 },
  maze: { minX: -100, maxX: -80, minZ: 76, maxZ: 98 },
  mazeCenter: { x: -90, z: 87 },
  tractorDock: { x: -49.5, z: 64 },
  tractorRoute: [
    [-52, 64],
    [-52, 86],
    [-77, 86],
    [-77, 63],
    [-52, 63],
  ] as [number, number][],
  trigo: { x: -52, z: 54, faceX: -48, faceZ: 58 },
  chispi: { x: -84, z: 58 },
  animals: [
    ['cow', -66, 46],
    ['cow', -82, 70],
    ['cow', -54, 76],
    ['hen', -56, 48],
    ['hen', -64, 62],
    ['hen', -86, 52],
  ] as ['cow' | 'hen', number, number][],
};

/** Paredes del laberinto de maíz (rectángulos en metros), dentro de `FARM.maze`. */
function mazeWalls(): Rect[] {
  const M = FARM.maze;
  const t = 0.8;
  const out: Rect[] = [];
  const h = (x0: number, x1: number, z: number) => out.push({ minX: x0, maxX: x1, minZ: z - t / 2, maxZ: z + t / 2 });
  const v = (x: number, z0: number, z1: number) => out.push({ minX: x - t / 2, maxX: x + t / 2, minZ: z0, maxZ: z1 });
  // Borde con entrada al este (z 80–83) y salida al sur-oeste
  h(M.minX, M.maxX, M.minZ);
  h(M.minX + 4, M.maxX, M.maxZ);
  v(M.minX, M.minZ, M.maxZ);
  v(M.maxX, M.minZ, 79.5);
  v(M.maxX, 83.5, M.maxZ);
  // Pasillos interiores
  v(-84, 80, 94);
  h(-96, -84, 80);
  v(-96, 80, 90);
  h(-92, -84, 84);
  v(-92, 84, 94);
  h(-96, -88, 94);
  v(-88, 88, 94);
  return out;
}

export interface FarmInfo {
  barn: ReviveRoom & { incubator: { x: number; z: number }; chicks: THREE.Group };
  /** Hace crecer los campos (cuando giran los tres molinos). */
  growFields(animate: boolean): void;
  /** Plantas del invernadero (cuando el regador anda). */
  bloomGreenhouse(): void;
}

export function buildFarm(scene: THREE.Scene, rects: Rect[], circles: { x: number; z: number; r: number; h?: number }[]): FarmInfo {
  const add = <T extends THREE.Object3D>(m: T, x: number, y: number, z: number): T => {
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const R = FARM_REGION;
  add(box(R.maxX - R.minX + 2, 0.08, R.maxZ - R.minZ + 2, '#9cb85a', { outline: false, cast: false, brush: 22 }), (R.minX + R.maxX) / 2, 0.035, (R.minZ + R.maxZ) / 2);
  for (const C of [FARM_FROM_CENTRO, FARM_FROM_PORT]) {
    add(box(C.maxX - C.minX, 0.07, C.maxZ - C.minZ, '#b89a6a', { outline: false, cast: false, brush: 8 }), (C.minX + C.maxX) / 2, 0.045, (C.minZ + C.maxZ) / 2);
  }
  // Camino de tierra del tractor
  const dirt = '#a98a5a';
  const Rt = FARM.tractorRoute;
  for (let i = 1; i < Rt.length; i += 1) {
    const [ax, az] = Rt[i - 1];
    const [bx, bz] = Rt[i];
    const w = Math.abs(bx - ax) + 3;
    const d = Math.abs(bz - az) + 3;
    add(box(w, 0.06, d, dirt, { outline: false, cast: false, brush: 6 }), (ax + bx) / 2, 0.05, (az + bz) / 2);
  }

  // Cercos de madera del borde
  const wood = toon('#a97a52');
  for (let x = R.minX + 1; x < R.maxX - 2; x += 3) {
    add(box(0.12, 0.9, 0.12, '', { mat: wood, outline: 0.006 }), x, 0.45, R.maxZ - 0.5);
    add(box(3, 0.1, 0.08, '', { mat: wood, outline: false }), x + 1.5, 0.7, R.maxZ - 0.5);
  }

  // Granero rojo (mira a +Z) con techo a dos aguas y portón
  const B = FARM.barn;
  add(box(B.w, 4, B.d, '#c8452f', { outline: 0.05, brush: 3 }), B.x, 2, B.z);
  rects.push({ minX: B.x - B.w / 2, maxX: B.x + B.w / 2, minZ: B.z - B.d / 2, maxZ: B.z + B.d / 2 });
  for (const s of [-1, 1]) {
    const roof = box(B.w + 0.8, 0.2, B.d / 2 + 1, '#6a3e26', { outline: 0.03 });
    roof.position.set(B.x, 4.8, B.z + s * (B.d / 4 + 0.2));
    roof.rotation.x = s * 0.6;
    scene.add(roof);
  }
  add(box(2.4, 2.8, 0.1, '#fff3dc', { outline: 0.02 }), B.doorX, 1.4, B.z + B.d / 2 + 0.05);
  for (const r of [0.75, -0.75]) {
    const cross = box(0.15, 3.4, 0.05, '#c8452f', { outline: false });
    cross.position.set(B.doorX, 1.4, B.z + B.d / 2 + 0.11);
    cross.rotation.z = r;
    scene.add(cross);
  }

  // Invernadero de vidrio
  const G = FARM.greenhouse;
  const glass = new THREE.MeshBasicMaterial({ color: '#cfeefa', transparent: true, opacity: 0.45, depthWrite: false });
  const gh = new THREE.Mesh(new THREE.BoxGeometry(G.w, 2.6, G.d), glass);
  add(gh, G.x, 1.3, G.z);
  const frame = toon('#e8e2d6');
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) add(box(0.12, 2.8, 0.12, '', { mat: frame, outline: 0.006 }), G.x + (dx * G.w) / 2, 1.4, G.z + (dz * G.d) / 2);
  const ghRoof = new THREE.Mesh(new THREE.CylinderGeometry(G.d / 2, G.d / 2, G.w, 12, 1, true, 0, Math.PI), glass);
  ghRoof.rotation.z = Math.PI / 2;
  add(ghRoof, G.x, 2.6, G.z);
  rects.push({ minX: G.x - G.w / 2, maxX: G.x + G.w / 2, minZ: G.z - G.d / 2, maxZ: G.z + G.d / 2 });
  const plants = new THREE.Group();
  const plantColors = ['#ff8fc8', '#ffd23a', '#ff5a6e', '#b77cff'];
  for (let i = 0; i < 12; i += 1) {
    const px = G.x - G.w / 2 + 0.8 + (i % 6) * 1.25;
    const pz = G.z - 1 + Math.floor(i / 6) * 2;
    const stem = box(0.06, 0.7, 0.06, '#4f8f3a', { outline: false });
    stem.position.set(px, 0.35, pz);
    plants.add(stem);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), toon(plantColors[i % 4]));
    flower.position.set(px, 0.8, pz);
    plants.add(flower);
  }
  plants.visible = false;
  plants.userData.dynamic = true;
  scene.add(plants);

  // Campos: surcos de tierra; las plantas crecen cuando giran los molinos
  const F = FARM.fields;
  const crops = new THREE.Group();
  const cropMat = toon('#7be07a');
  const wheat = toon('#ffd23a');
  for (let z = F.minZ + 1; z < F.maxZ; z += 2.4) {
    add(box(F.maxX - F.minX, 0.1, 1, '#6a4a32', { outline: false, cast: false }), (F.minX + F.maxX) / 2, 0.06, z);
    for (let x = F.minX + 1; x < F.maxX; x += 1.4) {
      const p = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 6), Math.round(x + z) % 3 ? cropMat : wheat);
      p.position.set(x, 0.45, z);
      crops.add(p);
    }
  }
  crops.scale.y = 0.15;
  crops.userData.dynamic = true;
  scene.add(crops);
  rects.push({ minX: F.minX, maxX: F.maxX, minZ: F.minZ, maxZ: F.maxZ });

  // Laberinto de maíz con un espantapájaros en el centro
  const corn = toon('#c9b04a');
  const cornDark = toon('#8a9a3a');
  for (const w of mazeWalls()) {
    const len = Math.max(w.maxX - w.minX, w.maxZ - w.minZ);
    const along = w.maxX - w.minX > w.maxZ - w.minZ;
    for (let s = 0.4; s < len; s += 0.8) {
      const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.1, 5), Math.round(s * 3) % 2 ? corn : cornDark);
      stalk.position.set(along ? w.minX + s : (w.minX + w.maxX) / 2, 1.05, along ? (w.minZ + w.maxZ) / 2 : w.minZ + s);
      scene.add(stalk);
    }
    rects.push(w);
  }
  const C = FARM.mazeCenter;
  const crow = new THREE.Group();
  const post = box(0.12, 1.8, 0.12, '#6a3e26', { outline: 0.006 });
  post.position.y = 0.9;
  crow.add(post);
  const arms = box(1.4, 0.1, 0.1, '#6a3e26', { outline: 0.006 });
  arms.position.y = 1.4;
  crow.add(arms);
  const shirt = box(0.6, 0.6, 0.3, '#3f7fd6', { outline: 0.015 });
  shirt.position.y = 1.3;
  crow.add(shirt);
  const head = rounded(new THREE.SphereGeometry(0.22, 10, 8), toon('#f2d38a'), 0.01);
  head.position.y = 1.85;
  crow.add(head);
  const hat = rounded(new THREE.ConeGeometry(0.35, 0.3, 10), toon('#a97a52'), 0.01);
  hat.position.y = 2.1;
  crow.add(hat);
  add(crow, C.x, 0, C.z);
  circles.push({ x: C.x, z: C.z, r: 0.25 });

  // Cartel de la granja
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c8452f';
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff3dc';
  g.font = 'bold 54px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('GRANJA', 256, 66);
  g.strokeStyle = '#231a36';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), withLife(new THREE.MeshBasicMaterial({ map: tex }))), -47.5, 2.1, 47.6);
  add(rounded(new THREE.CylinderGeometry(0.07, 0.07, 2, 6), wood, 0.008), -47.5, 1, 47.5);

  return {
    barn: buildBarn(scene, rects),
    growFields(animate) {
      if (!animate) {
        crops.scale.y = 1;
        return;
      }
      let k = 0.15;
      const grow = () => {
        k = Math.min(1, k + 0.02);
        crops.scale.y = k;
        if (k < 1) requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);
    },
    bloomGreenhouse() {
      plants.visible = true;
    },
  };
}

/** Granero por dentro: gris; la incubadora (lo que se revive) hace nacer pollitos. */
function buildBarn(scene: THREE.Scene, rects: Rect[]): ReviveRoom & { incubator: { x: number; z: number }; chicks: THREE.Group } {
  const RX = BARN_X;
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 12,
    d: 8,
    wall: '#e0a080',
    low: '#c8452f',
    trim: '#ffd23a',
    floor: ['#c9a77e', '#b8946a'],
    base: '#6a3e26',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { add, solid, z0 } = k;
  // Fardos de paja (se saltan) y herramientas colgadas
  const hay = toon('#f2d38a');
  for (const [x, z, h] of [
    [RX - 4.6, -2.8, 0.8],
    [RX - 3.4, -2.8, 0.8],
    [RX - 4, -2.8, 1.6],
  ] as [number, number, number][]) {
    add(box(1.1, 0.8, 0.9, '', { mat: hay, outline: 0.015 }), x, h - 0.4, z);
  }
  solid(RX - 4, -2.8, 2.3, 0.9, 0.8);
  for (let i = 0; i < 3; i += 1) add(box(0.08, 1.2, 0.08, '#6a3e26', { outline: 0.006 }), RX + 1 + i * 0.6, 1.6, z0 + 0.1);
  // Incubadora (el objeto que se revive) y el corral de los pollitos
  const incubator = { x: RX + 1.5, z: -2.6 };
  const chicks = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const ch = rounded(new THREE.SphereGeometry(0.16, 10, 8), toonUnique('#ffe066'), 0.008);
    ch.position.set(RX - 1 + (i % 3) * 0.5, 0.16, 1.2 + Math.floor(i / 3) * 0.5);
    chicks.add(ch);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), toon('#ff9f43'));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(ch.position.x, 0.18, ch.position.z + 0.17);
    chicks.add(beak);
  }
  chicks.visible = false;
  chicks.userData.dynamic = true;
  keepVivid(chicks);
  scene.add(chicks);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);
  return {
    room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
    spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
    exit: { x: RX + 3.5, z: k.z1 - 0.3 },
    spark: { id: 'spark-room-granero', x: RX - 4, z: -2.8, y: 2.4 },
    source: { x: RX - 1.5, z: -2.4 },
    target: incubator,
    gray,
    incubator,
    chicks,
  };
}
