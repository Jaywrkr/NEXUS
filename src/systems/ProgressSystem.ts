import type { GameState, SavedConnection, SavedPosition } from '../data/gameState';
import { clearGameState, loadGameState, saveGameState } from '../data/gameState';

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

  getConnections(): SavedConnection[] {
    return this.state.connections.map((connection) => ({ ...connection }));
  }

  saveConnection(sourceId: string, targetId: string): void {
    if (this.state.connections.some((c) => c.sourceId === sourceId && c.targetId === targetId)) return;
    this.state.connections.push({ sourceId, targetId });
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
