const KEY = 'los-nexus-3d-progress';

interface State3D {
  fragmentsCollected: string[];
  seenCompletion: boolean;
}

/**
 * Progreso guardado de la versión 3D, separado del de la 2D (que guarda mucho más:
 * capítulo, conexiones, posición...). Misma idea: qué fragmentos hay y si ya se vio el festejo final.
 */
export class Progress3D {
  private state: State3D;

  constructor() {
    this.state = Progress3D.load();
  }

  private static load(): State3D {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<State3D> | null;
      return { fragmentsCollected: parsed?.fragmentsCollected ?? [], seenCompletion: parsed?.seenCompletion ?? false };
    } catch {
      return { fragmentsCollected: [], seenCompletion: false };
    }
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

  hasSeenCompletion(): boolean {
    return this.state.seenCompletion;
  }

  markCompletionSeen(): void {
    this.state.seenCompletion = true;
    this.save();
  }

  resetProgress(): void {
    localStorage.removeItem(KEY);
    this.state = Progress3D.load();
  }
}
