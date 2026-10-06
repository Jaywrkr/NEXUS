import type { GameState } from './gameState';

export const CHAPTER_TITLE = 'La ciudad al revés';
export const DISCOVERY_IDS = ['singing-door', 'no-refunds', 'salad-decree', 'house-garden', 'shy-lantern', 'plaza-bulletin', 'garden-concert'];
export const RESIDENTS = [
  { id: 'miga', name: 'Miga', x: 350, offsetY: 70, color: 0x5ee7ff, fragment: 'plaza-fragment', target: 'door',
    request: 'El manual lo escribió un pato. Empecemos por dar luz a la plaza.',
    restored: 'Una puerta que abre. Casi revolucionario. Bombo necesita agua para la fiesta.' },
  { id: 'bombo', name: 'Bombo', x: 1720, offsetY: 165, color: 0x5ee7ff, fragment: 'fountain-fragment', target: 'fountain',
    request: 'La fuente necesita agua, no un enchufe. Despierta la bomba y elige: chorro fuerte o flujo suave.',
    restored: '¡Plin, plon, CHOF! Ya tenemos música. Vera anunciará la fiesta.' },
  { id: 'vera', name: 'Vera', x: 2320, offsetY: 140, color: 0xff9ff3, fragment: 'beacon-fragment', target: 'beacon',
    request: 'Una señal dice CUAC. La otra debería decir dónde será la fiesta. Necesito las dos.',
    restored: '¡Atención, barrio! Fiesta en preparación. Traigan alegría, no enchufes mordidos.' },
  { id: 'don-paso', name: 'Don Paso', x: 2850, offsetY: 120, color: 0xffe066, fragment: 'bridge-fragment', target: 'bridge',
    request: 'Estoy cerrado por mantenimiento de mi autoestima. Mi mecanismo está dormido.',
    restored: 'Pueden pasar. Las fotos de mi lado elegante son gratuitas.' },
  { id: 'goteo', name: 'Alcalde Goteo', x: 3620, offsetY: 140, color: 0xffb86c, fragment: 'garden-fragment', target: 'garden-bed',
    request: 'Decreto municipal: flores felices. El jardín está seco y mi aspersor ni se mueve.',
    restored: '¡Ha florecido mi mandato! Las flores prefieren decir que las regaste tú.' },
  { id: 'pipa', name: 'Pipa', x: 4610, offsetY: 130, color: 0xc7a0ef, fragment: 'workshop-fragment', target: 'toy-parade',
    request: 'El desfile necesita música y un supervisor. Tenemos una campana muda y un pato demasiado quieto.',
    restored: '¡El desfile funciona! El pato pidió vacaciones antes de su primer día.' },
  { id: 'lucio', name: 'Lucio', x: 5510, offsetY: 170, color: 0x9be37a, fragment: 'lantern-fragment', target: 'lantern-last',
    request: 'El camino está oscuro. Unos faroles tienen prisa; otros prefieren conversar. ¿Por dónde viajará la luz?',
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
  if (state.story?.chapterSeen) {
    const epilogues: Record<string, string> = {
      miga: 'La fiesta salió bien. El manual del pato ahora sostiene una mesa que cojeaba.',
      bombo: 'Mi nuevo éxito se llama Plin Plon. Dura hasta que alguien cierre el grifo.',
      vera: 'Comunicado oficial: el confeti no sirve para empanar tostadas.',
      'don-paso': 'He dejado pasar a todos. Mi autobiografía tendrá muchas páginas en blanco.',
      goteo: 'Las flores votaron. He perdido contra una regadera. Acepto el resultado.',
      pipa: 'El pato supervisa la campana. La campana supervisa al pato. Yo descanso.',
      lucio: 'La fiesta sigue. Puedes ver el final otra vez o buscar las sorpresas del barrio.',
    };
    return epilogues[resident.id] ?? resident.restored;
  }
  if (resident.id === 'miga' && (state.fragmentsCollected.includes('fountain-fragment') || hasChapterConnection(state, 'fountain')))
    return 'Bombo compartió el agua con la plaza. La casa pidió un jardín. No tiene manos para firmar.';
  return state.fragmentsCollected.includes(resident.fragment) || hasChapterConnection(state, resident.target)
    ? resident.restored : resident.request;
}

export const CONNECTION_SURPRISES = [
  { id: 'singing-door', source: 'energy-source', target: 'door', speaker: 'La puerta', line: 'El generador aporta energía, pero mi cierre necesita el relé de la lámpara. Enciéndela primero.' },
  { id: 'no-refunds', source: 'lamp', target: 'energy-source', speaker: 'La fuente', line: 'No aceptamos devoluciones de luz. La puerta está por allí.' },
  { id: 'salad-decree', source: 'garden-source', target: 'garden-bed', speaker: 'Alcalde Goteo', line: '¡No electrifiques la ensalada! Enciende el aspersor primero.' },
];

export function connectionSurprise(source: string, target: string) {
  return CONNECTION_SURPRISES.find(surprise => surprise.source === source && surprise.target === target);
}

export function chapterTask(state: GameState): { id: string; objective: string; clues: string[] } {
  const done = (fragment: string, target: string): boolean => state.fragmentsCollected.includes(fragment) || hasChapterConnection(state, target);
  const task = (id: string, objective: string, ...clues: string[]) => ({ id, objective, clues });
  if (!done('plaza-fragment', 'door')) return hasChapterConnection(state, 'lamp')
    ? task('door', 'La lámpara funciona, pero la puerta sigue cerrada', 'La puerta necesita algo que ya tenga luz.', 'La lámpara encendida también puede iniciar un cable.', 'Lámpara → puerta.')
    : task('lamp', 'Dale luz a la plaza: fuente → lámpara', 'Toca la estrella y después la lámpara.', 'El primer cable tiene un túnel: puedes practicar antes de empezar.', 'Fuente → lámpara. Dentro del cable, guía la chispa con flechas o joystick.');
  if (!done('fountain-fragment', 'fountain')) return hasChapterConnection(state, 'water-pump')
    ? task('fountain', 'La bomba funciona: elige presión para la fuente', 'Las dos válvulas reciben agua; cada una cambia el chorro.', 'La directa entrega 3 bar; la reguladora reduce a 2 bar. Ambas restauran la fuente.', 'Bomba → válvula directa o reguladora → fuente. Puedes cambiar de ruta.')
    : task('fountain', 'La fuente está seca: su bomba necesita energía', 'Observa los conectores: energía dorada, agua azul.', 'El generador alimenta el motor de la bomba. La fuente solo recibe agua.', 'Generador → bomba → una válvula → fuente.');
  if (!done('beacon-fragment', 'beacon')) return task('beacon', 'El anuncio de Vera todavía llega incompleto', 'Una sola voz no cuenta el anuncio completo.', 'Hay dos estrellas; cada una aporta una señal distinta.', 'Conecta cada fuente de la antena con la antena. Necesita ambas.');
  if (!done('bridge-fragment', 'bridge')) return task('bridge', 'Don Paso necesita despertar su mecanismo', 'El puente espera una señal antes de dejarte cruzar.', 'Observa el interruptor y su estrella cercana.', 'Fuente del puente → interruptor.');
  if (!done('garden-fragment', 'garden-bed')) return hasChapterConnection(state, 'garden-sprinkler')
    ? task('flowers', 'El aspersor funciona, pero las flores siguen secas', 'La electricidad ya hizo su trabajo. Ahora falta agua.', 'Un aparato encendido puede alimentar otro objeto.', 'Aspersor → flores.')
    : task('sprinkler', 'El jardín está seco; su aspersor tampoco despierta', 'Las flores necesitan agua, no electricidad directa.', 'Primero hay que despertar al que reparte el agua.', 'Fuente del jardín → aspersor.');
  if (!done('workshop-fragment', 'toy-parade')) {
    if (!hasChapterConnection(state, 'toy-motor')) return task('motor', 'El taller está quieto: falta música y un supervisor', 'Busca qué puede poner en marcha a los juguetes.', 'El motor puede repartir la energía a más de un juguete.', 'Fuente del taller → motor.');
    if (!hasChapterConnection(state, 'toy-duck') || !hasChapterConnection(state, 'toy-bell')) return task('toys', 'El desfile todavía necesita a sus dos participantes', 'Uno supervisa y el otro hace música.', 'El motor tiene energía para los dos.', 'Motor → pato y motor → campana, en cualquier orden.');
    return task('parade', 'Los juguetes despiertan, pero no se han reunido', 'Los dos participantes deben llegar al mismo lugar.', 'El desfile necesita dos cables distintos.', 'Pato → desfile y campana → desfile.');
  }
  if (!done('lantern-fragment', 'lantern-last')) return task('lanterns', 'Hay luz al inicio; falta encontrar un camino a la fiesta', 'La luz puede pasar de un farol encendido a otro.', 'Arriba hay un camino corto; abajo esperan los faroles curiosos.', 'Fuente → primer farol. Continúa por arriba o por los dos faroles de abajo hasta la salida.');
  if (!hasChapterConnection(state, 'party-stage')) return task('stage', 'El barrio está listo, pero el escenario sigue apagado', 'La luz que llegó al final del camino todavía puede viajar.', 'El escenario espera la señal de salida de los faroles.', 'Farol de salida → escenario.');
  if (!hasChapterConnection(state, 'party-confetti')) return task('confetti', 'La fiesta está preparada; falta la sorpresa final', 'Hay una máquina esperando la señal del escenario.', 'El escenario encendido puede iniciar el último cable.', 'Escenario → confeti.');
  return task('explore', '¡La fiesta está en marcha! Explora y recupera los recuerdos', 'Los habitantes tienen algo nuevo que contar.', 'Algunas parejas equivocadas tienen respuestas propias.', 'Vuelve a Miga tras reparar la fuente o prueba el camino de faroles curiosos.');
}

export function chapterObjective(state: GameState): string { return chapterTask(state).objective; }
