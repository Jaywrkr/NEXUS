const STORAGE_KEY = 'los-nexus-progress';

export interface GameState {
  fragmentsCollected: string[];
  seenCompletion: boolean;
}

const DEFAULT_STATE: GameState = {
  fragmentsCollected: [],
  seenCompletion: false,
};

export function loadGameState(): GameState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE };

  try {
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      fragmentsCollected: parsed.fragmentsCollected ?? [],
      seenCompletion: parsed.seenCompletion ?? false,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
