import type { GameState } from '../data/gameState';
import { loadGameState, saveGameState } from '../data/gameState';

/**
 * Punto único de acceso al progreso guardado (localStorage):
 * fragmentos recolectados.
 */
export class ProgressSystem {
  private state: GameState;

  constructor() {
    this.state = loadGameState();
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

  hasSeenCompletion(): boolean {
    return this.state.seenCompletion;
  }

  markCompletionSeen(): void {
    this.state.seenCompletion = true;
    saveGameState(this.state);
  }
}
