/*
 * Armario del Nexus en 3D (pedido del usuario después de la Fase 9). Colores de buzo, mochila, puntas de
 * las orejas, cable y un accesorio en la cabeza. Algunas cosas se ganan jugando (`need` = flag del
 * progreso 3D). Se guarda aparte de la partida (clave propia), como en la 2D.
 */

export interface LookOption {
  id: string;
  label: string;
  /** Color principal (y secundario para las puntas de las orejas). */
  color?: string;
  color2?: string;
  /** Flag del progreso que la desbloquea. */
  need?: string;
  /** Cómo se gana (se muestra mientras está bloqueada). */
  hint?: string;
}

export const HOODIES: LookOption[] = [
  { id: 'turquesa', label: 'Turquesa', color: '#22b8a8', color2: '#178c82' },
  { id: 'coral', label: 'Coral', color: '#ec8575', color2: '#c4604f' },
  { id: 'violeta', label: 'Violeta', color: '#aa86d5', color2: '#8461b3' },
  { id: 'bosque', label: 'Bosque', color: '#6f9f52', color2: '#4f7a3a' },
  { id: 'ambar', label: 'Ámbar', color: '#e8b45c', color2: '#c08a32', need: 'chapter-done', hint: 'Hacé la fiesta del Centro' },
  { id: 'feria', label: 'Feria', color: '#ff5a6e', color2: '#c8384b', need: 'ride-park-coaster', hint: 'Subite a la montaña rusa' },
  { id: 'noche', label: 'Noche estrellada', color: '#30406a', color2: '#1d2a4a', need: 'cave-lit', hint: 'Prendé los cristales de la cueva' },
  { id: 'chispa', label: 'Gran Chispa', color: '#ffd23a', color2: '#ff9f43', need: 'gran-chispa', hint: 'Traé de vuelta la Gran Chispa' },
];

export const PACKS: LookOption[] = [
  { id: 'gris', label: 'Gris', color: '#4a5263' },
  { id: 'rojo', label: 'Roja', color: '#c8452f' },
  { id: 'azul', label: 'Azul', color: '#3f7fd6' },
  { id: 'amarillo', label: 'Amarilla', color: '#e0a83a' },
  { id: 'rosa', label: 'Rosa', color: '#e77fa6', need: 'train-tour', hint: 'Viajá en tren a cuatro paradas' },
];

export const EARS: LookOption[] = [
  { id: 'clasicas', label: 'Clásicas', color: '#2ec7e6', color2: '#f2742b' },
  { id: 'rosas', label: 'Rosas', color: '#ff9fd6', color2: '#ff9fd6' },
  { id: 'doradas', label: 'Doradas', color: '#ffd23a', color2: '#ffd23a' },
  { id: 'menta', label: 'Menta', color: '#7dffb0', color2: '#2ec7e6' },
  { id: 'neon', label: 'Neón', color: '#ff4fd8', color2: '#5ee7ff', need: 'hood', hint: 'Ganá la capucha de Rulo' },
];

export const CABLES: LookOption[] = [
  { id: 'lima', label: 'Lima', color: '#b8e04a' },
  { id: 'cian', label: 'Cian', color: '#5ee7ff' },
  { id: 'dorado', label: 'Dorado', color: '#ffdf76' },
  { id: 'rosa', label: 'Rosa', color: '#ff9fd6' },
];

export const HATS: LookOption[] = [
  { id: 'nada', label: 'Nada' },
  { id: 'lazo', label: 'Lazo' },
  { id: 'gorra', label: 'Gorra de Rulo', need: 'hood', hint: 'Ganá la capucha de Rulo' },
  { id: 'paja', label: 'Sombrero de feria', need: 'ride-park-wheel', hint: 'Subite a la vuelta al mundo' },
  { id: 'corona', label: 'Corona', need: 'chapter-done', hint: 'Hacé la fiesta del Centro' },
  { id: 'pato', label: 'Pato de Pipa', need: 'chapter-done', hint: 'Hacé la fiesta del Centro' },
  { id: 'capitan', label: 'Gorra de capitán', need: 'gran-chispa', hint: 'Traé de vuelta la Gran Chispa' },
];

export interface NexusLook {
  hoodie: string;
  pack: string;
  ears: string;
  cable: string;
  hat: string;
}

export const DEFAULT_LOOK: NexusLook = { hoodie: 'turquesa', pack: 'gris', ears: 'clasicas', cable: 'lima', hat: 'nada' };
export const LOOK_PARTS: { key: keyof NexusLook; title: string; options: LookOption[] }[] = [
  { key: 'hoodie', title: 'Buzo', options: HOODIES },
  { key: 'hat', title: 'En la cabeza', options: HATS },
  { key: 'ears', title: 'Puntas de las orejas', options: EARS },
  { key: 'pack', title: 'Mochila', options: PACKS },
  { key: 'cable', title: 'Cable', options: CABLES },
];

const KEY = 'los-nexus-3d-look';

export function loadLook(): NexusLook {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<NexusLook> | null;
    const look = { ...DEFAULT_LOOK };
    if (raw && typeof raw === 'object') {
      for (const part of LOOK_PARTS) {
        const v = raw[part.key];
        if (typeof v === 'string' && part.options.some((o) => o.id === v)) look[part.key] = v;
      }
    }
    return look;
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

export function saveLook(look: NexusLook): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    /* sin almacenamiento: el look vale solo por esta sesión */
  }
}

export function option(list: LookOption[], id: string): LookOption {
  return list.find((o) => o.id === id) ?? list[0];
}
