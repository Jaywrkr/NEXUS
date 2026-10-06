const STORAGE_KEY = 'los-nexus-reduced-effects';

/** Visual comfort preference, independent of saved game progress. */
export class EffectsSettings {
  static isReduced(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true' || saved === 'false') return saved === 'true';
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  static setReduced(reduced: boolean): void {
    localStorage.setItem(STORAGE_KEY, String(reduced));
  }
}
