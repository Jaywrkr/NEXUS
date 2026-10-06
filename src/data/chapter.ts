import type { GameState } from './gameState';

export const CHAPTER_TITLE = 'La ciudad al revés';
export const RESIDENTS = [
  { id: 'miga', name: 'Miga', x: 1020, offsetY: 120, color: 0x5ee7ff, fragment: 'plaza-fragment', target: 'door',
    request: 'El manual lo escribió un pato. Empecemos por dar luz a la plaza.',
    restored: 'Una puerta que abre. Casi revolucionario. Bombo necesita agua para la fiesta.' },
  { id: 'bombo', name: 'Bombo', x: 1570, offsetY: 140, color: 0x5ee7ff, fragment: 'fountain-fragment', target: 'fountain',
    request: 'Mi concierto de agua está un poco seco. ¿Enciendes la fuente?',
    restored: '¡Plin, plon, CHOF! Ya tenemos música. Vera anunciará la fiesta.' },
  { id: 'vera', name: 'Vera', x: 2320, offsetY: 140, color: 0xff9ff3, fragment: 'beacon-fragment', target: 'beacon',
    request: 'Una señal dice CUAC. La otra debería decir dónde será la fiesta. Necesito las dos.',
    restored: '¡Atención, barrio! Fiesta en preparación. Traigan alegría, no enchufes mordidos.' },
  { id: 'don-paso', name: 'Don Paso', x: 2850, offsetY: 120, color: 0xffe066, fragment: 'bridge-fragment', target: 'bridge',
    request: 'Estoy cerrado por mantenimiento de mi autoestima. Conecta el interruptor.',
    restored: 'Pueden pasar. Las fotos de mi lado elegante son gratuitas.' },
  { id: 'goteo', name: 'Alcalde Goteo', x: 3620, offsetY: 140, color: 0xffb86c, fragment: 'garden-fragment', target: 'garden-bed',
    request: 'Decreto municipal: flores felices. Energía al aspersor, agua a las flores.',
    restored: '¡Ha florecido mi mandato! Las flores prefieren decir que las regaste tú.' },
];

export type ResidentInfo = typeof RESIDENTS[number];

export function hasChapterConnection(state: GameState, target: string): boolean {
  if (target === 'beacon') return new Set(state.connections.filter(c => c.targetId === target).map(c => c.sourceId)).size >= 2;
  return state.connections.some(c => c.targetId === target);
}

export function residentLine(resident: ResidentInfo, state: GameState): string {
  return state.fragmentsCollected.includes(resident.fragment) || hasChapterConnection(state, resident.target)
    ? resident.restored : resident.request;
}

export function chapterObjective(state: GameState): string {
  const done = (fragment: string, target: string): boolean => state.fragmentsCollected.includes(fragment) || hasChapterConnection(state, target);
  if (!done('plaza-fragment', 'door')) return hasChapterConnection(state, 'lamp')
    ? 'Conecta la lámpara con la puerta del barrio' : 'Dale luz a la plaza: fuente → lámpara';
  if (!done('fountain-fragment', 'fountain') || !done('beacon-fragment', 'beacon'))
    return 'Prepara la fiesta: agua para Bombo y dos señales para Vera';
  if (!done('bridge-fragment', 'bridge')) return 'Conecta el interruptor para cruzar el puente';
  if (!done('garden-fragment', 'garden-bed')) return hasChapterConnection(state, 'garden-sprinkler')
    ? 'Conecta el aspersor con las flores de la fiesta' : 'Enciende el aspersor del jardín';
  return 'El barrio está listo. Explora y recupera los recuerdos';
}
