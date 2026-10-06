import type { GameState } from './gameState';

export const RADIO_SOURCE_ID = 'radio-source';
export const RADIO_TARGETS = { music: 'radio-music', news: 'radio-news' } as const;
export type RadioChannel = keyof typeof RADIO_TARGETS;

/** Last valid selection wins, including saves containing older competing rows. */
export function radioChannel(state: GameState): RadioChannel | null {
  const connection = state.connections.findLast(c => c.sourceId === RADIO_SOURCE_ID
    && Object.values(RADIO_TARGETS).some(id => id === c.targetId));
  return connection?.targetId === RADIO_TARGETS.music ? 'music'
    : connection?.targetId === RADIO_TARGETS.news ? 'news' : null;
}
