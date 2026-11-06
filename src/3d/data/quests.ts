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
  /** [despiertos, total] de un tipo de cosa dormida (búhos…). */
  awakeKind(kind: string): [number, number];
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
  bosque: 'Bosque de las luciérnagas',
  granja: 'Granja y molinos',
  fabrica: 'Fábrica de Chispas',
  alto: 'Barrio Alto y mercado',
  playa: 'Playa',
  noche: '🌙 De noche',
};

/** Distritos con libreta (en orden); los de las fases siguientes se suman acá. */
export const QUEST_DISTRICTS = ['centro', 'skatepark', 'parque', 'estacion', 'cerro', 'puerto', 'bosque', 'granja', 'fabrica', 'alto', 'playa', 'noche'];
/** Secciones de la libreta que no tienen Pieza (encargos sueltos). */
export const NO_PIECE = new Set(['noche']);

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
  // ---------- Bosque de las luciérnagas (Fase 11) ----------
  { id: 'b-puente', district: 'bosque', giver: 'yuyo', title: 'El puente colgante', text: 'Llevá energía a la palanca y armá el puente del arroyo.', check: (c) => c.active('forest-bridge'), at: { x: -71, z: -81.5 } },
  { id: 'b-fogon', district: 'bosque', giver: 'yuyo', title: 'Fogón del claro', text: 'Prendé el fogón con un cable.', check: (c) => c.active('forest-fire'), at: { x: -56, z: -64 }, reward: 'pack' },
  { id: 'b-luciernagas', district: 'bosque', giver: 'yuyo', title: 'Frascos de luz', text: 'Despertá con la mochila los 8 frascos de luciérnagas.', check: (c) => c.awake('bosque') },
  { id: 'b-arbol', district: 'bosque', giver: 'yuyo', title: 'La casa del árbol', text: 'Subí por las plataformas del árbol gigante hasta la casita de arriba.', check: (c) => c.flag('tree-top'), at: { x: -92, z: -74 } },
  { id: 'b-tirolesa', district: 'bosque', giver: 'yuyo', title: 'Desde la copa', text: 'Bajá del árbol gigante por la tirolesa.', check: (c) => c.flag('zip-tree') },
  { id: 'b-hongos', district: 'bosque', giver: 'yuyo', title: '¡Boing!', text: 'Rebotá 15 veces en los hongos colorados.', check: (c) => [Math.min(15, c.count('bounce')), 15], at: { x: -60, z: -88 } },
  { id: 'b-pinita', district: 'bosque', giver: 'yuyo', title: 'Piñita', text: 'Rescatá a Piñita en el Mundo Voltio, del otro lado del arroyo.', check: (c) => c.chispi('pinita'), at: { x: -96, z: -96 } },
  { id: 'b-carrera', district: 'bosque', giver: 'yuyo', title: 'Carrera de los hongos', text: 'Ganá la carrera de aros saltando en los hongos.', check: (c) => c.flag('race-bosque'), at: { x: -52, z: -84 } },
  { id: 'b-notas', district: 'bosque', giver: 'yuyo', title: 'Canto del bosque', text: 'Juntá las 6 notas del bosque (una está en la casa del árbol).', check: (c) => c.notes('bosque') },
  // ---------- Granja y molinos (Fase 12) ----------
  {
    id: 'g-molinos',
    district: 'granja',
    giver: 'trigo',
    title: 'Que giren los molinos',
    text: 'Llevale energía a los tres molinos (uno tiene el motor trabado: ¡capucha ⚡!).',
    check: (c) => [['farm-mill-0', 'farm-mill-1', 'farm-mill-2'].filter((id) => c.active(id)).length, 3],
    at: { x: -90, z: 54 },
  },
  { id: 'g-motor', district: 'granja', giver: 'trigo', title: 'El motor del molino', text: 'Destrabá el tercer molino cerrando su circuito en el Mundo Voltio.', check: (c) => c.flag('molino-open'), at: { x: -66, z: 86 } },
  { id: 'g-campos', district: 'granja', giver: 'trigo', title: 'Campos que crecen', text: 'Con los tres molinos girando, el agua llega y los campos crecen.', check: (c) => c.flag('fields-grown'), reward: 'pack' },
  { id: 'g-regador', district: 'granja', giver: 'trigo', title: 'El invernadero', text: 'Prendé el regador del invernadero.', check: (c) => c.active('farm-sprinkler'), at: { x: -68, z: 53 } },
  { id: 'g-pollitos', district: 'granja', giver: 'trigo', title: '¡Pío pío!', text: 'Entrá al granero y prendé la incubadora.', check: (c) => c.active('farm-incubator'), at: { x: -58, z: 60.5 }, reward: 'pack' },
  { id: 'g-animales', district: 'granja', giver: 'trigo', title: 'Buenos días, granja', text: 'Despertá con la mochila a las vacas y las gallinas.', check: (c) => c.awake('granja') },
  { id: 'g-tractor', district: 'granja', giver: 'trigo', title: 'Paseo en tractor', text: 'Despertá el tractor y dá una vuelta a los campos.', check: (c) => c.flag('ride-farm-tractor'), at: { x: -49.5, z: 64 } },
  { id: 'g-laberinto', district: 'granja', giver: 'trigo', title: 'El laberinto de maíz', text: 'Encontrá al espantapájaros en el centro del maizal.', check: (c) => c.flag('maze-center'), at: { x: -81, z: 81.5 } },
  { id: 'g-girasolin', district: 'granja', giver: 'trigo', title: 'Girasolín', text: 'Rescatá a Girasolín en el Mundo Voltio.', check: (c) => c.chispi('girasolin'), at: { x: -84, z: 58 } },
  { id: 'g-carrera', district: 'granja', giver: 'trigo', title: 'Carrera del maizal', text: 'Ganá la carrera de aros por adentro del laberinto.', check: (c) => c.flag('race-granja'), at: { x: -78, z: 81.5 } },
  { id: 'g-notas', district: 'granja', giver: 'trigo', title: 'Canción de la granja', text: 'Juntá las 6 notas de la granja (una está con el espantapájaros).', check: (c) => c.notes('granja') },
  // ---------- Fábrica de Chispas (Fase 14) ----------
  { id: 'f-cintas', district: 'fabrica', giver: 'tuerca', title: 'Cintas en orden', text: 'Prendé las tres cintas transportadoras, una después de la otra.', check: (c) => [['factory-belt-0', 'factory-belt-1', 'factory-belt-2'].filter((id) => c.active(id)).length, 3], at: { x: 52, z: -60 } },
  { id: 'f-porton', district: 'fabrica', giver: 'tuerca', title: 'El portón trabado', text: 'Abrí el portón de la sala de máquinas cerrando su circuito en el Mundo Voltio.', check: (c) => c.flag('fabrica-open'), at: { x: 92, z: -74 } },
  { id: 'f-maquina', district: 'fabrica', giver: 'tuerca', title: 'La Gran Máquina', text: 'Adentro: caldera → engranaje → Gran Máquina.', check: (c) => c.active('factory-machine'), at: { x: 92, z: -79 }, reward: 'pack' },
  { id: 'f-robots', district: 'fabrica', giver: 'tuerca', title: 'Robots ayudantes', text: 'Reiniciá con la mochila a los 5 robots dormidos.', check: (c) => c.awakeKind('robot') },
  { id: 'f-techo', district: 'fabrica', giver: 'tuerca', title: 'Montacargas', text: 'Subí en el montacargas al techo del depósito (anda cuando las cintas andan).', check: (c) => c.flag('roof-factory'), at: { x: 71.3, z: -90 } },
  { id: 'f-tirolesa', district: 'fabrica', giver: 'tuerca', title: 'Bajada de la fábrica', text: 'Bajá del techo del depósito por la tirolesa.', check: (c) => c.flag('zip-factory') },
  { id: 'f-faroluz', district: 'fabrica', giver: 'tuerca', title: 'Faroluz', text: 'Rescatá a Faroluz en el Mundo Voltio (¡dicen que vio a la Gran Chispa!).', check: (c) => c.chispi('faroluz'), at: { x: 104, z: -52 }, reward: 'pack' },
  { id: 'f-carrera', district: 'fabrica', giver: 'tuerca', title: 'Turno rápido', text: 'Ganá la carrera de aros de la fábrica.', check: (c) => c.flag('race-fabrica'), at: { x: 60, z: -44 } },
  { id: 'f-notas', district: 'fabrica', giver: 'tuerca', title: 'Ruido de máquinas', text: 'Juntá las 6 notas de la fábrica (una está en el techo del depósito).', check: (c) => c.notes('fabrica') },
  // ---------- Barrio Alto y mercado (Fase 15) ----------
  { id: 'a-mercado', district: 'alto', giver: 'kiosko', title: 'El mercado prendido', text: 'Llevá la energía a un puesto: cada puesto prendido le pasa la luz a otro. ¡Prendé los 6!', check: (c) => [['frutas', 'pan', 'flores', 'juguetes', 'telas', 'discos'].filter((k) => c.active(`alto-stall-${k}`)).length, 6], at: { x: 104.5, z: 13 } },
  { id: 'a-cine', district: 'alto', giver: 'kiosko', title: 'Función de cine', text: 'Con el mercado andando abre el cine: prendé el proyector y mirá la película.', check: (c) => c.active('alto-projector'), at: { x: 114, z: -13 }, reward: 'pack' },
  { id: 'a-biblio', district: 'alto', giver: 'luli', title: 'El farol de lectura', text: 'El farol de la biblioteca está trabado. Cerrá su circuito en el Mundo Voltio y llevale energía.', check: (c) => c.active('alto-lamp'), at: { x: 140, z: -11 } },
  { id: 'a-techos', district: 'alto', giver: 'luli', title: 'Arriba de todo', text: 'Subí saltando por las terrazas hasta el techo más alto.', check: (c) => c.flag('alto-top'), at: { x: 136.5, z: 11 } },
  { id: 'a-tirolesa', district: 'alto', giver: 'luli', title: 'Bajada al mercado', text: 'Bajá del techo más alto por la tirolesa.', check: (c) => c.flag('zip-alto') },
  { id: 'a-patineta', district: 'alto', giver: 'kiosko', title: 'Patineta al techo', text: 'Subí a un techo en patineta usando la rampita.', check: (c) => c.flag('roof-board'), at: { x: 131.6, z: 11 } },
  { id: 'a-gatos', district: 'alto', giver: 'luli', title: 'Los gatos del barrio', text: 'Despertá con la mochila a los 5 gatos dormidos.', check: (c) => c.awakeKind('cat') },
  { id: 'a-turbo', district: 'alto', giver: 'kiosko', title: 'Turbochispa', text: 'Rescatá a Turbochispa en el Mundo Voltio, al lado del mercado.', check: (c) => c.chispi('turbochispa'), at: { x: 150, z: 24 }, reward: 'pack' },
  { id: 'a-carrera', district: 'alto', giver: 'kiosko', title: 'Carrera por los techos', text: 'En patineta: subí por la rampita y pasá los aros de techo en techo.', check: (c) => c.flag('race-alto'), at: { x: 124, z: 7 } },
  { id: 'a-notas', district: 'alto', giver: 'luli', title: 'Canción del barrio', text: 'Juntá las 6 notas del Barrio Alto (hay notas en los techos).', check: (c) => c.notes('alto') },
  // ---------- Playa (Fase 16) ----------
  { id: 'p-kiosco', district: 'playa', giver: 'coral', title: 'Algo fresquito', text: 'Llevale energía a la heladera del kiosco: ¡se abren las sombrillas!', check: (c) => c.active('playa-fridge'), at: { x: 57.5, z: 75.5 } },
  { id: 'p-castillo', district: 'playa', giver: 'coral', title: 'El castillo gigante', text: 'Conectá el balde de chispas con el castillo de arena y miralo crecer.', check: (c) => c.active('playa-castle'), at: { x: 83.5, z: 80.5 } },
  { id: 'p-torre', district: 'playa', giver: 'coral', title: 'La torre de Coral', text: 'Subí a la torre de la salvavidas (por el escalón de al lado).', check: (c) => c.flag('torre-coral'), at: { x: 105.6, z: 76 } },
  { id: 'p-muelle', district: 'playa', giver: 'coral', title: 'El portón de la escollera', text: 'Abrí el portón de la escollera cerrando su circuito en el Mundo Voltio.', check: (c) => c.flag('muelle-open'), at: { x: 122, z: 92 } },
  { id: 'p-farito', district: 'playa', giver: 'coral', title: 'El faro chiquito', text: 'El faro chiquito necesita dos cables: el del panel solar y el del molinito.', check: (c) => c.active('playa-farito'), at: { x: 122, z: 110 }, reward: 'pack' },
  { id: 'p-surf', district: 'playa', giver: 'coral', title: '¡A surfear!', text: 'Subite a la patineta y andá sobre el mar de la orilla.', check: (c) => c.flag('surf') },
  { id: 'p-ola', district: 'playa', giver: 'coral', title: 'Saltar una ola', text: 'Surfeando, agarrá una ola de espuma rápido y volá.', check: (c) => c.flag('surf-air'), at: { x: 64, z: 104 } },
  { id: 'p-cangrejos', district: 'playa', giver: 'coral', title: 'Los cangrejos', text: 'Despertá con la mochila a los 6 cangrejos de la orilla.', check: (c) => c.awakeKind('crab') },
  { id: 'p-olita', district: 'playa', giver: 'coral', title: 'Olita', text: 'Rescatá a Olita en el Mundo Voltio, cerca del kiosco.', check: (c) => c.chispi('olita'), at: { x: 96, z: 68 }, reward: 'pack' },
  { id: 'p-carrera', district: 'playa', giver: 'coral', title: 'Carrera de surf', text: 'En patineta: pasá los aros sobre el mar (uno se alcanza saltando una ola).', check: (c) => c.flag('race-playa'), at: { x: 54, z: 92 } },
  { id: 'p-notas', district: 'playa', giver: 'coral', title: 'Canción del mar', text: 'Juntá las 6 notas de la playa (una en la torre y otra en la punta de la escollera).', check: (c) => c.notes('playa') },
  // ---------- De noche (Fase 13) ----------
  { id: 'n-noche', district: 'noche', giver: 'lucio', title: 'Primera noche', text: 'Esperá a que se haga de noche (o dormí una siesta en tu casa).', check: (c) => c.flag('night-seen') },
  { id: 'n-buhos', district: 'noche', giver: 'lucio', title: 'Los búhos', text: 'Despertá con la mochila a los 4 búhos (solo se despiertan de noche).', check: (c) => c.awakeKind('owl'), reward: 'pack' },
  { id: 'n-estrellas', district: 'noche', giver: 'lalo', title: 'Lluvia de estrellas', text: 'Mirá las estrellas desde el mirador del cerro, de noche.', check: (c) => c.flag('stars-cerro'), at: { x: -91, z: 14 } },
  { id: 'n-arbol', district: 'noche', giver: 'yuyo', title: 'Noche en el árbol', text: 'Subí a la casa del árbol de noche.', check: (c) => c.flag('tree-night'), at: { x: -92, z: -74 } },
  { id: 'n-vuelta', district: 'noche', giver: 'tita', title: 'Luces de feria', text: 'Subite a la vuelta al mundo de noche.', check: (c) => c.flag('wheel-night') },
  { id: 'n-luciernagas', district: 'noche', giver: 'yuyo', title: 'Baile de luciérnagas', text: 'Bailá en el bosque de noche.', check: (c) => c.flag('dance-fireflies') },
  { id: 'n-faro', district: 'noche', giver: 'marina', title: 'El faro en la noche', text: 'Visitá el faro prendido de noche.', check: (c) => c.flag('faro-night') },
  { id: 'n-carrera', district: 'noche', giver: 'don-paso', title: 'Carrera a la luz de la luna', text: 'Ganá cualquier carrera de aros de noche.', check: (c) => c.flag('race-night'), reward: 'pack' },
  { id: 'n-dormir', district: 'noche', giver: 'pipa', title: 'Dulces sueños', text: 'Dormí una siesta en la cama de tu casa.', check: (c) => c.flag('napped') },
  { id: 'pu-cartas', district: 'puerto', giver: 'marina', title: 'Coleccionista', text: 'Juntá 25 cartas distintas de Chispis.', check: (c) => [Math.min(25, c.cards()), 25] },
];

/** ¿Está cumplido? (acepta los dos formatos de `check`) */
export function questDone(q: Quest, c: QuestCtx): boolean {
  const r = q.check(c);
  return Array.isArray(r) ? r[0] >= r[1] && r[1] > 0 : r;
}
