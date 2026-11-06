import { DISTRICTS } from '../world/districts';
import { SKATE_REGION } from '../world/Skatepark';
import { PARK_REGION } from '../world/Park';
import { STATION_CORRIDOR, STATION_REGION } from '../world/Station';
import { CERRO, CERRO_CORRIDOR, CERRO_REGION } from '../world/Cerro';
import { CREEK, FOREST_FROM_CERRO, FOREST_FROM_PARK, FOREST_REGION, TREE } from '../world/Forest';
import { FARM, FARM_FROM_CENTRO, FARM_FROM_PORT, FARM_REGION } from '../world/Farm';
import { FACTORY, FACTORY_FROM_PARK, FACTORY_FROM_SKATE, FACTORY_REGION } from '../world/Factory';
import { ALTO, ALTO_FROM_SKATE, ALTO_REGION } from '../world/BarrioAlto';
import { JETTY, PLAYA_FROM_PORT, PLAYA_FROM_STATION, PLAYA_REGION } from '../world/Playa';
import { ISLA, ISLA_PIER, ISLA_REGION, VOLCANO } from '../world/Isla';
import { LEDGE, NIEVE_FROM_PARK, NIEVE_REGION, SUMMIT } from '../world/Nieve';
import { PIERS, PORT_CORRIDOR, PORT_REGION, SEA_Z } from '../world/Port';

/*
 * Mapa de la ciudad visto desde arriba (menú → Mapa, o tecla M). Muestra dónde volvió el color,
 * los lugares grandes (★), las cosas dormidas/despiertas (✦), los nidos, al Nexus y los distritos
 * que vienen. Se dibuja en un canvas 2D; el norte (−Z) queda arriba.
 */

export interface MapData {
  life: (x: number, z: number) => number;
  walls: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  canal: { minZ: number; maxZ: number; bridgeX: number; bridgeOpen: boolean };
  places: { name: string; x: number; z: number; alive: boolean }[];
  things: { x: number; z: number; awake: boolean }[];
  nests: { x: number; z: number; ready: boolean }[];
  nexus: { x: number; z: number; heading: number };
  /** Piezas que faltan (las marca el telescopio del observatorio). */
  pieces?: { x: number; z: number; name: string }[];
}

export type MapZoom = 'near' | 'all';

// Todo el mundo (con los distritos de la expansión) y la ventana «cerca» (176 m, centrada en el Nexus)
const WORLD_BOUNDS = { minX: -112, maxX: 168, minZ: -168, maxZ: 202 };
const NEAR = 176;

function viewFor(zoom: MapZoom, nexus: { x: number; z: number }): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const B = WORLD_BOUNDS;
  if (zoom === 'all') {
    const size = Math.max(B.maxX - B.minX, B.maxZ - B.minZ);
    const cx = (B.minX + B.maxX) / 2;
    const cz = (B.minZ + B.maxZ) / 2;
    return { minX: cx - size / 2, maxX: cx + size / 2, minZ: cz - size / 2, maxZ: cz + size / 2 };
  }
  const cx = Math.min(Math.max(nexus.x, B.minX + NEAR / 2), B.maxX - NEAR / 2);
  const cz = Math.min(Math.max(nexus.z, B.minZ + NEAR / 2), B.maxZ - NEAR / 2);
  return { minX: cx - NEAR / 2, maxX: cx + NEAR / 2, minZ: cz - NEAR / 2, maxZ: cz + NEAR / 2 };
}

export function drawMap(canvas: HTMLCanvasElement, data: MapData, time: number, zoom: MapZoom = 'near'): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const VIEW = viewFor(zoom, data.nexus);
  const sx = W / (VIEW.maxX - VIEW.minX);
  const sz = H / (VIEW.maxZ - VIEW.minZ);
  const px = (x: number) => (x - VIEW.minX) * sx;
  const pz = (z: number) => (z - VIEW.minZ) * sz;

  ctx.fillStyle = '#16122a';
  ctx.fillRect(0, 0, W, H);

  // Distritos que vienen: contorno punteado y nombre
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 2;
  ctx.font = 'bold 15px "Nunito", sans-serif';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    if (d.open) continue;
    const x0 = px(d.minX);
    const z0 = pz(d.minZ);
    const w = (d.maxX - d.minX) * sx;
    const h = (d.maxZ - d.minZ) * sz;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x0, z0, w, h);
    ctx.strokeStyle = 'rgba(255,243,220,0.25)';
    ctx.strokeRect(x0, z0, w, h);
    const cx = Math.min(Math.max(px((d.minX + d.maxX) / 2), 60), W - 60);
    const cz = Math.min(Math.max(pz((d.minZ + d.maxZ) / 2), 22), H - 14);
    ctx.fillStyle = 'rgba(255,243,220,0.55)';
    ctx.fillText(`${d.name} · pronto`, cx, cz);
  }
  ctx.restore();

  // Suelo del Centro y del Skatepark: gris donde falta vida, verde (o naranja) donde volvió el color
  const step = 2;
  const center = DISTRICTS[0];
  for (const [area, alive] of [
    [center, [98, 170, 68]],
    [SKATE_REGION, [200, 150, 90]],
    [PARK_REGION, [230, 120, 140]],
    [STATION_REGION, [190, 160, 120]],
    [STATION_CORRIDOR, [190, 160, 120]],
    [CERRO_REGION, [110, 170, 120]],
    [CERRO_CORRIDOR, [110, 170, 120]],
    [FOREST_REGION, [80, 150, 90]],
    [FOREST_FROM_CERRO, [80, 150, 90]],
    [FOREST_FROM_PARK, [80, 150, 90]],
    [FARM_REGION, [190, 170, 100]],
    [FARM_FROM_CENTRO, [190, 170, 100]],
    [FARM_FROM_PORT, [190, 170, 100]],
    [FACTORY_REGION, [170, 160, 150]],
    [FACTORY_FROM_PARK, [170, 160, 150]],
    [FACTORY_FROM_SKATE, [170, 160, 150]],
    [ALTO_REGION, [215, 200, 180]],
    [ALTO_FROM_SKATE, [215, 200, 180]],
    [PLAYA_REGION, [242, 220, 160]],
    [PLAYA_FROM_PORT, [242, 220, 160]],
    [PLAYA_FROM_STATION, [242, 220, 160]],
    [JETTY, [150, 144, 130]],
    [ISLA_REGION, [150, 190, 110]],
    [ISLA_PIER, [169, 122, 82]],
    [NIEVE_REGION, [225, 235, 245]],
    [NIEVE_FROM_PARK, [225, 235, 245]],
    [PORT_REGION, [150, 160, 190]],
    [PORT_CORRIDOR, [150, 160, 190]],
  ] as [{ minX: number; maxX: number; minZ: number; maxZ: number }, number[]][]) {
    for (let x = area.minX; x < area.maxX; x += step) {
      for (let z = area.minZ; z < area.maxZ; z += step) {
        const l = data.life(x + 1, z + 1);
        const r = Math.round(78 + (alive[0] - 78) * l);
        const g = Math.round(70 + (alive[1] - 70) * l);
        const b = Math.round(88 + (alive[2] - 88) * l);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(px(x), pz(z), step * sx + 0.5, step * sz + 0.5);
      }
    }
  }
  // Camino al skatepark
  ctx.fillStyle = '#8a817c';
  ctx.fillRect(px(-60), pz(-4), (62 + 60) * sx, 8 * sz);
  ctx.fillRect(px(-4), pz(-60), 8 * sx, (data.canal.minZ - 1.2 + 60) * sz);
  ctx.fillRect(px(-4), pz(PARK_REGION.maxZ), 8 * sx, (-45 - PARK_REGION.maxZ) * sz);
  // Mar y muelles del puerto
  ctx.fillStyle = '#2f78c8';
  ctx.fillRect(px(-76), pz(SEA_Z), 176 * sx, 30 * sz);
  ctx.fillStyle = '#a97a52';
  for (const p of PIERS) ctx.fillRect(px(p.minX), pz(p.minZ), (p.maxX - p.minX) * sx, (p.maxZ - p.minZ) * sz);
  // La cima y el saliente de la Montaña
  ctx.fillStyle = '#8a8e9a';
  for (const r of [SUMMIT, LEDGE]) ctx.fillRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * sx, (r.maxZ - r.minZ) * sz);
  // Templo y volcán de la isla
  ctx.fillStyle = '#9a9484';
  const it = ISLA.temple;
  ctx.fillRect(px(it.x - it.w / 2), pz(it.z - it.d / 2), it.w * sx, it.d * sz);
  ctx.fillStyle = '#6e5a50';
  ctx.beginPath();
  ctx.arc(px(VOLCANO.x), pz(VOLCANO.z), VOLCANO.r * sx, 0, Math.PI * 2);
  ctx.fill();
  // Cine, biblioteca y terrazas del Barrio Alto
  for (const [b, col] of [
    [ALTO.cine, '#a0565e'],
    [ALTO.library, '#b8a888'],
  ] as [{ x: number; z: number; w: number; d: number }, string][]) {
    ctx.fillStyle = col;
    ctx.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w * sx, b.d * sz);
  }
  ctx.fillStyle = '#e77fa6';
  for (const r of ALTO.roofs) ctx.fillRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * sx, (r.maxZ - r.minZ) * sz);
  // Sala de máquinas y depósito de la fábrica
  ctx.fillStyle = '#4a4656';
  const fh = FACTORY.hall;
  ctx.fillRect(px(fh.x - fh.w / 2), pz(fh.z - fh.d / 2), fh.w * sx, fh.d * sz);
  const fw = FACTORY.warehouse;
  ctx.fillRect(px(fw.minX), pz(fw.minZ), (fw.maxX - fw.minX) * sx, (fw.maxZ - fw.minZ) * sz);
  // Campos y maizal de la granja
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(px(FARM.fields.minX), pz(FARM.fields.minZ), (FARM.fields.maxX - FARM.fields.minX) * sx, (FARM.fields.maxZ - FARM.fields.minZ) * sz);
  ctx.fillStyle = '#c9b04a';
  ctx.fillRect(px(FARM.maze.minX), pz(FARM.maze.minZ), (FARM.maze.maxX - FARM.maze.minX) * sx, (FARM.maze.maxZ - FARM.maze.minZ) * sz);
  // Arroyo y árbol gigante del bosque
  ctx.fillStyle = '#3f86c8';
  ctx.fillRect(px(CREEK.minX), pz(FOREST_REGION.minZ), (CREEK.maxX - CREEK.minX) * sx, (FOREST_REGION.maxZ - FOREST_REGION.minZ) * sz);
  ctx.fillStyle = '#2f6a32';
  ctx.beginPath();
  ctx.arc(px(TREE.x), pz(TREE.z), 5 * sx, 0, Math.PI * 2);
  ctx.fill();
  // Meseta del cerro y acantilado
  ctx.fillStyle = 'rgba(120,108,98,0.85)';
  ctx.fillRect(px(CERRO.top.minX), pz(CERRO.top.minZ), (CERRO.top.maxX - CERRO.top.minX) * sx, (CERRO.top.maxZ - CERRO.top.minZ) * sz);
  ctx.fillRect(px(-100), pz(-40), 44 * sx, 7 * sz);
  // Vías de la Estación
  ctx.fillStyle = '#6a3e26';
  ctx.fillRect(px(STATION_REGION.minX - 2), pz(40.2), (STATION_REGION.maxX - STATION_REGION.minX + 8) * sx, 1.6 * sz);

  // Canal y puente
  ctx.fillStyle = '#3f86c8';
  ctx.fillRect(px(-60), pz(data.canal.minZ), 120 * sx, (data.canal.maxZ - data.canal.minZ) * sz);
  ctx.fillStyle = data.canal.bridgeOpen ? '#b0855c' : 'rgba(176,133,92,0.35)';
  ctx.fillRect(px(data.canal.bridgeX - 1.6), pz(data.canal.minZ), 3.2 * sx, (data.canal.maxZ - data.canal.minZ) * sz);

  // Casas y paredes
  ctx.fillStyle = 'rgba(29,22,48,0.75)';
  for (const r of data.walls) {
    if (r.minX > 200 || r.maxX - r.minX > 40 || r.maxZ - r.minZ > 40) continue;
    ctx.fillRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * sx, (r.maxZ - r.minZ) * sz);
  }

  // Nidos de chispitas
  for (const n of data.nests) {
    ctx.fillStyle = n.ready ? '#ffe066' : '#6a6450';
    ctx.beginPath();
    ctx.arc(px(n.x), pz(n.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cosas dormidas / despiertas
  for (const t of data.things) {
    ctx.fillStyle = t.awake ? '#9be7ff' : '#6b6680';
    ctx.beginPath();
    ctx.arc(px(t.x), pz(t.z), 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lugares grandes
  ctx.font = 'bold 13px "Nunito", sans-serif';
  ctx.textAlign = 'center';
  // Las Piezas que faltan (las marca el telescopio): rombos violetas que laten
  for (const pc of data.pieces ?? []) {
    const x = px(pc.x);
    const z = pz(pc.z);
    const k = 1 + Math.sin(time * 4) * 0.2;
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#c7a0ef';
    ctx.strokeStyle = '#fff3dc';
    ctx.lineWidth = 2;
    ctx.fillRect(-9 * k, -9 * k, 18 * k, 18 * k);
    ctx.strokeRect(-9 * k, -9 * k, 18 * k, 18 * k);
    ctx.restore();
  }
  // En «toda la ciudad» los nombres de los lugares no entran: van los de los distritos
  if (zoom === 'all') {
    ctx.font = 'bold 12px "Nunito", sans-serif';
    for (const d of DISTRICTS) {
      if (!d.open || d.id === 'camino-skate') continue;
      const x = px((d.minX + d.maxX) / 2);
      const z = pz((d.minZ + d.maxZ) / 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1d1630';
      ctx.strokeText(d.name, x, z);
      ctx.fillStyle = '#fff3dc';
      ctx.fillText(d.name, x, z);
    }
    ctx.font = 'bold 13px "Nunito", sans-serif';
  }
  for (const p of data.places) {
    const x = px(p.x);
    const z = pz(p.z);
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = p.alive ? '#ffc23a' : '#8e8a99';
    ctx.strokeStyle = '#1d1630';
    ctx.lineWidth = 2;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
    if (zoom === 'all') continue;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1d1630';
    ctx.strokeText(p.name, x, z - 12);
    ctx.fillStyle = p.alive ? '#fff3dc' : '#cfc9dd';
    ctx.fillText(p.name, x, z - 12);
  }

  // El Nexus: flecha que late
  const nx = px(data.nexus.x);
  const nz = pz(data.nexus.z);
  const pulse = 1 + Math.sin(time * 5) * 0.15;
  ctx.save();
  ctx.translate(nx, nz);
  ctx.beginPath();
  ctx.arc(0, 0, 14 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,74,0.25)';
  ctx.fill();
  // heading: 0 = +Z (sur, abajo en el mapa)
  ctx.rotate(-data.nexus.heading);
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.lineTo(-7, -7);
  ctx.lineTo(0, -3);
  ctx.lineTo(7, -7);
  ctx.closePath();
  ctx.fillStyle = '#ff6b4a';
  ctx.strokeStyle = '#1d1630';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Rosa de los vientos
  ctx.font = 'bold 16px "Bowlby One", sans-serif';
  ctx.fillStyle = '#fff3dc';
  ctx.textAlign = 'right';
  ctx.fillText('N ↑', W - 12, 24);
}
