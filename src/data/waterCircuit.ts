import type { SavedConnection } from './gameState.ts';

export type WaterRoute = 'direct' | 'regulated';
export const WATER_VALVES = ['water-direct', 'water-regulated'];
export const WATER_OUTLETS: SavedConnection[] = WATER_VALVES.map(sourceId => ({ sourceId, targetId: 'fountain' }));
export const LEGACY_WATER: SavedConnection = { sourceId: 'fountain-source', targetId: 'fountain' };
export function waterPath(route: WaterRoute): SavedConnection[] {
  const valve = `water-${route}`;
  return [{ sourceId: 'fountain-source', targetId: 'water-pump' },
    { sourceId: 'water-pump', targetId: valve }, { sourceId: valve, targetId: 'fountain' }];
}
export function waterPressure(route: WaterRoute | null): number { return route === 'direct' ? 3 : route === 'regulated' ? 2 : 0; }

/** Legacy achievements are replayed at runtime without rewriting historical saves. */
export function restoreWaterConnections(connections: SavedConnection[], collected: boolean): SavedConnection[] {
  const legacy = connections.some(c => c.sourceId === LEGACY_WATER.sourceId && c.targetId === LEGACY_WATER.targetId);
  const modern = connections.some(c => c.sourceId.startsWith('water-') || c.targetId.startsWith('water-'));
  return legacy || (collected && !modern)
    ? [...connections.filter(c => !(c.sourceId === LEGACY_WATER.sourceId && c.targetId === LEGACY_WATER.targetId)), ...waterPath('direct')]
    : connections;
}
