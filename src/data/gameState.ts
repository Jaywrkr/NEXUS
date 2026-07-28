import type { NexusAppearance } from '../entities/Nexus';
import { DEFAULT_APPEARANCE } from '../entities/Nexus';

const STORAGE_KEY = 'los-nexus-progress';

export interface GameState {
  fragmentsCollected: string[];
  appearance: NexusAppearance;
}

const DEFAULT_STATE: GameState = {
  fragmentsCollected: [],
  appearance: DEFAULT_APPEARANCE,
};

export function loadGameState(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      fragmentsCollected: parsed.fragmentsCollected ?? [],
      appearance: parsed.appearance ?? DEFAULT_APPEARANCE,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
