const STORAGE_KEY = 'los-nexus-progress';

export interface SavedConnection {
  sourceId: string;
  targetId: string;
}

export interface SavedPosition {
  x: number;
  /** Relative world height, so rotating the phone preserves the location. */
  yRatio: number;
}

export interface GameState {
  fragmentsCollected: string[];
  seenCompletion: boolean;
  /** Missing in old saves, where the completed collection contained four items. */
  completionCount?: number;
  connections: SavedConnection[];
  position: SavedPosition | null;
}

function emptyState(): GameState {
  return { fragmentsCollected: [], seenCompletion: false, connections: [], position: null };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyState();
    const position = parsed.position;
    return {
      fragmentsCollected: Array.isArray(parsed.fragmentsCollected)
        ? [...new Set<string>(parsed.fragmentsCollected.filter((id: unknown) => typeof id === 'string'))]
        : [],
      seenCompletion: parsed.seenCompletion === true,
      ...(Number.isSafeInteger(parsed.completionCount) && parsed.completionCount >= 0
        ? { completionCount: parsed.completionCount } : {}),
      connections: Array.isArray(parsed.connections)
        ? parsed.connections.filter((connection: unknown): connection is SavedConnection => {
            if (!connection || typeof connection !== 'object') return false;
            const candidate = connection as Partial<SavedConnection>;
            return typeof candidate.sourceId === 'string' && typeof candidate.targetId === 'string';
          })
        : [],
      position: position && Number.isFinite(position.x) && Number.isFinite(position.yRatio)
        ? { x: position.x, yRatio: position.yRatio }
        : null,
    };
  } catch {
    return emptyState();
  }
}

export function saveGameState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
