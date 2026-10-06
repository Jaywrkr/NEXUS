import type { GameState, SavedConnection, SavedPosition } from '../data/gameState.ts';
import { clearGameState, loadGameState, saveGameState } from '../data/gameState.ts';

/**
 * Punto único de acceso al progreso guardado (localStorage):
 * fragmentos, conexiones resueltas y posición del Nexus.
 */
export class ProgressSystem {
  private state: GameState;

  constructor() {
    this.state = loadGameState();
  }

  hasProgress(): boolean {
    return this.state.fragmentsCollected.length > 0 || this.state.connections.length > 0 || this.state.position !== null;
  }

  snapshot(): GameState {
    return structuredClone(this.state);
  }

  markResidentHeard(id: string): void {
    this.state.story ??= { heard: [], discoveries: [], chapterSeen: false };
    if (this.state.story.heard.includes(id)) return;
    this.state.story.heard.push(id);
    saveGameState(this.state);
  }

  hasHeardResident(id: string): boolean {
    return this.state.story?.heard.includes(id) ?? false;
  }

  markDiscovery(id: string): void {
    this.state.story ??= { heard: [], discoveries: [], chapterSeen: false };
    if (this.state.story.discoveries.includes(id)) return;
    this.state.story.discoveries.push(id);
    saveGameState(this.state);
  }

  hasSeenChapter(): boolean { return this.state.story?.chapterSeen ?? false; }

  markChapterSeen(): void {
    this.state.story ??= { heard: [], discoveries: [], chapterSeen: false };
    this.state.story.chapterSeen = true;
    saveGameState(this.state);
  }

  getConnections(): SavedConnection[] {
    return this.state.connections.map((connection) => ({ ...connection }));
  }

  removeConnections(connections: SavedConnection[]): void {
    this.state.connections = this.state.connections.filter(c => !connections.some(old => old.sourceId === c.sourceId && old.targetId === c.targetId));
    saveGameState(this.state);
  }

  saveConnection(sourceId: string, targetId: string, replaceSource = false): void {
    if (replaceSource) this.state.connections = this.state.connections.filter(c => c.sourceId !== sourceId);
    if (this.state.connections.some((c) => c.sourceId === sourceId && c.targetId === targetId)) return;
    this.state.connections.push({ sourceId, targetId });
    saveGameState(this.state);
  }

  /** Replace only destinations in this group, preserving other branches of the source. */
  saveExclusiveConnection(sourceId: string, targetId: string, targets: string[]): void {
    this.state.connections = this.state.connections.filter(c => c.sourceId !== sourceId || !targets.includes(c.targetId));
    this.saveConnection(sourceId, targetId);
  }

  /** Replay one optional story without erasing the neighborhood or earned endings/styles. */
  restartStory(id: string): void {
    if (!['mail', 'toys', 'flowers'].includes(id)) return;
    const prefix = `side-${id}-`;
    this.state.connections = this.state.connections.filter(c => !c.sourceId.startsWith(prefix) && !c.targetId.startsWith(prefix));
    saveGameState(this.state);
  }

  getPosition(): SavedPosition | null {
    return this.state.position ? { ...this.state.position } : null;
  }

  savePosition(x: number, yRatio: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(yRatio)) return;
    if (this.state.position?.x === x && this.state.position.yRatio === yRatio) return;
    this.state.position = { x, yRatio };
    saveGameState(this.state);
  }

  hasFragment(id: string): boolean {
    return this.state.fragmentsCollected.includes(id);
  }

  collectFragment(id: string): void {
    if (this.hasFragment(id)) return;
    this.state.fragmentsCollected.push(id);
    saveGameState(this.state);
  }

  getCollectedFragments(): string[] {
    return [...this.state.fragmentsCollected];
  }

  hasSeenCompletion(collectionSize: number): boolean {
    return this.state.seenCompletion && (this.state.completionCount ?? 4) >= collectionSize;
  }

  markCompletionSeen(collectionSize: number): void {
    this.state.seenCompletion = true;
    this.state.completionCount = collectionSize;
    saveGameState(this.state);
  }

  /** Borra todo el progreso guardado (fragmentos, conexiones, posición y celebración vista). Usado por "Nueva partida". */
  resetProgress(): void {
    clearGameState();
    this.state = loadGameState();
  }
}
