const STORAGE_KEY = 'los-nexus-progress';

export interface GameState {
  fragmentsCollected: string[];
}

const DEFAULT_STATE: GameState = {
  fragmentsCollected: [],
};

export function loadGameState(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };

  try {
    const parsed = JSON.parse(raw) as GameState;
    return { fragmentsCollected: parsed.fragmentsCollected ?? [] };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
