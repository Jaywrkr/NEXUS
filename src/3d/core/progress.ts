import type { GameState, SavedConnection } from '../../data/gameState';

const KEY = 'los-nexus-3d-progress';

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
}

/** Cuántas chispitas entran en la mochila. */
export const MAX_CHARGE = 5;

const empty = (): State3D => ({ fragmentsCollected: [], seenCompletion: false, connections: [], heard: [], charge: 0, sparks: [], tunnelSkill: 0.15, flags: [], chispis: [], cards: {}, companion: null });

/**
 * Progreso guardado de la versión 3D, separado del de la 2D. Guarda fragmentos, festejo final,
 * conexiones hechas y habitantes escuchados. `snapshot()` lo expone con la forma del GameState de la 2D
 * para reutilizar su lógica de capítulo (`src/data/chapter.ts`).
 */
export class Progress3D {
  private state: State3D;

  constructor() {
    this.state = Progress3D.load();
  }

  private static load(): State3D {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<State3D> | null;
      if (!parsed) return empty();
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
      };
    } catch {
      return empty();
    }
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
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // sin almacenamiento (modo privado): el juego sigue, solo no se guarda
    }
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
    localStorage.removeItem(KEY);
    this.state = Progress3D.load();
  }
}
