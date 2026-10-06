import type { GameState } from './gameState.ts';

export interface PlazaStep { number: number; title: string; action: string; target: string }
/** Derive the lesson from real progress. Old saves never repeat completed steps. */
export function plazaStep(state: GameState, selected: string | null): PlazaStep | null {
  if (state.fragmentsCollected.includes('plaza-fragment') || state.fragmentsCollected.some(id => id !== 'secret-fragment')
    || state.connections.some(c => !['energy-source', 'lamp'].includes(c.sourceId))) return null;
  const connected = (source: string, target: string) => state.connections.some(c => c.sourceId === source && c.targetId === target);
  if (connected('lamp', 'door')) return { number: 6, title: 'Recoge tu primer recuerdo', action: 'Camina hasta la luz dorada. Después visitarás el museo.', target: 'fragment' };
  if (connected('energy-source', 'lamp')) return selected === 'lamp'
    ? { number: 5, title: 'Ahora toca la puerta', action: 'La lámpara encendida puede enviar energía a la puerta.', target: 'door' }
    : { number: 4, title: 'Selecciona la lámpara encendida', action: 'Ya tiene energía. Tócala para iniciar el segundo cable.', target: 'lamp' };
  if (selected === 'energy-source') return { number: 3, title: 'Ahora toca la lámpara', action: 'Origen elegido. Toca la lámpara para unirlos y entrar en el cable.', target: 'lamp' };
  if (selected) return { number: 2, title: 'Cambia el origen', action: 'Toca otra vez el objeto seleccionado y elige el generador.', target: 'energy-source' };
  if (!state.story?.heard.includes('miga')) return { number: 1, title: 'Acércate a Miga', action: 'Ella te cuenta el problema. Sigue la señal amarilla.', target: 'miga' };
  return { number: 2, title: 'Toca el generador de energía', action: 'Primero el origen, después el destino. Empieza por el generador.', target: 'energy-source' };
}
