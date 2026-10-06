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
  { id: 'pipa', name: 'Pipa', x: 4610, offsetY: 130, color: 0xc7a0ef, fragment: 'workshop-fragment', target: 'toy-parade',
    request: 'Motor al pato y a la campana. Luego júntalos en el desfile. El pato insiste en supervisar.',
    restored: '¡El desfile funciona! El pato pidió vacaciones antes de su primer día.' },
  { id: 'lucio', name: 'Lucio', x: 5510, offsetY: 170, color: 0x9be37a, fragment: 'lantern-fragment', target: 'lantern-last',
    request: 'Puedes llevar la luz por arriba o por los faroles curiosos de abajo. Nos vemos en la fiesta.',
    restored: '¡Tenemos camino! El farol tímido solo cuenta chistes si te desvías a verlo.' },
];

export type ResidentInfo = typeof RESIDENTS[number];

export function hasChapterConnection(state: GameState, target: string): boolean {
  const required = target === 'beacon' ? ['beacon-source-a', 'beacon-source-b']
    : target === 'toy-parade' ? ['toy-duck', 'toy-bell'] : null;
  if (required) return required.every(source => state.connections.some(c => c.targetId === target && c.sourceId === source));
  return state.connections.some(c => c.targetId === target);
}

export function residentLine(resident: ResidentInfo, state: GameState): string {
  if (resident.id === 'miga' && (state.fragmentsCollected.includes('fountain-fragment') || hasChapterConnection(state, 'fountain')))
    return 'Bombo compartió el agua con la plaza. La casa pidió un jardín. No tiene manos para firmar.';
  return state.fragmentsCollected.includes(resident.fragment) || hasChapterConnection(state, resident.target)
    ? resident.restored : resident.request;
}

export const CONNECTION_SURPRISES = [
  { id: 'singing-door', source: 'energy-source', target: 'door', speaker: 'La puerta', line: '¡DOOO! Quería abrir, pero me salió una nota. Prueba con la lámpara.' },
  { id: 'no-refunds', source: 'lamp', target: 'energy-source', speaker: 'La fuente', line: 'No aceptamos devoluciones de luz. La puerta está por allí.' },
  { id: 'salad-decree', source: 'garden-source', target: 'garden-bed', speaker: 'Alcalde Goteo', line: '¡No electrifiques la ensalada! Enciende el aspersor primero.' },
];

export function connectionSurprise(source: string, target: string) {
  return CONNECTION_SURPRISES.find(surprise => surprise.source === source && surprise.target === target);
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
  if (!done('workshop-fragment', 'toy-parade')) {
    if (!hasChapterConnection(state, 'toy-motor')) return 'Pipa necesita un desfile: enciende el motor del taller';
    if (!hasChapterConnection(state, 'toy-duck') || !hasChapterConnection(state, 'toy-bell')) return 'Conecta el motor con el pato y con la campana';
    return 'Lleva el pato y la campana al desfile: faltan sus dos cables';
  }
  if (!done('lantern-fragment', 'lantern-last')) return 'Lleva la luz a la salida: ruta directa o faroles curiosos';
  if (!hasChapterConnection(state, 'party-stage')) return 'Conecta la luz de salida con el escenario de la fiesta';
  if (!hasChapterConnection(state, 'party-confetti')) return 'Último cable: escenario → confeti';
  return '¡La fiesta está en marcha! Explora y recupera los recuerdos';
}
