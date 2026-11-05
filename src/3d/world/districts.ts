/*
 * Distritos de la ciudad (PLAN_MAESTRO.md §6). Hoy solo el Centro está construido; los demás se
 * muestran en el mapa como "próximamente" para que se vea hacia dónde crece el mundo.
 * Coordenadas en metros: +X este, +Z sur (igual que World).
 */

export interface District {
  id: string;
  name: string;
  /** Rectángulo aproximado en el piso. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** ¿Ya se puede visitar? */
  open: boolean;
  /** Color del distrito en el mapa cuando revive. */
  color: string;
}

export const DISTRICTS: District[] = [
  { id: 'centro', name: 'Centro', minX: -45, maxX: 46, minZ: -45, maxZ: 63, open: true, color: '#7bd389' },
  { id: 'camino-skate', name: 'Camino al Skatepark', minX: 46, maxX: 62, minZ: -8, maxZ: 8, open: true, color: '#c9b37a' },
  { id: 'skatepark', name: 'Skatepark', minX: 62, maxX: 120, minZ: -30, maxZ: 30, open: true, color: '#ff9f43' },
  { id: 'parque', name: 'Parque de diversiones', minX: -40, maxX: 40, minZ: -110, maxZ: -45, open: true, color: '#ff6b81' },
  { id: 'cerro', name: 'Cerro y cascada', minX: -110, maxX: -45, minZ: -40, maxZ: 40, open: false, color: '#7ed6df' },
  { id: 'estacion', name: 'Estación de tren', minX: 46, maxX: 110, minZ: 30, maxZ: 70, open: true, color: '#c7a17a' },
  { id: 'puerto', name: 'Puerto y faro', minX: -45, maxX: 46, minZ: 63, maxZ: 120, open: false, color: '#4a90e2' },
];

export function districtAt(x: number, z: number): District | null {
  return DISTRICTS.find((d) => x >= d.minX && x < d.maxX && z >= d.minZ && z < d.maxZ) ?? null;
}
