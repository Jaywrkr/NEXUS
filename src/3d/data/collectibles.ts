/*
 * Expansión, Fase 10 (PLAN_EXPANSION.md): notas de la canción escondidas y carreras de aros.
 * Coordenadas en metros (+X este, +Z sur). `y` = altura del centro de la nota/aro.
 */

export interface NoteSpot {
  id: string;
  district: string;
  x: number;
  y: number;
  z: number;
}

const n = (district: string, list: [number, number, number][]): NoteSpot[] =>
  list.map(([x, y, z], i) => ({ id: `note-${district}-${i}`, district, x, y, z }));

/** Notas de la canción de la ciudad: algunas en el piso, otras arriba de autos, bancos, rampas y rocas. */
export const NOTES: NoteSpot[] = [
  ...n('centro', [
    [-34.2, 2.8, 2.6], // techo de un auto
    [30.2, 2.8, -2.6], // techo de otro auto
    [-2.6, 2.8, -36.2], // auto de la calle norte
    [-24, 1.5, -22], // banco de la plaza
    [-42, 0.9, -38.8], // rincón del noroeste
    [10, 0.9, 44], // canal sur
  ]),
  ...n('skatepark', [
    [75, 1.6, 2], // arriba de la rampa grande
    [65, 1.5, -16], // banco
    [86.7, 0.9, -14.6],
    [91.6, 0.9, 17.8],
    [68, 0.9, 12],
  ]),
  ...n('parque', [
    [-30, 0.9, -60],
    [25, 0.9, -90],
    [0, 0.9, -75],
    [-28, 0.9, -92],
    [30, 0.9, -58],
  ]),
  ...n('estacion', [
    [64, 1.5, 46.5], // banco del andén
    [90, 0.9, 60],
    [55, 0.9, 56],
    [86, 0.9, 50],
    [92, 0.9, 38.6],
  ]),
  ...n('cerro', [
    [-70, 3.6, 20], // tercera roca
    [-96, 8.1, 26], // arriba de la meseta
    [-60, 0.9, -20],
    [-95, 0.9, -26],
    [-75, 0.9, 6],
  ]),
  ...n('bosque', [
    [-92.4, 9.0, -78.6], // en la casa del árbol
    [-60, 4.5, -88], // arriba de un hongo (hay que rebotar)
    [-50, 0.9, -95],
    [-66, 0.9, -58],
    [-100, 0.9, -60],
    [-92, 0.9, -100],
  ]),
  ...n('granja', [
    [-90.6, 0.9, 85.6], // con el espantapájaros
    [-102, 0.9, 90],
    [-100, 0.9, 44],
    [-56, 0.9, 70],
    [-84, 0.9, 62],
    [-70, 0.9, 96],
  ]),
  ...n('fabrica', [
    [62, 6.9, -90], // en el techo del depósito
    [66, 1.8, -60], // arriba de una cinta
    [50.6, 1.9, -47.1], // arriba de los barriles
    [100, 0.9, -50],
    [110, 0.9, -96],
    [48, 0.9, -90],
  ]),
  ...n('puerto', [
    [-3.3, 1.8, 90], // arriba de los cajones
    [16.7, 1.8, 74], // otros cajones
    [-19.5, 0.9, 110], // punta del muelle oeste
    [38, 0.9, 108], // muelle del faro
    [-35, 0.9, 70],
  ]),
];

export interface Race {
  id: string;
  district: string;
  name: string;
  /** Hay que hacerla en patineta. */
  board?: boolean;
  /** Segundos para llegar. */
  time: number;
  start: { x: number; z: number };
  /** Aros en orden: x, y (centro), z. */
  rings: [number, number, number][];
}

/** Carreras de aros contra el reloj: si no se llega, se prueba otra vez (sin perder nada). */
export const RACES: Race[] = [
  {
    id: 'race-centro',
    district: 'centro',
    name: 'Vuelta al barrio',
    time: 30,
    start: { x: -42, z: 3 },
    rings: [
      [-35, 1.2, 0],
      [-20, 1.2, 0],
      [-5, 1.2, 0],
      [0, 1.2, -12],
      [0, 1.2, -26],
      [0, 1.2, -40],
    ],
  },
  {
    id: 'race-skate',
    district: 'skatepark',
    name: 'Slalom de Rulo',
    board: true,
    time: 26,
    start: { x: 66, z: -14 },
    rings: [
      [70, 1.2, -9],
      [79, 1.2, -4],
      [70, 1.2, 4],
      [81, 1.2, 11],
      [90, 1.2, 4],
      [87, 1.2, -9],
    ],
  },
  {
    id: 'race-parque',
    district: 'parque',
    name: 'La gran vuelta del parque',
    time: 40,
    start: { x: 0, z: -54 },
    rings: [
      [-25, 1.2, -58],
      [-31, 1.2, -75],
      [-18, 1.2, -91],
      [5, 1.2, -91],
      [26, 1.2, -72],
      [10, 1.2, -57],
    ],
  },
  {
    id: 'race-estacion',
    district: 'estacion',
    name: 'Andén express',
    time: 24,
    start: { x: 55, z: 44.5 },
    rings: [
      [62, 1.2, 44.5],
      [70, 1.2, 44.5],
      [79, 1.2, 44.5],
      [88, 1.2, 44.5],
      [90, 1.2, 52],
      [92, 1.2, 59],
    ],
  },
  {
    id: 'race-cerro',
    district: 'cerro',
    name: 'Carrera del cerro',
    time: 40,
    start: { x: -58, z: 22 },
    rings: [
      [-62, 1.2, 20],
      [-67, 2.9, 20],
      [-73, 4.7, 20],
      [-79, 6.5, 20],
      [-86, 8.3, 20],
      [-94, 8.3, 16],
    ],
  },
  {
    id: 'race-bosque',
    district: 'bosque',
    name: 'Carrera de los hongos',
    time: 28,
    start: { x: -52, z: -84 },
    rings: [
      [-56, 3.8, -80],
      [-60, 3.8, -88],
      [-66, 3.8, -92],
      [-72, 3.8, -96],
      [-62, 1.2, -100],
    ],
  },
  {
    id: 'race-granja',
    district: 'granja',
    name: 'Carrera del maizal',
    time: 30,
    start: { x: -78, z: 81.5 },
    rings: [
      [-82, 1.2, 81.5],
      [-82, 1.2, 96],
      [-86, 1.2, 96],
      [-86, 1.2, 86],
      [-90, 1.2, 86],
    ],
  },
  {
    id: 'race-fabrica',
    district: 'fabrica',
    name: 'Turno rápido',
    time: 30,
    start: { x: 60, z: -44 },
    rings: [
      [72, 1.2, -44],
      [86, 1.2, -46],
      [100, 1.2, -56],
      [104, 1.2, -70],
      [90, 1.2, -66],
      [76, 1.2, -74],
    ],
  },
  {
    id: 'race-puerto',
    district: 'puerto',
    name: 'Muelle a toda velocidad',
    time: 32,
    start: { x: -35, z: 85 },
    rings: [
      [-25, 1.2, 92],
      [-19.5, 1.2, 102],
      [-19.5, 1.2, 109],
      [0, 1.2, 93],
      [20, 1.2, 93],
      [31, 1.2, 100],
    ],
  },
];
