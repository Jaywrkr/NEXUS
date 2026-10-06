const KEY = 'los-nexus-appearance';
export const OUTFITS = [
  { id: 'turquoise', label: 'Turquesa', color: 0x21b6b3 },
  { id: 'coral', label: 'Coral', color: 0xec8575 },
  { id: 'violet', label: 'Violeta', color: 0xaa86d5 },
  { id: 'forest', label: 'Bosque', color: 0x85ad69 },
  { id: 'amber', label: 'Ámbar', color: 0xe8b45c, reward: 'mail' },
] as const;
export const ACCESSORIES = [
  { id: 'none', label: 'Sin adorno' }, { id: 'bow', label: 'Lazo' }, { id: 'antenna', label: 'Antena' },
  { id: 'duck', label: 'Pato', reward: 'toys' }, { id: 'crown', label: 'Corona', reward: 'flowers' },
] as const;
export const CABLES = [
  { id: 'cyan', label: 'Cian', color: 0x5ee7ff }, { id: 'gold', label: 'Dorado', color: 0xffdf76 },
  { id: 'pink', label: 'Rosa', color: 0xff9fd6 }, { id: 'lime', label: 'Lima', color: 0xb6ef78 },
] as const;
export interface Appearance { name: string; outfit: string; accessory: string; cable: string; unlocked: string[] }
export function normalizeAppearance(raw: unknown): Appearance {
  const p = raw && typeof raw === 'object' ? raw as Partial<Appearance> : {};
  const unlocked = Array.isArray(p.unlocked) ? [...new Set(p.unlocked.filter(x => ['mail', 'toys', 'flowers'].includes(x)))] : [];
  const allowed = (choices: readonly { id: string; reward?: string }[], id: unknown, fallback: string): string =>
    choices.find(c => c.id === id && (!c.reward || unlocked.includes(c.reward)))?.id ?? fallback;
  return {
    name: typeof p.name === 'string' ? Array.from(p.name.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 16).join('') || 'Nexus' : 'Nexus',
    outfit: allowed(OUTFITS, p.outfit, 'turquoise'), accessory: allowed(ACCESSORIES, p.accessory, 'none'),
    cable: allowed(CABLES, p.cable, 'lime'), unlocked,
  };
}
export function loadAppearance(): Appearance {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(KEY) ?? 'null')); }
  catch { return normalizeAppearance(null); }
}
export function saveAppearance(appearance: Appearance): void { localStorage.setItem(KEY, JSON.stringify(normalizeAppearance(appearance))); }
export function unlockAppearance(reward: string): void {
  const look = loadAppearance();
  look.unlocked.push(reward);
  saveAppearance(look);
}
export function cableColor(): number { return CABLES.find(c => c.id === loadAppearance().cable)!.color; }
