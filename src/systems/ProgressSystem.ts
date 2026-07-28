import type { GameState } from '../data/gameState';
import { loadGameState, saveGameState } from '../data/gameState';
import type { NexusAppearance } from '../entities/Nexus';

/**
 * Punto único de acceso al progreso guardado (localStorage):
 * fragmentos recolectados y apariencia elegida del Nexus.
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

  getAppearance(): NexusAppearance {
    return { ...this.state.appearance };
  }

  saveAppearance(appearance: NexusAppearance): void {
    this.state.appearance = appearance;
    saveGameState(this.state);
  }

  hasSeenCompletion(): boolean {
    return this.state.seenCompletion;
  }

  markCompletionSeen(): void {
    this.state.seenCompletion = true;
    saveGameState(this.state);
  }
}
