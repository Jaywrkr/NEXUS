import type { GameState, SavedConnection } from '../../data/gameState';

const KEY = 'los-nexus-3d-progress';
/** Guía «save-systems»: copia de respaldo (la última buena) y la partida borrada (para deshacer). */
const BAK = `${KEY}-bak`;
const ERASED = `${KEY}-borrada`;
/** Versión del formato del guardado. Subirla junto con una migración en `migrate()`. */
export const SAVE_VERSION = 2;
/** Otras claves que viajan en el código de partida (ropa del Nexus). */
const EXTRA_KEYS = ['los-nexus-3d-look'];

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

interface State3D {
  fragmentsCollected: string[];
  seenCompletion: boolean;
  /** Conexiones hechas (para restaurar trabajos a medias y para lo que dicen los habitantes). */
  connections: SavedConnection[];
  /** Habitantes (y la intro) que ya hablaron. */
  heard: string[];
  /** Chispitas guardadas en la mochila Atrapachispas (0..MAX_CHARGE). */
  charge: number;
  /** Chispitas escondidas del barrio que ya se juntaron (no vuelven a aparecer). */
  sparks: string[];
  /** Qué tan difícil sale la próxima carrera de luz (0..1): sube al ganar y baja al fallar. */
  tunnelSkill: number;
  /** Cosas destrabadas (patineta, capucha, trucos, circuitos del Mundo Voltio...). */
  flags: string[];
  /** Chispis rescatados en el Mundo Voltio (serán cartas). */
  chispis: string[];
  /** Cartas de Chispis: id → cuántas tiene (las repetidas sirven para cambiar con los vecinos). */
  cards: Record<string, number>;
  /** Chispi compañero elegido (id de carta) o null. */
  companion: string | null;
  /** Contadores (grinds, carreras ganadas, mejores tiempos…) para la libreta de encargos. */
  counts: Record<string, number>;
}

/** Cuántas chispitas entran en la mochila. */
export const MAX_CHARGE = 5;

const empty = (): State3D => ({ fragmentsCollected: [], seenCompletion: false, connections: [], heard: [], charge: 0, sparks: [], tunnelSkill: 0.15, flags: [], chispis: [], cards: {}, companion: null, counts: {} });

/**
 * Progreso guardado de la versión 3D, separado del de la 2D. Guarda fragmentos, festejo final,
 * conexiones hechas y habitantes escuchados. `snapshot()` lo expone con la forma del GameState de la 2D
 * para reutilizar su lógica de capítulo (`src/data/chapter.ts`).
 */
export class Progress3D {
  private state: State3D;
  /** De dónde salió la partida al abrir el juego (para avisar si se recuperó del respaldo). */
  readonly loadedFrom: 'main' | 'backup' | 'new';
  private lastBackup = 0;

  constructor() {
    const main = Progress3D.parse(readKey(KEY));
    if (main) {
      this.state = main;
      this.loadedFrom = 'main';
      // Al abrir, la partida buena pasa a ser el respaldo
      writeKey(BAK, JSON.stringify({ ...main, v: SAVE_VERSION }));
      this.lastBackup = Date.now();
    } else {
      // El guardado no está o se rompió: se recupera el respaldo (y NO se pisa con una partida vacía)
      const bak = Progress3D.parse(readKey(BAK));
      this.state = bak ?? empty();
      this.loadedFrom = bak ? 'backup' : 'new';
    }
  }

  private static load(): State3D {
    return Progress3D.parse(readKey(KEY)) ?? empty();
  }

  /** Lleva un guardado viejo al formato actual (por ahora, la v1 sin número se lee igual). */
  private static migrate(raw: Record<string, unknown>): Record<string, unknown> {
    const v = typeof raw.v === 'number' ? Math.floor(raw.v) : 1;
    if (v > SAVE_VERSION) return raw; // de una versión más nueva: se lee lo que se entienda
    return raw;
  }

  /** Lee un guardado (texto JSON) y lo limpia; `null` si no hay o está roto. Solo datos: nunca ejecuta nada. */
  static parse(text: string | null): State3D | null {
    if (!text) return null;
    try {
      const raw = JSON.parse(text) as unknown;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const parsed = Progress3D.migrate(raw as Record<string, unknown>) as Partial<State3D>;
      const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);
      const connections = Array.isArray(parsed.connections)
        ? parsed.connections.filter((c): c is SavedConnection => typeof c?.sourceId === 'string' && typeof c?.targetId === 'string')
        : [];
      return {
        fragmentsCollected: strings(parsed.fragmentsCollected),
        seenCompletion: parsed.seenCompletion === true,
        connections,
        heard: strings(parsed.heard),
        charge: typeof parsed.charge === 'number' ? Math.max(0, Math.min(MAX_CHARGE, Math.floor(parsed.charge))) : 0,
        sparks: strings(parsed.sparks),
        tunnelSkill: typeof parsed.tunnelSkill === 'number' ? Math.max(0, Math.min(1, parsed.tunnelSkill)) : 0.15,
        flags: strings(parsed.flags),
        chispis: strings(parsed.chispis),
        cards: Progress3D.cleanCards(parsed.cards, strings(parsed.chispis)),
        companion: typeof parsed.companion === 'string' ? parsed.companion : null,
        counts: Progress3D.cleanCounts(parsed.counts),
      };
    } catch {
      return null;
    }
  }

  private static cleanCounts(v: unknown): Record<string, number> {
    const out: Record<string, number> = {};
    if (v && typeof v === 'object') {
      for (const [k, n] of Object.entries(v as Record<string, unknown>)) if (typeof n === 'number' && Number.isFinite(n)) out[k] = n;
    }
    return out;
  }

  private static cleanCards(v: unknown, rescued: string[]): Record<string, number> {
    const out: Record<string, number> = {};
    if (v && typeof v === 'object') {
      for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
        if (typeof n === 'number' && n > 0) out[k] = Math.floor(n);
      }
    }
    // Partidas de la Fase 1: el Chispi rescatado ya cuenta como carta
    for (const id of rescued) out[id] = Math.max(1, out[id] ?? 0);
    return out;
  }

  private save(): void {
    // Sin almacenamiento (modo privado): el juego sigue, solo no se guarda
    const text = JSON.stringify({ ...this.state, v: SAVE_VERSION });
    // Cada dos minutos, la última partida buena pasa al respaldo antes de escribir la nueva
    if (Date.now() - this.lastBackup > 120_000) {
      const prev = readKey(KEY);
      if (prev && Progress3D.parse(prev)) writeKey(BAK, prev);
      this.lastBackup = Date.now();
    }
    writeKey(KEY, text);
  }

  /** Código de partida: todo el progreso (y la ropa del Nexus) en un texto para copiar a otro equipo. */
  exportCode(): string {
    const extra: Record<string, string> = {};
    for (const k of EXTRA_KEYS) {
      const v = readKey(k);
      if (v !== null) extra[k] = v;
    }
    const json = JSON.stringify({ app: 'los-nexus-3d', v: SAVE_VERSION, state: this.state, extra });
    return `NEXUS1:${btoa(unescape(encodeURIComponent(json)))}`;
  }

  /** Carga un código de partida. Devuelve false si no es válido (y no toca nada). */
  importCode(code: string): boolean {
    const m = /NEXUS1:([A-Za-z0-9+/=]+)/.exec(code.replace(/\s+/g, ''));
    if (!m) return false;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(m[1])))) as { app?: string; state?: unknown; extra?: Record<string, unknown> };
      if (data.app !== 'los-nexus-3d') return false;
      const state = Progress3D.parse(JSON.stringify(data.state ?? null));
      if (!state) return false;
      // La partida de ahora queda como respaldo, por si el código no era el que se quería
      const prev = readKey(KEY);
      if (prev) writeKey(BAK, prev);
      this.state = state;
      this.save();
      for (const k of EXTRA_KEYS) {
        const v = data.extra?.[k];
        if (typeof v === 'string') writeKey(k, v);
      }
      return true;
    } catch {
      return false;
    }
  }

  /** ¿Hay una partida borrada que se pueda recuperar? */
  static get hasErased(): boolean {
    return Progress3D.parse(readKey(ERASED)) !== null;
  }

  /** Deshace «Borrar partida». */
  restoreErased(): boolean {
    const text = readKey(ERASED);
    const st = Progress3D.parse(text);
    if (!st || !text) return false;
    this.state = st;
    this.save();
    try {
      localStorage.removeItem(ERASED);
    } catch {
      // nada
    }
    return true;
  }

  hasFragment(id: string): boolean {
    return this.state.fragmentsCollected.includes(id);
  }

  collectFragment(id: string): void {
    if (this.hasFragment(id)) return;
    this.state.fragmentsCollected.push(id);
    this.save();
  }

  getCollectedFragments(): string[] {
    return [...this.state.fragmentsCollected];
  }

  hasProgress(): boolean {
    return this.state.fragmentsCollected.length > 0 || this.state.connections.length > 0 || this.state.flags.length > 0;
  }

  hasSeenCompletion(): boolean {
    return this.state.seenCompletion;
  }

  markCompletionSeen(): void {
    this.state.seenCompletion = true;
    this.save();
  }

  saveConnection(sourceId: string, targetId: string): void {
    if (this.hasConnection(sourceId, targetId)) return;
    this.state.connections.push({ sourceId, targetId });
    this.save();
  }

  hasConnection(sourceId: string, targetId: string): boolean {
    return this.state.connections.some((c) => c.sourceId === sourceId && c.targetId === targetId);
  }

  getConnections(): SavedConnection[] {
    return this.state.connections.map((c) => ({ ...c }));
  }

  markHeard(id: string): void {
    if (this.hasHeard(id)) return;
    this.state.heard.push(id);
    this.save();
  }

  hasHeard(id: string): boolean {
    return this.state.heard.includes(id);
  }

  /* ---------- Mochila Atrapachispas ---------- */

  get charge(): number {
    return this.state.charge;
  }

  /** Suma (o resta) chispitas; devuelve cuántas entraron de verdad. */
  addCharge(n: number): number {
    const before = this.state.charge;
    this.state.charge = Math.max(0, Math.min(MAX_CHARGE, before + n));
    this.save();
    return this.state.charge - before;
  }

  hasSpark(id: string): boolean {
    return this.state.sparks.includes(id);
  }

  collectSpark(id: string): void {
    if (this.hasSpark(id)) return;
    this.state.sparks.push(id);
    this.save();
  }

  get tunnelSkill(): number {
    return this.state.tunnelSkill;
  }

  set tunnelSkill(v: number) {
    this.state.tunnelSkill = Math.max(0, Math.min(1, v));
    this.save();
  }

  /* ---------- Cosas destrabadas y Chispis ---------- */

  count(key: string): number {
    return this.state.counts[key] ?? 0;
  }

  addCount(key: string, n = 1): number {
    this.state.counts[key] = this.count(key) + n;
    this.save();
    return this.state.counts[key];
  }

  setCount(key: string, value: number): void {
    this.state.counts[key] = value;
    this.save();
  }

  /** Guarda un récord si es mejor (menor) que el anterior. */
  setBest(key: string, value: number): boolean {
    const old = this.state.counts[key];
    if (old !== undefined && old <= value) return false;
    this.state.counts[key] = value;
    this.save();
    return true;
  }

  /** Cuántas cosas se lograron en total (para saber si el jugador avanza o está trabado). */
  get advances(): number {
    return this.state.connections.length + this.state.flags.length + this.state.fragmentsCollected.length + this.state.chispis.length;
  }

  hasFlag(id: string): boolean {
    return this.state.flags.includes(id);
  }

  setFlag(id: string): void {
    if (this.hasFlag(id)) return;
    this.state.flags.push(id);
    this.save();
  }

  hasChispi(id: string): boolean {
    return this.state.chispis.includes(id);
  }

  rescueChispi(id: string): void {
    if (this.hasChispi(id)) return;
    this.state.chispis.push(id);
    this.addCard(id);
  }

  /* ---------- Cartas ---------- */

  cardCount(id: string): number {
    return this.state.cards[id] ?? 0;
  }

  hasCard(id: string): boolean {
    return this.cardCount(id) > 0;
  }

  addCard(id: string): void {
    this.state.cards[id] = this.cardCount(id) + 1;
    this.save();
  }

  /** Saca una copia (para cambiarla). No deja sin la última. */
  giveCard(id: string): boolean {
    if (this.cardCount(id) < 2) return false;
    this.state.cards[id] -= 1;
    this.save();
    return true;
  }

  get companion(): string | null {
    return this.state.companion && this.hasCard(this.state.companion) ? this.state.companion : null;
  }

  set companion(id: string | null) {
    this.state.companion = id;
    this.save();
  }

  /** Cuántas cartas distintas tiene. */
  get uniqueCards(): number {
    return Object.values(this.state.cards).filter((n) => n > 0).length;
  }

  /** Las repetidas: id de cada carta con más de una copia. */
  get duplicates(): string[] {
    return Object.entries(this.state.cards)
      .filter(([, n]) => n > 1)
      .map(([k]) => k);
  }

  get chispis(): string[] {
    return [...this.state.chispis];
  }

  /** Vista compatible con el GameState de la 2D (para `residentLine`, `hasChapterConnection`...). */
  snapshot(): GameState {
    return {
      fragmentsCollected: [...this.state.fragmentsCollected],
      seenCompletion: this.state.seenCompletion,
      connections: this.getConnections(),
      position: null,
      story: { heard: [...this.state.heard], discoveries: [], chapterSeen: this.state.flags.includes('chapter-done') },
    };
  }

  resetProgress(): void {
    // Lo borrado se guarda aparte: se puede recuperar desde Opciones
    const prev = readKey(KEY);
    if (prev && Progress3D.parse(prev)) writeKey(ERASED, prev);
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(BAK);
    } catch {
      // nada
    }
    this.state = Progress3D.load();
  }
}
