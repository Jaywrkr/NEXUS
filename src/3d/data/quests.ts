/*
 * Libreta de encargos (Fase 10, PLAN_EXPANSION.md §4.1). Cada vecino da encargos cortos y cada
 * distrito tiene una gran tarea: terminar todos sus encargos devuelve su Pieza de la Gran Chispa
 * (solo después de que la Chispa se partió en el faro). Todo se cumple con acciones que ya existen.
 */

/** Lo que un encargo puede preguntarle al mundo. */
export interface QuestCtx {
  flag(id: string): boolean;
  active(id: string): boolean;
  /** [despiertas, total] de cosas dormidas en un distrito. */
  awake(district: string): [number, number];
  /** [juntadas, total] de notas en un distrito. */
  notes(district: string): [number, number];
  chispi(id: string): boolean;
  count(key: string): number;
  zones(): number;
  fragments(): number;
  fragment(id: string): boolean;
  homeFixed(): number;
  stopsVisited(): number;
  cards(): number;
}

export interface Quest {
  id: string;
  district: string;
  /** Vecino que lo pide (retrato en la libreta). */
  giver: string;
  title: string;
  text: string;
  /** true, o [hecho, total] para mostrar el avance. */
  check: (c: QuestCtx) => boolean | [number, number];
  /** Premio: chispitas (por defecto 2) o un sobre de cartas. */
  reward?: 'pack';
  /** Dónde queda (para la flecha de la pista). */
  at?: { x: number; z: number };
}

const all = (c: QuestCtx, ids: string[], f: (c: QuestCtx, id: string) => boolean): [number, number] => [ids.filter((id) => f(c, id)).length, ids.length];
const pair = (v: [number, number]): [number, number] => v;

export const DISTRICT_NAMES: Record<string, string> = {
  centro: 'Centro',
  skatepark: 'Skatepark',
  parque: 'Parque de diversiones',
  estacion: 'Estación',
  cerro: 'Cerro',
  puerto: 'Puerto',
};

/** Distritos con libreta (en orden); los de las fases siguientes se suman acá. */
export const QUEST_DISTRICTS = ['centro', 'skatepark', 'parque', 'estacion', 'cerro', 'puerto'];

/** Cuántas Piezas de la Gran Chispa hay en total (una por gran tarea; las demás llegan con los distritos nuevos). */
export const PIECES_TOTAL = 12;

export const QUESTS: Quest[] = [
  // ---------- Centro ----------
  { id: 'c-lugares', district: 'centro', giver: 'miga', title: 'La ciudad al derecho', text: 'Devolvele la vida a los 7 lugares del Centro.', check: (c) => [c.zones(), 7] },
  { id: 'c-fiesta', district: 'centro', giver: 'lucio', title: '¡Que empiece la fiesta!', text: 'Prendé el escenario y el cañón de confeti.', check: (c) => c.flag('chapter-done'), reward: 'pack' },
  { id: 'c-dormidas', district: 'centro', giver: 'goteo', title: 'Nadie duerme en el Centro', text: 'Despertá con la mochila todas las cosas dormidas del Centro.', check: (c) => c.awake('centro') },
  { id: 'c-notas', district: 'centro', giver: 'vera', title: 'Melodía de la plaza', text: 'Juntá las 6 notas escondidas del Centro (¡hay arriba de los autos!).', check: (c) => c.notes('centro') },
  { id: 'c-carrera', district: 'centro', giver: 'don-paso', title: 'Vuelta al barrio', text: 'Ganá la carrera de aros del Centro (cartel 🏁 al oeste de la calle).', check: (c) => c.flag('race-centro'), at: { x: -42, z: 3 } },
  { id: 'c-recuerdos', district: 'centro', giver: 'miga', title: 'Museo lleno', text: 'Juntá los 7 recuerdos de los lugares.', check: (c) => [c.fragments(), 7] },
  { id: 'c-secreto', district: 'centro', giver: 'miga', title: 'El secreto de la plaza', text: 'Encontrá el recuerdo secreto escondido detrás de una casa.', check: (c) => c.fragment('secret-fragment'), at: { x: -18, z: -39 } },
  {
    id: 'c-rescates',
    district: 'centro',
    giver: 'bombo',
    title: 'Chispis del Centro',
    text: 'Rescatá en el Mundo Voltio a Chispazo, Gotita, Antenita, Brotecito y Globín.',
    check: (c) => all(c, ['chispazo', 'gotita', 'antenita', 'brotecito', 'globin'], (k, id) => k.chispi(id)),
    reward: 'pack',
  },
  { id: 'c-casa', district: 'centro', giver: 'pipa', title: 'Casa propia', text: 'Arreglá 5 cosas de tu casa (al lado del jardín).', check: (c) => [Math.min(5, c.homeFixed()), 5], at: { x: -34.4, z: 55 } },
  { id: 'c-tirolesa', district: 'centro', giver: 'lucio', title: 'Por los cables', text: 'Tirate 5 veces por una tirolesa.', check: (c) => [Math.min(5, c.count('zip')), 5] },

  // ---------- Skatepark ----------
  { id: 's-capucha', district: 'skatepark', giver: 'rulo', title: 'Tres trucos', text: 'Hacé los tres trucos de Rulo y ganá la capucha.', check: (c) => c.flag('hood') },
  { id: 's-rampa', district: 'skatepark', giver: 'rulo', title: 'La rampa grande', text: 'Llevá energía a la rampa grande.', check: (c) => c.active('skate-ramp') },
  { id: 's-sala', district: 'skatepark', giver: 'rulo', title: 'La sala de Rulo', text: 'Abrí la sala cerrando su circuito en el Mundo Voltio.', check: (c) => c.flag('sala-open') },
  { id: 's-rueditas', district: 'skatepark', giver: 'rulo', title: 'Rueditas', text: 'Rescatá a Rueditas en el Mundo Voltio.', check: (c) => c.chispi('rueditas') },
  { id: 's-carrera', district: 'skatepark', giver: 'rulo', title: 'Slalom de Rulo', text: 'Ganá la carrera de aros en patineta.', check: (c) => c.flag('race-skate'), at: { x: 66, z: -14 }, reward: 'pack' },
  { id: 's-grind', district: 'skatepark', giver: 'rulo', title: 'Grindero', text: 'Grindá 10 veces en las barandas.', check: (c) => [Math.min(10, c.count('trick-grind')), 10] },
  { id: 's-vuelos', district: 'skatepark', giver: 'rulo', title: 'Pájaro de rampa', text: 'Volá 10 veces desde las rampitas.', check: (c) => [Math.min(10, c.count('trick-air')), 10] },
  { id: 's-notas', district: 'skatepark', giver: 'rulo', title: 'Ritmo de ruedas', text: 'Juntá las 5 notas del Skatepark.', check: (c) => c.notes('skatepark') },

  // ---------- Parque ----------
  { id: 'p-calesita', district: 'parque', giver: 'tita', title: 'Una vuelta en calesita', text: 'Revivila y subite.', check: (c) => c.flag('ride-park-carousel') },
  { id: 'p-vuelta', district: 'parque', giver: 'tita', title: 'Bien arriba', text: 'Revivi la vuelta al mundo y subite.', check: (c) => c.flag('ride-park-wheel') },
  { id: 'p-montana', district: 'parque', giver: 'tita', title: '¡Agarrate fuerte!', text: 'Revivi la montaña rusa y subite.', check: (c) => c.flag('ride-park-coaster'), reward: 'pack' },
  { id: 'p-espejos', district: 'parque', giver: 'tita', title: 'Mil Nexus', text: 'Encendé la bola de la casa de los espejos.', check: (c) => c.active('espejos-bola') },
  { id: 'p-pochoclin', district: 'parque', giver: 'tita', title: '¡Pop!', text: 'Rescatá a Pochoclín en el Mundo Voltio.', check: (c) => c.chispi('pochoclin') },
  { id: 'p-dormidas', district: 'parque', giver: 'tita', title: 'Feria despierta', text: 'Despertá las cosas dormidas del parque.', check: (c) => c.awake('parque') },
  { id: 'p-carrera', district: 'parque', giver: 'tita', title: 'La gran vuelta', text: 'Ganá la carrera de aros del parque.', check: (c) => c.flag('race-parque'), at: { x: 0, z: -54 } },
  { id: 'p-notas', district: 'parque', giver: 'tita', title: 'Música de feria', text: 'Juntá las 5 notas del parque.', check: (c) => c.notes('parque') },

  // ---------- Estación ----------
  { id: 'e-tren', district: 'estacion', giver: 'nora', title: '¡Pasajeros al tren!', text: 'Destrabá el motor y despertá el tren.', check: (c) => c.active('station-train'), reward: 'pack' },
  { id: 'e-tour', district: 'estacion', giver: 'nora', title: 'Turista', text: 'Viajá en tren a cuatro paradas.', check: (c) => c.flag('train-tour') },
  { id: 'e-todas', district: 'estacion', giver: 'nora', title: 'Todas las paradas', text: 'Bajate al menos una vez en cada parada del tren.', check: (c) => [c.stopsVisited(), 6] },
  { id: 'e-viajes', district: 'estacion', giver: 'nora', title: 'Pasajero frecuente', text: 'Hacé 10 viajes en tren.', check: (c) => [Math.min(10, c.count('trips')), 10] },
  { id: 'e-rielito', district: 'estacion', giver: 'nora', title: 'Rielito', text: 'Rescatá a Rielito en el Mundo Voltio.', check: (c) => c.chispi('rielito') },
  { id: 'e-carrera', district: 'estacion', giver: 'nora', title: 'Andén express', text: 'Ganá la carrera de aros del andén.', check: (c) => c.flag('race-estacion'), at: { x: 55, z: 44.5 } },
  { id: 'e-notas', district: 'estacion', giver: 'nora', title: 'Silbato y compás', text: 'Juntá las 5 notas de la estación.', check: (c) => c.notes('estacion') },

  // ---------- Cerro ----------
  { id: 'ce-cascada', district: 'cerro', giver: 'lalo', title: 'Agua que corre', text: 'Descongelá la cascada.', check: (c) => c.active('cerro-cascade') },
  { id: 'ce-cima', district: 'cerro', giver: 'lalo', title: 'Hasta la cima', text: 'Subí saltando hasta el mirador.', check: (c) => c.flag('cerro-top') },
  { id: 'ce-cueva', district: 'cerro', giver: 'lalo', title: 'Cristales', text: 'Prendé los cristales de la cueva.', check: (c) => c.flag('cave-lit'), reward: 'pack' },
  {
    id: 'ce-rescates',
    district: 'cerro',
    giver: 'lalo',
    title: 'Chispis del bosque',
    text: 'Rescatá a Ventarrón y a Musguito.',
    check: (c) => pair([Number(c.chispi('ventarron')) + Number(c.chispi('musguito')), 2]),
  },
  { id: 'ce-tirolesa', district: 'cerro', giver: 'lalo', title: 'La gran bajada', text: 'Tirate por la tirolesa larga del mirador.', check: (c) => c.flag('zip-cerro') },
  { id: 'ce-carrera', district: 'cerro', giver: 'lalo', title: 'Carrera del cerro', text: 'Ganá la carrera de aros por las rocas.', check: (c) => c.flag('race-cerro'), at: { x: -58, z: 22 } },
  { id: 'ce-notas', district: 'cerro', giver: 'lalo', title: 'Eco del cerro', text: 'Juntá las 5 notas del cerro (una está en la cima).', check: (c) => c.notes('cerro') },

  // ---------- Puerto ----------
  { id: 'pu-bote', district: 'puerto', giver: 'marina', title: 'El bote de Marina', text: 'Despertá el bote en el canal.', check: (c) => c.active('canal-boat') },
  { id: 'pu-paseo', district: 'puerto', giver: 'marina', title: 'Paseo por el canal', text: 'Subite al bote y dá la vuelta.', check: (c) => c.flag('ride-canal-boat') },
  { id: 'pu-faro', district: 'puerto', giver: 'marina', title: 'El faro', text: 'Prendé el faro (necesita toda la ciudad con vida).', check: (c) => c.flag('gran-chispa'), reward: 'pack' },
  { id: 'pu-gaviotin', district: 'puerto', giver: 'marina', title: 'Gaviotín', text: 'Rescatá a Gaviotín en el Mundo Voltio.', check: (c) => c.chispi('gaviotin') },
  { id: 'pu-carrera', district: 'puerto', giver: 'marina', title: 'Muelle a toda velocidad', text: 'Ganá la carrera de aros por los muelles.', check: (c) => c.flag('race-puerto'), at: { x: -35, z: 85 } },
  { id: 'pu-notas', district: 'puerto', giver: 'marina', title: 'Canción del mar', text: 'Juntá las 5 notas del puerto (¡arriba de los cajones también!).', check: (c) => c.notes('puerto') },
  { id: 'pu-cartas', district: 'puerto', giver: 'marina', title: 'Coleccionista', text: 'Juntá 25 cartas distintas de Chispis.', check: (c) => [Math.min(25, c.cards()), 25] },
];

/** ¿Está cumplido? (acepta los dos formatos de `check`) */
export function questDone(q: Quest, c: QuestCtx): boolean {
  const r = q.check(c);
  return Array.isArray(r) ? r[0] >= r[1] && r[1] > 0 : r;
}
