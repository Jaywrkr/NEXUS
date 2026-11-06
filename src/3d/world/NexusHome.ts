import * as THREE from 'three';
import { box, glow, keepVivid, rounded, toon } from '../core/render';
import { makeGray, type Revivable } from './revive';
import { roomShell, type InteriorInfo } from './MigaHouse';
import type { Rect } from './World';

/*
 * La casa del Nexus (pedido del usuario después de la Fase 9): una casita vieja y rota que el Nexus va
 * arreglando de a poco. Cada cosa rota se arregla con chispitas de la mochila (la misma acción de
 * despertar cosas, Decisión 040) y queda arreglada para siempre. Algunas además sirven:
 *   armario → cambiar la ropa del Nexus · radio → canción de la ciudad · cama → siesta (recarga la capucha)
 *   estante → muestra los recuerdos · techo y jardín se arreglan desde afuera.
 * Interior en x = 1000 (habitaciones "maqueta" lejos del barrio, como las otras).
 */

export const HOME_X = 1000;

export interface HomeItemInfo {
  id: string;
  name: string;
  cost: number;
  x: number;
  z: number;
  /** Afuera (techo, jardín) o adentro. */
  outside?: boolean;
  /** Verbo del botón cuando ya está arreglado (si sirve para algo). */
  use?: string;
}

/** Lote de la casa en el barrio (frente mirando a +Z). */
export const HOME_LOT = { x: -36, z: 51, w: 7, d: 6 };

export const HOME_ITEMS: HomeItemInfo[] = [
  { id: 'luz', name: 'la lámpara', cost: 1, x: HOME_X - 0.5, z: -0.4 },
  { id: 'ventana', name: 'la ventana', cost: 1, x: HOME_X + 1.5, z: -3.2 },
  { id: 'alfombra', name: 'la alfombra', cost: 1, x: HOME_X + 0.2, z: 1.2 },
  { id: 'planta', name: 'la planta', cost: 1, x: HOME_X + 4.6, z: -2.8 },
  { id: 'cama', name: 'la cama', cost: 2, x: HOME_X - 4, z: -2, use: '💤 Siesta' },
  { id: 'radio', name: 'la radio', cost: 2, x: HOME_X + 4.6, z: 0.6, use: '🎵 Música' },
  { id: 'estante', name: 'el estante', cost: 2, x: HOME_X + 3.2, z: -3.2, use: '🏛️ Recuerdos' },
  { id: 'armario', name: 'el armario', cost: 2, x: HOME_X - 4.6, z: 1.6, use: '🧥 Armario' },
  { id: 'techo', name: 'el techo', cost: 3, x: HOME_LOT.x - 2.4, z: HOME_LOT.z + HOME_LOT.d / 2 + 1, outside: true },
  { id: 'jardin', name: 'el jardín', cost: 2, x: HOME_LOT.x + 3.6, z: HOME_LOT.z + HOME_LOT.d / 2 + 2.2, outside: true },
];

interface ItemView {
  broken: THREE.Group;
  fixed: THREE.Group;
}

export interface NexusHome {
  info: InteriorInfo;
  gray: Revivable;
  /** Puerta (afuera) para entrar. */
  door: { x: number; z: number };
  /** Muestra la cosa arreglada (`animate`: con un saltito). */
  fix(id: string, animate: boolean): void;
  /** Ventana de afuera prendida cuando hay luz adentro. */
  update(dt: number, time: number): void;
}

const g = () => new THREE.Group();

export function buildNexusHome(scene: THREE.Scene, rects: Rect[]): NexusHome {
  const views = new Map<string, ItemView>();
  const RX = HOME_X;
  // ---------- Adentro ----------
  const k = roomShell(rects, {
    cx: RX,
    cz: 0,
    w: 12,
    d: 8,
    wall: '#e9cfa8',
    low: '#c9a77e',
    trim: '#ffc23a',
    floor: ['#a97a52', '#b88a60'],
    base: '#6e5133',
    doorFrom: RX + 2.5,
    doorTo: RX + 4.5,
  });
  const { solid, z0 } = k;
  const items = new THREE.Group();
  const place = (id: string, build: (b: THREE.Group, f: THREE.Group) => void, x: number, z: number) => {
    const b = g();
    const f = g();
    build(b, f);
    b.position.set(x, 0, z);
    f.position.set(x, 0, z);
    f.visible = false;
    items.add(b, f);
    views.set(id, { broken: b, fixed: f });
  };
  const at = (id: string) => HOME_ITEMS.find((i) => i.id === id)!;
  const dust = '#8e8a99';
  // Lámpara de techo
  place('luz', (b, f) => {
    const wire = box(0.03, 1, 0.03, '#2c2838', { outline: false });
    wire.position.y = 2.9;
    b.add(wire);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#6a6478'));
    bulb.position.y = 2.35;
    b.add(bulb);
    const w2 = wire.clone();
    f.add(w2);
    const shade = rounded(new THREE.ConeGeometry(0.45, 0.4, 16, 1, true), toon('#ff9f43'), 0.012);
    (shade.material as THREE.Material).side = THREE.DoubleSide;
    shade.position.y = 2.45;
    f.add(shade);
    const on = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), glow('#fff3a8'));
    on.position.y = 2.3;
    f.add(on);
  }, at('luz').x, at('luz').z);
  // Ventana (pared del fondo)
  place('ventana', (b, f) => {
    const hole = box(1.6, 1.2, 0.06, '#3d3550', { outline: 0.02 });
    hole.position.set(0, 1.7, 0);
    b.add(hole);
    for (const r of [0.5, -0.5]) {
      const plank = box(1.8, 0.18, 0.08, '#7a5a3a', { outline: 0.01 });
      plank.position.set(0, 1.7, 0.06);
      plank.rotation.z = r;
      b.add(plank);
    }
    const glass = box(1.6, 1.2, 0.06, '#bfe6ff', { outline: 0.02 });
    glass.position.set(0, 1.7, 0);
    f.add(glass);
    const frame = box(1.75, 0.1, 0.1, '#fff3dc', { outline: false });
    frame.position.set(0, 1.7, 0.05);
    f.add(frame);
    for (const sx of [-1, 1]) {
      const curtain = box(0.4, 1.4, 0.05, '#ff5a6e', { outline: 0.01 });
      curtain.position.set(sx * 0.95, 1.65, 0.1);
      f.add(curtain);
    }
  }, at('ventana').x, z0 + 0.12);
  // Alfombra
  place('alfombra', (b, f) => {
    const old = box(2.4, 0.02, 1.6, dust, { outline: false, cast: false });
    old.position.y = 0.02;
    old.rotation.y = 0.3;
    b.add(old);
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.03, 28), toon('#5ec8ff'));
    rug.position.y = 0.02;
    f.add(rug);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.035, 24), toon('#ffe066'));
    ring.position.y = 0.025;
    f.add(ring);
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 18), toon('#ff5a6e'));
    dot.position.y = 0.03;
    f.add(dot);
  }, at('alfombra').x, at('alfombra').z);
  // Planta
  place('planta', (b, f) => {
    for (const grp of [b, f]) {
      const pot = rounded(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 12), toon('#c8452f'), 0.012);
      pot.position.y = 0.22;
      grp.add(pot);
    }
    const stick = box(0.04, 0.6, 0.04, '#7a5a3a', { outline: false });
    stick.position.set(0.05, 0.7, 0);
    stick.rotation.z = 0.4;
    b.add(stick);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const leaf = rounded(new THREE.SphereGeometry(0.2, 8, 6), toon('#4f8f3a'), 0.01);
      leaf.scale.set(0.6, 1.4, 0.6);
      leaf.position.set(Math.cos(a) * 0.18, 0.75 + (i % 2) * 0.15, Math.sin(a) * 0.18);
      leaf.rotation.z = Math.cos(a) * 0.5;
      f.add(leaf);
    }
    for (let i = 0; i < 3; i += 1) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(['#ff8fc8', '#ffe066', '#ff5a6e'][i]));
      fl.position.set(-0.15 + i * 0.15, 1.05, 0.1);
      f.add(fl);
    }
  }, at('planta').x, at('planta').z);
  solid(at('planta').x, at('planta').z, 0.6, 0.6);
  // Cama
  place('cama', (b, f) => {
    const frame = box(1.6, 0.4, 2.6, '#a97a52', { outline: 0.02 });
    frame.position.y = 0.2;
    f.add(frame);
    const blanket = box(1.5, 0.18, 1.8, '#3f7fd6', { outline: 0.015 });
    blanket.position.set(0, 0.48, 0.3);
    f.add(blanket);
    const pillow = box(1.1, 0.16, 0.5, '#fff3dc', { outline: 0.015 });
    pillow.position.set(0, 0.48, -0.9);
    f.add(pillow);
    const head = box(1.6, 1, 0.12, '#a97a52', { outline: 0.02 });
    head.position.set(0, 0.5, -1.3);
    f.add(head);
    const old = box(1.4, 0.25, 2.3, dust, { outline: 0.02 });
    old.position.set(0, 0.13, 0);
    old.rotation.z = 0.12;
    b.add(old);
  }, at('cama').x, at('cama').z);
  solid(at('cama').x, at('cama').z, 1.6, 2.6, 0.57);
  // Radio
  place('radio', (b, f) => {
    for (const [grp, col] of [
      [b, dust],
      [f, '#b77cff'],
    ] as [THREE.Group, string][]) {
      const table = box(0.9, 0.7, 0.6, '#7a5a3a', { outline: 0.015 });
      table.position.y = 0.35;
      grp.add(table);
      const radio = box(0.7, 0.45, 0.35, col, { outline: 0.015 });
      radio.position.y = 0.93;
      grp.add(radio);
      const speaker = rounded(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), toon('#2c2838'), 0.006);
      speaker.rotation.x = Math.PI / 2;
      speaker.position.set(-0.12, 0.93, 0.18);
      grp.add(speaker);
      const ant = box(0.02, 0.5, 0.02, '#c8cdd6', { outline: false });
      ant.position.set(0.25, 1.35, 0);
      ant.rotation.z = grp === b ? 1.2 : -0.3;
      grp.add(ant);
    }
  }, at('radio').x, at('radio').z);
  solid(at('radio').x, at('radio').z, 0.9, 0.6);
  // Estante de recuerdos
  place('estante', (b, f) => {
    for (let i = 0; i < 3; i += 1) {
      const p = box(1.6, 0.08, 0.35, '#7a5a3a', { outline: 0.01 });
      p.position.set(0.2 * i - 0.2, 0.05 + i * 0.09, 0.3 + i * 0.1);
      p.rotation.y = 0.3 * (i - 1);
      b.add(p);
    }
    const back = box(1.6, 1.8, 0.1, '#a97a52', { outline: 0.02 });
    back.position.set(0, 0.9, -0.1);
    f.add(back);
    for (let i = 0; i < 3; i += 1) {
      const p = box(1.6, 0.07, 0.35, '#a97a52', { outline: 0.01 });
      p.position.set(0, 0.35 + i * 0.6, 0.08);
      f.add(p);
    }
    const colors = ['#ffd23a', '#5ec8ff', '#b77cff', '#7be07a', '#ff8fc8', '#ff9f43', '#9be37a'];
    colors.forEach((c, i) => {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), glow(c));
      star.position.set(-0.6 + (i % 4) * 0.4, 0.55 + Math.floor(i / 4) * 0.6, 0.1);
      f.add(star);
    });
  }, at('estante').x, z0 + 0.35);
  solid(at('estante').x, z0 + 0.35, 1.6, 0.5);
  // Armario
  place('armario', (b, f) => {
    const body = box(1.3, 2.1, 0.7, '#8a6a4a', { outline: 0.02 });
    body.position.y = 1.05;
    f.add(body);
    for (const sx of [-0.32, 0.32]) {
      const door = box(0.6, 1.9, 0.05, '#ff9f43', { outline: 0.01 });
      door.position.set(sx, 1.05, 0.37);
      f.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon('#ffd23a'));
      knob.position.set(sx * 0.4, 1.05, 0.41);
      f.add(knob);
    }
    const hood = rounded(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#22b8a8'), 0.01);
    hood.position.set(0, 2.15, 0);
    f.add(hood);
    const oldBody = box(1.3, 2.1, 0.7, dust, { outline: 0.02 });
    oldBody.position.y = 1.05;
    b.add(oldBody);
    const hanging = box(0.6, 1.9, 0.05, '#6a6478', { outline: 0.01 });
    hanging.position.set(0.75, 1, 0.5);
    hanging.rotation.y = -1.1;
    b.add(hanging);
  }, at('armario').x, at('armario').z);
  solid(at('armario').x, at('armario').z, 1.3, 0.7);
  items.userData.dynamic = true;
  keepVivid(items);
  scene.add(items);
  k.g.userData.dynamic = true;
  keepVivid(k.g);
  const gray = makeGray(k.g);
  scene.add(k.g);

  // ---------- Afuera: la casita vieja ----------
  const L = HOME_LOT;
  const out = g();
  const wallMat = toon('#e9cfa8', 3);
  const walls = box(L.w, 3.2, L.d, '', { mat: wallMat, outline: 0.05 });
  walls.position.set(L.x, 1.6, L.z);
  out.add(walls);
  rects.push({ minX: L.x - L.w / 2, maxX: L.x + L.w / 2, minZ: L.z - L.d / 2, maxZ: L.z + L.d / 2 });
  const doorMesh = box(1.2, 2.1, 0.08, '#6a3e26', { outline: 0.02 });
  doorMesh.position.set(L.x + 1.6, 1.05, L.z + L.d / 2 + 0.04);
  out.add(doorMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#ffd23a'));
  knob.position.set(L.x + 2, 1.05, L.z + L.d / 2 + 0.1);
  out.add(knob);
  // Cartel con el nombre
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const cx = c.getContext('2d')!;
  cx.fillStyle = '#22b8a8';
  cx.fillRect(0, 0, 512, 128);
  cx.fillStyle = '#fff3dc';
  cx.font = 'bold 58px "Arial Black", Impact, sans-serif';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText('CASA DEL NEXUS', 256, 68);
  cx.strokeStyle = '#231a36';
  cx.lineWidth = 10;
  cx.strokeRect(5, 5, 502, 118);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(L.x - 1.2, 2.6, L.z + L.d / 2 + 0.05);
  out.add(sign);
  // Ventana del frente: oscura; con la lámpara arreglada se prende
  const winMat = new THREE.MeshBasicMaterial({ color: '#3d3550' });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), winMat);
  win.position.set(L.x - 1.6, 1.6, L.z + L.d / 2 + 0.05);
  out.add(win);
  // Techo: roto (con agujero y tablas) o arreglado (tejas rojas y chimenea con humo)
  const roofBroken = g();
  const roofFixed = g();
  const roofShape = (mat: THREE.Material, grp: THREE.Group) => {
    for (const side of [-1, 1]) {
      const slab = box(L.w + 0.8, 0.22, L.d / 2 + 0.9, '', { mat, outline: 0.03 });
      slab.position.set(L.x, 3.9, L.z + side * (L.d / 4 + 0.15));
      slab.rotation.x = side * 0.55;
      grp.add(slab);
    }
  };
  roofShape(toon('#8a7f76'), roofBroken);
  const holeMesh = box(1.6, 0.25, 1.2, '#1d1630', { outline: false });
  holeMesh.position.set(L.x + 1, 4.05, L.z + 0.9);
  holeMesh.rotation.x = 0.55;
  roofBroken.add(holeMesh);
  for (const r of [0.3, -0.4]) {
    const plank = box(1.8, 0.1, 0.25, '#7a5a3a', { outline: 0.01 });
    plank.position.set(L.x - 1.4, 4.2, L.z + 0.6);
    plank.rotation.set(0.55, 0, r);
    roofBroken.add(plank);
  }
  roofShape(toon('#c4643e'), roofFixed);
  const chimney = box(0.6, 1.4, 0.6, '#a9512f', { outline: 0.02 });
  chimney.position.set(L.x - 2, 4.6, L.z - 0.8);
  roofFixed.add(chimney);
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#f4efe6', transparent: true, opacity: 0.5 }));
    p.position.set(L.x - 2, 5.5 + i * 0.5, L.z - 0.8);
    roofFixed.add(p);
    puffs.push(p);
  }
  roofFixed.visible = false;
  out.add(roofBroken, roofFixed);
  views.set('techo', { broken: roofBroken, fixed: roofFixed });
  // Jardín del frente: tierra seca o flores con cerquito y buzón
  const gardenBroken = g();
  const gardenFixed = g();
  const gx = L.x + 3.6;
  const gz = L.z + L.d / 2 + 2.2;
  const dirt = box(3, 0.06, 2, '#9a8470', { outline: false, cast: false });
  dirt.position.set(gx, 0.04, gz);
  gardenBroken.add(dirt);
  const weed = box(0.05, 0.4, 0.05, '#7a6a5a', { outline: false });
  weed.position.set(gx - 0.6, 0.25, gz + 0.3);
  weed.rotation.z = 0.4;
  gardenBroken.add(weed);
  const soil = box(3, 0.08, 2, '#6a4a32', { outline: false, cast: false });
  soil.position.set(gx, 0.05, gz);
  gardenFixed.add(soil);
  const petals = ['#ff8fc8', '#ffe066', '#ff5a6e', '#b77cff', '#5ec8ff'];
  for (let i = 0; i < 10; i += 1) {
    const stem = box(0.04, 0.4, 0.04, '#4f8f3a', { outline: false });
    const fx = gx - 1.2 + (i % 5) * 0.6;
    const fz = gz - 0.5 + Math.floor(i / 5) * 0.9;
    stem.position.set(fx, 0.25, fz);
    gardenFixed.add(stem);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), toon(petals[i % 5]));
    fl.position.set(fx, 0.5, fz);
    gardenFixed.add(fl);
  }
  for (let i = 0; i < 6; i += 1) {
    const picket = box(0.12, 0.6, 0.06, '#fff3dc', { outline: 0.008 });
    picket.position.set(gx - 1.5 + i * 0.6, 0.3, gz + 1.1);
    gardenFixed.add(picket);
  }
  const mailbox = box(0.4, 0.35, 0.6, '#3f7fd6', { outline: 0.015 });
  mailbox.position.set(gx + 1.8, 1, gz + 0.9);
  gardenFixed.add(mailbox);
  const mpost = box(0.08, 0.9, 0.08, '#6a3e26', { outline: false });
  mpost.position.set(gx + 1.8, 0.45, gz + 0.9);
  gardenFixed.add(mpost);
  gardenFixed.visible = false;
  out.add(gardenBroken, gardenFixed);
  views.set('jardin', { broken: gardenBroken, fixed: gardenFixed });
  out.userData.dynamic = true;
  scene.add(out);

  let lit = false;
  let t = 0;
  return {
    info: {
      room: { minX: k.x0, maxX: k.x1, minZ: z0, maxZ: k.z1 + 0.2 },
      spawn: { x: RX + 3.5, z: k.z1 - 1.3 },
      exit: { x: RX + 3.5, z: k.z1 - 0.3 },
      spark: { id: 'spark-room-casa-nexus', x: RX - 4.4, z: -2.2, y: 0.9 },
    },
    gray,
    door: { x: L.x + 1.6, z: L.z + L.d / 2 + 0.9 },
    fix(id, animate) {
      const v = views.get(id);
      if (!v) return;
      v.broken.visible = false;
      v.fixed.visible = true;
      if (id === 'luz') {
        lit = true;
        winMat.color.set('#ffe9a0');
      }
      if (animate) {
        v.fixed.scale.setScalar(0.6);
        let k2 = 0;
        const grow = () => {
          k2 = Math.min(1, k2 + 0.08);
          const s = 0.6 + 0.4 * k2 + Math.sin(k2 * Math.PI) * 0.15;
          v.fixed.scale.setScalar(s);
          if (k2 < 1) requestAnimationFrame(grow);
          else v.fixed.scale.setScalar(1);
        };
        requestAnimationFrame(grow);
      }
    },
    update(dt, time) {
      t += dt;
      puffs.forEach((p, i) => {
        const kk = (time * 0.4 + i / 3) % 1;
        p.position.y = 5.4 + kk * 1.6;
        p.scale.setScalar(0.6 + kk);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - kk);
      });
      if (lit) winMat.color.setHSL(0.13, 1, 0.78 + Math.sin(t * 2) * 0.03);
    },
  };
}
