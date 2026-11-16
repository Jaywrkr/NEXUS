/**
 * Globitos de los vecinos (Fase 6 del «siguiente nivel», guía `dialogue-systems`).
 *
 * Son frases cortas que un vecino ya conocido dice al pasar cerca, sin frenar el juego ni abrir
 * ventanas: reaccionan a lo que está pasando (si el Nexus baila o anda en patineta, la hora, si su
 * lugar ya revivió). Lo importante sigue en las charlas de `chapter.ts`; esto es solo vida.
 *
 * Elección: la situación más especial gana (bailar > patineta > noche > atardecer > contento/triste);
 * si el vecino tiene frases propias, a veces dice una de esas. Nunca repite la última.
 */

export type ChatterMood = 'dance' | 'skate' | 'night' | 'dusk' | 'happy' | 'sad';

export const CHATTER: Record<ChatterMood, string[]> = {
  dance: ['¡Eso, a bailar! 💃', '¡Qué pasos!', '¡Me contagiaste el ritmo!', '¡Otra vuelta, otra vuelta!'],
  skate: ['¡Qué rápido vas! 🛹', '¡Cuidado con las palomas!', '¡Hacé un truco!', '¡Volá, Nexus!'],
  night: ['¡Qué linda noche! 🌙', 'Mirá cuántas estrellas.', 'Shh… los búhos ya se despertaron.', 'De noche todo brilla distinto.'],
  dusk: ['¡Mirá qué cielo naranja! 🌇', 'Ya se está yendo el sol.', 'Mi hora favorita del día.'],
  happy: ['¡Gracias por devolverle el color! ✨', '¡Hola, Nexus! ¡Qué lindo está todo!', 'Desde que volvió la luz, no paro de sonreír.', '¡Sos mi héroe del cable!'],
  sad: ['Todo está tan gris…', 'Ojalá vuelva la luz pronto.', 'Hola, Nexus… ¿nos ayudás?', 'Extraño los colores.'],
};

/** Frases propias de algunos vecinos (se mezclan con las de la situación). */
export const OWN_CHATTER: Record<string, string[]> = {
  miga: ['¿Ya pasaste por mi casa?', '¡La farola es mi lugar favorito!'],
  bombo: ['¡Splash! Me encanta el agua.', '¿Escuchaste la fuente?'],
  vera: ['¿Querés oír la radio? 📻', 'La antena capta canciones lejanas.'],
  'don-paso': ['Yo cruzo el puente mil veces por día.', 'Paso a paso se llega lejos.'],
  goteo: ['¡Las flores necesitan agua!', 'Soy el alcalde, pero también jardinero.'],
  pipa: ['¡Ese motor ronronea como un gato!', '¿Viste el pato del desfile?'],
  lucio: ['Cada farol tiene su carácter.', 'Al farol tímido le gustan las visitas.'],
  tita: ['¿Una vuelta en la calesita? 🎠', '¡La montaña rusa da cosquillas!'],
  nora: ['¡Todos a bordo! 🚂', 'El tren llega a todos lados.'],
  rulo: ['¡Probá la rampa grande!', 'Tres trucos y te ganás algo.'],
  marina: ['El mar hoy está tranquilo.', '¿Viste el faro de noche?'],
  lalo: ['Desde el cerro se ve toda la ciudad.', '¡La tirolesa larga es la mejor!'],
  tuerca: ['¡Clanc, clanc! Así suena el trabajo.', 'Cada engranaje cuenta.'],
  trigo: ['Las vacas saludan a la mañana. 🐄', 'El maíz crece mejor con música.'],
  yuyo: ['Las luciérnagas salen de noche.', 'Shh… el bosque está escuchando.'],
  kiosko: ['¡Golosinas, diarios y cuentos!', '¿Pasaste por el cine?'],
  luli: ['¡Hay gatitos en las terrazas!', 'Me encanta la biblioteca.'],
  coral: ['¡Al agua, pero con cuidado! 🏖️', '¿Te animás a surfear?'],
  pip: ['¡Esta isla tiene secretos!', 'El volcán está calentito.'],
  lupa: ['Con el telescopio se ve todo.', '¿Sabías que las estrellas cantan?'],
};

/** Qué situación pesa más ahora. */
export function chatterMood(s: { dancing: boolean; riding: boolean; night: number; dusk: number; happy: boolean }): ChatterMood {
  if (s.dancing) return 'dance';
  if (s.riding) return 'skate';
  if (s.night > 0.6) return 'night';
  if (s.dusk > 0.5) return 'dusk';
  return s.happy ? 'happy' : 'sad';
}

/**
 * Elige la frase. `turn` es un contador por vecino (así cambia cada vez); `last` evita repetir.
 * Las situaciones especiales (bailar, patineta, noche, atardecer) siempre usan su lista; en un día
 * común, una de cada dos veces habla de lo suyo.
 */
export function pickChatter(id: string, mood: ChatterMood, turn: number, last = ''): string {
  const own = OWN_CHATTER[id] ?? [];
  const pool = (mood === 'happy' || mood === 'sad') && own.length && turn % 2 === 1 ? own : CHATTER[mood];
  let line = pool[(turn * 7 + id.length) % pool.length];
  if (line === last && pool.length > 1) line = pool[(pool.indexOf(line) + 1) % pool.length];
  return line;
}
