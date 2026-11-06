import * as THREE from 'three';
import { AudioSystem } from '../../systems/AudioSystem';
import type { Input } from '../core/input';
import { Progress3D } from '../core/progress';
import { LIFE, LIFE_SPOTS, keepVivid } from '../core/render';
import type { Renderer } from '../core/render';
import { after, tween } from '../core/tween';
import { damp, dampAngle } from '../core/util';
import { Nexus3D } from '../entities/Nexus3D';
import type { Connectable } from '../objects/Connectable';
import { Beacon, BridgeLever, Door, EnergySource, FlowerBed, Fountain, Fragment, Sprinkler, StreetLamp } from '../objects/objects';
import { Connections } from '../systems/Connections';
import type { FeedbackKind } from '../systems/Connections';
import { World } from '../world/World';
import { SECRET_FRAGMENT, ZONE_FRAGMENTS } from './MuseumMode';
import { RESIDENTS, connectionSurprise, residentLine } from '../../data/chapter';
import { Resident3D } from '../entities/Resident3D';
import { SLEEPER_INFO, Sleeper, Spark } from '../objects/sleepers';
import type { SleeperKind } from '../objects/sleepers';
import { Playground } from '../systems/Playground';
import { HIDDEN_SPARKS, SparkPickups } from '../systems/SparkPickups';
import { MAX_CHARGE } from '../core/progress';
import { planTunnel } from './TunnelMode';
import type { TunnelPlan } from './TunnelMode';
import { flashScreen } from '../core/settings';
import type { MapData } from '../ui/MapView';
import { DISTRICTS, districtAt } from '../world/districts';
import { BRIDGE_X, CANAL_MAX_Z } from '../world/World';
import { CANAL_MIN_Z, ZIP_SAG } from '../world/World';
import { SkateRamp, makeBoard } from '../objects/skate';
import { Skate, type Trick } from '../systems/Skate';
import { MAX_VOLT, Voltio } from '../systems/Voltio';
import type { InteriorInfo, ReviveRoom } from '../world/MigaHouse';
import { CardDisplay, FuseBox, IceCreamMachine } from '../objects/indoor';
import { CARDS, CARD_BY_ID, TOTAL_CARDS, TYPES, rollPack } from '../data/chispis';
import { makePack } from '../objects/pack';
import { ConfettiCannon, LanternPost, Motor, Stage, ToyBell, ToyDuck, ToyParade } from '../objects/festival';
import { FESTIVAL } from '../world/Festival';
import { Carousel, Coaster, FerrisWheel, MirrorBall, type Ride } from '../objects/rides';
import { PARK } from '../world/Park';
import { STATION, TRAIN_STOPS } from '../world/Station';
import { Train, makeStop } from '../objects/train';
import { Cascade } from '../objects/cascade';
import { CERRO, TOP_H } from '../world/Cerro';
import { BOAT, PORT } from '../world/Port';
import { CanalBoat, GranChispa, Lighthouse, PiecePedestals } from '../objects/finale';
import { Campfire, RopeBridgeLever } from '../objects/forest';
import { GreenhouseSprinkler, Incubator, Tractor, Windmill } from '../objects/farm';
import { FactoryPart } from '../objects/factory';
import { MarketStall, Projector, ReadingLamp } from '../objects/alto';
import { ALTO } from '../world/BarrioAlto';
import { BeachFridge, SandCastle, SmallLighthouse } from '../objects/playa';
import { PLAYA, SURF_REGION } from '../world/Playa';
import { RuneStone, SeaBoat, TempleAltar, VolcanoHeart, lift } from '../objects/isla';
import { ISLA, LANCHA, VOLCANO } from '../world/Isla';
import { Chairlift, Telescope } from '../objects/nieve';
import { LEDGE, NIEVE, SUMMIT, SUMMIT_STEPS } from '../world/Nieve';
import { FACTORY, liftHeight } from '../world/Factory';
import { FARM } from '../world/Farm';
import { FOREST, MUSHROOM_R, MUSHROOM_TOP, TREE } from '../world/Forest';
import { Notes, Races } from '../systems/Collectibles';
import { NOTES, type Race } from '../data/collectibles';
import { DISTRICT_NAMES, NO_PIECE, PIECES_TOTAL, QUESTS, QUEST_DISTRICTS, questDone, type Quest, type QuestCtx } from '../data/quests';
import { CitySong, INSTRUMENTS, INSTRUMENT_NAMES, type Instrument } from '../systems/CitySong';
import { HOME_ITEMS, type HomeItemInfo } from '../world/NexusHome';
import { loadLook } from '../data/wardrobe';
import type { CageSpot } from '../systems/Voltio';
import { Companion } from '../entities/Companion';
import type { ChispiType } from '../data/chispis';

const INTERACT_REACH = 2.2; // metros desde el borde del objeto
const NEXUS_RADIUS = 0.32;
const ISO_HALF = 4.4; // media altura visible (m): más chico = todo se ve más grande
/** La cámara isométrica mira desde el sureste (+X+Z) hacia el noroeste: ve las fachadas que dan a +X y +Z. */
const ISO_OFFSET = new THREE.Vector3(20, 22, 20);
/** Rumbo que mira hacia la cámara isométrica (que está al sureste, +X+Z). */
const ISO_FACING = Math.atan2(ISO_OFFSET.x, ISO_OFFSET.z);
const VIEW_KEY = 'los-nexus-3d-view';
const START = new THREE.Vector3(-20, 0, -11);
/** Salto: velocidad inicial y gravedad (sube ~1,3 m: alcanza bancos, tachos y el capó de los autos). */
const JUMP_V = 6.2;
const GRAVITY = 15;
/** Tirolesa: qué tan abajo del cable queda el Nexus colgado y a qué velocidad va. */
const ZIP_HANG = 2.0;
const ZIP_SPEED = 8.5;

const [PLAZA_ID, FOUNTAIN_ID, BEACON_ID, BRIDGE_ID, GARDEN_ID, WORKSHOP_ID, LANTERN_ID] = ZONE_FRAGMENTS.map((f) => f.id);
/** Lugares que se pueden devolver a la vida (uno por fragmento de zona). */
const ZONE_COUNT = ZONE_FRAGMENTS.length;

export interface WorldCallbacks {
  /** Pide abrir el mini-túnel; debe llamar a `finishTunnel` al terminar. */
  tunnel: (source: Connectable, target: Connectable) => void;
  /** Ir al museo (tras recoger un fragmento). */
  museum: () => void;
  /** Mostrar la carta de un Chispi rescatado o recibido (pausa el mundo hasta cerrarla). */
  card?: (id: string, kicker?: string) => void;
  /** Abrir un sobre: las cartas ya quedaron guardadas, esto es la animación. */
  pack?: (ids: string[]) => void;
  /** Un vecino ofrece cambiar su carta por una repetida. */
  trade?: (offer: { who: string; name: string; text: string; card: string; duplicates: string[] }) => void;
  /** Abrir el álbum. */
  album?: () => void;
  /** Tocaste una parada con el tren despierto: elegir destino (llama a `travelTo`). */
  travel?: () => void;
  /** Abrir el armario del Nexus (ropa). */
  wardrobe?: () => void;
  /** Volvió la Gran Chispa: créditos del final. */
  credits?: (stats: { places: number; placesTotal: number; awake: number; awakeTotal: number; cards: number; cardsTotal: number; chispis: number }) => void;
  /** La fiesta terminó el capítulo: pantalla de resultados. */
  ending?: (stats: { places: number; placesTotal: number; awake: number; awakeTotal: number; cards: number; cardsTotal: number; chispis: number }) => void;
}

/** Una habitación que se visita: dónde está su puerta afuera y cuándo se abre. */
interface Interior {
  id: string;
  info: InteriorInfo;
  door: { x: number; z: number; y?: number };
  out: { x: number; z: number; y?: number };
  open: () => boolean;
  story: [string, string];
  /** Lo que se revive adentro (si tiene). */
  target?: Connectable;
}

const TRICKS: Trick[] = ['ollie', 'air', 'grind'];

/** Chispis atrapados en el Mundo Voltio, uno por lugar (Fase 3). Rueditas está en el Skatepark. */
const CAGES: { id: string; x: number; z: number }[] = [
  { id: 'chispazo', x: -30, z: -8 },
  { id: 'gotita', x: -31, z: 20 },
  { id: 'antenita', x: 26, z: -9 },
  { id: 'brotecito', x: 13, z: 42 },
  { id: 'globin', x: 22, z: 44 },
  { id: 'pochoclin', x: PARK.chispi.x, z: PARK.chispi.z },
  { id: 'rielito', x: STATION.chispi.x, z: STATION.chispi.z },
  { id: 'ventarron', x: CERRO.chispi.x, z: CERRO.chispi.z },
  { id: 'musguito', x: CERRO.caveChispi.x, z: CERRO.caveChispi.z },
  { id: 'gaviotin', x: PORT.chispi.x, z: PORT.chispi.z },
  { id: 'pinita', x: FOREST.chispi.x, z: FOREST.chispi.z },
  { id: 'girasolin', x: FARM.chispi.x, z: FARM.chispi.z },
  { id: 'faroluz', x: FACTORY.chispi.x, z: FACTORY.chispi.z },
  { id: 'turbochispa', x: ALTO.chispi.x, z: ALTO.chispi.z },
  { id: 'olita', x: PLAYA.chispi.x, z: PLAYA.chispi.z },
  { id: 'caracolin', x: ISLA.chispi.x, z: ISLA.chispi.z },
  { id: 'frecuencio', x: NIEVE.chispi.x, z: NIEVE.chispi.z },
];

/** Sobres escondidos por el mundo (x, z, altura). */
const HIDDEN_PACKS: [string, number, number, number][] = [
  ['banco-plaza', -8, -32, 0.9],
  ['callejon', 6, -40, 0.9],
  ['esquina-este', 41, 8, 0.9],
  ['fuente-oeste', -40, 8, 0.9],
  ['canal-sur', 28, 44, 0.9],
  ['jardin-oeste', -34, 50, 0.9],
  ['skate-cajon', 75, 2, 1.55],
  ['sala-skate', 398, 1.5, 0.9],
  ['parque-algodon', 26, -91, 0.9],
];
const TRICK_NAMES: Record<Trick, string> = { ollie: 'Ollie', air: '¡Vuelo!', grind: 'Grind' };

/**
 * El mundo jugable: el barrio, el Nexus, las 4 zonas con sus reglas de conexión,
 * los fragmentos y el HUD. Es el equivalente 3D de WorldScene, con la misma lógica.
 */
export class WorldMode {
  readonly world = new World();
  readonly nexus = new Nexus3D();
  readonly progress = new Progress3D();
  private readonly audio = new AudioSystem();
  private readonly input: Input;
  private readonly cb: WorldCallbacks;
  private readonly connections: Connections;
  private readonly isoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -80, 200);
  private readonly chaseCam = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  private iso: boolean;
  private readonly focus = START.clone();
  private camYaw = Math.PI;
  private readonly raycaster = new THREE.Raycaster();
  private readonly fragments: Fragment[] = [];
  private nearest: Connectable | null = null;
  private nearestResident: Resident3D | null = null;
  private readonly residents: Resident3D[] = [];
  private storyTimer = 0;
  private eventTimer = 0;
  private districtId = 'centro';
  private districtCheck = 0;
  /** Conexiones grandes en orden (para las pistas): origen, destino y cómo se llaman. */
  private bigSteps: { s: Connectable; t: Connectable; sName: string; tName: string; door?: { x: number; z: number }; when?: () => boolean }[] = [];
  private hintArrow: THREE.Mesh | null = null;
  private hintRing: THREE.Mesh | null = null;
  private hintTimer = 0;
  private hintTarget = new THREE.Vector3();
  /** Habitación en la que está el Nexus (null = afuera). */
  private inside: Interior | null = null;
  private interiors: Interior[] = [];
  /* Fase 1: Skatepark, patineta y Mundo Voltio */
  private readonly skate = new Skate();
  private readonly ramp: SkateRamp;
  /* Fase 2: lo que se revive adentro de cada casa */
  private readonly fuse: FuseBox;
  private readonly iceMachine: IceCreamMachine;
  private readonly cardDisplay: CardDisplay;
  private closedWarned = 0;
  /** Chispi compañero (Fase 4) y sus ayuditas. */
  private companion: Companion | null = null;
  private boostT = 0;
  private scoutT = 4;
  private readonly heardPacks = new Set<string>();
  /** Sobres que están en el mundo, esperando que el Nexus pase por encima. */
  private readonly packs: { id: string; g: THREE.Group; x: number; z: number; y: number }[] = [];
  private readonly voltio: Voltio;
  private boardPickup: THREE.Group | null = null;
  private nearBoard = false;
  private boardToggle: 'on' | 'off' | null = null;
  private isoOutside = true;
  private doorway: { kind: 'enter' | 'exit'; room: Interior } | null = null;
  private introShown = false;
  private time = 0;
  private busy = false;

  private readonly lamp: StreetLamp;
  private readonly door: Door;
  private readonly fountain: Fountain;
  private readonly beacon: Beacon;
  private readonly bridge: BridgeLever;
  private readonly sprinkler: Sprinkler;
  private readonly flowerBed: FlowerBed;
  /* Fase 5: taller de Pipa y faroles de Lucio */
  private readonly motor: Motor;
  private readonly duck: ToyDuck;
  private readonly bell: ToyBell;
  private readonly parade: ToyParade;
  private readonly lanterns: { first: LanternPost; middle: LanternPost; last: LanternPost; sideA: LanternPost; sideB: LanternPost };
  private readonly stage: Stage;
  private readonly confetti: ConfettiCannon;
  /* Fase 6: Parque de diversiones */
  private readonly carousel: Carousel;
  private readonly wheel: FerrisWheel;
  private readonly coaster: Coaster;
  private readonly mirrorBall: MirrorBall;
  /** Juego en el que está subido el Nexus. */
  private readonly train: Train;
  private readonly cascade: Cascade;
  private readonly boat: CanalBoat;
  private readonly forestLever: RopeBridgeLever;
  private readonly campfire: Campfire;
  private readonly mills: Windmill[] = [];
  private readonly greenhouse: GreenhouseSprinkler;
  private readonly incubator: Incubator;
  private readonly tractor: Tractor;
  private readonly belts: FactoryPart[] = [];
  private readonly boiler: FactoryPart;
  private readonly gear: FactoryPart;
  private readonly machine: FactoryPart;
  private liftT = 0;
  private readonly stalls: MarketStall[] = [];
  private readonly projector: Projector;
  private readonly libLamp: ReadingLamp;
  private filmT = 0;
  private readonly fridge: BeachFridge;
  private readonly castle: SandCastle;
  private readonly farito: SmallLighthouse;
  private readonly lancha: SeaBoat;
  private readonly runes: RuneStone[] = [];
  private readonly altar: TempleAltar;
  private readonly heart: VolcanoHeart;
  private readonly chairlift: Chairlift;
  private readonly telescope: Telescope;
  private readonly lighthouse: Lighthouse;
  private readonly granChispa = new GranChispa();
  /** Expansión (Fase 10): notas de la canción, carreras de aros, libreta y Piezas de la Gran Chispa. */
  private notes!: Notes;
  private races!: Races;
  private pedestals!: PiecePedestals;
  private raceSpot: Race | null = null;
  private lastRace: Race | null = null;
  private questTimer = 0;
  private questsPrimed = false;
  private readonly song: CitySong;
  /** Paradas del tren construidas (Fase 7). */
  private readonly stops: { id: string; name: string; x: number; z: number }[] = [];
  private stopSpot: { id: string; name: string; x: number; z: number } | null = null;
  /** Algo de la casa del Nexus para arreglar (o usar) al lado. */
  private homeSpot: HomeItemInfo | null = null;
  private rideOn: (Ride & Connectable) | null = null;
  private rideSpot: (Ride & Connectable) | null = null;
  private readonly labels: { obj: Connectable; el: HTMLElement; alpha: number }[] = [];
  private readonly fragmentById = new Map<string, Fragment>();
  /** Chisperos y cosas dormidas repartidos por el barrio (despertarlas es opcional). */
  private readonly sparks: Spark[] = [];
  readonly sleepers: Sleeper[] = [];
  readonly playground: Playground;
  readonly pickups: SparkPickups;
  /** Velocidad vertical del Nexus (saltos y caídas). */
  private vy = 0;
  grounded = true;
  /** Tirolesa en curso: del poste `a` al `b`. */
  zip: { a: THREE.Vector3; b: THREE.Vector3; t: number; dur: number; climb: number; from: THREE.Vector3 } | null = null;
  private nearestPole: { pole: THREE.Vector3; line: THREE.Vector3[]; i: number } | null = null;
  /** Para las pruebas: hay una carrera de luz pedida y todavía no terminó. */
  tunnelPending = false;
  private fullWarned = 0;

  private readonly el = {
    msg: document.getElementById('msg'),
    stars: document.getElementById('stars'),
    awake: document.getElementById('awake'),
    charge: document.getElementById('charge'),
    toast: document.getElementById('toast'),
    interact: document.getElementById('interact') as HTMLButtonElement | null,
    story: document.getElementById('story'),
    storyWho: document.getElementById('storyWho'),
    storyText: document.getElementById('storyText'),
  };
  private toastTimer = 0;

  constructor(input: Input, callbacks: WorldCallbacks) {
    this.input = input;
    this.cb = callbacks;
    this.iso = localStorage.getItem(VIEW_KEY) !== 'chase';
    const scene = this.world.scene;

    this.nexus.position.copy(START);
    this.nexus.heading = Math.PI * 1.15; // mirando hacia la fuente de la plaza
    scene.add(this.nexus.root);
    this.prepareSilhouette();

    this.connections = new Connections(scene, this.audio, {
      feedback: (m, k) => this.toast(m, k),
      invalid: (s, t) => this.onSurprise(s, t),
      made: (s, t) => {
        this.progress.saveConnection(s.id, t.id);
        if (t instanceof Sleeper) this.onWake(t, true);
        else this.applyConnection(t, true);
      },
      tunnel: (s, t) => {
        this.tunnelPending = true;
        this.cb.tunnel(s, t);
      },
    });

    // Zona 1: la plaza (fuente → farola → puerta)
    const source = new EnergySource('energy-source', -24, -15);
    this.lamp = new StreetLamp('lamp', -13, -18);
    this.door = new Door('door', -15.5, -26.95);
    // Zona 2: la fuente de agua
    const fountainSource = new EnergySource('fountain-source', -28.5, 9.5);
    this.fountain = new Fountain('fountain', -20, 16);
    this.fountain.facePlug(-28.5, 9.5);
    // Zona 3: la antena (dos fuentes reales + un señuelo gris, Decisión 018)
    const beaconA = new EnergySource('beacon-source-a', 15, -23);
    const beaconB = new EnergySource('beacon-source-b', 15, -13);
    const decoy = new EnergySource('beacon-source-fake', 21, -18, 'dim');
    this.beacon = new Beacon('beacon', 27, -18);
    // Zona 4: el puente sobre el canal
    const bridgeSource = new EnergySource('bridge-source', 10.5, 23.5);
    this.bridge = new BridgeLever('bridge', 15.6, 27.9, 18, 29.3, 36.7);
    scene.add(this.bridge.deck);
    // Zona 5: el jardín municipal, al otro lado del canal (fuente → aspersor → flores)
    const gardenSource = new EnergySource('garden-source', 1.6, 50.6);
    this.sprinkler = new Sprinkler('garden-sprinkler', -5.6, 54.2);
    this.flowerBed = new FlowerBed('garden-bed', -13, 54);
    this.flowerBed.facePlug(-5.6, 54.2);
    this.world.rects.push({ minX: -16.7, maxX: -9.3, minZ: 52.3, maxZ: 55.7 });
    // Skatepark (Fase 1): la rampa grande revive con cable desde su fuente
    const sk = this.world.skate;
    const skateSource = new EnergySource('skate-source', sk.source.x, sk.source.z);
    this.ramp = new SkateRamp('skate-ramp', sk.ramp.x, sk.ramp.z);
    // Interiores (Fase 2): cada habitación tiene su energía y algo para revivir con su carrera de luz
    const casa = this.world.interior;
    const hel = this.world.heladeria;
    const tie = this.world.tienda;
    const casaSource = new EnergySource('casa-source', casa.source.x, casa.source.z);
    this.fuse = new FuseBox('casa-tablero', casa.target.x, casa.target.z);
    const heladosSource = new EnergySource('helados-source', hel.source.x, hel.source.z);
    this.iceMachine = new IceCreamMachine('helados-maquina', hel.target.x, hel.target.z);
    const cartasSource = new EnergySource('cartas-source', tie.source.x, tie.source.z);
    this.cardDisplay = new CardDisplay('cartas-vitrina', tie.target.x, tie.target.z);
    // Fase 5: taller de Pipa (adentro) y la calle de los faroles de Lucio con la fiesta
    const tal = this.world.taller;
    const tallerSource = new EnergySource('toy-source', tal.source.x, tal.source.z);
    this.motor = new Motor('toy-motor', tal.motor.x, tal.motor.z);
    this.duck = new ToyDuck('toy-duck', tal.duck.x, tal.duck.z);
    this.bell = new ToyBell('toy-bell', tal.bell.x, tal.bell.z);
    this.parade = new ToyParade('toy-parade', tal.parade.x, tal.parade.z);
    const F = FESTIVAL;
    const lanternSource = new EnergySource('lantern-source', F.lanternSource.x, F.lanternSource.z);
    this.lanterns = {
      first: new LanternPost('lantern-first', F.first.x, F.first.z, 'Farol del inicio', '#ffe066'),
      middle: new LanternPost('lantern-middle', F.direct.x, F.direct.z, 'Farol apurado', '#5ee7ff'),
      last: new LanternPost('lantern-last', F.exit.x, F.exit.z, 'Farol de salida', '#ff9ff3'),
      sideA: new LanternPost('lantern-side-a', F.curious.x, F.curious.z, 'Farol curioso', '#9be37a'),
      sideB: new LanternPost('lantern-side-b', F.shy.x, F.shy.z, 'Farol tímido', '#ffb86c', true),
    };
    this.stage = new Stage('party-stage', F.stage.x, F.stage.z);
    this.confetti = new ConfettiCannon('party-confetti', F.confetti.x, F.confetti.z, scene);
    this.world.rects.push(this.stage.deckRect);
    // Fase 6: Parque de diversiones
    const P = PARK;
    const carouselSource = new EnergySource('park-carousel-source', P.carouselSource.x, P.carouselSource.z);
    this.carousel = new Carousel('park-carousel', P.carousel.x, P.carousel.z);
    this.world.circles.push({ x: P.carousel.x, z: P.carousel.z, r: 4.7 });
    const wheelSource = new EnergySource('park-wheel-source', P.wheelSource.x, P.wheelSource.z);
    this.wheel = new FerrisWheel('park-wheel', P.wheel.x, P.wheel.z);
    this.world.rects.push({ minX: P.wheel.x - 3.2, maxX: P.wheel.x + 3.2, minZ: P.wheel.z - 1.6, maxZ: P.wheel.z + 1.6 });
    const coasterSource = new EnergySource('park-coaster-source', P.coasterSource.x, P.coasterSource.z);
    this.coaster = new Coaster('park-coaster', P.coasterStation, P.coasterTrack);
    const esp = this.world.espejos;
    const espejosSource = new EnergySource('espejos-source', esp.source.x, esp.source.z);
    this.mirrorBall = new MirrorBall('espejos-bola', esp.target.x, esp.target.z);
    this.wheel.unlocked = this.progress.hasFlag('wheel-open');
    this.coaster.unlocked = this.progress.hasFlag('coaster-open');
    // Fase 7: Estación y tren
    const stationSource = new EnergySource('station-source', STATION.source.x, STATION.source.z);
    this.train = new Train('station-train', STATION.train.x, STATION.train.z);
    this.train.unlocked = this.progress.hasFlag('train-open');
    this.world.rects.push({ minX: STATION.train.x - 10.6, maxX: STATION.train.x + 3.3, minZ: STATION.train.z - 1.1, maxZ: STATION.train.z + 1.1 });
    this.buildStops();
    // Fase 8: Cerro y cascada
    const cascadeSource = new EnergySource('cerro-cascade-source', CERRO.cascadeSource.x, CERRO.cascadeSource.z);
    this.cascade = new Cascade('cerro-cascade', CERRO.cascade.x, CERRO.cascade.z);
    // Fase 9: Puerto, bote y faro
    const boatSource = new EnergySource('boat-source', BOAT.source.x, BOAT.source.z);
    this.boat = new CanalBoat('canal-boat', BOAT.route[0][0], BOAT.route[0][1], BOAT.dock, BOAT.route);
    const portSource = new EnergySource('port-source', PORT.source.x, PORT.source.z);
    this.lighthouse = new Lighthouse('port-lighthouse', PORT.lighthouse.x, PORT.lighthouse.z);
    this.lighthouse.unlocked = this.progress.hasFlag('faro-open');
    this.world.circles.push({ x: PORT.lighthouse.x, z: PORT.lighthouse.z, r: 2.4 });
    scene.add(this.granChispa.group);
    this.notes = new Notes(scene, (id) => this.progress.hasFlag(id));
    this.races = new Races(scene);
    this.pedestals = new PiecePedestals(PORT.lighthouse.x, PORT.lighthouse.z, 4.6, PIECES_TOTAL, this.world.circles);
    keepVivid(this.pedestals.group);
    scene.add(this.pedestals.group);
    this.song = new CitySong(this.audio);
    // Fase 11: Bosque de las luciérnagas
    const forestBridgeSource = new EnergySource('forest-bridge-source', FOREST.bridgeSource.x, FOREST.bridgeSource.z);
    this.forestLever = new RopeBridgeLever('forest-bridge', FOREST.bridge.x, FOREST.bridge.z);
    const fireSource = new EnergySource('forest-fire-source', FOREST.fireSource.x, FOREST.fireSource.z);
    this.campfire = new Campfire('forest-fire', FOREST.fire.x, FOREST.fire.z);
    // Fase 12: Granja y molinos
    const millSources = FARM.mills.map((m, i) => new EnergySource(`farm-mill-source-${i}`, m.source.x, m.source.z));
    FARM.mills.forEach((m, i) => this.mills.push(new Windmill(`farm-mill-${i}`, m.x, m.z)));
    this.mills[2].unlocked = this.progress.hasFlag('molino-open');
    const ghSource = new EnergySource('farm-sprinkler-source', FARM.sprinklerSource.x, FARM.sprinklerSource.z);
    this.greenhouse = new GreenhouseSprinkler('farm-sprinkler', FARM.sprinkler.x, FARM.sprinkler.z);
    const barn = this.world.farm.barn;
    const barnSource = new EnergySource('farm-barn-source', barn.source.x, barn.source.z);
    this.incubator = new Incubator('farm-incubator', barn.incubator.x, barn.incubator.z);
    const tractorSource = new EnergySource('farm-tractor-source', FARM.tractorDock.x + 0.5, FARM.tractorDock.z - 4);
    this.tractor = new Tractor('farm-tractor', FARM.tractorDock, FARM.tractorRoute);
    // Fase 14: Fábrica de Chispas
    const beltSource = new EnergySource('factory-belt-source', FACTORY.beltSource.x, FACTORY.beltSource.z);
    FACTORY.belts.forEach((b, i) => this.belts.push(new FactoryPart(`factory-belt-${i}`, 'belt', b.x, b.z + 1.4, i + 1)));
    const hall = this.world.factory.hall;
    const hallSource = new EnergySource('factory-hall-source', hall.source.x, hall.source.z);
    this.boiler = new FactoryPart('factory-boiler', 'boiler', hall.boiler.x, hall.boiler.z);
    this.gear = new FactoryPart('factory-gear', 'gear', hall.gear.x, hall.gear.z);
    this.machine = new FactoryPart('factory-machine', 'machine', hall.machine.x, hall.machine.z);
    if (this.progress.hasFlag('fabrica-open')) this.world.factory.openGate();
    // Fase 15: Barrio Alto y mercado
    const marketSource = new EnergySource('alto-market-source', ALTO.marketSource.x, ALTO.marketSource.z);
    for (const st of ALTO.stalls) this.stalls.push(new MarketStall(`alto-stall-${st.kind}`, st.kind, st.x, st.z));
    const cineHall = this.world.alto.hall;
    const cineSource = new EnergySource('alto-cine-source', cineHall.source.x, cineHall.source.z);
    this.projector = new Projector('alto-projector', cineHall.projector.x, cineHall.projector.z);
    const libSource = new EnergySource('alto-lamp-source', ALTO.libSource.x, ALTO.libSource.z);
    this.libLamp = new ReadingLamp('alto-lamp', ALTO.libLamp.x, ALTO.libLamp.z);
    this.libLamp.unlocked = this.progress.hasFlag('biblio-open');
    if (this.progress.hasFlag('alto-top')) this.addLife(146.5, 11, 15, false);
    // Fase 16: la Playa
    const fridgeSource = new EnergySource('playa-fridge-source', PLAYA.kioscoSource.x, PLAYA.kioscoSource.z);
    this.fridge = new BeachFridge('playa-fridge', PLAYA.fridge.x, PLAYA.fridge.z);
    const castleSource = new EnergySource('playa-castle-source', PLAYA.castleSource.x, PLAYA.castleSource.z);
    this.castle = new SandCastle('playa-castle', PLAYA.castle.x, PLAYA.castle.z);
    const panelSource = new EnergySource('playa-panel', PLAYA.panel.x, PLAYA.panel.z);
    const windSource = new EnergySource('playa-wind', PLAYA.wind.x, PLAYA.wind.z);
    this.farito = new SmallLighthouse('playa-farito', PLAYA.farito.x, PLAYA.farito.z);
    if (this.progress.hasFlag('muelle-open')) this.world.playa.openGate();
    // Fase 17: la Isla misteriosa
    const lanchaSource = new EnergySource('lancha-source', LANCHA.source.x, LANCHA.source.z);
    this.lancha = new SeaBoat('lancha', LANCHA.portDock, LANCHA.islandDock, LANCHA.route);
    if (this.progress.count('lancha-side') === 1) this.lancha.setSide(1);
    const temple = this.world.isla.hall;
    const templeSource = new EnergySource('isla-temple-source', temple.source.x, temple.source.z);
    (['luna', 'sol', 'estrella'] as const).forEach((k, i) => this.runes.push(new RuneStone(`isla-rune-${k}`, k, temple.stones[i].x, temple.stones[i].z)));
    this.altar = new TempleAltar('isla-altar', temple.altar.x, temple.altar.z);
    const heartSource = lift(new EnergySource('isla-heart-source', ISLA.heartSource.x, ISLA.heartSource.z), VOLCANO.h);
    this.heart = new VolcanoHeart('isla-heart', ISLA.heart.x, ISLA.heart.z, VOLCANO.h);
    if (this.progress.hasFlag('templo-open')) this.world.isla.openTemple();
    // Fase 18: Montaña nevada y observatorio
    const liftSource = new EnergySource('telesilla-source', NIEVE.liftSource.x, NIEVE.liftSource.z);
    this.chairlift = new Chairlift('telesilla', NIEVE.liftBase, NIEVE.liftTop, NIEVE.liftRoute);
    if (this.progress.count('telesilla-side') === 1) this.chairlift.setSide(1);
    const obs = this.world.nieve.hall;
    const obsSource = new EnergySource('nieve-obs-source', obs.source.x, obs.source.z);
    this.telescope = new Telescope('nieve-telescope', obs.telescope.x, obs.telescope.z);
    // La casa del Nexus: lo que ya se arregló
    for (const it of HOME_ITEMS) if (this.progress.hasFlag(`casa-${it.id}`)) this.world.home.fix(it.id, false);
    if (this.homeInsideDone) this.world.home.gray.revive(false);
    this.nexus.applyLook(loadLook());
    this.clock = this.progress.count('clock') || 0.1;
    if (this.progress.hasFlag('cave-lit')) {
      this.world.cerro.cave.light();
      this.world.cerro.cave.gray.revive(false);
    }

    const labels: [Connectable, string][] = [
      [source, 'Energía'], [this.lamp, 'Farola'], [this.door, 'Puerta'],
      [fountainSource, 'Energía'], [this.fountain, 'Fuente'],
      [beaconA, 'Energía'], [beaconB, 'Energía'], [decoy, 'Energía'], [this.beacon, 'Antena'],
      [bridgeSource, 'Energía'], [this.bridge, 'Palanca del puente'],
      [gardenSource, 'Energía'], [this.sprinkler, 'Aspersor'], [this.flowerBed, 'Flores'],
      [skateSource, 'Energía'], [this.ramp, 'Rampa'],
      [casaSource, 'Energía'], [heladosSource, 'Energía'], [cartasSource, 'Energía'],
      [this.fuse, 'Tablero de luz'], [this.iceMachine, 'Máquina de helados'], [this.cardDisplay, 'Vitrina de cartas'],
      [tallerSource, 'Energía'], [lanternSource, 'Energía'],
      [carouselSource, 'Energía'], [wheelSource, 'Energía'], [coasterSource, 'Energía'], [espejosSource, 'Energía'],
      [stationSource, 'Energía'],
      [cascadeSource, 'Energía'],
      [boatSource, 'Energía'],
      [portSource, 'Energía'],
      [forestBridgeSource, 'Energía'],
      [fireSource, 'Energía'],
      ...millSources.map((s): [Connectable, string] => [s, 'Energía']),
      [ghSource, 'Energía'],
      [barnSource, 'Energía'],
      [tractorSource, 'Energía'],
      [beltSource, 'Energía'],
      [hallSource, 'Energía'],
      [marketSource, 'Energía'],
      [cineSource, 'Energía'],
      [libSource, 'Energía'],
      [fridgeSource, 'Energía'],
      [castleSource, 'Balde de chispas'],
      [panelSource, 'Panel solar'],
      [windSource, 'Molinito'],
      [lanchaSource, 'Energía'],
      [templeSource, 'Energía'],
      [heartSource, 'Piedra caliente'],
      [liftSource, 'Energía'],
      [obsSource, 'Energía'],
    ];
    for (const [obj, label] of labels) obj.label = label;

    for (const obj of [source, this.lamp, this.door, fountainSource, this.fountain, beaconA, beaconB, decoy, this.beacon, bridgeSource, this.bridge, gardenSource, this.sprinkler, this.flowerBed, skateSource, this.ramp, casaSource, this.fuse, heladosSource, this.iceMachine, cartasSource, this.cardDisplay, tallerSource, this.motor, this.duck, this.bell, this.parade, lanternSource, ...Object.values(this.lanterns), this.stage, this.confetti, carouselSource, this.carousel, wheelSource, this.wheel, coasterSource, this.coaster, espejosSource, this.mirrorBall, stationSource, this.train, cascadeSource, this.cascade, boatSource, this.boat, portSource, this.lighthouse, forestBridgeSource, this.forestLever, fireSource, this.campfire, ...millSources, ...this.mills, ghSource, this.greenhouse, barnSource, this.incubator, tractorSource, this.tractor, beltSource, ...this.belts, hallSource, this.boiler, this.gear, this.machine, marketSource, ...this.stalls, cineSource, this.projector, libSource, this.libLamp, fridgeSource, this.fridge, castleSource, this.castle, panelSource, windSource, this.farito, lanchaSource, this.lancha, templeSource, ...this.runes, this.altar, heartSource, this.heart, liftSource, this.chairlift, obsSource, this.telescope]) {
      // Los objetos conectables no se apagan con el pueblo: se ven como "lo que se puede tocar"
      keepVivid(obj.group);
      scene.add(obj.group);
      this.connections.register(obj);
    }
    this.connections.addRule({ sourceId: source.id, targetId: this.lamp.id, useTunnel: true });
    this.connections.addRule({ sourceId: this.lamp.id, targetId: this.door.id, useTunnel: true });
    this.connections.addRule({ sourceId: fountainSource.id, targetId: this.fountain.id, useTunnel: true });
    this.connections.addRule({ sourceId: beaconA.id, targetId: this.beacon.id, useTunnel: true });
    this.connections.addRule({ sourceId: beaconB.id, targetId: this.beacon.id, useTunnel: true });
    this.connections.addRule({ sourceId: bridgeSource.id, targetId: this.bridge.id, useTunnel: true });
    this.connections.addRule({ sourceId: gardenSource.id, targetId: this.sprinkler.id, useTunnel: true });
    this.connections.addRule({ sourceId: this.sprinkler.id, targetId: this.flowerBed.id, useTunnel: true });
    this.connections.addRule({ sourceId: skateSource.id, targetId: this.ramp.id, useTunnel: true });
    this.connections.addRule({ sourceId: casaSource.id, targetId: this.fuse.id, useTunnel: true });
    this.connections.addRule({ sourceId: heladosSource.id, targetId: this.iceMachine.id, useTunnel: true });
    this.connections.addRule({ sourceId: cartasSource.id, targetId: this.cardDisplay.id, useTunnel: true });
    // Taller: la energía al motor (carrera de luz); del motor, cables cortos al pato y a la campana; los dos al desfile
    this.connections.addRule({ sourceId: tallerSource.id, targetId: this.motor.id, useTunnel: true });
    for (const [a, b] of [
      [this.motor, this.duck],
      [this.motor, this.bell],
      [this.duck, this.parade],
      [this.bell, this.parade],
    ] as [Connectable, Connectable][]) this.connections.addRule({ sourceId: a.id, targetId: b.id });
    // Faroles: la energía al primero (carrera de luz); de ahí, camino directo o camino curioso hasta la salida
    const L = this.lanterns;
    this.connections.addRule({ sourceId: lanternSource.id, targetId: L.first.id, useTunnel: true });
    for (const [a, b] of [
      [L.first, L.middle],
      [L.middle, L.last],
      [L.first, L.sideA],
      [L.sideA, L.sideB],
      [L.sideB, L.last],
    ] as [Connectable, Connectable][]) this.connections.addRule({ sourceId: a.id, targetId: b.id });
    // La fiesta: necesita todos los preparativos (luz, agua, radio, jardín y desfile)
    const blockedMessage = 'Faltan preparativos para la fiesta: luz, agua, radio, jardín y desfile';
    this.connections.addRule({ sourceId: L.last.id, targetId: this.stage.id, useTunnel: true, available: () => this.prepared, blockedMessage });
    this.connections.addRule({ sourceId: this.stage.id, targetId: this.confetti.id, available: () => this.prepared, blockedMessage });
    // Parque: la calesita arranca con cable; la vuelta al mundo y la montaña rusa tienen el motor trabado
    // hasta cerrar su circuito en el Mundo Voltio
    this.connections.addRule({ sourceId: carouselSource.id, targetId: this.carousel.id, useTunnel: true });
    this.connections.addRule({
      sourceId: wheelSource.id,
      targetId: this.wheel.id,
      useTunnel: true,
      available: () => this.wheel.unlocked,
      blockedMessage: 'La vuelta al mundo tiene el motor trabado: mirá sus cables con la capucha ⚡',
    });
    this.connections.addRule({
      sourceId: coasterSource.id,
      targetId: this.coaster.id,
      useTunnel: true,
      available: () => this.coaster.unlocked,
      blockedMessage: 'La montaña rusa tiene el motor trabado: mirá sus cables con la capucha ⚡',
    });
    this.connections.addRule({ sourceId: espejosSource.id, targetId: this.mirrorBall.id, useTunnel: true });
    // Estación: el tren está dormido y con el motor trabado hasta cerrar su circuito en el Mundo Voltio
    this.connections.addRule({
      sourceId: stationSource.id,
      targetId: this.train.id,
      useTunnel: true,
      available: () => this.train.unlocked,
      blockedMessage: 'El tren tiene el motor trabado: mirá sus cables con la capucha ⚡',
    });
    this.connections.addRule({ sourceId: cascadeSource.id, targetId: this.cascade.id, useTunnel: true });
    this.connections.addRule({ sourceId: boatSource.id, targetId: this.boat.id, useTunnel: true });
    this.connections.addRule({ sourceId: forestBridgeSource.id, targetId: this.forestLever.id, useTunnel: true });
    this.connections.addRule({ sourceId: fireSource.id, targetId: this.campfire.id, useTunnel: true });
    this.mills.forEach((m, i) =>
      this.connections.addRule({
        sourceId: millSources[i].id,
        targetId: m.id,
        useTunnel: true,
        available: () => m.unlocked,
        blockedMessage: 'Este molino tiene el motor trabado: mirá sus cables con la capucha ⚡',
      }),
    );
    this.connections.addRule({ sourceId: ghSource.id, targetId: this.greenhouse.id, useTunnel: true });
    this.connections.addRule({ sourceId: barnSource.id, targetId: this.incubator.id, useTunnel: true });
    this.connections.addRule({ sourceId: tractorSource.id, targetId: this.tractor.id, useTunnel: true });
    // Fábrica: todo en orden (cada pieza solo pasa la energía si ya está prendida)
    this.connections.addRule({ sourceId: beltSource.id, targetId: this.belts[0].id, useTunnel: true });
    this.connections.addRule({ sourceId: this.belts[0].id, targetId: this.belts[1].id });
    this.connections.addRule({ sourceId: this.belts[1].id, targetId: this.belts[2].id });
    this.connections.addRule({ sourceId: hallSource.id, targetId: this.boiler.id, useTunnel: true });
    this.connections.addRule({ sourceId: this.boiler.id, targetId: this.gear.id });
    this.connections.addRule({ sourceId: this.gear.id, targetId: this.machine.id });
    // Mercado: la energía llega a un puesto y cada puesto prendido le pasa la luz a otro (en cualquier orden)
    for (const a of this.stalls) {
      this.connections.addRule({ sourceId: marketSource.id, targetId: a.id, useTunnel: true });
      for (const b of this.stalls) if (a !== b) this.connections.addRule({ sourceId: a.id, targetId: b.id });
    }
    this.connections.addRule({ sourceId: cineSource.id, targetId: this.projector.id, useTunnel: true });
    this.connections.addRule({
      sourceId: libSource.id,
      targetId: this.libLamp.id,
      useTunnel: true,
      available: () => this.libLamp.unlocked,
      blockedMessage: 'El farol de lectura tiene el mecanismo trabado: mirá sus cables con la capucha ⚡',
    });
    // Playa: la heladera, el castillo y el faro chiquito (que necesita dos cables a la vez)
    this.connections.addRule({ sourceId: fridgeSource.id, targetId: this.fridge.id, useTunnel: true });
    this.connections.addRule({ sourceId: castleSource.id, targetId: this.castle.id, useTunnel: true });
    this.connections.addRule({ sourceId: panelSource.id, targetId: this.farito.id, useTunnel: true });
    this.connections.addRule({ sourceId: windSource.id, targetId: this.farito.id, useTunnel: true });
    // Isla: la lancha sale al mar solo con el faro chiquito prendido
    this.connections.addRule({
      sourceId: lanchaSource.id,
      targetId: this.lancha.id,
      useTunnel: true,
      available: () => this.farito.isActive,
      blockedMessage: 'Marina no sale al mar sin el faro chiquito de la Playa prendido',
    });
    // Templo: luna → sol → estrella → altar (el orden del mural); los otros órdenes avisan
    const [luna, sol, estrella] = this.runes;
    const muralMsg = 'El mural muestra otro orden: primero la luna, después el sol y al final la estrella';
    this.connections.addRule({ sourceId: templeSource.id, targetId: luna.id, useTunnel: true });
    this.connections.addRule({ sourceId: luna.id, targetId: sol.id });
    this.connections.addRule({ sourceId: sol.id, targetId: estrella.id });
    this.connections.addRule({ sourceId: estrella.id, targetId: this.altar.id });
    for (const [s, t] of [
      [templeSource, sol],
      [templeSource, estrella],
      [templeSource, this.altar],
      [luna, estrella],
      [luna, this.altar],
      [sol, this.altar],
    ] as [Connectable, Connectable][]) {
      this.connections.addRule({ sourceId: s.id, targetId: t.id, available: () => false, blockedMessage: muralMsg });
    }
    this.connections.addRule({ sourceId: heartSource.id, targetId: this.heart.id, useTunnel: true });
    // Montaña: la telesilla y el telescopio
    this.connections.addRule({ sourceId: liftSource.id, targetId: this.chairlift.id, useTunnel: true });
    this.connections.addRule({ sourceId: obsSource.id, targetId: this.telescope.id, useTunnel: true });
    // El faro: motor trabado (circuito Voltio) y solo prende con toda la ciudad viva
    this.connections.addRule({
      sourceId: portSource.id,
      targetId: this.lighthouse.id,
      useTunnel: true,
      available: () => this.lighthouse.unlocked && this.finalMissing.length === 0,
      blockedMessage: () =>
        !this.lighthouse.unlocked ? 'El faro tiene el motor trabado: mirá sus cables con la capucha ⚡' : `Para traer la Gran Chispa falta: ${this.finalMissing.join(', ')}`,
    });
    this.bigSteps = [
      { s: source, t: this.lamp, sName: 'la energía de la plaza', tName: 'la farola' },
      { s: this.lamp, t: this.door, sName: 'la farola', tName: 'la puerta de la casa' },
      { s: fountainSource, t: this.fountain, sName: 'la energía junto a la fuente', tName: 'la fuente de agua' },
      { s: beaconA, t: this.beacon, sName: 'una energía de la antena', tName: 'la antena' },
      { s: beaconB, t: this.beacon, sName: 'la otra energía de la antena', tName: 'la antena' },
      { s: bridgeSource, t: this.bridge, sName: 'la energía junto al canal', tName: 'la palanca del puente' },
      { s: gardenSource, t: this.sprinkler, sName: 'la energía del jardín', tName: 'el aspersor' },
      { s: this.sprinkler, t: this.flowerBed, sName: 'el aspersor', tName: 'las flores' },
      { s: skateSource, t: this.ramp, sName: 'la energía del skatepark', tName: 'la rampa grande' },
      { s: tallerSource, t: this.motor, sName: 'la energía del taller de Pipa', tName: 'el motor', door: { x: F.workshop.doorX, z: F.workshop.z + F.workshop.d / 2 + 1 } },
      { s: lanternSource, t: this.lanterns.first, sName: 'la energía de la calle de los faroles', tName: 'el primer farol' },
      { s: this.lanterns.first, t: this.lanterns.middle, sName: 'el primer farol', tName: 'el farol apurado (o el curioso)' },
      { s: this.lanterns.middle, t: this.lanterns.last, sName: 'el farol apurado', tName: 'el farol de salida' },
      { s: this.lanterns.last, t: this.stage, sName: 'el farol de salida', tName: 'el escenario de la fiesta', when: () => this.prepared },
      { s: this.stage, t: this.confetti, sName: 'el escenario', tName: 'el cañón de confeti', when: () => this.prepared },
      { s: carouselSource, t: this.carousel, sName: 'la energía del parque', tName: 'la calesita' },
      { s: wheelSource, t: this.wheel, sName: 'la energía de la vuelta al mundo', tName: 'la vuelta al mundo', when: () => this.wheel.unlocked },
      { s: coasterSource, t: this.coaster, sName: 'la energía de la montaña rusa', tName: 'la montaña rusa', when: () => this.coaster.unlocked },
      { s: stationSource, t: this.train, sName: 'la energía de la estación', tName: 'el tren', when: () => this.train.unlocked },
      { s: cascadeSource, t: this.cascade, sName: 'la energía del cerro', tName: 'la cascada congelada' },
      { s: boatSource, t: this.boat, sName: 'la energía del embarcadero', tName: 'el bote de Marina' },
      { s: forestBridgeSource, t: this.forestLever, sName: 'la energía junto al arroyo', tName: 'la palanca del puente colgante' },
      { s: fireSource, t: this.campfire, sName: 'la energía del claro', tName: 'el fogón' },
      ...this.mills.map((m, i) => ({ s: millSources[i] as Connectable, t: m as Connectable, sName: 'la energía del molino', tName: 'el molino', when: () => m.unlocked })),
      { s: ghSource, t: this.greenhouse, sName: 'la energía del invernadero', tName: 'el regador' },
      { s: tractorSource, t: this.tractor, sName: 'la energía del galpón', tName: 'el tractor' },
      { s: beltSource, t: this.belts[0], sName: 'la energía de las cintas', tName: 'la cinta 1' },
      { s: this.belts[0], t: this.belts[1], sName: 'la cinta 1', tName: 'la cinta 2' },
      { s: this.belts[1], t: this.belts[2], sName: 'la cinta 2', tName: 'la cinta 3' },
      { s: portSource, t: this.lighthouse, sName: 'la energía del puerto', tName: 'el faro', when: () => this.lighthouse.unlocked && this.finalMissing.length === 0 },
    ];

    // Fragmentos: uno por zona + el secreto detrás de la casa (Decisión 019), que ya está visible
    for (const [id, x, y, z] of [
      [PLAZA_ID, -15.5, 1.0, -24.2],
      [FOUNTAIN_ID, -20, 1.0, 20.4],
      [BEACON_ID, 30.5, 1.0, -15.2],
      [BRIDGE_ID, 18, 1.0, 40.5],
      [GARDEN_ID, -13, 1.0, 58.2],
      [SECRET_FRAGMENT.id, -18, 1.0, -39.6],
      [WORKSHOP_ID, this.world.taller.fragment.x, 1.0, this.world.taller.fragment.z],
      [LANTERN_ID, FESTIVAL.lanternFragment.x, 1.0, FESTIVAL.lanternFragment.z],
    ] as const) {
      const f = new Fragment(id, x, y, z);
      keepVivid(f.group);
      scene.add(f.group);
      this.fragments.push(f);
      this.fragmentById.set(id, f);
    }

    this.pickups = new SparkPickups(scene, this.world);
    this.buildSleepers();
    this.playground = new Playground(scene, this.world, this.audio);
    this.voltio = this.makeVoltio();
    this.setupSkatepark();
    this.setupPacks();
    CardDisplay.onPoke = () => this.cb.album?.();
    this.playground.onSplash = () => {
      if (!this.helps('agua')) return;
      this.boostT = 1.6;
      this.companion?.cheer();
    };
    if (this.progress.companion) this.setCompanion(this.progress.companion, false);

    LIFE.reset();
    this.restoreProgress({ source, fountainSource, beaconA, beaconB, bridgeSource, gardenSource });
    this.makeLabels();
    this.placeResidents();
    this.setupInteriors();
    this.setView(this.iso);
    this.el.story?.addEventListener('click', () => this.hideStory());

    this.el.interact?.addEventListener('click', () => this.input.queueInteract());
    this.el.msg?.addEventListener('click', () => this.showHint());
    document.getElementById('jumpBtn')?.addEventListener('click', () => this.input.queueJump());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && document.body.classList.contains('mode-world') && !document.body.classList.contains('paused')) this.showHint();
    });
    const canvas = document.getElementById('game');
    canvas?.addEventListener('pointerdown', (e) => this.onTap(e));
  }

  /* ---------- Progreso guardado ---------- */

  private restoreProgress(srcs: Record<'source' | 'fountainSource' | 'beaconA' | 'beaconB' | 'bridgeSource' | 'gardenSource', Connectable>): void {
    const p = this.progress;
    // Partidas anteriores a guardar conexiones: si hay fragmento pero no conexiones, se deducen
    const legacy: [string, Connectable, Connectable][] = [
      [PLAZA_ID, srcs.source, this.lamp],
      [PLAZA_ID, this.lamp, this.door],
      [FOUNTAIN_ID, srcs.fountainSource, this.fountain],
      [BEACON_ID, srcs.beaconA, this.beacon],
      [BEACON_ID, srcs.beaconB, this.beacon],
      [BRIDGE_ID, srcs.bridgeSource, this.bridge],
      [GARDEN_ID, srcs.gardenSource, this.sprinkler],
      [GARDEN_ID, this.sprinkler, this.flowerBed],
    ];
    for (const [fragment, s, t] of legacy) if (p.hasFragment(fragment)) p.saveConnection(s.id, t.id);

    // Rehacer cada conexión guardada, sin animación (también los trabajos a medias)
    const byId = (id: string) => this.connections.all.find((o) => o.id === id);
    for (const c of p.getConnections()) {
      const s = byId(c.sourceId);
      const t = byId(c.targetId);
      // Cosas chicas despertadas con la mochila (o con los chisperos de antes)
      if (t instanceof Sleeper) {
        if (!t.isActive) {
          t.restore();
          this.onWake(t, false);
        }
        continue;
      }
      if (!s || !t) continue;
      s.activate();
      if (t === this.beacon || t === this.parade) t.activate();
      else t.restore();
      this.connections.restore(s, t);
      this.applyConnection(t, false);
    }

    for (const f of this.fragments) if (p.hasFragment(f.id)) f.collect();
    if (!p.hasFragment(SECRET_FRAGMENT.id)) this.fragmentById.get(SECRET_FRAGMENT.id)!.reveal(false);
    this.updateHud();
    this.showObjective();
  }

  private statusMessage(): string {
    const st = this.skateStep();
    if (st) return st.text;
    const done = this.zonesDone();
    if (done === ZONE_COUNT) {
      const q = this.nextQuest();
      return q ? `📒 ${q.title}: ${q.text}` : 'Ya le devolviste la vida a todo el barrio';
    }
    if (done === 0) return 'El barrio está triste y sin color. Conecta la fuente con la farola';
    return `Le devolviste la vida a ${done} de ${ZONE_COUNT} lugares — sigue explorando`;
  }

  /** Zonas resueltas (no hace falta haber juntado el fragmento). */
  private zonesDone(): number {
    return [this.door.isActive, this.fountain.isActive, this.beacon.isFullyActive, this.bridge.isActive, this.flowerBed.isActive, this.parade.isActive, this.lanterns.last.isActive].filter(Boolean).length;
  }

  /* ---------- Vida del barrio ---------- */

  /** Círculos de color que crecen en el mundo (ver LIFE en core/render.ts). */
  private readonly lifeSpots: { x: number; z: number; current: number; target: number }[] = [];

  private addLife(x: number, z: number, radius: number, animate: boolean): void {
    // Si ya cae dentro de una mancha de color, no hace falta otra
    if (this.lifeSpots.some((s) => Math.hypot(s.x - x, s.z - z) + radius <= s.target + 0.05)) return;
    // Sin lugar (el shader tiene LIFE_SPOTS): se juntan en una las dos manchas que menos agrandan al unirse
    if (this.lifeSpots.length >= LIFE_SPOTS) this.mergeLifeSpots();
    this.lifeSpots.push({ x, z, current: animate ? 0.5 : radius, target: radius });
  }

  /** Une las dos manchas de vida más «baratas» de juntar en un círculo que las envuelve. */
  private mergeLifeSpots(): void {
    const L = this.lifeSpots;
    let bi = 0;
    let bj = 1;
    let best = Infinity;
    let merged = { x: 0, z: 0, r: 0 };
    for (let i = 0; i < L.length; i += 1) {
      for (let j = i + 1; j < L.length; j += 1) {
        const a = L[i];
        const b = L[j];
        const d = Math.hypot(b.x - a.x, b.z - a.z);
        let c: { x: number; z: number; r: number };
        if (d + b.target <= a.target) c = { x: a.x, z: a.z, r: a.target };
        else if (d + a.target <= b.target) c = { x: b.x, z: b.z, r: b.target };
        else {
          const r = (d + a.target + b.target) / 2;
          const k = (r - a.target) / d;
          c = { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, r };
        }
        const cost = c.r * c.r - a.target * a.target - b.target * b.target;
        if (cost < best) {
          best = cost;
          bi = i;
          bj = j;
          merged = c;
        }
      }
    }
    const done = L[bi].current >= L[bi].target - 0.05 && L[bj].current >= L[bj].target - 0.05;
    L[bi] = { x: merged.x, z: merged.z, current: done ? merged.r : Math.max(L[bi].current, L[bj].current), target: merged.r };
    L.splice(bj, 1);
  }

  private updateLife(dt: number): void {
    this.lifeSpots.forEach((spot, i) => {
      // La ola de color avanza rápido al principio y se frena al llegar
      spot.current += (spot.target - spot.current) * Math.min(1, dt * 1.6);
      LIFE.spots[i].set(spot.x, spot.z, spot.current, 0);
    });
    for (let i = this.lifeSpots.length; i < LIFE_SPOTS; i += 1) LIFE.spots[i].set(0, 0, 0, 0);
    this.world.mood = this.zonesDone() / ZONE_COUNT;
  }

  /** Vida (0..1) en un punto del barrio (también lo usan las pruebas). */
  lifeAt(x: number, z: number): number {
    return LIFE.at(x, z);
  }

  /** Cuando las cuatro zonas tienen vida, el color vuelve a todo el pueblo. */
  private reviveWholeTown(animate: boolean): void {
    if (!animate) {
      LIFE.global = 1;
      return;
    }
    const from = LIFE.global;
    tween(3.0, (k) => (LIFE.global = from + (1 - from) * k), { delay: 0.6 });
  }

  /* ---------- Reacciones del mundo ---------- */

  /**
   * Lo que cambia en el barrio con cada conexión. `animate` = en vivo (mensajes, olas de color);
   * sin animar = restaurando una partida guardada.
   */
  private applyConnection(target: Connectable, animate: boolean): void {
    const reveal = (id: string) => {
      if (!this.progress.hasFragment(id)) this.fragmentById.get(id)!.reveal(animate);
    };
    const say = (m: string) => {
      if (animate) this.setMessage(m);
    };
    const zoneLife = (x: number, z: number, r: number) => {
      this.addLife(x, z, r, animate);
      // Al revivir un lugar grande estallan chispitas de la Gran Chispa
      if (animate) after(0.6, () => this.pickups.burst(4, target.x, target.z, 1.6));
      if (this.zonesDone() === ZONE_COUNT) this.reviveWholeTown(animate);
    };
    if (animate) after(0.8, () => this.updateResidentMoods());
    // Cada conexión devuelve un poco de color alrededor de lo que se encendió
    this.addLife(target.x, target.z, target === this.fountain ? 6 : 4.5, animate);

    // Fase 3: cada lugar que revive deja un sobre de cartas
    const packFor: [Connectable, string, boolean][] = [
      [this.door, 'plaza', true],
      [this.fountain, 'fuente', true],
      [this.beacon, 'antena', this.beacon.isFullyActive],
      [this.bridge, 'puente', true],
      [this.flowerBed, 'jardin', true],
      [this.ramp, 'skatepark', true],
      [this.fuse, 'casa-miga', true],
      [this.iceMachine, 'heladeria', true],
      [this.cardDisplay, 'tienda', true],
      [this.parade, 'taller', this.parade.isActive],
      [this.lanterns.last, 'faroles', true],
      [this.carousel, 'calesita', true],
      [this.wheel, 'vuelta', true],
      [this.coaster, 'montana', true],
      [this.mirrorBall, 'espejos', true],
      [this.train, 'estacion', true],
      [this.cascade, 'cascada', true],
      [this.boat, 'bote', true],
      [this.campfire, 'fogon', true],
      [this.incubator, 'granero', true],
      [this.machine, 'fabrica', true],
      [this.projector, 'cine', true],
      [this.libLamp, 'biblioteca', true],
      [this.castle, 'castillo', true],
      [this.farito, 'farito', this.farito.isActive],
      [this.altar, 'templo', true],
      [this.heart, 'volcan', true],
      [this.telescope, 'observatorio', true],
    ];
    for (const [obj, id, ok] of packFor) {
      if (target !== obj || !ok) continue;
      // El del taller cae afuera, junto al portón; los demás al costado (no justo delante de las puertas)
      if (obj === this.parade) this.dropPack(`lugar-${id}`, FESTIVAL.workshop.x - 1.5, FESTIVAL.workshop.z + FESTIVAL.workshop.d / 2 + 3, animate);
      else this.dropPack(`lugar-${id}`, target.x + 2.6, target.z + 2.4, animate);
    }
    if (target === this.lamp) {
      this.lightWindow();
      say('¡La farola se encendió! Ahora llévale energía a la puerta');
    }
    if (target === this.door) {
      reveal(PLAZA_ID);
      this.transformPlaza(animate);
      zoneLife(-18, -22, 19);
      say('¡La plaza volvió a la vida! Acércate al fragmento');
    }
    if (target === this.fountain) {
      reveal(FOUNTAIN_ID);
      zoneLife(-20, 15, 17);
      say('¡La fuente volvió a fluir y el color con ella! Acércate al fragmento');
    }
    if (target === this.beacon) {
      if (this.beacon.isFullyActive) {
        reveal(BEACON_ID);
        zoneLife(22, -18, 17);
        say('¡La antena transmite! Acércate al fragmento');
      } else {
        say('La antena necesita otra conexión más');
      }
    }
    if (target === this.sprinkler) {
      say('¡El aspersor despertó! Ahora el agua tiene que llegar a las flores');
    }
    if (target === this.flowerBed) {
      reveal(GARDEN_ID);
      zoneLife(-11, 54, 16);
      say('¡El jardín volvió a florecer! Acércate al fragmento');
    }
    // Fase 2: al revivir algo adentro, la habitación recupera el color y afuera se nota
    const room = target === this.fuse ? this.world.interior : target === this.iceMachine ? this.world.heladeria : target === this.cardDisplay ? this.world.tienda : null;
    if (room) {
      room.gray.revive(animate);
      const o = this.world.outside;
      if (target === this.fuse) o.miga.visible = true;
      const pane = target === this.iceMachine ? o.helados : target === this.cardDisplay ? o.cartas : null;
      if (pane) (pane.material as THREE.MeshBasicMaterial).opacity = 0.75;
      if (animate) after(0.5, () => this.pickups.burst(3, target.x + 1, target.z + 2, 1.4));
      say(
        target === this.fuse
          ? '¡Volvió la luz a la casa de Miga! Desde la plaza se ven las guirnaldas'
          : target === this.iceMachine
            ? '¡La heladería volvió a la vida! Su vidriera brilla desde la calle'
            : '¡La tienda de cartas se encendió! Su vidriera brilla desde la calle',
      );
    }
    // Fase 5: taller de Pipa
    if (target === this.motor) say('¡El motor arrancó! Ahora un cable al pato y otro a la campana');
    if (target === this.duck) say('¡El pato supervisor despertó! Cuac.');
    if (target === this.bell) say('¡La campana ya no está muda! Ding, dong.');
    if (target === this.parade) {
      if (this.parade.isActive) {
        reveal(WORKSHOP_ID);
        this.world.taller.gray.revive(animate);
        zoneLife(FESTIVAL.workshop.x, FESTIVAL.workshop.z, 10);
        say('¡El desfile funciona! Acércate al fragmento');
      } else {
        say('El desfile necesita las dos cosas: el pato y la campana');
      }
    }
    // Fase 5: los faroles de Lucio y la fiesta
    if (target === this.lanterns.first) say('¡Se prendió el primer farol! ¿Camino directo o camino curioso?');
    if (target === this.lanterns.sideB && animate && !this.progress.hasHeard('shy-lantern')) {
      this.progress.markHeard('shy-lantern');
      after(0.6, () => this.showStory('El farol tímido', '¿Por qué cruzó el cable el camino? Porque alguien lo conectó. Perdón.'));
    }
    if (target === this.lanterns.last) {
      reveal(LANTERN_ID);
      zoneLife(21, 55.5, 14);
      say(this.prepared ? '¡Tenemos camino! Ahora, a preparar la fiesta en el escenario' : '¡Tenemos camino! Acércate al fragmento');
    }
    if (target === this.stage) say('¡El escenario está listo! Falta el confeti');
    if (target === this.confetti) this.party(animate);
    // Fase 6: Parque de diversiones
    if (target === this.carousel || target === this.wheel || target === this.coaster) {
      this.addLife(target.x, target.z, 10, animate);
      const name = target === this.carousel ? 'La calesita' : target === this.wheel ? 'La vuelta al mundo' : 'La montaña rusa';
      if (target === this.coaster) this.placeCoasterSparks();
      if (this.parkDone === 3) {
        this.addLife(0, -73, 42, animate);
        say('¡El Parque de diversiones volvió a la vida! Subite a todos los juegos');
        if (animate) after(0.8, () => this.updateResidentMoods());
      } else {
        say(`¡${name} revivió! Acercate y subite`);
      }
    }
    // Fase 18: la Montaña nevada
    if (target === this.chairlift) say('¡La telesilla arrancó! Subite en la estación para ir a la cima');
    if (target === this.telescope) {
      this.world.nieve.hall.gray.revive(animate);
      this.world.nieve.openDome();
      this.progress.setFlag('telescopio');
      this.addLife(SUMMIT.minX + 12, SUMMIT.minZ + 10, 20, animate);
      this.addLife(4, -120, 26, animate);
      say('¡El telescopio funciona! Mirá el mapa: marca las Piezas que faltan');
      if (animate) {
        after(1.6, () =>
          this.showStory(
            'Profesora Lupa · ¡Las Piezas!',
            'Con el telescopio se ve toda la ciudad: cada Pieza de la Gran Chispa brilla un poquito. Las marqué en tu mapa (M) con rombos violetas. Tocá el mapa para verlo entero. ¡Y de noche las estrellas se ven hermosas!',
          ),
        );
        after(0.8, () => this.updateResidentMoods());
      }
    }
    // Fase 17: la Isla misteriosa
    if (target === this.lancha) say('¡La lancha de Marina arrancó! Subite en el muelle para cruzar a la isla');
    if (target instanceof RuneStone) {
      const next = { luna: 'Ahora la piedra del sol', sol: 'Falta la piedra de la estrella', estrella: '¡Las tres piedras brillan! Ahora el altar' }[target.kind];
      say(`¡Se prendió la ${target.label.toLowerCase()}! ${next}`);
    }
    if (target === this.altar) {
      this.world.isla.hall.gray.revive(animate);
      this.addLife(ISLA.temple.x, ISLA.temple.z + 6, 16, animate);
      say('¡El altar de la chispa antigua brilla!');
      if (animate) {
        after(1.6, () =>
          this.showStory(
            'Pip · La chispa antigua',
            'Hace muchísimo tiempo cayó del cielo una chispa chiquita, acá en la isla. La gente la cuidó, la llevó a la ciudad y en la Fábrica la hicieron grande: ¡la Gran Chispa! Por eso brilla cuando todos se ayudan. Juntá las 12 Piezas, Nexus.',
          ),
        );
        after(0.8, () => this.updateResidentMoods());
      }
    }
    if (target === this.heart) {
      this.world.isla.wakeVolcano();
      this.addLife(VOLCANO.x, VOLCANO.z, 22, animate);
      this.addLife(8, 170, 24, animate);
      say('¡El volcán se despertó tranquilo: humito y agua tibia!');
      if (animate) after(0.8, () => this.updateResidentMoods());
    }
    // Fase 16: la Playa
    if (target === this.fridge) {
      this.world.playa.openUmbrellas();
      this.addLife(66, 78, 16, animate);
      say('¡La heladera enfría! Y se abrieron las sombrillas');
    }
    if (target === this.castle) {
      this.addLife(PLAYA.castle.x, PLAYA.castle.z, 14, animate);
      say('¡El castillo de arena creció y levantó sus banderas!');
    }
    if (target === this.farito) {
      if (!this.farito.isActive) say('¡Llegó un cable! El faro chiquito necesita el otro también');
      else {
        this.addLife(PLAYA.farito.x, PLAYA.farito.z - 8, 18, animate);
        this.addLife(112, 86, 22, animate);
        say('¡El faro chiquito se prendió con el sol y el viento!');
        if (animate) {
          after(1.4, () =>
            this.showStory(
              'Coral · El faro chiquito',
              '¡Gracias! Este farito guía a los botes que vuelven de la isla del sur. Marina dice que su bote ya puede salir al mar… ¿Y viste algo que brillaba allá lejos, en la isla?',
            ),
          );
          after(0.8, () => this.updateResidentMoods());
        }
      }
    }
    // Fase 15: el Barrio Alto
    if (target instanceof MarketStall) {
      const n = this.stalls.filter((s) => s.isActive).length;
      this.addLife(target.x, target.z, 5, animate);
      if (n === 6) {
        this.progress.setFlag('alto-market');
        this.world.alto.lightMarquee();
        this.addLife(119, 18, 22, animate);
        say('¡El mercado volvió! Y mirá: se prendió el cartel del cine');
      } else {
        say(`¡Se prendió el ${target.label.toLowerCase()}! (${n}/6) Pasale la luz a otro puesto`);
      }
    }
    if (target === this.projector) {
      this.world.alto.hall.gray.revive(animate);
      this.addLife(ALTO.cine.x, ALTO.cine.z + 8, 12, animate);
      say('¡Empezó la película!');
      if (animate) {
        after(2, () =>
          this.showStory(
            'Don Kiosko · ¡Función de cine!',
            'Esta película la filmamos el día que llegó la Gran Chispa. ¿Ves cómo el Nexus la persigue? ¡Igualito a vos con las Piezas! Dicen que una Pieza cayó en el Barrio Alto… y que se la gana quien ayuda a todo el barrio.',
          ),
        );
        after(0.8, () => this.updateResidentMoods());
      }
    }
    if (target === this.libLamp) {
      this.world.alto.lightLibrary();
      this.addLife(ALTO.library.x, ALTO.library.z + 8, 16, animate);
      say('¡El farol de lectura se prendió y la biblioteca volvió!');
      if (animate) {
        after(1.4, () =>
          this.showStory(
            'Luli · Un libro que flota',
            'En la biblioteca hay un libro viejo que cuenta que la Gran Chispa vino de muy lejos, del cielo. Si la ciudad entera brilla, la Chispa se queda para siempre. ¡Por eso hay que ayudar en todos los barrios!',
          ),
        );
        after(0.8, () => this.updateResidentMoods());
      }
    }
    // Fase 14: la fábrica
    if (target instanceof FactoryPart && target.kind === 'belt') {
      const n = this.belts.filter((b) => b.isActive).length;
      if (n === 3) {
        this.addLife(80, -66, 30, animate);
        say('¡Las tres cintas andan! El montacargas también se prendió');
      } else {
        say(`¡La cinta ${n} anda! Ahora pasale la energía a la siguiente`);
      }
    }
    if (target === this.boiler) say('¡La caldera calienta! Ahora el engranaje');
    if (target === this.gear) say('¡El engranaje gira! Falta la Gran Máquina');
    if (target === this.machine) {
      this.world.factory.hall.gray.revive(animate);
      this.addLife(92, -80, 16, animate);
      say('¡La Gran Máquina despertó!');
      if (animate) {
        after(1, () =>
          this.showStory(
            'Ingeniera Tuerca · ¡Acá nació la Gran Chispa!',
            'Esta máquina hizo la Gran Chispa hace muchísimo tiempo. Mirá el plano de la pared: cuando juntes las 12 Piezas, el faro va a poder armarla otra vez. ¡Y esta vez para siempre!',
          ),
        );
        after(0.8, () => this.updateResidentMoods());
      }
    }
    // Fase 12: la granja
    if (target instanceof Windmill) {
      this.addLife(target.x, target.z, 9, animate);
      const n = this.mills.filter((m) => m.isActive).length;
      if (n === 3) {
        if (!this.progress.hasFlag('fields-grown')) this.progress.setFlag('fields-grown');
        this.world.farm.growFields(animate);
        this.addLife(-76, 70, 34, animate);
        if (animate) this.dropPack('lugar-molinos', -60, 62, true);
        say('¡Los tres molinos giran! El agua llega a los campos y todo crece');
        if (animate) after(0.8, () => this.updateResidentMoods());
      } else {
        say(`¡El molino gira! (${n}/3)`);
      }
    }
    if (target === this.greenhouse) {
      this.world.farm.bloomGreenhouse();
      this.addLife(FARM.greenhouse.x, FARM.greenhouse.z, 8, animate);
      say('¡El regador tira agua y el invernadero florece!');
    }
    if (target === this.incubator) {
      this.world.farm.barn.gray.revive(animate);
      this.world.farm.barn.chicks.visible = true;
      say('¡Pío pío! Nacieron los pollitos y el granero recuperó el color');
    }
    if (target === this.tractor) say('¡El tractor arrancó! Subite al lado y dá una vuelta a los campos');
    // Fase 11: el bosque
    if (target === this.forestLever) {
      this.world.forest.openBridge();
      this.addLife(-78, -75, 12, animate);
      say('¡El puente colgante se armó! Ya podés cruzar el arroyo hasta el árbol gigante');
    }
    if (target === this.campfire) {
      this.addLife(-75, -75, 34, animate);
      say('¡El fogón se prendió y el bosque recupera el color!');
      if (animate) after(0.8, () => this.updateResidentMoods());
    }
    // Fase 9: el bote de Marina y el faro (final)
    if (target === this.boat) {
      this.addLife(BOAT.dock.x, BOAT.dock.z, 10, animate);
      say('¡El bote despertó! Subite en el embarcadero y paseá por el canal');
      if (animate) after(0.8, () => this.updateResidentMoods());
    }
    if (target === this.lighthouse) this.finale(animate);
    // Fase 8: la cascada se descongela
    if (target === this.cascade) {
      this.addLife(-74, -22, 18, animate);
      say('¡La cascada se descongeló! El agua vuelve a correr por el cerro');
      if (animate) after(0.8, () => this.updateResidentMoods());
    }
    // Fase 7: el tren despierta y las paradas sirven para viajar
    if (target === this.train) {
      this.addLife(73, 49, 26, animate);
      say('¡El tren despertó! Buscá una parada 🚂 en cualquier distrito para viajar');
      if (animate) after(0.8, () => this.updateResidentMoods());
    }
    if (target === this.mirrorBall) {
      this.world.espejos.gray.revive(animate);
      say('¡La casa de los espejos brilla otra vez!');
    }
    if (target === this.ramp) {
      this.addLife(80, 0, 24, animate);
      if (animate) after(0.6, () => this.pickups.burst(4, target.x, target.z + 1.5, 1.6));
      say('¡El Skatepark volvió a la vida! Las rampas brillan otra vez');
    }
    if (target === this.bridge) {
      this.world.openBridgeGap();
      reveal(BRIDGE_ID);
      zoneLife(16, 33, 17);
      say('¡El puente se abrió! Cruza y busca el fragmento');
    }
  }

  private lightWindow(): void {
    this.world.plaza.window.material = new THREE.MeshBasicMaterial({ color: '#ffe066' });
  }

  /** La plaza recupera el color: piso cálido, casa de estuco con teja, el árbol saca hojas. */
  private transformPlaza(animate: boolean): void {
    const pz = this.world.plaza;
    const targets: [THREE.MeshToonMaterial, string][] = [
      [pz.ground, '#f4e9c9'],
      [pz.houseWall, '#f1d3a1'],
      [pz.houseRoof, '#c4643e'],
    ];
    if (!animate) {
      targets.forEach(([m, c]) => m.color.set(c));
      pz.treeCrowns.forEach((c) => (c.visible = true));
      return;
    }
    targets.forEach(([m, c]) => {
      const from = m.color.clone();
      const to = new THREE.Color(c);
      tween(0.9, (k) => m.color.copy(from).lerp(to, k));
    });
    pz.treeCrowns.forEach((c, i) => {
      c.scale.setScalar(0.001);
      tween(
        0.35,
        (k) => {
          c.visible = true;
          c.scale.set(k, k * 0.75, k);
        },
        { delay: i * 0.06 },
      );
    });
  }

  /* ---------- Fragmentos ---------- */

  private checkFragments(): void {
    if (this.busy) return;
    const p = this.nexus.position;
    for (const f of this.fragments) {
      if (!f.isRevealed || f.isCollected) continue;
      const g = f.group.position;
      if (Math.hypot(g.x - p.x, g.z - p.z) < 1.1) this.collect(f);
    }
  }

  private collect(f: Fragment): void {
    f.collect();
    this.progress.collectFragment(f.id);
    this.audio.playCollect();
    this.nexus.celebrate();
    this.updateHud();
    this.busy = true;

    const allDone = ZONE_FRAGMENTS.every((z) => this.progress.hasFragment(z.id));
    if (allDone && !this.progress.hasSeenCompletion()) {
      this.progress.markCompletionSeen();
      this.setMessage('¡El barrio entero volvió a la vida!');
      this.audio.playSuccess();
      this.celebrateWorld();
      after(2.2, () => this.goMuseum());
      return;
    }
    this.setMessage(f.id === SECRET_FRAGMENT.id ? '¡Encontraste un fragmento secreto!' : '¡Fragmento recuperado!');
    after(1.0, () => this.goMuseum());
  }

  private goMuseum(): void {
    this.busy = false;
    this.cb.museum();
  }

  private celebrateWorld(): void {
    const spots = [
      new THREE.Vector3(-18, 3, -24),
      new THREE.Vector3(-20, 3, 16),
      new THREE.Vector3(27, 5, -18),
      new THREE.Vector3(18, 2, 33),
      new THREE.Vector3(-13, 2, 54),
      this.nexus.position.clone().setY(1.5),
    ];
    spots.forEach((s, i) => after(i * 0.2, () => this.connections.celebrate(s)));
    flashScreen();
  }

  /** Se llama al volver del museo. */
  resume(): void {
    this.showObjective();
    this.input.flush();
  }

  /* ---------- Pistas, mapa y distritos (Fase 0, PLAN_MAESTRO.md §8) ---------- */

  /** Tocar el objetivo (o H): dice qué conviene hacer y marca hacia dónde ir. */
  showHint(): void {
    const p = this.nexus.position;
    const dist = (o: { x: number; z: number }) => Math.hypot(o.x - p.x, o.z - p.z);
    const reachable = (o: { z: number }) => o.z < CANAL_MAX_Z || this.bridge.isActive;
    let text = '';
    let where: { x: number; z: number } | null = null;
    if (this.inside) {
      const ist = this.skateStep();
      if (ist?.at) {
        this.showStory('Pista', ist.text);
        this.pointTo(ist.at.x, ist.at.z);
        return;
      }
      this.showStory('Pista', 'Para volver al barrio, pisá el felpudo amarillo de la puerta.');
      this.pointTo(this.inside.info.exit.x, this.inside.info.exit.z);
      return;
    }
    const st = this.skateStep();
    if (st) {
      this.showStory('Pista', st.text);
      if (st.at) this.pointTo(st.at.x, st.at.z);
      return;
    }
    const sel = this.connections.selection;
    const at = (b: (typeof this.bigSteps)[number]) => b.door ?? b.s;
    const pending = this.bigSteps.filter(
      (b) => !this.progress.hasConnection(b.s.id, b.t.id) && b.s.canInitiate() && reachable(at(b)) && (b.when?.() ?? true) && !b.t.isActive,
    );
    const forSel = sel ? pending.find((b) => b.s === sel) : undefined;
    if (forSel) {
      text = `Tenés el cable de ${forSel.sName}: llevalo hasta ${forSel.tName}.`;
      where = forSel.t;
    } else if (pending.length) {
      const b = pending.reduce((a, c) => (dist(at(a)) < dist(at(c)) ? a : c));
      text = b.door
        ? `Entrá al taller de Pipa: adentro, tocá ${b.sName} y después ${b.tName}.`
        : `Tocá ${b.sName} y después ${b.tName}. ¡Ahí empieza la carrera de luz!`;
      where = at(b);
    } else {
      const sleeping = this.sleepers.filter((sl) => !sl.isActive && reachable(sl));
      if (sleeping.length && this.progress.charge > 0) {
        const sl = sleeping.reduce((a, c) => (dist(a) < dist(c) ? a : c));
        text = `Tenés chispitas en la mochila: despertá ${sl.label.toLowerCase()} (tiene Zzz).`;
        where = sl;
      } else if (sleeping.length) {
        const nests = this.sparks.filter((n) => n.ready && reachable(n));
        const n = nests.length ? nests.reduce((a, c) => (dist(a) < dist(c) ? a : c)) : null;
        text = n ? 'Tu mochila está vacía: tocá un nido de chispitas y atrapalas.' : 'Buscá chispitas escondidas por el barrio (¡algunas están arriba de los autos!).';
        where = n;
      } else {
        const q = this.nextQuest();
        const qa = q ? this.questPlace(q) : null;
        text = q ? `📒 ${q.title}: ${q.text}` : '¡El barrio está lleno de vida! Explorá: hay chispitas escondidas, techos y tirolesas.';
        if (qa) where = qa;
      }
    }
    this.showStory('Pista', text);
    if (where) this.pointTo(where.x, where.z);
  }

  /** Flecha en el piso alrededor del Nexus y aro en el destino, por unos segundos. */
  private pointTo(x: number, z: number): void {
    const scene = this.world.scene;
    if (!this.hintArrow) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.55);
      shape.lineTo(0.38, 0);
      shape.lineTo(0.14, 0);
      shape.lineTo(0.14, -0.4);
      shape.lineTo(-0.14, -0.4);
      shape.lineTo(-0.14, 0);
      shape.lineTo(-0.38, 0);
      shape.closePath();
      this.hintArrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#ffc23a', transparent: true, depthWrite: false, fog: false }));
      this.hintRing = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 1.25, 32),
        new THREE.MeshBasicMaterial({ color: '#ffc23a', transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }),
      );
      this.hintRing.rotation.x = -Math.PI / 2;
      scene.add(this.hintArrow, this.hintRing);
    }
    this.hintTarget.set(x, 0, z);
    this.hintTimer = 8;
  }

  private updateHint(dt: number): void {
    if (!this.hintArrow || !this.hintRing) return;
    this.hintTimer -= dt;
    const on = this.hintTimer > 0;
    this.hintArrow.visible = this.hintRing.visible = on;
    if (!on) return;
    const p = this.nexus.position;
    const a = Math.atan2(this.hintTarget.x - p.x, this.hintTarget.z - p.z);
    this.hintArrow.position.set(p.x + Math.sin(a) * 1.3, p.y + 0.14, p.z + Math.cos(a) * 1.3);
    this.hintArrow.rotation.set(-Math.PI / 2, 0, a + Math.PI);
    const k = Math.min(1, this.hintTimer);
    (this.hintArrow.material as THREE.MeshBasicMaterial).opacity = 0.9 * k;
    this.hintRing.position.set(this.hintTarget.x, 0.14, this.hintTarget.z);
    this.hintRing.scale.setScalar(1 + Math.sin(this.time * 5) * 0.12);
    (this.hintRing.material as THREE.MeshBasicMaterial).opacity = 0.85 * k;
    // Al llegar, la pista se apaga sola
    if (Math.hypot(this.hintTarget.x - p.x, this.hintTarget.z - p.z) < 2) this.hintTimer = Math.min(this.hintTimer, 0.5);
  }

  /* ---------- Interiores: la casa de Miga ---------- */

  get isInside(): boolean {
    return this.inside !== null;
  }

  /** Las habitaciones que se visitan: la casa de Miga (Fase 0) y la sala del skatepark (Fase 1). */
  private setupInteriors(): void {
    const sala = this.world.skate.sala;
    this.interiors = [
      {
        id: 'casa-miga',
        info: this.world.interior,
        door: { x: this.door.x, z: this.door.z + 0.9 },
        out: { x: this.door.x, z: this.door.z + 1.6 },
        open: () => this.door.isActive,
        story: [
          'Miga · Mi casa',
          '¡Bienvenido a mi casa! Desde el apagón está todo gris acá adentro… ¿Le llevás energía al tablero de luz de la pared? Ah, y arriba del banco de trabajo se escondió una chispita.',
        ],
        target: this.fuse,
      },
      {
        id: 'heladeria',
        info: this.world.heladeria,
        door: { x: this.world.shopDoors.helados.x, z: this.world.shopDoors.helados.z + 0.9 },
        out: { x: this.world.shopDoors.helados.x, z: this.world.shopDoors.helados.z + 1.7 },
        open: () => true,
        story: ['Heladería', 'La máquina de helados se apagó con la Gran Chispa y todo quedó gris. Llevale energía con un cable desde la estrella.'],
        target: this.iceMachine,
      },
      {
        id: 'tienda-cartas',
        info: this.world.tienda,
        door: { x: this.world.shopDoors.cartas.x, z: this.world.shopDoors.cartas.z + 0.9 },
        out: { x: this.world.shopDoors.cartas.x, z: this.world.shopDoors.cartas.z + 1.7 },
        open: () => this.progress.hasFlag('cartas-open'),
        story: ['Tienda de cartas', '¡Acá se juntan las cartas de los Chispis! La vitrina está apagada: llevale energía desde la estrella.'],
        target: this.cardDisplay,
      },
      {
        id: 'taller-pipa',
        info: this.world.taller,
        door: { x: FESTIVAL.workshop.doorX, z: FESTIVAL.workshop.z + FESTIVAL.workshop.d / 2 + 0.9 },
        out: { x: FESTIVAL.workshop.doorX, z: FESTIVAL.workshop.z + FESTIVAL.workshop.d / 2 + 1.7 },
        open: () => true,
        story: ['Pipa · El taller', 'El desfile necesita música y un supervisor. Tenemos una campana muda y un pato demasiado quieto. ¿Le das energía al motor?'],
        target: this.parade,
      },
      {
        id: 'casa-espejos',
        info: this.world.espejos,
        door: { x: PARK.mirror.doorX, z: PARK.mirror.z + PARK.mirror.d / 2 + 0.9 },
        out: { x: PARK.mirror.doorX, z: PARK.mirror.z + PARK.mirror.d / 2 + 1.7 },
        open: () => true,
        story: ['Casa de los espejos', '¡Cuántos Nexus! La bola de espejos se apagó y todo quedó gris. Llevale energía desde la estrella.'],
        target: this.mirrorBall,
      },
      {
        id: 'casa-nexus',
        info: this.world.home.info,
        door: this.world.home.door,
        out: { x: this.world.home.door.x, z: this.world.home.door.z + 0.8 },
        open: () => true,
        story: ['Tu casa', 'Esta casita vieja es tuya, Nexus. Está toda rota… pero con chispitas de la mochila la podés ir arreglando, cosa por cosa.'],
      },
      {
        id: 'observatorio',
        info: this.world.nieve.hall,
        door: { x: NIEVE.observatory.x, z: NIEVE.observatory.z + NIEVE.observatory.r + 0.9, y: SUMMIT.h },
        out: { x: NIEVE.observatory.x, z: NIEVE.observatory.z + NIEVE.observatory.r + 1.7, y: SUMMIT.h },
        open: () => this.progress.hasFlag('domo-open'),
        story: ['Profesora Lupa · El observatorio', '¡Llegaste a la cima! El telescopio está dormido. Llevale energía y vas a ver toda la ciudad… y algo más.'],
        target: this.telescope,
      },
      {
        id: 'templo',
        info: this.world.isla.hall,
        door: { x: ISLA.temple.x, z: ISLA.temple.z + ISLA.temple.d / 2 + 0.9 },
        out: { x: ISLA.temple.x, z: ISLA.temple.z + ISLA.temple.d / 2 + 1.7 },
        open: () => this.progress.hasFlag('templo-open'),
        story: ['Pip · El templo', 'Mirá el mural de la pared: muestra en qué orden se prenden las piedras. La energía va primero a una, y cada piedra prendida le pasa la luz a la siguiente.'],
        target: this.altar,
      },
      {
        id: 'cine',
        info: this.world.alto.hall,
        door: { x: ALTO.cine.doorX, z: ALTO.cine.z + ALTO.cine.d / 2 + 0.9 },
        out: { x: ALTO.cine.doorX, z: ALTO.cine.z + ALTO.cine.d / 2 + 1.7 },
        open: () => this.progress.hasFlag('alto-market'),
        story: ['Don Kiosko · El cine', '¡Hace años que no hay función! La sala quedó gris. Llevale energía al proyector, que está atrás de las butacas.'],
        target: this.projector,
      },
      {
        id: 'fabrica',
        info: this.world.factory.hall,
        door: { x: FACTORY.hall.doorX, z: FACTORY.hall.z + FACTORY.hall.d / 2 + 0.9 },
        out: { x: FACTORY.hall.doorX, z: FACTORY.hall.z + FACTORY.hall.d / 2 + 1.7 },
        open: () => this.progress.hasFlag('fabrica-open'),
        story: ['Ingeniera Tuerca · La sala de máquinas', 'Acá adentro está la Gran Máquina. Va todo en orden: la energía a la caldera, de la caldera al engranaje y del engranaje a la máquina.'],
        target: this.machine,
      },
      {
        id: 'granero',
        info: this.world.farm.barn,
        door: { x: FARM.barn.doorX, z: FARM.barn.z + FARM.barn.d / 2 + 0.9 },
        out: { x: FARM.barn.doorX, z: FARM.barn.z + FARM.barn.d / 2 + 1.7 },
        open: () => true,
        story: ['Abuela Trigo · El granero', 'Desde el apagón la incubadora no calienta y los huevitos no nacen. ¿Le llevás energía?'],
        target: this.incubator,
      },
      {
        id: 'cueva',
        info: this.world.cerro.cave,
        door: { x: CERRO.cave.doorX, z: CERRO.cave.z + 0.9 },
        out: { x: CERRO.cave.doorX, z: CERRO.cave.z + 1.7 },
        open: () => true,
        story: ['Lalo · La cueva', '¡Qué oscuro! Acá adentro duermen los cristales del cerro. Dicen que con la capucha ⚡ se ven sus cables de energía…'],
      },
      {
        id: 'sala-skate',
        info: this.world.skate.room,
        door: { x: sala.doorX, z: sala.doorZ + 0.9 },
        out: { x: sala.doorX, z: sala.doorZ + 1.8 },
        open: () => this.progress.hasFlag('sala-open'),
        story: [
          'Rulo · La sala',
          '¡Abriste mi sala! Acá guardo los trofeos y practico en la mini rampa. Arriba de las cajas brilla algo… ¿una chispita?',
        ],
      },
    ];
  }

  /** ¿El Nexus está en una puerta que se puede cruzar? (más cerca que cualquier objeto) */
  private findDoorway(objD: number): { kind: 'enter' | 'exit'; room: Interior } | null {
    if (this.busy || this.zip || this.connections.hasSelection() || this.voltio.active) return null;
    const p = this.nexus.position;
    if (this.inside) {
      const e = this.inside.info.exit;
      return Math.hypot(p.x - e.x, p.z - e.z) < 1.4 ? { kind: 'exit', room: this.inside } : null;
    }
    for (const room of this.interiors) {
      if (!room.open()) continue;
      if (Math.abs(p.y - (room.door.y ?? 0)) > 1.2) continue;
      const d = Math.hypot(p.x - room.door.x, p.z - room.door.z);
      if (d < 1.7 && d <= objD + 0.6) return { kind: 'enter', room };
    }
    return null;
  }

  /** Fundido corto y el Nexus aparece del otro lado de la puerta. */
  private crossDoor(move: () => void): void {
    this.busy = true;
    const fade = document.getElementById('fade');
    fade?.classList.add('on');
    this.audio.tone(392, 0, 0.12, 'triangle', 0.07);
    this.audio.tone(523, 0.1, 0.14, 'triangle', 0.07);
    window.setTimeout(() => {
      move();
      this.companion?.snap(this.nexus.position, this.nexus.heading);
      this.focus.set(this.nexus.position.x, 0, this.nexus.position.z);
      this.updateCameras(1);
      this.busy = false;
      fade?.classList.remove('on');
    }, 280);
  }

  enterHouse(room = this.interiors[0]): void {
    if (this.inside) return;
    this.dismount();
    this.crossDoor(() => {
      this.inside = room;
      this.isoOutside = this.iso;
      this.iso = true;
      const sp = room.info.spawn;
      this.nexus.position.set(sp.x, 0, sp.z);
      this.nexus.velocity.set(0, 0, 0);
      this.nexus.heading = Math.PI;
      this.hintTimer = 0;
      document.body.classList.add('inside');
      if (this.eventTimer <= 0) this.showObjective();
      if (!this.progress.hasHeard(room.id)) {
        this.progress.markHeard(room.id);
        this.showStory(room.story[0], room.story[1]);
      } else {
        this.toast(room.story[0].split(' · ')[1] ?? room.story[0], 'info');
      }
    });
  }

  leaveHouse(): void {
    const room = this.inside;
    if (!room) return;
    this.crossDoor(() => {
      this.inside = null;
      this.iso = this.isoOutside;
      this.nexus.position.set(room.out.x, room.out.y ?? 0, room.out.z);
      this.nexus.velocity.set(0, 0, 0);
      this.nexus.heading = 0;
      this.camYaw = 0;
      this.hintTimer = 0;
      document.body.classList.remove('inside');
      if (this.eventTimer <= 0) this.showObjective();
    });
  }

  /** Cartel grande al entrar a otro distrito. */
  private checkDistrict(): void {
    const p = this.nexus.position;
    const d = districtAt(p.x, p.z);
    if (!d || d.id === this.districtId) return;
    this.districtId = d.id;
    if (this.eventTimer <= 0) this.showObjective();
    const banner = document.getElementById('districtBanner');
    if (!banner) return;
    banner.hidden = false;
    banner.innerHTML = `${d.name}${d.id === 'camino-skate' ? '<small>las rampas te esperan</small>' : ''}`;
    // reiniciar la animación
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
  }

  /** Datos para dibujar el mapa. */
  mapData(): MapData {
    const n = this.inside ? this.inside.out : this.nexus.position;
    const places = [
      { name: 'Plaza', x: -18, z: -22, alive: this.door.isActive },
      { name: 'Fuente', x: -20, z: 16, alive: this.fountain.isActive },
      { name: 'Antena', x: 27, z: -18, alive: this.beacon.isFullyActive },
      { name: 'Puente', x: 17, z: 30, alive: this.bridge.isActive },
      { name: 'Jardín', x: -11, z: 54, alive: this.flowerBed.isActive },
      { name: 'Skatepark', x: 82, z: -12, alive: this.ramp.isActive },
      { name: 'Taller', x: FESTIVAL.workshop.x, z: FESTIVAL.workshop.z, alive: this.parade.isActive },
      { name: 'Faroles', x: 21, z: 55, alive: this.lanterns.last.isActive },
      { name: 'Calesita', x: PARK.carousel.x, z: PARK.carousel.z, alive: this.carousel.isActive },
      { name: 'Vuelta al mundo', x: PARK.wheel.x, z: PARK.wheel.z, alive: this.wheel.isActive },
      { name: 'Montaña rusa', x: -20, z: -85, alive: this.coaster.isActive },
      { name: 'Estación', x: STATION.train.x - 4, z: STATION.train.z, alive: this.train.isActive },
      { name: 'Cascada', x: CERRO.cascade.x, z: CERRO.cascade.z + 2, alive: this.cascade.isActive },
      { name: 'Mirador', x: CERRO.mirador.x, z: CERRO.mirador.z + 4, alive: this.progress.hasFlag('cerro-top') },
      { name: 'Cueva', x: CERRO.cave.doorX, z: CERRO.cave.z + 1, alive: this.progress.hasFlag('cave-lit') },
      { name: 'Bote', x: BOAT.dock.x, z: BOAT.dock.z, alive: this.boat.isActive },
      { name: 'Árbol gigante', x: TREE.x, z: TREE.z, alive: this.progress.hasFlag('tree-top') },
      { name: 'Fogón', x: FOREST.fire.x, z: FOREST.fire.z, alive: this.campfire.isActive },
      { name: 'Molinos', x: -96, z: 59, alive: this.progress.hasFlag('fields-grown') },
      { name: 'Maizal', x: FARM.mazeCenter.x, z: FARM.mazeCenter.z, alive: this.progress.hasFlag('maze-center') },
      { name: 'Granero', x: FARM.barn.x, z: FARM.barn.z, alive: this.incubator.isActive },
      { name: 'Fábrica', x: FACTORY.hall.x, z: FACTORY.hall.z, alive: this.machine.isActive },
      { name: 'Mercado', x: 119, z: 19, alive: this.progress.hasFlag('alto-market') },
      { name: 'Cine', x: ALTO.cine.x, z: ALTO.cine.z, alive: this.projector.isActive },
      { name: 'Biblioteca', x: ALTO.library.x, z: ALTO.library.z, alive: this.libLamp.isActive },
      { name: 'Terrazas', x: 146.5, z: 11, alive: this.progress.hasFlag('alto-top') },
      { name: 'Kiosco', x: PLAYA.kiosco.x, z: PLAYA.kiosco.z, alive: this.fridge.isActive },
      { name: 'Castillo de arena', x: PLAYA.castle.x, z: PLAYA.castle.z, alive: this.castle.isActive },
      { name: 'Faro chiquito', x: PLAYA.farito.x, z: PLAYA.farito.z, alive: this.farito.isActive },
      { name: 'Templo', x: ISLA.temple.x, z: ISLA.temple.z, alive: this.altar.isActive },
      { name: 'Volcán', x: VOLCANO.x, z: VOLCANO.z, alive: this.heart.isActive },
      { name: 'Observatorio', x: NIEVE.observatory.x, z: NIEVE.observatory.z, alive: this.telescope.isActive },
      { name: 'Telesilla', x: NIEVE.liftBase.x, z: NIEVE.liftBase.z, alive: this.chairlift.isActive },
      { name: 'Cintas', x: 66, z: -63, alive: this.belts[2].isActive },
      { name: 'Faro', x: PORT.lighthouse.x, z: PORT.lighthouse.z - 3, alive: this.lighthouse.isActive },
    ];
    return {
      life: (x, z) => LIFE.at(x, z),
      walls: this.world.rects.filter((r) => r.h === undefined && r.maxX - r.minX < 40 && r.maxZ - r.minZ < 40),
      canal: { minZ: CANAL_MIN_Z, maxZ: CANAL_MAX_Z, bridgeX: BRIDGE_X, bridgeOpen: this.bridge.isActive },
      places,
      things: this.sleepers.map((s) => ({ x: s.x, z: s.z, awake: s.isActive })),
      nests: this.sparks.map((s) => ({ x: s.x, z: s.z, ready: s.ready })),
      nexus: { x: n.x, z: n.z, heading: this.inside ? 0 : this.nexus.heading },
      pieces: this.missingPieces(),
    };
  }

  /** Gestos desde el menú. */
  dance(): void {
    this.dismount();
    if (!this.zip && this.grounded) this.danceParty();
  }

  waveHello(): void {
    this.nexus.wave();
    this.audio.tone(880, 0, 0.1, 'triangle', 0.06);
  }

  /* ---------- Fase 1: Skatepark, patineta y Mundo Voltio (PLAN_MAESTRO.md) ---------- */

  private makeVoltio(): Voltio {
    const sala = this.world.skate.sala;
    const cartas = this.world.shopDoors.cartas;
    return new Voltio(
      this.world.scene,
      this.world.skate,
      [
        { id: 'sala-open', nodes: this.world.skate.nodes, door: { x: sala.doorX, z: sala.doorZ } },
        { id: 'cartas-open', nodes: this.world.cardNodes, door: cartas },
        { id: 'wheel-open', nodes: PARK.wheelNodes, door: { x: PARK.wheel.x, z: PARK.wheel.z } },
        { id: 'coaster-open', nodes: PARK.coasterNodes, door: { x: PARK.coasterStation.x, z: PARK.coasterStation.z } },
        { id: 'train-open', nodes: STATION.nodes, door: { x: STATION.train.x, z: STATION.train.z } },
        { id: 'cave-lit', nodes: CERRO.caveNodes, door: CERRO.caveNodes[1] },
        { id: 'molino-open', nodes: FARM.millNodes, door: FARM.mills[2] },
        { id: 'biblio-open', nodes: ALTO.libNodes, door: ALTO.libLamp },
        { id: 'muelle-open', nodes: PLAYA.nodes, door: { x: 122, z: PLAYA.gateZ } },
        { id: 'domo-open', nodes: NIEVE.domeNodes, door: { x: 4, z: -103 } },
        { id: 'templo-open', nodes: ISLA.templeNodes, door: { x: ISLA.temple.x, z: ISLA.temple.z + ISLA.temple.d / 2 } },
        { id: 'fabrica-open', nodes: FACTORY.gateNodes, door: { x: FACTORY.hall.doorX, z: FACTORY.hall.z + 6 } },
        { id: 'faro-open', nodes: PORT.nodes, door: PORT.lighthouse },
      ],
      {
        rescue: (id, x, z) => this.onRescue(id, x, z),
        circuit: (id) => {
          this.progress.setFlag(id);
          this.audio.playSuccess();
          if (id === 'sala-open') {
            this.openShutter(true);
            this.setMessage('¡Circuito cerrado! Afuera se abrió la sala del skatepark');
          } else if (id === 'cartas-open') {
            this.openGrille(true);
            this.setMessage('¡Circuito cerrado! Afuera se abrió la tienda de cartas');
          } else if (id === 'wheel-open') {
            this.wheel.unlocked = true;
            this.setMessage('¡Circuito cerrado! El motor de la vuelta al mundo se destrabó');
          } else if (id === 'coaster-open') {
            this.coaster.unlocked = true;
            this.setMessage('¡Circuito cerrado! El motor de la montaña rusa se destrabó');
          } else if (id === 'train-open') {
            this.train.unlocked = true;
            this.setMessage('¡Circuito cerrado! El motor del tren se destrabó');
          } else if (id === 'faro-open') {
            this.lighthouse.unlocked = true;
            this.setMessage('¡Circuito cerrado! El motor del faro se destrabó');
          } else if (id === 'domo-open') {
            this.setMessage('¡Circuito cerrado! Volvió la energía al observatorio de la cima');
          } else if (id === 'templo-open') {
            this.world.isla.openTemple();
            this.setMessage('¡Circuito cerrado! La puerta de piedra del templo se abrió');
          } else if (id === 'muelle-open') {
            this.world.playa.openGate();
            this.setMessage('¡Circuito cerrado! Se abrió el portón de la escollera');
          } else if (id === 'biblio-open') {
            this.libLamp.unlocked = true;
            this.setMessage('¡Circuito cerrado! El farol de la biblioteca se destrabó');
          } else if (id === 'fabrica-open') {
            this.world.factory.openGate();
            this.setMessage('¡Circuito cerrado! El portón de la fábrica se abrió');
          } else if (id === 'molino-open') {
            this.mills[2].unlocked = true;
            this.setMessage('¡Circuito cerrado! El motor del molino se destrabó');
          } else if (id === 'cave-lit') {
            this.lightCave(true);
          }
          this.refreshObjectiveSoon();
        },
        zap: () => {
          this.audio.tone(90, 0, 0.25, 'sawtooth', 0.08);
          this.audio.noise(0, 0.3, 0.08, 1800);
          this.exitVoltio('¡Bzzzt! Una Estática te tocó y volviste al mundo normal');
        },
        staticBroken: (x, z) => {
          this.pickups.burst(3, x, z, 1.2);
          this.audio.tone(1320, 0, 0.1, 'square', 0.05);
          this.setMessage('¡Rompiste una Estática! Se volvió chispitas');
        },
        loop: () => {
          this.audio.tone(660, 0, 0.08, 'sine', 0.07);
          this.audio.tone(990, 0.06, 0.1, 'sine', 0.07);
        },
        node: (n, total) => {
          this.audio.tone(520 + n * 160, 0, 0.14, 'triangle', 0.08);
          this.toast(`Nodo ${n} de ${total}`, 'ok');
        },
      },
      {
        cages: [{ id: 'rueditas', ...this.world.skate.chispi }, ...CAGES]
          .filter((c) => !this.progress.hasChispi(c.id))
          .map((c): CageSpot => ({ ...c, color: TYPES[CARD_BY_ID.get(c.id)!.type].color })),
        circuits: ['sala-open', 'cartas-open', 'wheel-open', 'coaster-open', 'train-open', 'cave-lit', 'faro-open', 'molino-open', 'fabrica-open', 'biblio-open', 'muelle-open', 'templo-open', 'domo-open'].filter((f) => this.progress.hasFlag(f)),
      },
    );
  }

  private setupSkatepark(): void {
    const sk = this.world.skate;
    if (!this.progress.hasFlag('board')) {
      const b = makeBoard();
      b.position.set(sk.board.x, 0.1, sk.board.z);
      b.rotation.set(0, 0.6, 0.12);
      keepVivid(b);
      this.world.scene.add(b);
      this.boardPickup = b;
    }
    if (this.progress.hasFlag('sala-open')) this.openShutter(false);
    if (this.progress.hasFlag('cartas-open')) this.openGrille(false);
    const rs2 = this.world.espejos.spark;
    if (!this.progress.hasSpark(rs2.id)) this.pickups.addHidden(rs2.id, rs2.x, rs2.z, rs2.y);
    for (const r of [this.world.heladeria, this.world.tienda]) {
      if (!this.progress.hasSpark(r.spark.id)) this.pickups.addHidden(r.spark.id, r.spark.x, r.spark.z, r.spark.y);
    }
    const rs = sk.room.spark;
    if (!this.progress.hasSpark(rs.id)) this.pickups.addHidden(rs.id, rs.x, rs.z, rs.y);
    document.body.classList.toggle('has-hood', this.progress.hasFlag('hood'));
    document.getElementById('voltBtn')?.addEventListener('click', () => this.input.queueVolt());
  }

  /** La persiana de la sala sube (o ya está arriba al cargar). */
  private openShutter(animate: boolean): void {
    const sh = this.world.skate.sala.shutter;
    if (!animate) {
      sh.position.y = 2.5;
      sh.scale.y = 0.15;
      return;
    }
    const y0 = sh.position.y;
    tween(1.2, (k) => {
      sh.position.y = y0 + (2.5 - y0) * k;
      sh.scale.y = 1 - 0.85 * k;
    });
  }

  /** La reja de la tienda de cartas sube. */
  private openGrille(animate: boolean): void {
    const g = this.world.outside.grille;
    if (!animate) {
      g.position.y = 2.3;
      return;
    }
    tween(1.0, (k) => (g.position.y = 2.3 * k));
  }

  /** Cerca de la tienda de cartas cerrada: un aviso de vez en cuando. */
  private warnClosedShop(dt: number): void {
    this.closedWarned -= dt;
    if (this.closedWarned > 0 || this.inside || this.voltio.active || this.progress.hasFlag('cartas-open')) return;
    const d = this.world.shopDoors.cartas;
    const p = this.nexus.position;
    if (Math.hypot(p.x - d.x, p.z - (d.z + 1)) > 2.5) return;
    this.closedWarned = 8;
    this.toast(
      this.progress.hasFlag('hood')
        ? 'La tienda de cartas está trabada… ¿y si mirás los cables con la capucha ⚡?'
        : 'La tienda de cartas está cerrada. Rulo, en el Skatepark, sabe de cables…',
      'info',
    );
  }

  get hasBoard(): boolean {
    return this.progress.hasFlag('board');
  }

  get riding(): boolean {
    return this.nexus.riding;
  }

  /** Subirse a la patineta. */
  mount(): void {
    if (!this.hasBoard || this.nexus.riding || this.inside || this.zip) return;
    this.nexus.riding = true;
    World.setSurf(true);
    this.skate.reset();
    this.skate.speed = Math.min(this.nexus.speed, 4);
    this.audio.tone(330, 0, 0.08, 'triangle', 0.06);
    this.audio.tone(440, 0.05, 0.08, 'triangle', 0.06);
  }

  /** Bajarse de la patineta (la lleva en la mochila). */
  dismount(): void {
    if (!this.nexus.riding) return;
    this.nexus.riding = false;
    World.setSurf(false);
    this.nexus.grinding = false;
    this.nexus.lean = 0;
    this.skate.reset();
  }

  private takeBoard(): void {
    if (this.hasBoard) return;
    this.progress.setFlag('board');
    if (this.boardPickup) {
      this.world.scene.remove(this.boardPickup);
      this.boardPickup = null;
    }
    this.nexus.reach();
    this.audio.playCollect();
    this.showStory('Rulo', '¡Es tuya! Andá con el joystick y saltá con SALTAR. Mostrame tres trucos: un ollie, un vuelo en una rampita y un grind en una baranda.');
    this.mount();
    this.refreshObjectiveSoon();
  }

  /** Un truco en patineta: los tres de Rulo destraban la capucha. */
  private onTrick(kind: Trick): void {
    this.audio.tone(880, 0, 0.08, 'square', 0.04);
    this.audio.tone(1175, 0.06, 0.1, 'square', 0.04);
    const flag = `trick-${kind}`;
    this.progress.addCount(flag);
    if (this.progress.hasFlag(flag)) return;
    this.progress.setFlag(flag);
    const done = TRICKS.filter((t) => this.progress.hasFlag(`trick-${t}`)).length;
    this.toast(`${TRICK_NAMES[kind]} — truco ${done} de 3`, 'ok');
    this.nexus.sparkle();
    if (done === TRICKS.length && !this.progress.hasFlag('hood')) {
      this.progress.setFlag('hood');
      document.body.classList.add('has-hood');
      this.audio.playSuccess();
      after(0.6, () => {
        this.nexus.celebrate();
        this.showStory(
          'Rulo',
          '¡Qué estilo! … Ey, ¿qué le pasa a tu capucha? ¡Está brillando! Ponétela con ⚡ (Q): dicen que con ella se ven los cables de la ciudad… y que la Estática atrapó a un Chispi acá.',
        );
      });
    }
    this.refreshObjectiveSoon();
  }

  get voltioActive(): boolean {
    return this.voltio.active;
  }

  toggleVoltio(): void {
    if (this.voltio.active) this.exitVoltio();
    else this.enterVoltio();
  }

  enterVoltio(): void {
    if (!this.progress.hasFlag('hood') || this.voltio.active) return;
    if (this.inside && this.inside.id !== 'cueva') {
      this.toast('Acá adentro no hay cables: probá afuera', 'info');
      return;
    }
    if (this.busy || this.zip) return;
    if (this.voltio.voltage < 3) {
      this.toast('Tu capucha se está recargando…', 'info');
      return;
    }
    this.connections.cancel();
    this.voltio.enter();
    this.nexus.setHood(true);
    this.nexus.speedScale = 1.5;
    document.body.classList.add('voltio');
    this.audio.tone(220, 0, 0.3, 'sawtooth', 0.05);
    this.audio.tone(440, 0.12, 0.25, 'sawtooth', 0.05);
    this.audio.tone(880, 0.24, 0.2, 'triangle', 0.06);
    if (!this.progress.hasFlag('voltio-seen')) {
      this.progress.setFlag('voltio-seen');
      this.showStory(
        'Voltio',
        '¡Estás adentro de los cables! Corré y vas a dejar una estela de luz. Si cerrás un círculo, rompés la Estática que quede adentro. ¡No dejes que te toque! La barra ⚡ dice cuánto podés quedarte.',
      );
    }
    this.showObjective();
  }

  exitVoltio(reason?: string): void {
    if (!this.voltio.active) return;
    this.voltio.exit();
    this.nexus.setHood(false);
    this.nexus.speedScale = 1;
    document.body.classList.remove('voltio');
    this.audio.tone(660, 0, 0.15, 'triangle', 0.05);
    this.audio.tone(330, 0.1, 0.2, 'triangle', 0.05);
    if (reason) this.setMessage(reason);
    else this.showObjective();
  }

  private onRescue(id: string, x: number, z: number): void {
    this.progress.rescueChispi(id);
    this.updateHud();
    this.audio.playSuccess();
    this.connections.celebrate(new THREE.Vector3(x, 1.2, z));
    this.pickups.burst(3, x, z, 1.2);
    const card = CARD_BY_ID.get(id);
    this.setMessage(card ? `¡Rescataste a ${card.name}, un Chispi de ${TYPES[card.type].name}!` : '¡Rescataste un Chispi!');
    this.cb.card?.(id, '¡Rescataste un Chispi!');
    this.refreshObjectiveSoon();
  }

  private refreshObjectiveSoon(): void {
    if (this.eventTimer <= 0) this.showObjective();
    after(5.2, () => {
      if (this.eventTimer <= 0) this.showObjective();
    });
  }

  private get inSkatepark(): boolean {
    return this.districtId === 'skatepark' || this.districtId === 'camino-skate';
  }

  /** Lo que conviene hacer en el skatepark (o en el Mundo Voltio), en orden. */
  private skateStep(): { text: string; at: { x: number; z: number } | null } | null {
    const p = this.progress;
    const sk = this.world.skate;
    if (this.inside?.id === 'taller-pipa' && !this.parade.isActive) {
      const tal = this.world.taller;
      if (!this.motor.isActive) return { text: 'Llevá la energía del taller hasta el motor', at: this.connections.hasSelection() ? tal.motor : tal.source };
      if (!this.duck.isActive || !this.bell.isActive) {
        const next = !this.duck.isActive ? tal.duck : tal.bell;
        return { text: 'Del motor, un cable al pato y otro a la campana', at: this.connections.hasSelection() ? next : tal.motor };
      }
      return { text: 'El pato y la campana tienen que llegar los dos al desfile', at: tal.parade };
    }
    if (this.inside?.id === 'casa-nexus') {
      const next = HOME_ITEMS.filter((i) => !i.outside && !this.progress.hasFlag(`casa-${i.id}`)).sort((a, b) => a.cost - b.cost)[0];
      if (next) return { text: `Arreglá ${next.name} con chispitas de la mochila (${next.cost} ✦)`, at: next };
      return { text: '¡Tu casa quedó hermosa! Probá el armario, la radio y la cama', at: null };
    }
    if (this.inside?.id === 'cueva' && !this.progress.hasFlag('cave-lit')) {
      if (!this.progress.hasFlag('hood')) return { text: 'Está muy oscuro… Con la capucha ⚡ de Rulo se verían los cristales', at: null };
      if (!this.voltio.active) return { text: 'Ponete la capucha ⚡ para ver los cristales', at: null };
      const lit = this.voltio.litNodes('cave-lit');
      if (lit < 3) return { text: `Tocá los tres racimos de cristales (${lit}/3)`, at: CERRO.caveNodes[Math.min(lit, 2)] };
    }
    if (this.inside?.id === 'cueva' && this.voltio.active && this.voltio.isCaged('musguito')) {
      return { text: '¡Musguito está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: CERRO.caveChispi };
    }
    if (this.inside) {
      const t = this.inside.target;
      if (t && !t.isActive) return { text: `Llevá la energía de la habitación hasta ${t === this.fuse ? 'el' : 'la'} ${t.label.toLowerCase()}`, at: this.connections.hasSelection() ? t : (this.inside.info as ReviveRoom).source };
      return { text: `${this.inside.story[0].split(' · ').pop()}: hay una chispita escondida por acá`, at: null };
    }
    const park = this.parkStep() ?? this.stationStep() ?? this.cerroStep() ?? this.portStep() ?? this.forestStep() ?? this.farmStep() ?? this.factoryStep() ?? this.altoStep() ?? this.playaStep() ?? this.islaStep() ?? this.nieveStep();
    if (park) return park;
    if (this.voltio.active && !this.inSkatepark) {
      const me = this.nexus.position;
      const near = this.voltio.cageSpots.filter((c) => c.id !== 'rueditas' && Math.hypot(c.x - me.x, c.z - me.z) < 14);
      if (near.length) {
        const c = near.reduce((a, b) => (Math.hypot(a.x - me.x, a.z - me.z) < Math.hypot(b.x - me.x, b.z - me.z) ? a : b));
        return { text: `¡${CARD_BY_ID.get(c.id)!.name} está atrapado! Cerrá un círculo con tu estela alrededor de la jaula`, at: c };
      }
    }
    if (this.voltio.active && !this.inSkatepark && !p.hasFlag('cartas-open')) {
      const n = this.voltio.litNodes('cartas-open');
      return { text: `Tocá los tres nodos frente a la tienda de cartas (${n}/3)`, at: this.world.cardNodes[Math.min(n, 2)] };
    }
    if (this.voltio.active) {
      if (this.voltio.isCaged('rueditas')) return { text: 'Cerrá un círculo con tu estela alrededor de la jaula del Chispi', at: sk.chispi };
      if (!p.hasFlag('sala-open')) {
        const n = this.voltio.litNodes();
        return { text: `Tocá los tres nodos del circuito frente a la sala (${n}/3)`, at: sk.nodes[Math.min(n, 2)] };
      }
      return { text: 'Encerrá Estáticas con tu estela: se vuelven chispitas', at: null };
    }
    if (!this.inSkatepark) return null;
    if (!p.hasFlag('board')) return { text: 'Hablá con Rulo y agarrá su patineta', at: sk.board };
    if (!p.hasFlag('hood')) {
      const done = TRICKS.filter((t) => p.hasFlag(`trick-${t}`)).length;
      const next = TRICKS.find((t) => !p.hasFlag(`trick-${t}`));
      const at = next === 'air' ? sk.kickers[0] : next === 'grind' ? { x: sk.rails[0].ax + 4, z: sk.rails[0].az } : null;
      return { text: `Trucos para Rulo (${done}/3): ollie, volar en una rampita y grindar una baranda`, at };
    }
    if (!p.hasFlag('voltio-seen')) return { text: '¡Tu capucha brilla! Apretá ⚡ para entrar al Mundo Voltio', at: null };
    if (!p.hasChispi('rueditas')) return { text: 'Entrá al Mundo Voltio ⚡ y rescatá al Chispi atrapado', at: sk.chispi };
    if (!p.hasFlag('sala-open')) return { text: 'En el Mundo Voltio ⚡, cerrá el circuito de la sala', at: sk.nodes[0] };
    if (!this.ramp.isActive) return { text: 'Conectá la energía del skatepark con la rampa grande', at: sk.source };
    return { text: '¡El Skatepark volvió! Probá trucos y visitá la sala', at: null };
  }

  private ruloText(): string {
    const p = this.progress;
    if (!p.hasFlag('board')) {
      return '¡Ey! Soy Rulo. Desde que se apagó la Gran Chispa, el Skatepark está muerto… Mi patineta vieja está ahí al lado: ¡agarrala y mostrame qué sabés hacer!';
    }
    if (!p.hasFlag('hood')) {
      const done = TRICKS.filter((t) => p.hasFlag(`trick-${t}`)).length;
      return `Tres trucos: un ollie (saltá andando), volar en una rampita y grindar una baranda (caé sobre ella yendo a lo largo). Llevás ${done} de 3.`;
    }
    if (!p.hasChispi('rueditas')) return 'Con la capucha puesta (⚡) vas a ver la jaula de Estática. Corré a su alrededor: si cerrás el círculo con tu estela, se rompe.';
    if (!p.hasFlag('sala-open')) return 'Mi sala está cerrada desde el apagón. En el Mundo Voltio hay tres nodos frente a la puerta… tocalos todos.';
    if (!this.ramp.isActive) return 'Falta lo más importante: llevá la energía de la estrella hasta la rampa grande.';
    return '¡El Skatepark volvió! Sos el mejor patinador del barrio.';
  }

  /* ---------- Saltar, tirolesa y bailar (Decisión 042) ---------- */

  /** Gravedad, salto y plataformas (bancos, tachos, autos). */
  private updateVertical(dt: number): void {
    const p = this.nexus.position;
    // Grindando una baranda: no hay gravedad hasta llegar a la punta (o saltar)
    if (this.skate.grinding) {
      if (this.input.consumeJump()) {
        this.skate.leaveGrind();
        this.vy = JUMP_V;
        this.grounded = false;
      } else if (this.skate.updateGrind(this.nexus, dt)) {
        this.vy = 3.5;
        this.grounded = false;
      } else {
        this.nexus.airborne = false;
        this.nexus.grinding = true;
        this.audio.noise(0, 0.05, 0.015, 4000);
        return;
      }
      this.nexus.grinding = false;
    }
    if (this.input.consumeJump() && this.grounded && !this.busy && !this.nexus.dancing) {
      this.vy = JUMP_V * (this.voltio.active ? 1.2 : 1) * (this.helps('bosque') ? 1.2 : 1);
      this.companion?.cheer();
      this.grounded = false;
      if (this.nexus.riding) this.onTrick('ollie');
      this.audio.tone(520, 0, 0.12, 'triangle', 0.06);
      this.audio.tone(780, 0.05, 0.1, 'triangle', 0.05);
    }
    const prevY = p.y;
    this.vy -= GRAVITY * dt;
    p.y += this.vy * dt;
    const ground = this.world.groundAt(p.x, p.z, prevY);
    if (p.y <= ground) {
      if (!this.grounded && this.vy < -3) {
        this.nexus.land();
        this.audio.tone(150, 0, 0.08, 'triangle', 0.06);
      }
      p.y = ground;
      this.vy = 0;
      this.grounded = true;
      // Hongo del bosque: rebota muy alto
      if (Math.abs(ground - MUSHROOM_TOP) < 0.01 && FOREST.mushrooms.some(([mx, mz]) => Math.hypot(p.x - mx, p.z - mz) < MUSHROOM_R)) {
        this.vy = 12.5;
        this.grounded = false;
        this.progress.addCount('bounce');
        this.audio.tone(330, 0, 0.1, 'sine', 0.08);
        this.audio.tone(660, 0.06, 0.18, 'sine', 0.08);
      }
    } else {
      this.grounded = false;
    }
    // Patineta: rampitas que hacen volar y barandas para grindar
    if (this.nexus.riding) {
      const sk = this.world.skate;
      if (this.grounded) {
        const v = this.skate.kick(this.nexus, sk.kickers);
        if (v > 0) {
          this.vy = v;
          this.grounded = false;
          this.audio.tone(392, 0, 0.1, 'triangle', 0.06);
          this.audio.tone(784, 0.08, 0.16, 'triangle', 0.06);
          this.onTrick('air');
        }
      } else if (this.vy < 0 && this.skate.tryGrind(this.nexus, sk.rails, this.vy)) {
        this.vy = 0;
        this.nexus.grinding = true;
        this.audio.noise(0, 0.25, 0.05, 3500);
        this.onTrick('grind');
      }
    }
    this.nexus.airborne = !this.grounded;
  }

  /** Para las pruebas: saltar ahora. */
  jump(): void {
    this.input.queueJump();
  }

  private findNearestPole(objD: number): { pole: THREE.Vector3; line: THREE.Vector3[]; i: number } | null {
    const p = this.nexus.position;
    let best: { pole: THREE.Vector3; line: THREE.Vector3[]; i: number } | null = null;
    let bestD = 1.7;
    for (const line of this.world.zipLines) {
      line.forEach((pole, i) => {
        const d = Math.hypot(pole.x - p.x, pole.z - p.z);
        if (d < bestD && d < objD + 0.25) {
          bestD = d;
          best = { pole, line, i };
        }
      });
    }
    return best;
  }

  /** Engancharse al cable y deslizarse hasta el poste vecino que queda hacia donde mira el Nexus. */
  private startZip(np: { pole: THREE.Vector3; line: THREE.Vector3[]; i: number }): void {
    const options = [np.line[np.i - 1], np.line[np.i + 1]].filter(Boolean) as THREE.Vector3[];
    if (!options.length) return;
    const h = this.nexus.heading;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const score = (b: THREE.Vector3) => ((b.x - np.pole.x) * fx + (b.z - np.pole.z) * fz) / (Math.hypot(b.x - np.pole.x, b.z - np.pole.z) || 1);
    const b = options.reduce((x, y) => (score(x) >= score(y) ? x : y));
    const a = np.pole;
    if (b.y > a.y + 1.5) {
      this.setMessage('Para arriba no se puede: ¡subí saltando por las rocas!');
      return;
    }
    this.progress.addCount('zip');
    if (np.line === this.world.cerro.zipLine && !this.progress.hasFlag('zip-cerro')) this.progress.setFlag('zip-cerro');
    if (np.line === this.world.forest.zipLine && !this.progress.hasFlag('zip-tree')) this.progress.setFlag('zip-tree');
    if (np.line === this.world.factory.zipLine && !this.progress.hasFlag('zip-factory')) this.progress.setFlag('zip-factory');
    if (np.line === this.world.alto.zipLine && !this.progress.hasFlag('zip-alto')) this.progress.setFlag('zip-alto');
    if (np.line === this.world.nieve.zipLine) this.progress.setFlag(np.i === 1 ? 'zip-nieve-2' : 'zip-nieve');
    this.zip = { a, b, t: 0, dur: Math.hypot(b.x - a.x, b.z - a.z) / ZIP_SPEED, climb: 0, from: this.nexus.position.clone() };
    this.nexus.hanging = true;
    this.nexus.airborne = false;
    this.nexus.heading = Math.atan2(b.x - a.x, b.z - a.z);
    this.connections.cancel();
    this.audio.tone(660, 0, 0.1, 'square', 0.04);
    if (!this.progress.hasHeard('zip')) {
      this.progress.markHeard('zip');
      this.setMessage('¡Tirolesa! El Nexus se engancha con su cable');
    }
  }

  private updateZip(dt: number): void {
    const z = this.zip!;
    const p = this.nexus.position;
    const hangY = (t: number) => z.a.y + (z.b.y - z.a.y) * t - Math.sin(t * Math.PI) * ZIP_SAG - ZIP_HANG;
    // Primero sube hasta el cable
    if (z.climb < 1) {
      z.climb = Math.min(1, z.climb + dt / 0.45);
      const k = z.climb * z.climb * (3 - 2 * z.climb);
      p.set(z.from.x + (z.a.x - z.from.x) * k, z.from.y + (hangY(0) - z.from.y) * k, z.from.z + (z.a.z - z.from.z) * k);
      this.nexus.velocity.set(0, 0, 0);
      return;
    }
    // Se desliza (rápido en la bajada del cable, más lento al final)
    z.t = Math.min(1, z.t + dt / z.dur);
    const ease = z.t < 0.5 ? z.t : 0.5 + (z.t - 0.5) * (1 - (z.t - 0.5) * 0.6);
    const t = Math.min(1, ease);
    p.set(z.a.x + (z.b.x - z.a.x) * t, hangY(t), z.a.z + (z.b.z - z.a.z) * t);
    this.nexus.velocity.set(((z.b.x - z.a.x) / z.dur) * 0.4, 0, ((z.b.z - z.a.z) / z.dur) * 0.4);
    if (Math.random() < dt * 20) this.audio.noise(0, 0.05, 0.02, 3000);
    if (z.t >= 1) {
      // Se suelta un poquito antes del poste y cae (la gravedad hace el resto)
      const dx = z.b.x - z.a.x;
      const dz = z.b.z - z.a.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x = z.b.x - (dx / d) * 1.1;
      p.z = z.b.z - (dz / d) * 1.1;
      this.zip = null;
      this.nexus.hanging = false;
      this.vy = 0;
      this.grounded = false;
      this.nexus.velocity.set(0, 0, 0);
    }
  }

  /** ¡A bailar! El Nexus baila y los que están cerca se suman. */
  private danceParty(): void {
    this.nexus.dance();
    const p = this.nexus.position;
    let happy = 0;
    this.residents.forEach((r, i) => {
      if (Math.hypot(r.x - p.x, r.z - p.z) < 7) {
        r.dance(0.15 + i * 0.12);
        if (r.isHappy) happy += 1;
      }
    });
    for (const sl of this.sleepers) if (sl.isActive && Math.hypot(sl.x - p.x, sl.z - p.z) < 7) sl.poke();
    // Una melodía corta y alegre
    [523, 659, 784, 659, 880, 784, 659, 523].forEach((f, i) => this.audio.tone(f, i * 0.22, 0.18, 'triangle', 0.06));
    if (happy > 0) this.setMessage(happy > 1 ? '¡Todos bailan con el Nexus!' : '¡Bailan con el Nexus!');
  }

  finishTunnel(source: Connectable, target: Connectable, success: boolean, sparks = 0): void {
    this.input.flush();
    this.tunnelPending = false;
    // Dificultad adaptable: sube de a poco al ganar, baja al abandonar
    this.progress.tunnelSkill = this.progress.tunnelSkill + (success ? 0.1 : -0.12);
    this.connections.finishTunnel(source, target, success);
    // Ayudita de Feria: las carreras de luz ganadas dan dos chispitas más
    if (success && this.helps('feria')) sparks += 2;
    if (sparks > 0) {
      const before = this.progress.charge;
      this.addCharge(sparks);
      const got = this.progress.charge - before;
      after(1.4, () => this.toast(got > 0 ? `+${got} chispitas en tu mochila ✦` : '¡Tu mochila ya está llena!', 'ok'));
    }
  }

  /* ---------- HUD ---------- */

  /** Aviso de algo que acaba de pasar: se destaca unos segundos y después vuelve el objetivo. */
  private setMessage(m: string): void {
    if (!this.el.msg) return;
    this.el.msg.textContent = m;
    this.el.msg.classList.add('event');
    this.eventTimer = 5;
  }

  /** El objetivo actual (lo que conviene hacer ahora), en una línea. */
  private showObjective(): void {
    if (!this.el.msg) return;
    this.el.msg.textContent = this.statusMessage();
    this.el.msg.classList.remove('event');
    this.eventTimer = 0;
  }

  private toast(message: string, kind: FeedbackKind): void {
    if (!message || !this.el.toast) return;
    this.el.toast.textContent = message;
    this.el.toast.dataset.kind = kind;
    this.el.toast.classList.add('show');
    this.toastTimer = 1.6;
  }

  private updateHud(): void {
    const n = ZONE_FRAGMENTS.filter((f) => this.progress.hasFragment(f.id)).length;
    if (this.el.stars) this.el.stars.textContent = `★ ${n}/${ZONE_COUNT}`;
    if (this.el.awake) this.el.awake.textContent = `✦ ${this.awakeCount()}/${this.sleepers.length}`;
    const notesEl = document.getElementById('notesCount');
    if (notesEl) notesEl.textContent = `🎵 ${NOTES.filter((nt) => this.progress.hasFlag(nt.id)).length}/${NOTES.length}`;
    const piecesEl = document.getElementById('piecesCount');
    if (piecesEl) {
      piecesEl.hidden = !this.progress.hasFlag('chispa-rota');
      piecesEl.textContent = `◆ ${this.pieces}/${PIECES_TOTAL}`;
    }
    const qb = document.getElementById('questBtn');
    if (qb) {
      const pending = this.rewardsPending;
      qb.textContent = `📒 ${this.questsDone}/${QUESTS.length}${pending ? ` 🎁${pending}` : ''}`;
      qb.classList.toggle('has-reward', pending > 0);
    }
    const buddy = document.getElementById('buddy');
    if (buddy) {
      const card = this.companion ? CARD_BY_ID.get(this.companion.id) : null;
      buddy.hidden = !card;
      if (card) buddy.textContent = `${TYPES[card.type].icon} ${card.name}`;
    }
    const cardsEl = document.getElementById('cards');
    if (cardsEl) cardsEl.textContent = `🃏 ${this.progress.uniqueCards}/${TOTAL_CARDS}`;
    const c = this.progress.charge;
    if (this.el.charge) {
      this.el.charge.textContent = `🎒 ${'●'.repeat(c)}${'○'.repeat(MAX_CHARGE - c)}`;
      this.el.charge.classList.toggle('full', c === MAX_CHARGE);
    }
    this.nexus.charge = c / MAX_CHARGE;
  }

  /* ---------- Cosas dormidas (chisperos + objetos chicos para despertar) ---------- */

  awakeCount(): number {
    return this.sleepers.filter((s) => s.isActive).length;
  }

  /**
   * Ubica los chisperos y las cosas dormidas. Las coordenadas son aproximadas: si el lugar
   * está ocupado, se busca uno libre en espiral alrededor (no quedan dentro de casas ni objetos).
   */
  private buildSleepers(): void {
    const scene = this.world.scene;
    const taken: { x: number; z: number }[] = [
      ...this.connections.all.map((o) => ({ x: o.x, z: o.z })),
      ...Object.values(WorldMode.RESIDENT_SPOTS),
    ];
    const place = (x: number, z: number): [number, number] => {
      for (let ring = 0; ring <= 10; ring += 1) {
        const steps = ring === 0 ? 1 : 10;
        for (let i = 0; i < steps; i += 1) {
          const a = (i / steps) * Math.PI * 2;
          const px = x + Math.cos(a) * ring * 0.5;
          const pz = z + Math.sin(a) * ring * 0.5;
          if (this.world.isWalkable(px, pz, 0.8) && taken.every((t) => Math.hypot(t.x - px, t.z - pz) > 1.8)) {
            taken.push({ x: px, z: pz });
            return [px, pz];
          }
        }
      }
      taken.push({ x, z });
      return [x, z];
    };
    const addObj = (o: Spark | Sleeper) => {
      keepVivid(o.group);
      scene.add(o.group);
      this.connections.register(o);
    };

    for (const [id, x, z] of [
      ['spark-plaza', -10.5, -11.5],
      ['spark-fountain', -29, 17.5],
      ['spark-shops', 26, 17.5],
      ['spark-ne', 35, -7.5],
      ['spark-canal', -4, 26],
      ['spark-garden', -22, 49.5],
    ] as const) {
      const [px, pz] = place(x, z);
      const sp = new Spark(id, px, pz);
      addObj(sp);
      this.sparks.push(sp);
    }

    const free: [SleeperKind, number, number][] = [
      ['mailbox', -7.5, -15],
      ['birdhouse', -25, -9.5],
      ['trash', -12, -7.5],
      ['hydrant', -27.5, 6],
      ['balloons', -13, 24.5],
      ['icecream', 16.5, 17],
      ['bike', 35.5, 17],
      ['radio', 21, 17.5],
      ['clothes', 33, -6.5],
      ['birdhouse', 14, -8.5],
      ['gnome', -24.5, 54],
      ['pinwheel', -8, 50],
    ];
    let n = 0;
    const make = (kind: SleeperKind, x: number, z: number, rot = 0) => {
      const sl = new Sleeper(`sleeper-${kind}-${n++}`, kind, x, z, rot);
      addObj(sl);
      this.sleepers.push(sl);
    };
    for (const [kind, x, z] of free) {
      const [px, pz] = place(x, z);
      make(kind, px, pz, Math.PI / 4);
    }
    // Fijos: el cartel en la vidriera de la heladería, el pato sobre el borde de la fuente,
    // las luces de cuatro autos y dos caños del canal
    make('neon', 12, 14.02, 0);
    make('duck', -20 + 2.42 * Math.SQRT1_2, 16 + 2.42 * Math.SQRT1_2, Math.PI / 4);
    for (const i of [0, 1, 2, 4]) {
      const c = this.world.carSpots[i];
      if (!c) continue;
      make('car', c.x + Math.sin(c.rot) * 2.36, c.z + Math.cos(c.rot) * 2.36, c.rot);
    }
    for (const x of [-14, 6]) make('drain', x, CANAL_MIN_Z - 0.8, 0);
    // Fase 5: cuatro más en el barrio del canal sur (al final, así no cambian los ids guardados)
    for (const [kind, x, z] of [
      ['balloons', 29, 61.5],
      ['pinwheel', 12.5, 61.8],
      ['gnome', 34.5, 55.2],
      ['birdhouse', 7, 57],
      // Fase 6: en el parque
      ['balloons', 9, -56],
      ['icecream', -25, -60],
      ['pinwheel', 29, -80],
      // Fase 11: frascos de luciérnagas en el bosque
      ...FOREST.fireflies.map(([x, z]): [SleeperKind, number, number] => ['firefly', x, z]),
      // Fase 12: vacas y gallinas de la granja
      ...FARM.animals,
      // Fase 13: búhos (solo despiertan de noche)
      ['owl', -40, -18],
      ['owl', 30, -66],
      ['owl', -68, -8],
      ['owl', -98, -60],
      // Fase 14: robots ayudantes de la fábrica
      ...FACTORY.robots.map(([x, z]): [SleeperKind, number, number] => ['robot', x, z]),
      // Fase 15: gatos del Barrio Alto
      ...ALTO.cats.map(([x, z]): [SleeperKind, number, number] => ['cat', x, z]),
      // Fase 16: cangrejos de la orilla
      ...PLAYA.crabs.map(([x, z]): [SleeperKind, number, number] => ['crab', x, z]),
      // Fase 17: tortugas de la isla
      ...ISLA.turtles.map(([x, z]): [SleeperKind, number, number] => ['turtle', x, z]),
      // Fase 18: muñecos de nieve
      ...NIEVE.snowmen.map(([x, z]): [SleeperKind, number, number] => ['snowman', x, z]),
    ] as [SleeperKind, number, number][]) {
      const [px, pz] = place(x, z);
      make(kind, px, pz, Math.PI / 4);
    }

    Sleeper.audio = this.audio;
    // Nidos de chispitas: al tocarlos sueltan chispitas que hay que atrapar
    Spark.onRelease = (nest) => {
      this.pickups.burst(3, nest.x, nest.z, 1.3);
      this.audio.tone(990, 0, 0.1, 'sine', 0.08);
      this.audio.tone(1320, 0.08, 0.12, 'sine', 0.08);
      this.setMessage('¡El nido soltó chispitas! Atrápalas para tu mochila');
    };
    Spark.onEmpty = () => this.toast('Este nido se está volviendo a llenar de chispitas. Vuelve en un ratito', 'info');
    // Chispitas escondidas por el barrio (las que ya se juntaron no vuelven)
    for (const [id, x, z] of HIDDEN_SPARKS) {
      if (this.progress.hasSpark(id)) continue;
      const [px, pz] = place(x, z);
      this.pickups.addHidden(id, px, pz);
    }
    // Chispitas altas: arriba del techo de tres autos (saltar al capó y después al techo)
    // y en el medio de dos cables de la tirolesa (se juntan colgado)
    [0, 2, 3].forEach((ci, k) => {
      const c = this.world.carSpots[ci];
      const id = `spark-high-${k}`;
      if (c && !this.progress.hasSpark(id)) this.pickups.addHidden(id, c.roofX, c.roofZ, 1.9 + 0.95);
    });
    const roomSpark = this.world.interior.spark;
    if (!this.progress.hasSpark(roomSpark.id)) this.pickups.addHidden(roomSpark.id, roomSpark.x, roomSpark.z, roomSpark.y);
    this.world.zipLines.forEach((line, k) => {
      const i = Math.floor(line.length / 2) - 1;
      const a = line[i];
      const b = line[i + 1];
      const id = `spark-zip-${k}`;
      if (a && b && !this.progress.hasSpark(id)) this.pickups.addHidden(id, (a.x + b.x) / 2, (a.z + b.z) / 2, a.y - ZIP_SAG - ZIP_HANG + 0.9);
    });
  }

  /** La primera vez que el Nexus pasa junto a un nido, se explica para qué sirve. */
  private sparkTip(): void {
    if (this.progress.hasHeard('sparks')) return;
    const p = this.nexus.position;
    if (!this.sparks.some((s) => Math.hypot(s.x - p.x, s.z - p.z) < 3.5)) return;
    this.progress.markHeard('sparks');
    this.showStory(
      'Nido de chispitas',
      'Acá se juntan chispitas perdidas de la Gran Chispa. Tócalo y atrápalas con tu mochila. Con la mochila cargada puedes despertar las cosas dormidas (las que tienen «Zzz»).',
    );
  }

  /* ---------- Mochila Atrapachispas ---------- */

  /** Carga actual de la mochila (también para las pruebas). */
  get charge(): number {
    return this.progress.charge;
  }

  /** Para las pruebas y ajustes: fija la carga de la mochila. */
  setCharge(n: number): void {
    this.progress.addCharge(n - this.progress.charge);
    this.updateHud();
  }

  private addCharge(n: number): void {
    const got = this.progress.addCharge(n);
    if (got > 0) {
      this.nexus.sparkle();
      this.audio.tone(1500 + this.progress.charge * 80, 0, 0.1, 'sine', 0.08);
    }
    this.updateHud();
  }

  /** Despertar una cosa chica gastando una chispita de la mochila. */
  private wakeWithBackpack(sl: Sleeper): void {
    if (this.connections.hasSelection()) this.connections.cancel();
    if (sl.isActive) {
      sl.poke();
      return;
    }
    if (sl.kind === 'owl' && !this.isNight) {
      this.setMessage('El búho duerme de día: volvé de noche 🌙 (o dormí una siesta en tu casa)');
      return;
    }
    if (this.progress.charge <= 0) {
      this.toast('Tu mochila está vacía: junta chispitas ✦', 'info');
      if (!this.progress.hasHeard('empty-pack')) {
        this.progress.markHeard('empty-pack');
        this.showStory(
          'Mochila Atrapachispas',
          'Las cosas dormidas se despiertan con chispitas de tu mochila. Hay chispitas escondidas por el barrio, en los nidos de chispitas y adentro de los cables, en cada carrera de luz.',
        );
      }
      return;
    }
    this.progress.addCharge(-1);
    this.connections.zap(this.nexus.plugPoint(), sl);
    sl.activate();
    this.progress.saveConnection('mochila', sl.id);
    this.onWake(sl, true);
  }

  /** La carrera de luz que corresponde a un objeto grande (tema según el lugar, dificultad adaptada). */
  tunnelPlanFor(target: Connectable): TunnelPlan {
    const zones: [Connectable[], string][] = [
      [[this.lamp, this.door], 'plaza'],
      [[this.fountain], 'fountain'],
      [[this.beacon], 'beacon'],
      [[this.bridge], 'bridge'],
      [[this.ramp], 'skate'],
      [[this.fuse], 'casa'],
      [[this.iceMachine], 'helado'],
      [[this.cardDisplay], 'cartas'],
      [[this.motor], 'taller'],
      [[this.lanterns.first], 'faroles'],
      [[this.stage], 'fiesta'],
      [[this.carousel, this.wheel], 'feria'],
      [[this.coaster], 'montana'],
      [[this.mirrorBall], 'espejos'],
      [[this.train], 'via'],
      [[this.cascade], 'hielo'],
      [[this.boat], 'mar'],
      [[this.lighthouse], 'faro'],
      [[this.forestLever], 'bridge'],
      [[this.campfire], 'fogon'],
      [this.mills, 'molino'],
      [[this.greenhouse], 'garden'],
      [[this.incubator, this.tractor], 'granja'],
      [[this.belts[0], this.boiler], 'fabrica'],
      [this.stalls, 'mercado'],
      [[this.fridge, this.castle], 'playa'],
      [[this.farito], 'farito'],
      [[this.lancha], 'lancha'],
      [[this.runes[0]], 'templo'],
      [[this.heart], 'volcan'],
      [[this.chairlift], 'nieve'],
      [[this.telescope], 'estrellas'],
      [[this.projector], 'cine'],
      [[this.libLamp], 'biblio'],
    ];
    const zone = zones.find(([list]) => list.includes(target))?.[1] ?? 'garden';
    return planTunnel(zone, this.progress.tunnelSkill);
  }

  /** Una cosa dormida se despertó: un poquito de color alrededor y el contador. */
  private onWake(sl: Sleeper, animate: boolean): void {
    this.addLife(sl.x, sl.z, this.helps('flor') ? 5.2 : 3.2, animate);
    this.updateHud();
    if (!animate) return;
    this.setMessage(SLEEPER_INFO[sl.kind].wake);
    const n = this.awakeCount();
    if (n === this.sleepers.length) {
      after(1.2, () => {
        this.setMessage('¡Despertaste todas las cosas del barrio!');
        this.audio.playCollect();
        this.nexus.celebrate();
        const at = this.nexus.position.clone();
        at.y = 1.5;
        this.connections.celebrate(at);
      });
    }
  }

  get isIso(): boolean {
    return this.iso;
  }

  setView(iso: boolean): void {
    if (this.inside) {
      this.isoOutside = iso;
      localStorage.setItem(VIEW_KEY, iso ? 'iso' : 'chase');
      return;
    }
    this.iso = iso;
    localStorage.setItem(VIEW_KEY, iso ? 'iso' : 'chase');
    this.camYaw = this.nexus.heading;
  }

  get camera(): THREE.Camera {
    return this.iso ? this.isoCam : this.chaseCam;
  }

  /* ---------- Bromas de conexiones equivocadas (CONNECTION_SURPRISES de la 2D) ---------- */

  private onSurprise(source: Connectable, target: Connectable): boolean {
    const surprise = connectionSurprise(source.id, target.id);
    if (!surprise) return false;
    this.showStory(surprise.speaker, surprise.line);
    // El objeto "se queja" con un temblor corto
    const g = target.group;
    const base = g.rotation.z;
    tween(0.5, (k) => (g.rotation.z = base + Math.sin(k * Math.PI * 6) * 0.06 * (1 - k)), { easing: (t) => t });
    return true;
  }

  /* ---------- Nombres flotantes sobre los objetos ---------- */

  /**
   * Etiquetas HTML (no sprites): así no las borronea el filtro de pincel y se leen nítidas en el celular.
   * Aparecen al acercarse y siguen al objeto en pantalla.
   */
  private makeLabels(): void {
    const layer = document.getElementById('labels');
    if (!layer) return;
    for (const obj of this.connections.all) {
      if (!obj.label) continue;
      const el = document.createElement('div');
      el.className = 'obj-label';
      el.textContent = obj.label;
      layer.appendChild(el);
      this.labels.push({ obj, el, alpha: 0 });
    }
  }

  private updateLabels(dt: number): void {
    const p = this.nexus.position;
    const v = new THREE.Vector3();
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const label of this.labels) {
      const near = label.obj.distanceFrom(p.x, p.z) < 5 && !this.busy;
      label.alpha += ((near ? 1 : 0) - label.alpha) * Math.min(1, dt * 8);
      label.obj.plugPoint(v);
      v.set(label.obj.x, Math.max(v.y, 1) + 1.0, label.obj.z).project(this.camera);
      const visible = label.alpha > 0.02 && v.z < 1;
      label.el.style.opacity = visible ? label.alpha.toFixed(2) : '0';
      if (visible) label.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }

  /* ---------- Habitantes (capítulo 1 de la 2D, ver src/data/chapter.ts) ---------- */

  /** Dónde está cada vecino en el barrio 3D y qué zona lo pone contento. */
  private static readonly RESIDENT_SPOTS: Record<string, { x: number; z: number; faceX: number; faceZ: number }> = {
    miga: { x: -16.5, z: -12.8, faceX: -20, faceZ: -11 },
    bombo: { x: -13.6, z: 19.5, faceX: -20, faceZ: 16 },
    vera: { x: 31.5, z: -21, faceX: 27, faceZ: -18 },
    'don-paso': { x: 21.5, z: 27, faceX: 18, faceZ: 29 },
    goteo: { x: -1.6, z: 55.6, faceX: -6, faceZ: 54 },
    pipa: { x: 696.6, z: -1.3, faceX: 700, faceZ: 1 },
    lucio: { x: FESTIVAL.lucio.x, z: FESTIVAL.lucio.z, faceX: FESTIVAL.lucio.faceX, faceZ: FESTIVAL.lucio.faceZ },
  };

  private placeResidents(): void {
    for (const info of RESIDENTS) {
      const spot = WorldMode.RESIDENT_SPOTS[info.id];
      if (!spot) continue; // Goteo, Pipa y Lucio llegan con sus zonas
      const r = new Resident3D(info.id, info.name, spot.x, spot.z, Math.atan2(spot.faceX - spot.x, spot.faceZ - spot.z));
      r.setHeard(this.progress.hasHeard(info.id));
      this.world.scene.add(r.root);
      this.residents.push(r);
    }
    // Tita, la feriante del Parque de diversiones (Fase 6)
    const tp = PARK.tita;
    const tita = new Resident3D('tita', 'Tita', tp.x, tp.z, Math.atan2(tp.faceX - tp.x, tp.faceZ - tp.z));
    tita.setHeard(this.progress.hasHeard('tita'));
    this.world.scene.add(tita.root);
    this.residents.push(tita);
    // Nora, la jefa de estación (Fase 7)
    const ns = STATION.nora;
    const nora = new Resident3D('nora', 'Nora', ns.x, ns.z, Math.atan2(ns.faceX - ns.x, ns.faceZ - ns.z));
    nora.setHeard(this.progress.hasHeard('nora'));
    this.world.scene.add(nora.root);
    this.residents.push(nora);
    // Don Kiosko y Luli, del Barrio Alto (Fase 15); Coral, de la Playa (Fase 16)
    for (const [id, name, at] of [
      ['kiosko', 'Don Kiosko', ALTO.kiosko],
      ['luli', 'Luli', ALTO.luli],
      ['coral', 'Coral', PLAYA.coral],
      ['pip', 'Pip', ISLA.pip],
      ['lupa', 'Profesora Lupa', NIEVE.lupa],
    ] as [string, string, { x: number; z: number; faceX: number; faceZ: number }][]) {
      const r = new Resident3D(id, name, at.x, at.z, Math.atan2(at.faceX - at.x, at.faceZ - at.z));
      r.setHeard(this.progress.hasHeard(id));
      this.world.scene.add(r.root);
      this.residents.push(r);
    }
    // Ingeniera Tuerca, de la Fábrica de Chispas (Fase 14)
    const fs = FACTORY.tuerca;
    const tuerca = new Resident3D('tuerca', 'Ingeniera Tuerca', fs.x, fs.z, Math.atan2(fs.faceX - fs.x, fs.faceZ - fs.z));
    tuerca.setHeard(this.progress.hasHeard('tuerca'));
    this.world.scene.add(tuerca.root);
    this.residents.push(tuerca);
    // Abuela Trigo, la granjera (Fase 12)
    const ts = FARM.trigo;
    const trigo = new Resident3D('trigo', 'Abuela Trigo', ts.x, ts.z, Math.atan2(ts.faceX - ts.x, ts.faceZ - ts.z));
    trigo.setHeard(this.progress.hasHeard('trigo'));
    this.world.scene.add(trigo.root);
    this.residents.push(trigo);
    // Yuyo, el botánico del Bosque (Fase 11)
    const ys = FOREST.yuyo;
    const yuyo = new Resident3D('yuyo', 'Yuyo', ys.x, ys.z, Math.atan2(ys.faceX - ys.x, ys.faceZ - ys.z));
    yuyo.setHeard(this.progress.hasHeard('yuyo'));
    this.world.scene.add(yuyo.root);
    this.residents.push(yuyo);
    // Marina, la capitana del Puerto (Fase 9)
    const ms = PORT.marina;
    const marina = new Resident3D('marina', 'Marina', ms.x, ms.z, Math.atan2(ms.faceX - ms.x, ms.faceZ - ms.z));
    marina.setHeard(this.progress.hasHeard('marina'));
    this.world.scene.add(marina.root);
    this.residents.push(marina);
    // Lalo, el guardaparque del Cerro (Fase 8)
    const ls = CERRO.lalo;
    const lalo = new Resident3D('lalo', 'Lalo', ls.x, ls.z, Math.atan2(ls.faceX - ls.x, ls.faceZ - ls.z));
    lalo.setHeard(this.progress.hasHeard('lalo'));
    this.world.scene.add(lalo.root);
    this.residents.push(lalo);
    // Rulo, el patinador del Skatepark (Fase 1)
    const rs = this.world.skate.rulo;
    const rulo = new Resident3D('rulo', 'Rulo', rs.x, rs.z, Math.atan2(rs.faceX - rs.x, rs.faceZ - rs.z));
    rulo.setHeard(this.progress.hasHeard('rulo'));
    this.world.scene.add(rulo.root);
    this.residents.push(rulo);
    this.updateResidentMoods(true);
  }

  /** Cada vecino está triste hasta que su lugar recupera la vida. */
  private updateResidentMoods(instant = false): void {
    const restored: Record<string, boolean> = {
      miga: this.door.isActive,
      bombo: this.fountain.isActive,
      vera: this.beacon.isFullyActive,
      'don-paso': this.bridge.isActive,
      goteo: this.flowerBed.isActive,
      rulo: this.ramp.isActive,
      pipa: this.parade.isActive,
      lucio: this.lanterns.last.isActive,
      tita: this.parkDone === 3,
      nora: this.train.isActive,
      lalo: this.cerroDone,
      marina: this.boat.isActive,
      yuyo: this.campfire.isActive,
      trigo: this.progress.hasFlag('fields-grown'),
      tuerca: this.machine.isActive,
      kiosko: this.progress.hasFlag('alto-market'),
      luli: this.libLamp.isActive,
      coral: this.farito.isActive,
      pip: this.altar.isActive && this.heart.isActive,
      lupa: this.telescope.isActive,
    };
    for (const r of this.residents) r.setHappy(restored[r.id] ?? false, instant);
  }

  private residentText(r: Resident3D): string {
    if (r.id === 'rulo') return this.ruloText();
    if (r.id === 'tita') return this.titaText();
    if (r.id === 'nora') return this.noraText();
    if (r.id === 'lalo') return this.laloText();
    if (r.id === 'marina') return this.marinaText();
    if (r.id === 'yuyo') return this.yuyoText();
    if (r.id === 'trigo') return this.trigoText();
    if (r.id === 'tuerca') return this.tuercaText();
    if (r.id === 'kiosko') return this.kioskoText();
    if (r.id === 'luli') return this.luliText();
    if (r.id === 'coral') return this.coralText();
    if (r.id === 'pip') return this.pipText();
    if (r.id === 'lupa') return this.lupaText();
    const info = RESIDENTS.find((i) => i.id === r.id)!;
    // En 3D la fuente todavía no tiene bomba ni válvulas (eso es de la 2D): Bombo pide otra cosa
    if (r.id === 'bombo' && !this.fountain.isActive) {
      return 'Mi fuente se quedó sin agua y el barrio sin ritmo. Llévale energía desde la estrella de al lado.';
    }
    return residentLine(info, this.progress.snapshot());
  }

  /** `asked` = el jugador eligió hablar (botón o toque); el saludo automático no abre cambios. */
  private speak(r: Resident3D, asked = true): void {
    this.progress.markHeard(r.id);
    r.setHeard(true);
    r.talk();
    this.nexus.wave();
    // Cartas: cada vecino tiene un Chispi para cambiar por una carta repetida
    const offer = CARDS.find((k) => k.trader === r.id);
    const dups = this.progress.duplicates;
    if (asked && offer && !this.progress.hasCard(offer.id) && dups.length && this.cb.trade) {
      this.cb.trade({
        who: r.id,
        name: r.name,
        card: offer.id,
        duplicates: dups,
        text: `¿Me cambiás una carta repetida por mi ${offer.name}? ${offer.phrase}`,
      });
      return;
    }
    let text = this.residentText(r);
    if (offer && !this.progress.hasCard(offer.id) && this.progress.uniqueCards > 0) {
      text += dups.length
        ? ` (¡Tenés cartas repetidas! Hablame y te cambio a mi Chispi ${offer.name}.)`
        : ` (Si conseguís una carta repetida, te cambio a mi Chispi ${offer.name}.)`;
    }
    this.showStory(r.name, text);
  }

  /** Cambio con un vecino: da una repetida y recibe su Chispi. Devuelve la carta recibida. */
  trade(who: string, give: string): string | null {
    const offer = CARDS.find((k) => k.trader === who);
    if (!offer || this.progress.hasCard(offer.id) || !this.progress.giveCard(give)) return null;
    this.progress.addCard(offer.id);
    this.audio.playCollect();
    this.residents.find((r) => r.id === who)?.talk();
    this.updateHud();
    return offer.id;
  }

  /* ---------- Parque de diversiones (Fase 6) ---------- */

  /** Cuántos juegos del parque revivieron (0..3). */
  get parkDone(): number {
    return [this.carousel, this.wheel, this.coaster].filter((r) => r.isActive).length;
  }

  /** Juego en el que está subido el Nexus (id) o null. */
  get onRide(): string | null {
    return this.rideOn?.id ?? null;
  }

  /** Chispitas arriba de la vía de la montaña rusa: solo se juntan andando en ella. */
  private placeCoasterSparks(): void {
    [0.32, 0.5, 0.68, 0.84].forEach((t, i) => {
      const id = `spark-coaster-${i}`;
      if (this.progress.hasSpark(id) || this.pickups.items.some((p) => p.id === id)) return;
      const p = this.coaster.worldPoint(t);
      this.pickups.addHidden(id, p.x, p.z, p.y + 0.3 + 0.9);
    });
  }

  /** ¿Hay un juego vivo (y destrabado) al lado para subirse? */
  private findRideSpot(): (Ride & Connectable) | null {
    if (this.rideOn || this.busy || this.zip || this.inside || this.voltio.active || this.connections.hasSelection() || this.nexus.riding) return null;
    const p = this.nexus.position;
    for (const r of [this.carousel, this.wheel, this.coaster, this.boat, this.tractor, this.lancha, this.chairlift] as (Ride & Connectable)[]) {
      if (!r.isActive) continue;
      if (Math.abs(p.y - ((r.boardAt as { y?: number }).y ?? 0)) > 1.2) continue;
      if (Math.hypot(p.x - r.boardAt.x, p.z - r.boardAt.z) < 1.9) return r;
    }
    return null;
  }

  boardRide(r: Ride & Connectable): void {
    this.dismount();
    this.rideOn = r;
    r.startRide();
    this.nexus.velocity.set(0, 0, 0);
    this.vy = 0;
    this.audio.tone(523, 0, 0.1, 'triangle', 0.07);
    this.audio.tone(784, 0.08, 0.14, 'triangle', 0.07);
    this.companion?.cheer();
    if (!this.progress.hasFlag(`ride-${r.id}`)) {
      this.progress.setFlag(`ride-${r.id}`);
      this.toast(r === this.coaster ? '¡Agarrate fuerte! Juntá las chispitas de la vía' : '¡Wiii! Tocá «Bajar» cuando quieras', 'info');
    }
  }

  leaveRide(): void {
    const r = this.rideOn;
    if (!r) return;
    this.rideOn = null;
    (r as unknown as { stopRide?: () => void }).stopRide?.();
    this.nexus.position.set(r.boardAt.x, (r.boardAt as { y?: number }).y ?? 0, r.boardAt.z);
    this.nexus.airborne = false;
    this.grounded = true;
    this.vy = 0;
    this.nexus.heading = Math.PI / 4;
  }

  /** Subido a un juego: el Nexus va pegado al asiento. */
  private updateRideOn(dt: number): void {
    const r = this.rideOn!;
    if (!r.updateRide(dt)) {
      this.leaveRide();
      this.setMessage(r === this.coaster ? '¡Qué vuelta! ¿Otra?' : '¡Qué lindo paseo!');
      return;
    }
    const seat = r.seat();
    const v = new THREE.Vector3();
    seat.getWorldPosition(v);
    this.nexus.position.copy(v);
    const q = new THREE.Quaternion();
    seat.getWorldQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    if (Math.hypot(fwd.x, fwd.z) > 0.2) this.nexus.heading = Math.atan2(fwd.x, fwd.z);
    this.nexus.velocity.set(0, 0, 0);
    this.nexus.airborne = false;
  }

  private titaText(): string {
    if (!this.carousel.isActive) return '¡Pasen y vean! Bueno… cuando haya luz. La calesita se apagó con la Gran Chispa: ¿le llevás energía?';
    if (!this.wheel.unlocked || !this.coaster.unlocked) return 'La vuelta al mundo y la montaña rusa tienen el motor trabado. Dicen que con una capucha especial se ven sus cables…';
    if (this.parkDone < 3) return '¡Los motores están libres! Falta llevarles energía.';
    return '¡El parque está más vivo que nunca! Subite a la montaña rusa: arriba de la vía hay chispitas.';
  }

  /** Lo que conviene hacer en el parque (o en sus cables). */
  private parkStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'parque' || this.inside) return null;
    const lit = (id: string) => this.voltio.litNodes(id);
    const hood = this.progress.hasFlag('hood');
    if (this.voltio.active) {
      if (!this.wheel.unlocked) return { text: `Tocá los tres nodos de la vuelta al mundo (${lit('wheel-open')}/3)`, at: PARK.wheelNodes[Math.min(lit('wheel-open'), 2)] };
      if (!this.coaster.unlocked) return { text: `Tocá los tres nodos de la montaña rusa (${lit('coaster-open')}/3)`, at: PARK.coasterNodes[Math.min(lit('coaster-open'), 2)] };
      if (this.voltio.isCaged('pochoclin')) return { text: '¡Pochoclín está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: PARK.chispi };
      return { text: 'Los motores del parque están libres: sacate la capucha y llevales energía', at: null };
    }
    if (!this.carousel.isActive) return { text: 'Parque: conectá la energía con la calesita', at: PARK.carouselSource };
    if (!this.wheel.unlocked || !this.coaster.unlocked) {
      return {
        text: hood ? 'Los motores de los juegos están trabados: ponete la capucha ⚡ y mirá sus cables' : 'Los motores están trabados… Rulo, en el Skatepark, sabe de cables',
        at: hood ? (!this.wheel.unlocked ? PARK.wheelNodes[0] : PARK.coasterNodes[0]) : null,
      };
    }
    if (!this.wheel.isActive) return { text: 'Parque: conectá la energía con la vuelta al mundo', at: PARK.wheelSource };
    if (!this.coaster.isActive) return { text: 'Parque: conectá la energía con la montaña rusa', at: PARK.coasterSource };
    if (!this.world.espejos.gray.alive) return { text: 'Parque: entrá a la casa de los espejos', at: { x: PARK.mirror.doorX, z: PARK.mirror.z + 3.4 } };
    return { text: '¡El parque está vivo! Subite a los juegos', at: null };
  }

  /* ---------- Fase 7: Estación y tren ---------- */

  /** Postes de parada en cada distrito abierto (los de distritos nuevos aparecen con su fase). */
  private buildStops(): void {
    for (const st of TRAIN_STOPS) {
      if (st.need && !DISTRICTS.find((d) => d.id === st.id)?.open) continue;
      const g = makeStop(st.name);
      g.position.set(st.x, 0, st.z);
      keepVivid(g);
      this.world.scene.add(g);
      this.world.circles.push({ x: st.x, z: st.z, r: 0.2 });
      this.stops.push({ id: st.id, name: st.name, x: st.x, z: st.z });
    }
  }

  get trainAwake(): boolean {
    return this.train.isActive;
  }

  /** Paradas para el cartel de viaje: dónde estás y adónde se puede ir. */
  get trainStops(): { id: string; name: string; here: boolean; visited: boolean }[] {
    const here = this.nearStop()?.id ?? (this.stops.find((s) => DISTRICTS.find((d) => d.id === s.id) === districtAt(this.nexus.position.x, this.nexus.position.z))?.id ?? '');
    return this.stops.map((s) => ({ id: s.id, name: s.name, here: s.id === here, visited: this.progress.hasFlag(`train-${s.id}`) }));
  }

  private nearStop(): { id: string; name: string; x: number; z: number } | null {
    if (this.inside || this.voltio.active) return null;
    const p = this.nexus.position;
    let best: (typeof this.stops)[number] | null = null;
    let bd = 1.9;
    for (const s of this.stops) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** Viaje rápido en tren hasta la parada `id` (desde una parada o desde el mapa). */
  travelTo(id: string): void {
    const st = this.stops.find((s) => s.id === id);
    if (!st || !this.train.isActive || this.inside) return;
    this.dismount();
    if (this.rideOn) this.leaveRide();
    if (this.voltio.active) this.exitVoltio();
    this.train.depart();
    this.audio.tone(660, 0, 0.18, 'square', 0.05);
    this.audio.tone(880, 0.2, 0.3, 'square', 0.05);
    this.crossDoor(() => {
      // Bajás al lado del cartel, del lado de la vereda
      let tx = st.x + 1.4;
      let tz = st.z + 1.2;
      for (let ring = 0; ring < 8 && !this.world.isWalkable(tx, tz, 0.5); ring += 1) {
        const a = ring * 0.9;
        tx = st.x + Math.cos(a) * 1.6;
        tz = st.z + Math.sin(a) * 1.6;
      }
      this.nexus.position.set(tx, 0, tz);
      this.nexus.velocity.set(0, 0, 0);
      this.progress.setFlag(`train-${id}`);
      this.progress.addCount('trips');
      const visited = this.stops.filter((s) => this.progress.hasFlag(`train-${s.id}`)).length;
      this.toast(`🚂 ¡Llegaste a ${st.name}!`, 'ok');
      if (visited >= 4 && !this.progress.hasFlag('train-tour')) {
        this.progress.setFlag('train-tour');
        this.pickups.burst(4, tx, tz, 1.4);
        this.setMessage('¡Conociste cuatro paradas! Ahora la ciudad entera queda cerquita');
      }
      this.refreshObjectiveSoon();
    });
  }

  private noraText(): string {
    if (!this.train.unlocked) return 'Soy Nora, la jefa de estación. El tren se durmió y tiene el motor trabado. Con la capucha ⚡ se ven sus cables… ¡pero cuidado con las Estáticas!';
    if (!this.train.isActive) return '¡El motor está libre! Falta lo más lindo: llevarle energía con el cable. ¡Fiii!';
    if (!this.progress.hasFlag('train-tour')) return '¡Pasajeros al tren! Tocá cualquier parada 🚂 y elegí adónde ir. Te regalo el boleto.';
    return '¡Qué lindo es tener el tren andando! Ahora se llega a cualquier lado en un ratito. ¡Fiii!';
  }

  /** Lo que conviene hacer en la Estación. */
  private stationStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'estacion' || this.inside) return null;
    const hood = this.progress.hasFlag('hood');
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('train-open');
      if (!this.train.unlocked) return { text: `Tocá los tres nodos de las vías (${lit}/3)`, at: STATION.nodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('rielito')) return { text: '¡Rielito está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: STATION.chispi };
      return { text: 'El motor del tren está libre: sacate la capucha y llevale energía', at: null };
    }
    if (!this.train.unlocked) {
      return { text: hood ? 'El tren tiene el motor trabado: ponete la capucha ⚡ y mirá los cables de las vías' : 'El tren tiene el motor trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? STATION.nodes[0] : null };
    }
    if (!this.train.isActive) return { text: 'Estación: conectá la energía con el tren', at: STATION.source };
    if (!this.progress.hasFlag('train-tour')) return { text: 'Subite al tren en una parada 🚂 y conocé cuatro paradas', at: this.stops.find((s) => s.id === 'estacion') ?? null };
    return null;
  }

  /* ---------- La casa del Nexus y el armario ---------- */

  /** ¿Están arregladas todas las cosas de adentro? */
  get homeInsideDone(): boolean {
    return HOME_ITEMS.filter((i) => !i.outside).every((i) => this.progress.hasFlag(`casa-${i.id}`));
  }

  /** Las cosas de la casa (para el objetivo y las pruebas). */
  get homeItems(): HomeItemInfo[] {
    return HOME_ITEMS;
  }

  get homeFixed(): number {
    return HOME_ITEMS.filter((i) => this.progress.hasFlag(`casa-${i.id}`)).length;
  }

  private findHomeSpot(): HomeItemInfo | null {
    if (this.voltio.active || this.busy || this.zip) return null;
    const inHome = this.inside?.id === 'casa-nexus';
    if (this.inside && !inHome) return null;
    const p = this.nexus.position;
    let best: HomeItemInfo | null = null;
    let bd = 1.7;
    for (const it of HOME_ITEMS) {
      if (!!it.outside === inHome) continue;
      const fixed = this.progress.hasFlag(`casa-${it.id}`);
      if (fixed && !it.use) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  private homeLabel(it: HomeItemInfo): string {
    return this.progress.hasFlag(`casa-${it.id}`) ? it.use! : `🔧 Arreglar · ${it.cost}✦`;
  }

  /** Arreglar una cosa de la casa (con chispitas) o usarla si ya está arreglada. */
  useHomeItem(it: HomeItemInfo): void {
    if (this.progress.hasFlag(`casa-${it.id}`)) {
      if (it.id === 'armario') this.cb.wardrobe?.();
      else if (it.id === 'radio') this.playSong();
      else if (it.id === 'cama') this.nap();
      else if (it.id === 'estante') this.showMemories();
      return;
    }
    if (this.charge < it.cost) {
      this.setMessage(`Para arreglar ${it.name} hacen falta ${it.cost} ✦ (tenés ${this.charge}). Juntá chispitas en los nidos y en las carreras de luz`);
      this.audio.playError();
      return;
    }
    this.progress.addCharge(-it.cost);
    this.progress.setFlag(`casa-${it.id}`);
    this.world.home.fix(it.id, true);
    this.audio.playSuccess();
    this.nexus.celebrate();
    this.toast(`🔧 ¡Arreglaste ${it.name}!`, 'ok');
    if (it.use) after(0.6, () => this.setMessage(`¡Listo! Ahora ${it.name} sirve: ${it.use}`));
    if (!it.outside && this.homeInsideDone) {
      this.world.home.gray.revive(true);
      after(0.8, () => this.showStory('Tu casa', '¡Tu casa quedó hermosa! Ahora tenés armario para cambiarte, radio con la canción de la ciudad y una cama para la siesta.'));
    }
    if (it.outside) this.addLife(it.x, it.z, 6, true);
    if (this.homeFixed === HOME_ITEMS.length && !this.progress.hasFlag('casa-lista')) {
      this.progress.setFlag('casa-lista');
      after(1.2, () => this.setMessage('¡La casa del Nexus está completa! Es la más linda del barrio'));
    }
    this.refreshObjectiveSoon();
  }

  /** Menú → «Mi Nexus» sin armario todavía. */
  wardrobeLocked(): void {
    this.setMessage('Tu ropa está en el armario de tu casa (cruzando el canal, al lado del jardín municipal): arreglalo con chispitas');
  }

  /** La cama: siesta cortita que recarga la capucha. */
  private nap(): void {
    this.crossDoor(() => {
      this.voltio.voltage = this.voltio.maxVolt;
      const wasNight = this.isNight;
      this.clock = wasNight ? 0.05 : 0.64;
      this.progress.setCount('clock', this.clock);
      if (!this.progress.hasFlag('napped')) this.progress.setFlag('napped');
      this.setMessage(wasNight ? '☀️ ¡Buen día! Dormiste toda la noche (y la capucha quedó cargada)' : '🌙 Dormiste hasta la noche… ¡salí a ver las estrellas! (la capucha quedó cargada)');
    });
  }

  private showMemories(): void {
    const stars = this.fragments.filter((f) => f.isCollected).length;
    this.setMessage(`🏛️ Recuerdos: ★ ${stars} fragmentos · ✦ ${this.awakeCount()} cosas despiertas · 🃏 ${this.progress.uniqueCards} cartas · ⚡ ${this.progress.chispis.length} Chispis`);
  }

  /* ---------- Fase 18: Montaña nevada y observatorio ---------- */

  /** Telesilla de dos estaciones (como la lancha), cima, escalera, trineo y el telescopio de noche. */
  private updateNieve(): void {
    if (!this.rideOn && this.progress.count('telesilla-side') !== this.chairlift.side) this.progress.setCount('telesilla-side', this.chairlift.side);
    const p = this.nexus.position;
    if (this.chairlift.isActive && !this.rideOn) {
      const o = this.chairlift.otherDock;
      if (Math.hypot(p.x - o.x, p.z - o.z) < 1.6 && Math.abs(p.y - o.y) < 1.2) {
        this.chairlift.setSide(this.chairlift.side === 0 ? 1 : 0);
        this.setMessage('¡La telesilla vino a buscarte!');
      }
    }
    if (this.inside?.id === 'observatorio' && this.telescope.isActive && this.isNight && !this.progress.hasFlag('telescopio-noche')) {
      this.progress.setFlag('telescopio-noche');
      this.toast('🔭 ¡Qué estrellas! Encargo de noche', 'ok');
    }
    if (this.districtId !== 'nieve' || this.inside) return;
    const S = SUMMIT;
    const onSummit = p.y > S.h - 0.3 && p.x > S.minX && p.x < S.maxX && p.z > S.minZ && p.z < S.maxZ;
    if (onSummit && !this.progress.hasFlag('nieve-top')) {
      this.progress.setFlag('nieve-top');
      this.addLife(2, -144, 14, true);
      this.toast('🏔 ¡En la cima de la Montaña!', 'ok');
    }
    const top = SUMMIT_STEPS[SUMMIT_STEPS.length - 1];
    if (!this.progress.hasFlag('nieve-steps') && !this.rideOn && Math.abs(p.y - top.h) < 0.2 && p.x > top.minX && p.x < top.maxX && p.z > top.minZ && p.z < top.maxZ) {
      this.progress.setFlag('nieve-steps');
      this.toast('🪨 ¡Subiste toda la escalera!', 'ok');
    }
    if (this.nexus.riding && !this.grounded && p.y > 1 && !this.progress.hasFlag('snow-air')) {
      this.progress.setFlag('snow-air');
      this.toast('🛷 ¡Volaste en la nieve!', 'ok');
    }
    void LEDGE;
  }

  private lupaText(): string {
    if (!this.chairlift.isActive) return 'Soy la Profesora Lupa. Mi observatorio está allá arriba… ¿le llevás energía a la telesilla? (O subí por la escalera de piedras, ¡es larga!)';
    if (!this.progress.hasFlag('domo-open')) return 'La línea de energía del observatorio se cortó acá abajo. Con la capucha ⚡ se ven sus nodos.';
    if (!this.telescope.isActive) return 'Ya hay energía arriba: entrá al observatorio y prendé el telescopio.';
    return 'Con el telescopio marqué las Piezas en tu mapa. ¡Tocá el mapa para ver toda la ciudad!';
  }

  /** Lo que conviene hacer en la Montaña. */
  private nieveStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'nieve' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('domo-open');
      if (!this.progress.hasFlag('domo-open')) return { text: `Tocá los tres nodos de la línea del observatorio (${lit}/3)`, at: NIEVE.domeNodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('frecuencio')) return { text: '¡Frecuencio está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: NIEVE.chispi };
      return null;
    }
    if (!this.chairlift.isActive) return { text: 'Montaña: llevale energía a la telesilla', at: NIEVE.liftSource };
    if (!this.progress.hasFlag('domo-open')) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'La línea del observatorio está cortada: ponete la capucha ⚡' : 'La línea del observatorio está cortada… Rulo sabe ver cables', at: hood ? NIEVE.domeNodes[0] : null };
    }
    if (!this.telescope.isActive) {
      if (this.nexus.position.y < SUMMIT.h - 0.5) return { text: 'Subí a la cima (telesilla o escalera) y entrá al observatorio', at: NIEVE.liftBase };
      return { text: 'Entrá al observatorio y prendé el telescopio', at: { x: NIEVE.observatory.x, z: NIEVE.observatory.z + NIEVE.observatory.r + 1 } };
    }
    return null;
  }

  /** Piezas que faltan, para el mapa (solo con el telescopio prendido). */
  private missingPieces(): { x: number; z: number; name: string }[] {
    if (!this.progress.hasFlag('telescopio')) return [];
    const out: { x: number; z: number; name: string }[] = [];
    for (const id of QUEST_DISTRICTS) {
      if (NO_PIECE.has(id) || this.progress.hasFlag(`pieza-${id}`)) continue;
      const d = DISTRICTS.find((k) => k.id === id);
      if (d) out.push({ x: (d.minX + d.maxX) / 2, z: (d.minZ + d.maxZ) / 2, name: d.name });
    }
    return out;
  }

  /* ---------- Fase 17: Isla misteriosa ---------- */

  private echoT = 0;

  /** La lancha recuerda de qué lado quedó; Marina la trae si la llamás del otro muelle; cueva del eco, cima y vertiente. */
  private updateIsla(dt: number): void {
    this.world.isla.update(this.time);
    if (!this.rideOn && this.progress.count('lancha-side') !== this.lancha.side) this.progress.setCount('lancha-side', this.lancha.side);
    const p = this.nexus.position;
    if (this.lancha.isActive && !this.rideOn) {
      const o = this.lancha.otherDock;
      if (Math.hypot(p.x - o.x, p.z - o.z) < 1.6) {
        this.lancha.setSide(this.lancha.side === 0 ? 1 : 0);
        this.setMessage('¡Marina te vio y trajo la lancha!');
      }
    }
    if (this.districtId !== 'isla') return;
    if (!this.progress.hasFlag('isla-visit')) {
      this.progress.setFlag('isla-visit');
      this.toast('🏝 ¡Llegaste a la Isla misteriosa!', 'ok');
    }
    const C = ISLA.cave;
    this.echoT -= dt;
    if (Math.hypot(p.x - C.x, p.z - C.z) < C.r - 0.6 && this.echoT <= 0) {
      this.echoT = 4;
      [523, 523, 523].forEach((f, i) => this.audio.tone(f, i * 0.35, 0.2, 'sine', 0.07 / (i + 1)));
      this.setMessage('¡Hola… hola… hola…! (eco)');
      if (!this.progress.hasFlag('cueva-eco')) this.progress.setFlag('cueva-eco');
    }
    if (!this.progress.hasFlag('volcan-top') && p.y > VOLCANO.h - 0.3 && Math.hypot(p.x - VOLCANO.x, p.z - VOLCANO.z) < VOLCANO.r) {
      this.progress.setFlag('volcan-top');
      this.toast('🌋 ¡En la cima del volcán!', 'ok');
    }
    if (this.heart.isActive && !this.progress.hasFlag('vertiente') && Math.hypot(p.x - ISLA.spring.x, p.z - ISLA.spring.z) < 2.6) {
      this.progress.setFlag('vertiente');
      this.toast('♨️ ¡Qué agüita tibia!', 'ok');
    }
  }

  private pipText(): string {
    if (!this.progress.hasFlag('templo-open')) return 'Soy Pip. Vivo acá hace mucho… La puerta del templo está cerrada con cables que solo se ven con la capucha ⚡.';
    if (!this.altar.isActive) return 'Adentro del templo hay un mural. ¡Seguí su orden! Luna, sol, estrella… y el altar.';
    if (!this.heart.isActive) return 'El volcán duerme hace siglos. Si subís por las rocas, en el cráter está su corazón. No te preocupes: es un volcán bueno.';
    return 'La isla brilla otra vez. La chispa antigua estaría orgullosa de vos.';
  }

  /** Lo que conviene hacer en la isla. */
  private islaStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'isla' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('templo-open');
      if (!this.progress.hasFlag('templo-open')) return { text: `Tocá los tres nodos del templo (${lit}/3)`, at: ISLA.templeNodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('caracolin')) return { text: '¡Caracolín está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: ISLA.chispi };
      return null;
    }
    if (!this.progress.hasFlag('templo-open')) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'La puerta del templo está cerrada: ponete la capucha ⚡' : 'La puerta del templo tiene cables escondidos… Rulo sabe verlos', at: hood ? ISLA.templeNodes[0] : null };
    }
    if (!this.altar.isActive) return { text: 'Entrá al templo: piedras en el orden del mural y el altar', at: { x: ISLA.temple.x, z: ISLA.temple.z + ISLA.temple.d / 2 + 1 } };
    if (!this.heart.isActive) {
      if (this.nexus.position.y < VOLCANO.h - 0.5) return { text: 'Subí al volcán saltando por las rocas en espiral', at: { x: 37.7, z: 183.2 } };
      return { text: 'Llevá la energía de la piedra caliente al corazón del volcán', at: ISLA.heartSource };
    }
    return null;
  }

  /* ---------- Fase 16: Playa ---------- */

  private surfAir = false;

  /** Surf: el mar de la orilla es caminable solo en patineta; olas que se mueven; torre de Coral. */
  private updatePlaya(dt: number): void {
    const riding = this.nexus.riding && !this.inside;
    World.setSurf(riding);
    const t = this.time;
    this.world.playa.waveMeshes.forEach((m, i) => (m.position.y = -0.05 + Math.sin(t * 1.6 + i) * 0.06));
    void dt;
    const p = this.nexus.position;
    const S = SURF_REGION;
    const onSea = p.z > S.minZ + 0.6 && p.x > S.minX && p.x < S.maxX && p.z < S.maxZ;
    if (riding && onSea) {
      if (!this.progress.hasFlag('surf')) {
        this.progress.setFlag('surf');
        this.toast('🏄 ¡Surfeando!', 'ok');
      }
      if (!this.grounded && p.y > 1) this.surfAir = true;
      if (this.surfAir && !this.progress.hasFlag('surf-air')) {
        this.progress.setFlag('surf-air');
        this.toast('🌊 ¡Saltaste una ola!', 'ok');
      }
    } else this.surfAir = false;
    const T = PLAYA.tower;
    if (!this.progress.hasFlag('torre-coral') && p.y > T.h - 0.2 && p.x > T.minX && p.x < T.maxX && p.z > T.minZ && p.z < T.maxZ) {
      this.progress.setFlag('torre-coral');
      this.addLife(104, 82, 12, true);
      this.toast('🛟 ¡Arriba de la torre de Coral!', 'ok');
    }
  }

  private coralText(): string {
    if (!this.fridge.isActive) return '¡Hola! Soy Coral, la salvavidas. Hace un calor… ¿le llevás energía a la heladera del kiosco?';
    if (!this.castle.isActive) return 'Los chicos dejaron un castillo de arena a medio hacer. Dicen que con el balde de chispas crece solo.';
    if (!this.progress.hasFlag('muelle-open')) return 'El portón de la escollera se trabó. Sus cables se ven con la capucha ⚡.';
    if (!this.farito.isActive) return 'El faro chiquito necesita dos cables a la vez: el del panel solar y el del molinito.';
    if (!this.progress.hasFlag('surf')) return '¿Sabías que con la patineta se puede surfear? Subite y andá derecho al mar.';
    return '¡La playa está hermosa! Si agarrás una ola rápido, volás.';
  }

  /** Lo que conviene hacer en la Playa. */
  private playaStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'playa' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('muelle-open');
      if (!this.progress.hasFlag('muelle-open')) return { text: `Tocá los tres nodos de la escollera (${lit}/3)`, at: PLAYA.nodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('olita')) return { text: '¡Olita está atrapada! Cerrá un círculo con tu estela alrededor de la jaula', at: PLAYA.chispi };
      return null;
    }
    if (!this.fridge.isActive) return { text: 'Playa: llevale energía a la heladera del kiosco', at: PLAYA.kioscoSource };
    if (!this.castle.isActive) return { text: 'Playa: el balde de chispas hace crecer el castillo', at: PLAYA.castleSource };
    if (!this.progress.hasFlag('muelle-open')) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'El portón de la escollera está trabado: ponete la capucha ⚡' : 'El portón de la escollera está trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? PLAYA.nodes[0] : null };
    }
    if (!this.farito.isActive) {
      const n = this.farito.inputCount;
      return { text: `El faro chiquito necesita dos cables (${n}/2): panel solar y molinito`, at: n === 0 ? PLAYA.panel : PLAYA.wind };
    }
    return null;
  }

  /* ---------- Fase 15: Barrio Alto y mercado ---------- */

  /** Película del cine (solo se dibuja si el Nexus está adentro) y techos de las terrazas. */
  private updateAlto(dt: number): void {
    if (this.projector.isActive && this.inside?.id === 'cine') {
      this.filmT += dt;
      this.world.alto.film(this.filmT);
    }
    const p = this.nexus.position;
    if (p.y < 0.9 || this.districtId !== 'alto') return;
    const roof = ALTO.roofs.find((r) => p.x > r.minX - 0.2 && p.x < r.maxX + 0.2 && p.z > r.minZ - 0.2 && p.z < r.maxZ + 0.2 && Math.abs(p.y - r.h) < 0.3);
    if (!roof) return;
    if (this.nexus.riding && !this.progress.hasFlag('roof-board')) {
      this.progress.setFlag('roof-board');
      this.toast('🛹 ¡En patineta sobre un techo!', 'ok');
    }
    if (roof.h === 5 && !this.progress.hasFlag('alto-top')) {
      this.progress.setFlag('alto-top');
      this.addLife(146.5, 11, 15, true);
      this.toast('🏙 ¡Arriba de todo! Las terrazas recuperaron el color', 'ok');
    }
  }

  private kioskoText(): string {
    const n = this.stalls.filter((s) => s.isActive).length;
    if (n === 0) return '¡Buenas! Soy Don Kiosko. Desde el apagón el mercado está cerrado… Llevá la energía a un puesto y después cada puesto le pasa la luz a otro.';
    if (n < 6) return `¡Van ${n} puestos de 6! Tocá un puesto prendido y pasale el cable a uno apagado.`;
    if (!this.projector.isActive) return '¡El mercado volvió! Y se prendió el cartel del cine: entrá y prendé el proyector.';
    return '¡Qué lindo barrio otra vez! ¿Probaste subir a los techos en patineta? Hay una rampita al pie de las terrazas.';
  }

  private luliText(): string {
    if (!this.libLamp.isActive) {
      return this.progress.hasFlag('biblio-open')
        ? '¡Se destrabó el farol! Llevale energía desde la estrella de al lado.'
        : 'Hola, soy Luli. El farol de lectura de la biblioteca se trabó. Dicen que sus cables se ven con la capucha ⚡.';
    }
    return '¿Leíste el libro que flota? Y desde el techo más alto se ve toda la ciudad… ¡hay notas escondidas arriba!';
  }

  /** Lo que conviene hacer en el Barrio Alto. */
  private altoStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'alto' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('biblio-open');
      if (!this.progress.hasFlag('biblio-open')) return { text: `Tocá los tres nodos del farol (${lit}/3)`, at: ALTO.libNodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('turbochispa')) return { text: '¡Turbochispa está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: ALTO.chispi };
      return null;
    }
    const lit = this.stalls.filter((s) => s.isActive);
    if (lit.length === 0) return { text: 'Mercado: llevá la energía a un puesto', at: ALTO.marketSource };
    if (lit.length < 6) {
      const off = this.stalls.find((s) => !s.isActive)!;
      return { text: `Mercado: pasale la luz de un puesto prendido a otro (${lit.length}/6)`, at: off };
    }
    if (!this.projector.isActive) return { text: 'Entrá al cine y prendé el proyector', at: { x: ALTO.cine.doorX, z: ALTO.cine.z + ALTO.cine.d / 2 + 1 } };
    if (!this.libLamp.isActive) {
      const hood = this.progress.hasFlag('hood');
      if (this.libLamp.unlocked) return { text: 'Llevale energía al farol de la biblioteca', at: ALTO.libSource };
      return { text: hood ? 'El farol de la biblioteca está trabado: ponete la capucha ⚡' : 'El farol de la biblioteca está trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? ALTO.libNodes[0] : null };
    }
    return null;
  }

  /* ---------- Fase 14: Fábrica de Chispas ---------- */

  /** Cintas con cajas que avanzan, montacargas que sube y baja (y lleva al Nexus), techo del depósito. */
  private updateFactory(dt: number): void {
    const F = this.world.factory;
    const running = this.belts.map((b) => b.isActive);
    for (const crate of F.boxes) {
      const b = crate.userData.belt as { x: number; z: number };
      const i = FACTORY.belts.indexOf(b as (typeof FACTORY.belts)[number]);
      if (!running[i]) continue;
      crate.position.x += dt * 1.2;
      if (crate.position.x > b.x + 2.8) crate.position.x = b.x - 2.8;
    }
    if (!this.belts[2].isActive) return;
    const p = this.nexus.position;
    const prev = (F.liftRect.h ?? 0.05) - 0.05;
    this.liftT += dt;
    const h = liftHeight(this.liftT);
    F.liftRect.h = h + 0.05;
    F.liftMesh.position.y = h;
    const on = p.x > F.liftRect.minX - 0.1 && p.x < F.liftRect.maxX + 0.1 && p.z > F.liftRect.minZ - 0.1 && p.z < F.liftRect.maxZ + 0.1;
    // Llevar al Nexus si está parado arriba
    if (on && !this.zip && Math.abs(p.y - prev) < 0.35 && this.vy <= 0.1) {
      p.y = h + 0.05;
      this.vy = 0;
      this.grounded = true;
    }
    const W = FACTORY.warehouse;
    if (!this.progress.hasFlag('roof-factory') && p.y > W.h - 0.5 && p.x > W.minX && p.x < W.maxX && p.z > W.minZ && p.z < W.maxZ) {
      this.progress.setFlag('roof-factory');
      this.toast('🏭 ¡Arriba del depósito!', 'ok');
    }
  }

  private tuercaText(): string {
    if (!this.belts[2].isActive) return 'Soy la Ingeniera Tuerca. En la fábrica todo va en orden: primero la cinta 1, después la 2 y después la 3. ¡Si no, se traba!';
    if (!this.progress.hasFlag('fabrica-open')) return 'El portón de la sala de máquinas está trabado. Sus cables se ven con la capucha ⚡… ¡andá con cuidado!';
    if (!this.machine.isActive) return 'Adentro está la Gran Máquina, donde se hizo la Gran Chispa. Caldera, engranaje y máquina: en ese orden.';
    return '¿Viste el plano? Con las 12 Piezas, el faro puede armar la Gran Chispa para siempre. ¡Contamos con vos!';
  }

  /** Lo que conviene hacer en la fábrica. */
  private factoryStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'fabrica' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('fabrica-open');
      if (!this.progress.hasFlag('fabrica-open')) return { text: `Tocá los tres nodos del portón (${lit}/3)`, at: FACTORY.gateNodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('faroluz')) return { text: '¡Faroluz está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: FACTORY.chispi };
      return null;
    }
    const next = this.belts.findIndex((b) => !b.isActive);
    if (next === 0) return { text: 'Fábrica: llevá la energía a la cinta 1', at: FACTORY.beltSource };
    if (next > 0) return { text: `Fábrica: de la cinta ${next} a la cinta ${next + 1}`, at: this.belts[next - 1] };
    if (!this.progress.hasFlag('fabrica-open')) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'El portón está trabado: ponete la capucha ⚡ y mirá sus cables' : 'El portón está trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? FACTORY.gateNodes[0] : null };
    }
    if (!this.machine.isActive) return { text: 'Entrá a la sala de máquinas y despertá la Gran Máquina', at: { x: FACTORY.hall.doorX, z: FACTORY.hall.z + 7 } };
    return null;
  }

  /* ---------- Fase 13: Día y noche ---------- */

  /** Hora del día (0 = amanecer … 1 = amanecer siguiente). Un día dura DAY_LENGTH segundos de juego. */
  clock = 0.1;
  private clockSave = 0;
  private lantern: THREE.PointLight | null = null;
  static DAY_LENGTH = 480;

  /** 0 = día, 1 = noche cerrada (con atardecer y amanecer suaves). */
  get night(): number {
    const c = this.clock;
    const s = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
    const up = s(0.55, 0.63, c);
    const down = s(0.92, 0.99, c);
    const k = up * (1 - down);
    return k * k * (3 - 2 * k);
  }

  get isNight(): boolean {
    return this.night > 0.6;
  }

  /** Para pruebas y la cama: pone la hora (0..1). */
  setClock(c: number): void {
    this.clock = ((c % 1) + 1) % 1;
    this.progress.setCount('clock', this.clock);
  }

  private updateClock(dt: number): void {
    if (!this.inside) this.clock = (this.clock + dt / WorldMode.DAY_LENGTH) % 1;
    this.clockSave -= dt;
    if (this.clockSave <= 0) {
      this.clockSave = 5;
      this.progress.setCount('clock', this.clock);
    }
    const n = this.inside ? 0 : this.night;
    this.world.night = n;
    if (!this.lantern) {
      this.lantern = new THREE.PointLight('#ffd9a0', 0, 12, 1.5);
      this.lantern.position.set(0, 3.2, -0.4);
      this.nexus.root.add(this.lantern);
    }
    this.lantern.intensity = 5 * n;
    const pill = document.getElementById('clockPill');
    if (pill) pill.textContent = this.isNight ? '🌙' : this.night > 0.05 ? '🌆' : '☀️';
    if (this.isNight && !this.progress.hasFlag('night-seen')) {
      this.progress.setFlag('night-seen');
      this.showStory('Lucio · ¡Se hizo de noche!', 'De noche la ciudad cambia: se prenden los faroles, salen las estrellas y los búhos se despiertan. Mirá la libreta 📒: hay encargos que solo se pueden hacer de noche.');
    }
    if (!this.isNight || this.inside) return;
    const p = this.nexus.position;
    const T = CERRO.top;
    const mark = (f: string) => {
      if (this.progress.hasFlag(f)) return;
      this.progress.setFlag(f);
      this.toast('🌙 ¡Encargo de noche!', 'ok');
    };
    if (p.y > TOP_H - 0.4 && p.x > T.minX && p.x < T.maxX && p.z > T.minZ && p.z < T.maxZ) mark('stars-cerro');
    if (p.y > TREE.top - 0.4 && Math.hypot(p.x - TREE.x, p.z - TREE.z) < TREE.r + 0.8) mark('tree-night');
    if (this.rideOn === this.wheel) mark('wheel-night');
    if (this.lighthouse.isActive && Math.hypot(p.x - PORT.lighthouse.x, p.z - PORT.lighthouse.z) < 9) mark('faro-night');
    if (this.nexus.dancing && this.districtId === 'bosque') mark('dance-fireflies');
  }

  /* ---------- Fase 12: Granja y molinos ---------- */

  private checkMaze(): void {
    if (this.progress.hasFlag('maze-center') || this.inside) return;
    const p = this.nexus.position;
    if (Math.hypot(p.x - FARM.mazeCenter.x, p.z - FARM.mazeCenter.z) > 2) return;
    this.progress.setFlag('maze-center');
    this.audio.playSuccess();
    this.nexus.celebrate();
    this.showStory('Abuela Trigo · ¡Llegaste!', '¡Encontraste al espantapájaros! Se llama Don Paja y dice que hace años que nadie lo visitaba.');
    this.refreshObjectiveSoon();
  }

  private trigoText(): string {
    const n = this.mills.filter((m) => m.isActive).length;
    if (n < 3) return `Soy la Abuela Trigo. Sin la Gran Chispa los molinos no giran y los campos no crecen. Ya giran ${n} de 3. El último tiene el motor trabado: dicen que con una capucha especial se ven sus cables.`;
    if (!this.incubator.isActive) return '¡Qué lindos los campos! Ahora el granero: la incubadora no calienta y los huevitos esperan.';
    if (!this.progress.hasFlag('maze-center')) return 'En el maizal vive Don Paja, el espantapájaros. ¿Te animás a encontrarlo en el laberinto?';
    return '¡La granja está más viva que nunca! Subite al tractor cuando quieras: da la vuelta a los campos.';
  }

  /** Lo que conviene hacer en la granja. */
  private farmStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'granja' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('molino-open');
      if (!this.mills[2].unlocked) return { text: `Tocá los tres nodos del molino (${lit}/3)`, at: FARM.millNodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('girasolin')) return { text: '¡Girasolín está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: FARM.chispi };
      return null;
    }
    const next = this.mills.findIndex((m) => !m.isActive && m.unlocked);
    if (next >= 0) return { text: `Granja: llevale energía al molino (${this.mills.filter((m) => m.isActive).length}/3)`, at: FARM.mills[next].source };
    if (!this.mills[2].unlocked) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'El último molino tiene el motor trabado: ponete la capucha ⚡ y mirá sus cables' : 'El último molino tiene el motor trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? FARM.millNodes[0] : null };
    }
    if (!this.incubator.isActive) return { text: 'Entrá al granero y prendé la incubadora', at: { x: FARM.barn.doorX, z: FARM.barn.z + 4.4 } };
    return null;
  }

  /* ---------- Fase 11: Bosque de las luciérnagas ---------- */

  private checkTreeTop(): void {
    if (this.progress.hasFlag('tree-top') || this.inside) return;
    const p = this.nexus.position;
    if (p.y < TREE.top - 0.3 || Math.hypot(p.x - TREE.x, p.z - TREE.z) > TREE.r + 0.8) return;
    this.progress.setFlag('tree-top');
    this.audio.playSuccess();
    this.addLife(TREE.x, TREE.z, 10, true);
    this.showStory('Yuyo · La casa del árbol', '¡Llegaste a la copa! Desde acá se ve el bosque entero. Para bajar, tirate por la tirolesa: te deja al lado del puente.');
    this.refreshObjectiveSoon();
  }

  private yuyoText(): string {
    if (!this.forestLever.isActive) return 'Soy Yuyo, el botánico. El arroyo partió el bosque y el puente colgante se desarmó. ¿Le llevás energía a la palanca?';
    if (!this.campfire.isActive) return 'Con el apagón se apagó el fogón del claro y el bosque se quedó gris. Un cable desde la estrella lo prende.';
    if (!this.progress.hasFlag('tree-top')) return 'El árbol gigante tiene una casita arriba. Las plataformas suben en espiral: ¡saltá de una a otra!';
    return '¿Viste los hongos colorados? Si saltás encima, ¡boing! Te mandan bien alto.';
  }

  /** Lo que conviene hacer en el bosque. */
  private forestStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'bosque' || this.inside) return null;
    if (this.voltio.active) {
      if (this.voltio.isCaged('pinita')) return { text: '¡Piñita está atrapada! Cerrá un círculo con tu estela alrededor de la jaula', at: FOREST.chispi };
      return null;
    }
    if (!this.forestLever.isActive) return { text: 'Bosque: conectá la energía con la palanca del puente colgante', at: FOREST.bridgeSource };
    if (!this.campfire.isActive) return { text: 'Bosque: prendé el fogón del claro con un cable', at: FOREST.fireSource };
    if (!this.progress.hasFlag('tree-top')) return { text: 'Subí por las plataformas del árbol gigante hasta la casita', at: { x: TREE.x + 3.5, z: TREE.z + 1 } };
    return null;
  }

  /* ---------- Fase 9: Puerto y faro (final) ---------- */

  /** Lo que falta para que el faro pueda traer la Gran Chispa. */
  get finalMissing(): string[] {
    const out: string[] = [];
    if (!this.chapterDone) out.push('la fiesta del Centro');
    if (this.parkDone < 3) out.push('los juegos del parque');
    if (!this.train.isActive) out.push('el tren');
    if (!this.cascade.isActive) out.push('la cascada del cerro');
    if (!this.boat.isActive) out.push('el bote de Marina');
    return out;
  }

  get gameDone(): boolean {
    return this.progress.hasFlag('gran-chispa');
  }

  /** Los instrumentos de la canción de la ciudad que ya suenan (uno por distrito con vida). */
  get songLayers(): Instrument[] {
    // Con la Gran Chispa de vuelta, canta la ciudad entera
    if (this.gameDone) return [...INSTRUMENTS];
    const out: Instrument[] = [];
    if (this.zonesDone() >= 4) out.push('centro');
    if (this.ramp.isActive) out.push('skatepark');
    if (this.parkDone === 3) out.push('parque');
    if (this.train.isActive) out.push('estacion');
    if (this.cascade.isActive) out.push('cerro');
    if (this.lighthouse.isActive || this.boat.isActive) out.push('puerto');
    return out;
  }

  /** Menú → «Canción de la ciudad»: suena con los instrumentos de los distritos que ya revivieron. */
  playSong(): void {
    const layers = this.songLayers;
    if (!layers.length) {
      this.setMessage('La ciudad todavía no tiene música: cada distrito que revive suma un instrumento');
      return;
    }
    this.song.play(layers, 2);
    this.nexus.dance();
    this.setMessage(`🎵 ${layers.map((l) => INSTRUMENT_NAMES[l]).join(' · ')} (${layers.length}/6)`);
  }

  /** El faro prendió: vuelve la Gran Chispa, toda la ciudad recupera la vida y llegan los créditos. */
  private finale(animate: boolean): void {
    const L = PORT.lighthouse;
    const top = new THREE.Vector3(L.x, this.lighthouse.lampY, L.z);
    // Queda flotando a la vista, arriba del Nexus (que está en el muelle del faro)
    const n = this.nexus.position;
    const sky = new THREE.Vector3(n.x - 3, 6.5, n.z - 4);
    if (!animate) {
      // La Gran Chispa ya se partió (o se parte ahora, en partidas de antes de la expansión)
      this.reviveWholeTown(false);
      if (!this.progress.hasFlag('chispa-rota')) this.progress.setFlag('chispa-rota');
      return;
    }
    this.progress.setFlag('gran-chispa');
    this.audio.playSuccess();
    flashScreen(450);
    this.granChispa.launch(top, sky);
    this.setMessage('¡El faro prendió! Mirá: ¡vuelve la Gran Chispa!');
    after(3, () => {
      flashScreen(600);
      this.reviveWholeTown(true);
      for (let i = 0; i < 6; i += 1) after(i * 0.3, () => this.connections.celebrate(new THREE.Vector3(L.x + Math.cos(i) * 4, 4 + i, L.z + Math.sin(i) * 4)));
      // Todos los vecinos llegan al puerto a festejar alrededor del Nexus
      const c = this.nexus.position;
      this.residents.forEach((r, i) => {
        const a = (i / this.residents.length) * Math.PI * 2;
        let x = c.x + Math.cos(a) * 3.2;
        let z = c.z + Math.sin(a) * 3.2;
        if (!this.world.isWalkable(x, z, 0.3)) {
          x = PORT.plaza.x + Math.cos(a) * 3.2;
          z = PORT.plaza.z + Math.sin(a) * 3.2;
        }
        r.root.position.set(x, 0, z);
        r.setHappy(true);
        r.dance(i * 0.12);
      });
      this.nexus.dance();
      this.song.play(['centro', 'skatepark', 'parque', 'estacion', 'cerro', 'puerto'], 2);
      this.showStory('Marina · ¡La Gran Chispa!', '¡Volvió! La Gran Chispa brilla otra vez sobre la ciudad. Escuchá: cada distrito toca su instrumento…');
    });
    // …pero era tanta energía que se parte en 12 Piezas y salen volando lejos
    after(9, () => {
      flashScreen(500);
      this.audio.tone(220, 0, 0.5, 'sawtooth', 0.06);
      this.audio.noise(0, 0.6, 0.1, 2400);
      this.granChispa.shatter();
      this.progress.setFlag('chispa-rota');
      this.refreshObjectiveSoon();
      after(1.6, () =>
        this.showStory(
          'Marina · ¡Se partió!',
          '¡No puede ser! La Gran Chispa tenía tanta energía que se partió en 12 Piezas y volaron por toda la ciudad… y más lejos. Abrí tu libreta 📒: cada lugar que termines te devuelve una Pieza. ¡Con las 12, la Gran Chispa vuelve para siempre!',
        ),
      );
    });
  }

  /* ---------- Expansión (Fase 10): libreta de encargos, notas, carreras y Piezas ---------- */

  /** Lo que los encargos le preguntan al mundo. */
  private readonly questCtx: QuestCtx = {
    flag: (id) => this.progress.hasFlag(id),
    active: (id) => this.connections.all.find((o) => o.id === id)?.isActive ?? false,
    awake: (d) => {
      const list = this.sleepers.filter((sl) => districtAt(sl.x, sl.z)?.id === d);
      return [list.filter((sl) => sl.isActive).length, list.length];
    },
    notes: (d) => {
      const list = NOTES.filter((nt) => nt.district === d);
      return [list.filter((nt) => this.progress.hasFlag(nt.id)).length, list.length];
    },
    chispi: (id) => this.progress.hasChispi(id),
    count: (k) => this.progress.count(k),
    zones: () => this.zonesDone(),
    fragments: () => ZONE_FRAGMENTS.filter((f) => this.progress.hasFragment(f.id)).length,
    fragment: (id) => this.progress.hasFragment(id),
    homeFixed: () => this.homeFixed,
    stopsVisited: () => TRAIN_STOPS.filter((st) => this.progress.hasFlag(`train-${st.id}`)).length,
    cards: () => this.progress.uniqueCards,
    awakeKind: (kind) => {
      const list = this.sleepers.filter((sl) => sl.kind === kind);
      return [list.filter((sl) => sl.isActive).length, list.length];
    },
  };

  get pieces(): number {
    return QUEST_DISTRICTS.filter((d) => !NO_PIECE.has(d) && this.progress.hasFlag(`pieza-${d}`)).length;
  }

  get questsDone(): number {
    return QUESTS.filter((q) => this.progress.hasFlag(`quest-${q.id}`)).length;
  }

  /** Para la libreta: distritos, Pieza y encargos con su avance. */
  questBook(): { district: string; name: string; piece: boolean; hasPiece: boolean; quests: { id: string; title: string; text: string; giver: string; done: boolean; claimed: boolean; reward: string; progress: [number, number] | null }[] }[] {
    return QUEST_DISTRICTS.map((d) => ({
      district: d,
      name: DISTRICT_NAMES[d],
      piece: this.progress.hasFlag(`pieza-${d}`),
      hasPiece: !NO_PIECE.has(d),
      quests: QUESTS.filter((q) => q.district === d).map((q) => {
        const r = q.check(this.questCtx);
        return {
          id: q.id,
          title: q.title,
          text: q.text,
          giver: q.giver,
          done: this.progress.hasFlag(`quest-${q.id}`),
          claimed: this.progress.hasFlag(`reward-${q.id}`),
          reward: q.reward === 'pack' ? '🃏 sobre' : '✦✦',
          progress: Array.isArray(r) ? r : null,
        };
      }),
    }));
  }

  /** Dónde queda un encargo (su lugar, o la nota/cosa pendiente más cercana). */
  private questPlace(q: Quest): { x: number; z: number } | null {
    if (q.at) return q.at;
    if (q.id.endsWith('-notas')) return this.notes.nearest(this.nexus.position, q.district);
    return null;
  }

  /** Encargos cumplidos con el premio sin cobrar. */
  get rewardsPending(): number {
    return QUESTS.filter((q) => this.progress.hasFlag(`quest-${q.id}`) && !this.progress.hasFlag(`reward-${q.id}`)).length;
  }

  /** Libreta → «🎁 Cobrar»: 2 chispitas o un sobre de cartas. Devuelve lo que dio. */
  claimReward(id: string): string | null {
    const q = QUESTS.find((k) => k.id === id);
    if (!q || !this.progress.hasFlag(`quest-${id}`) || this.progress.hasFlag(`reward-${id}`)) return null;
    this.progress.setFlag(`reward-${id}`);
    this.updateHud();
    if (q.reward === 'pack') {
      const ids = rollPack((c) => this.progress.hasCard(c));
      for (const c of ids) this.progress.addCard(c);
      this.audio.playCollect();
      this.updateHud();
      this.cb.pack?.(ids);
      return 'sobre';
    }
    this.progress.addCharge(2);
    this.audio.playCollect();
    this.updateHud();
    return 'chispitas';
  }

  /** Libreta → «📍»: muestra el camino al encargo. */
  pointQuest(id: string): void {
    const q = QUESTS.find((k) => k.id === id);
    if (!q) return;
    const at = this.questPlace(q);
    this.showStory(`📒 ${q.title}`, q.text);
    if (at) this.pointTo(at.x, at.z);
  }

  /** El próximo encargo sugerido: primero los del distrito donde está el Nexus. */
  private nextQuest(): Quest | null {
    const open = QUESTS.filter((q) => !this.progress.hasFlag(`quest-${q.id}`));
    return open.find((q) => q.district === this.districtId) ?? open[0] ?? null;
  }

  private checkQuests(): void {
    const silent = !this.questsPrimed;
    this.questsPrimed = true;
    for (const q of QUESTS) {
      if (this.progress.hasFlag(`quest-${q.id}`) || !questDone(q, this.questCtx)) continue;
      this.progress.setFlag(`quest-${q.id}`);
      if (silent) continue;
      this.audio.playSuccess();
      this.toast(`📒 ¡Encargo cumplido! ${q.title} — cobrá el premio en la libreta`, 'ok');
    }
    // Gran tarea: todos los encargos de un distrito devuelven su Pieza (después de que la Chispa se partió)
    if (this.progress.hasFlag('chispa-rota')) {
      for (const d of QUEST_DISTRICTS) {
        if (NO_PIECE.has(d) || this.progress.hasFlag(`pieza-${d}`)) continue;
        if (!QUESTS.filter((q) => q.district === d).every((q) => this.progress.hasFlag(`quest-${q.id}`))) continue;
        this.progress.setFlag(`pieza-${d}`);
        if (silent) continue;
        flashScreen(300);
        this.nexus.celebrate();
        this.audio.playSuccess();
        after(0.8, () =>
          this.showStory(
            `◆ Pieza de la Gran Chispa (${this.pieces}/${PIECES_TOTAL})`,
            `¡Terminaste todo en ${DISTRICT_NAMES[d]}! Una Pieza de la Gran Chispa bajó del cielo y voló hasta su pedestal en el faro.`,
          ),
        );
      }
    }
    this.pedestals.show(this.pieces);
    this.updateHud();
  }

  private onNote(id: string): void {
    this.progress.setFlag(id);
    const nt = NOTES.find((k) => k.id === id)!;
    const [got, total] = this.questCtx.notes(nt.district);
    const scale = [523, 587, 659, 784, 880, 1047];
    this.audio.tone(scale[got % scale.length], 0, 0.18, 'triangle', 0.08);
    this.audio.tone(scale[(got + 2) % scale.length], 0.12, 0.22, 'triangle', 0.07);
    this.nexus.sparkle();
    this.toast(`🎵 Nota ${got}/${total} de ${DISTRICT_NAMES[nt.district] ?? nt.district}`, 'ok');
    this.updateHud();
  }

  private startRace(race: Race): void {
    if (race.board && !this.nexus.riding) {
      this.setMessage(this.hasBoard ? 'Esta carrera es en patineta: subite y tocá el cartel 🏁' : 'Esta carrera es en patineta: pedile la suya a Rulo');
      return;
    }
    this.races.start(race);
    this.lastRace = race;
    this.audio.tone(440, 0, 0.15, 'square', 0.05);
    this.audio.tone(440, 0.4, 0.15, 'square', 0.05);
    this.audio.tone(880, 0.8, 0.3, 'square', 0.06);
    this.toast(`🏁 ¡${race.name}! Pasá por los aros`, 'info');
  }

  private updateRace(dt: number): void {
    const ev = this.races.update(dt, this.time, this.nexus.position);
    const hud = document.getElementById('raceHud');
    if (hud) {
      hud.hidden = !this.races.active;
      if (this.races.active) {
        const [n, total] = this.races.progress;
        hud.textContent = `⏱ ${Math.ceil(this.races.timeLeft)} s · aro ${n + 1}/${total}`;
      }
    }
    if (!ev) return;
    if (ev.kind === 'ring') {
      this.audio.tone(660 + ev.n * 80, 0, 0.12, 'triangle', 0.07);
      return;
    }
    const race = this.lastRace;
    if (ev.kind === 'fail') {
      this.audio.playError();
      this.setMessage('¡Se acabó el tiempo! Volvé al cartel 🏁 y probá otra vez');
      return;
    }
    const id = race?.id ?? '';
    const t = Math.round(ev.time * 10) / 10;
    const first = !this.progress.hasFlag(id);
    const best = this.progress.setBest(`best-${id}`, t);
    this.progress.setFlag(id);
    this.progress.addCount('races-won');
    if (this.isNight && !this.progress.hasFlag('race-night')) this.progress.setFlag('race-night');
    this.audio.playSuccess();
    this.nexus.celebrate();
    this.pickups.burst(3, this.nexus.position.x, this.nexus.position.z, 1.2);
    this.setMessage(first ? `🏁 ¡Ganaste ${race?.name ?? 'la carrera'} en ${t} s!` : best ? `🏁 ¡Récord nuevo: ${t} s!` : `🏁 Llegaste en ${t} s`);
  }

  private marinaText(): string {
    if (!this.boat.isActive) return 'Soy Marina, la capitana. Mi bote quedó dormido en el canal, al lado del embarcadero del oeste. ¿Le llevás energía?';
    if (!this.lighthouse.unlocked) return 'El faro guarda un secreto: ahí adentro se escondió lo que queda de la Gran Chispa. Pero su motor está trabado… ¿y si mirás sus cables con la capucha ⚡?';
    if (!this.lighthouse.isActive) {
      const miss = this.finalMissing;
      return miss.length ? `Para que el faro brille tan fuerte, la ciudad entera tiene que estar viva. Falta: ${miss.join(', ')}.` : '¡Ya está todo listo! Llevale energía al faro y vas a ver…';
    }
    return '¡Lo lograste! La Gran Chispa volvió y la ciudad canta. Podés seguir paseando: siempre hay algo para descubrir.';
  }

  /** Lo que conviene hacer en el Puerto. */
  private portStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'puerto' || this.inside) return null;
    if (this.voltio.active) {
      const lit = this.voltio.litNodes('faro-open');
      if (!this.lighthouse.unlocked) return { text: `Tocá los tres nodos del faro (${lit}/3)`, at: PORT.nodes[Math.min(lit, 2)] };
      if (this.voltio.isCaged('gaviotin')) return { text: '¡Gaviotín está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: PORT.chispi };
      return null;
    }
    if (this.lighthouse.isActive) return null;
    if (!this.boat.isActive) return { text: 'Marina perdió su bote: está dormido en el canal, al oeste del Centro', at: null };
    if (!this.lighthouse.unlocked) {
      const hood = this.progress.hasFlag('hood');
      return { text: hood ? 'El faro tiene el motor trabado: ponete la capucha ⚡ y mirá sus cables' : 'El faro tiene el motor trabado… Rulo, en el Skatepark, sabe de cables', at: hood ? PORT.nodes[0] : null };
    }
    const miss = this.finalMissing;
    if (miss.length) return { text: `Para traer la Gran Chispa falta: ${miss[0]}`, at: null };
    return { text: '¡Todo listo! Conectá la energía del puerto con el faro', at: PORT.source };
  }

  /* ---------- Fase 8: Cerro y cascada ---------- */

  /** Se cerró el circuito de la cueva: los cristales se prenden y la cueva recupera el color. */
  private lightCave(animate: boolean): void {
    const cave = this.world.cerro.cave;
    cave.light();
    cave.gray.revive(animate);
    this.addLife(CERRO.cave.doorX, CERRO.cave.z + 2, 10, animate);
    this.dropPack('lugar-cueva', CERRO.cave.doorX + 3.5, CERRO.cave.z + 2.2, animate);
    this.setMessage('¡Los cristales se prendieron! La cueva ya no da miedo');
    this.updateResidentMoods();
  }

  /** El cerro está completo: cima, cascada y cueva. */
  get cerroDone(): boolean {
    return this.cascade.isActive && this.progress.hasFlag('cerro-top') && this.progress.hasFlag('cave-lit');
  }

  /** ¿El Nexus llegó a la cima? (premio una vez: una carta del bosque) */
  private checkSummit(): void {
    if (this.progress.hasFlag('cerro-top') || this.inside) return;
    const p = this.nexus.position;
    const T = CERRO.top;
    if (p.y < TOP_H - 0.3 || p.x < T.minX || p.x > T.maxX || p.z < T.minZ || p.z > T.maxZ) return;
    this.progress.setFlag('cerro-top');
    this.audio.playSuccess();
    this.addLife((T.minX + T.maxX) / 2, (T.minZ + T.maxZ) / 2, 12, true);
    const gift = ['hojin', 'pinita', 'ventarron'].find((id) => !this.progress.hasCard(id)) ?? 'hojin';
    this.progress.addCard(gift);
    this.updateResidentMoods();
    this.showStory('Lalo · El mirador', '¡Llegaste a la cima! Desde acá se ve toda la ciudad. Para bajar rápido, tirate por la tirolesa: es la más larga del barrio.');
    after(1.2, () => this.cb.card?.(gift, '¡Regalo del mirador!'));
    this.refreshObjectiveSoon();
  }

  private laloText(): string {
    if (!this.cascade.isActive) return 'Soy Lalo, el guardaparque. Con el apagón se congeló la cascada… ¿le llevás energía? Así el cerro vuelve a sonar.';
    if (!this.progress.hasFlag('cerro-top')) return '¿Te animás a subir el cerro? Las rocas son como escalones: saltá de una a otra hasta el mirador.';
    if (!this.progress.hasFlag('cave-lit')) return 'En la cueva no se ve nada. Pero vos tenés una capucha especial, ¿no? Los cristales tienen cables escondidos.';
    return '¡El cerro está más lindo que nunca! Cascada, mirador y cueva. Sos un guardaparque honorario.';
  }

  /** Lo que conviene hacer en el Cerro. */
  private cerroStep(): { text: string; at: { x: number; z: number } | null } | null {
    if (this.districtId !== 'cerro' || this.inside) return null;
    if (this.voltio.active) {
      if (this.voltio.isCaged('ventarron')) return { text: '¡Ventarrón está atrapado! Cerrá un círculo con tu estela alrededor de la jaula', at: CERRO.chispi };
      return null;
    }
    if (!this.cascade.isActive) return { text: 'Cerro: conectá la energía con la cascada congelada', at: CERRO.cascadeSource };
    if (!this.progress.hasFlag('cerro-top')) {
      const next = CERRO.steps.find((s) => s.h > this.nexus.position.y + 0.1);
      return { text: 'Subí el cerro saltando de roca en roca hasta el mirador', at: next ?? CERRO.mirador };
    }
    if (!this.progress.hasFlag('cave-lit')) return { text: 'Entrá a la cueva oscura del cerro', at: { x: CERRO.cave.doorX, z: CERRO.cave.z + 1 } };
    return null;
  }

  /* ---------- La fiesta: fin del capítulo (Fase 5) ---------- */

  /** ¿Están todos los preparativos? (luz, agua, radio, jardín y desfile) */
  get prepared(): boolean {
    return this.door.isActive && this.fountain.isActive && this.beacon.isFullyActive && this.flowerBed.isActive && this.parade.isActive;
  }

  get chapterDone(): boolean {
    return this.progress.hasFlag('chapter-done');
  }

  /** El confeti: todos bailan, explota la fiesta y aparece la pantalla del final (solo en vivo). */
  private party(animate: boolean): void {
    if (!animate) return;
    const first = !this.progress.hasFlag('chapter-done');
    this.progress.setFlag('chapter-done');
    this.audio.playSuccess();
    this.nexus.celebrate();
    flashScreen(350);
    const F = FESTIVAL;
    [
      new THREE.Vector3(F.stage.x, 3, F.stage.z),
      new THREE.Vector3(F.confetti.x, 2.5, F.confetti.z),
      new THREE.Vector3(F.exit.x, 3, F.exit.z),
      this.nexus.position.clone().setY(1.6),
    ].forEach((p, i) => after(i * 0.25, () => this.connections.celebrate(p)));
    after(0.8, () => this.confetti.fire());
    this.residents.forEach((r, i) => r.dance(i * 0.15));
    this.nexus.dance();
    this.showStory('Lucio', '¡Fiesta en el barrio! Gracias a vos, la ciudad al revés volvió a estar al derecho… o casi.');
    for (const r of this.residents) r.setHappy(true);
    if (first) {
      after(3.2, () =>
        this.cb.ending?.({
          places: this.zonesDone(),
          placesTotal: ZONE_COUNT,
          awake: this.awakeCount(),
          awakeTotal: this.sleepers.length,
          cards: this.progress.uniqueCards,
          cardsTotal: TOTAL_CARDS,
          chispis: this.progress.chispis.length,
        }),
      );
    }
  }

  /* ---------- Chispi compañero (Fase 4) ---------- */

  get companionId(): string | null {
    return this.companion?.id ?? null;
  }

  /** ¿El compañero es de este tipo? (su ayudita está activa) */
  helps(type: ChispiType): boolean {
    return this.companion?.type === type;
  }

  /** Elige (o saca, con null) el Chispi compañero. */
  setCompanion(id: string | null, announce = true): void {
    if (id && !this.progress.hasCard(id)) return;
    if (this.companion) {
      this.world.scene.remove(this.companion.root);
      this.companion = null;
    }
    this.progress.companion = id;
    if (id) {
      this.companion = new Companion(id);
      this.companion.snap(this.nexus.position, this.nexus.heading);
      this.world.scene.add(this.companion.root);
      if (announce) {
        this.companion.cheer();
        this.audio.tone(784, 0, 0.1, 'triangle', 0.07);
        this.audio.tone(1047, 0.08, 0.14, 'triangle', 0.07);
        const card = CARD_BY_ID.get(id)!;
        this.setMessage(`¡${card.name} es tu compañero! Ayudita: ${TYPES[card.type].helper.toLowerCase()}`);
      }
    }
    this.applyHelpers();
    this.updateHud();
  }

  /** Ayuditas que son un número (imán, voltaje). Las demás se miran en el momento con helps(). */
  private applyHelpers(): void {
    this.pickups.magnet = this.helps('luz') ? 3.4 : 1.4;
    this.voltio.maxVolt = this.helps('mar') ? MAX_VOLT * 1.5 : MAX_VOLT;
    if (!this.voltio.active) this.voltio.voltage = Math.min(this.voltio.voltage, this.voltio.maxVolt);
  }

  /** El compañero sigue al Nexus; Luz y Radio a veces vuelan a mostrar algo. */
  private updateCompanion(dt: number): void {
    const c = this.companion;
    if (!c) return;
    c.root.visible = true;
    c.update(dt, this.nexus.position, this.nexus.heading, this.nexus.dancing);
    if (Math.hypot(c.position.x - this.nexus.position.x, c.position.z - this.nexus.position.z) > 25) c.snap(this.nexus.position, this.nexus.heading);
    this.scoutT -= dt;
    if (this.scoutT > 0 || c.scouting || this.busy || this.inside) return;
    this.scoutT = 6;
    const p = this.nexus.position;
    if (c.type === 'luz') {
      const s = this.pickups.nearestHidden(p.x, p.z, 14);
      if (s) {
        c.show(s.x, s.z, 3);
        this.pointTo(s.x, s.z);
      }
    } else if (c.type === 'radio') {
      const near = this.packs.filter((k) => Math.hypot(k.x - p.x, k.z - p.z) < 40 && k.x < 200);
      if (near.length) {
        const k = near.reduce((a, b) => (Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b));
        c.show(k.x, k.z, 3);
        this.pointTo(k.x, k.z);
        if (!this.heardPacks.has(k.id)) {
          this.heardPacks.add(k.id);
          this.toast(`${c.name} escucha un sobre por allá 📻`, 'info');
        }
      }
    }
  }

  /** Multiplicador de velocidad al caminar: Voltio, Vía y el impulso de los charcos (Agua). */
  private walkScale(dt: number): number {
    this.boostT = Math.max(0, this.boostT - dt);
    return (this.voltio.active ? 1.5 : 1) * (this.helps('via') ? 1.15 : 1) * (this.boostT > 0 ? 1.55 : 1);
  }

  /* ---------- Sobres de cartas (Fase 3) ---------- */

  private setupPacks(): void {
    const taken: { x: number; z: number }[] = [];
    for (const [id, x, z, y] of HIDDEN_PACKS) {
      if (this.progress.hasFlag(`pack-${id}`)) continue;
      // Corre el sobre a un lugar caminable si cae sobre algo (salvo los que van arriba de algo a propósito)
      let px = x;
      let pz = z;
      if (y < 1 && x < 200) {
        for (let k = 0; k < 40 && !(this.world.isWalkable(px, pz, 0.6) && taken.every((t) => Math.hypot(t.x - px, t.z - pz) > 2)); k += 1) {
          const a = k * 2.4;
          px = x + Math.cos(a) * (0.5 + k * 0.25);
          pz = z + Math.sin(a) * (0.5 + k * 0.25);
        }
      }
      taken.push({ x: px, z: pz });
      this.spawnPack(id, px, pz, y);
    }
  }

  private spawnPack(id: string, x: number, z: number, y = 0.9): void {
    if (this.progress.hasFlag(`pack-${id}`) || this.packs.some((p) => p.id === id)) return;
    const g = makePack();
    g.position.set(x, y, z);
    this.world.scene.add(g);
    this.packs.push({ id, g, x, z, y });
  }

  /** Cada lugar que revive deja un sobre al lado. */
  private dropPack(id: string, x: number, z: number, animate: boolean): void {
    if (this.progress.hasFlag(`pack-${id}`)) return;
    let px = x;
    let pz = z;
    // Lejos de los fragmentos y de los otros sobres, para no juntar dos cosas a la vez
    const clear = (x2: number, z2: number) =>
      this.world.isWalkable(x2, z2, 0.5) &&
      this.fragments.every((f) => Math.hypot(f.group.position.x - x2, f.group.position.z - z2) > 2.8) &&
      this.packs.every((q) => Math.hypot(q.x - x2, q.z - z2) > 2.5) &&
      this.interiors.every((r) => Math.hypot(r.door.x - x2, r.door.z - z2) > 2.5 && Math.hypot(r.info.exit.x - x2, r.info.exit.z - z2) > 2.5);
    for (let k = 0; k < 60 && !clear(px, pz); k += 1) {
      const a = k * 2.4;
      px = x + Math.cos(a) * (1 + k * 0.2);
      pz = z + Math.sin(a) * (1 + k * 0.2);
    }
    if (animate) after(1.2, () => this.spawnPack(id, px, pz));
    else this.spawnPack(id, px, pz);
  }

  /** Sobres que hay en el mundo (para las pruebas y las pistas). */
  get packSpots(): { id: string; x: number; z: number; y: number }[] {
    return this.packs.map((p) => ({ id: p.id, x: p.x, z: p.z, y: p.y }));
  }

  private updatePacks(dt: number): void {
    const p = this.nexus.position;
    for (const pk of [...this.packs]) {
      const body = pk.g.userData.body as THREE.Group;
      body.rotation.y += dt * 1.6;
      pk.g.position.y = pk.y + Math.sin(this.time * 2 + pk.x) * 0.1;
      if (this.busy || this.voltio.active) continue;
      if (Math.hypot(pk.x - p.x, pk.z - p.z) < 1.0 && Math.abs(p.y + 0.9 - pk.y) < 0.5) this.openPack(pk.id);
    }
  }

  /** Junta un sobre: las cartas se guardan ya y después se muestran dándose vuelta. */
  openPack(id: string): void {
    const i = this.packs.findIndex((p) => p.id === id);
    if (i < 0) return;
    const pk = this.packs[i];
    this.world.scene.remove(pk.g);
    this.packs.splice(i, 1);
    this.progress.setFlag(`pack-${id}`);
    const ids = rollPack((c) => this.progress.hasCard(c));
    for (const c of ids) this.progress.addCard(c);
    this.audio.playCollect();
    this.nexus.celebrate();
    this.updateHud();
    if (this.cb.pack) this.cb.pack(ids);
    else this.setMessage('¡Encontraste un sobre de cartas!');
  }

  private showStory(who: string, text: string): void {
    if (!this.el.story) return;
    const face = document.getElementById('storyFace');
    if (face) {
      // Retrato: un ícono y un color por quién habla (vecinos con el color de su ropa)
      const faces: [string, string, string][] = [
        ['Miga', '👷', '#2bb3a8'],
        ['Bombo', '🥁', '#4fa8e0'],
        ['Vera', '🎙️', '#e77fa6'],
        ['Don Paso', '🎩', '#f2c14e'],
        ['Goteo', '🌻', '#4d6b8a'],
        ['Nido', '✨', '#ffe066'],
        ['Mochila', '🎒', '#ffc23a'],
        ['Pista', '💡', '#ffc23a'],
        ['Rulo', '🛹', '#ff9f43'],
        ['Tita', '🎪', '#ff5a6e'],
        ['Voltio', '⚡', '#7dffef'],
      ];
      const f = faces.find(([k]) => who.includes(k));
      face.textContent = f ? f[1] : '💬';
      face.style.background = f ? f[2] : '#9be7ff';
    }
    if (this.el.storyWho) this.el.storyWho.textContent = who;
    if (this.el.storyText) this.el.storyText.textContent = text;
    this.el.story.hidden = false;
    this.storyTimer = 6.5;
  }

  private hideStory(): void {
    if (this.el.story) this.el.story.hidden = true;
    this.storyTimer = 0;
  }

  private findNearestResident(): Resident3D | null {
    const p = this.nexus.position;
    let best: Resident3D | null = null;
    let bestD = INTERACT_REACH + 0.4;
    for (const r of this.residents) {
      const d = Math.hypot(r.x - p.x, r.z - p.z);
      if (d < bestD) {
        best = r;
        bestD = d;
      }
    }
    return best;
  }

  private updateResidents(dt: number): void {
    for (const r of this.residents) r.update(dt, this.nexus.position);
    // La primera vez que el Nexus se acerca, el vecino habla solo
    const p = this.nexus.position;
    for (const r of this.residents) {
      if (!this.progress.hasHeard(r.id) && Math.hypot(r.x - p.x, r.z - p.z) < 2.6) this.speak(r, false);
    }
    if (this.storyTimer > 0) {
      this.storyTimer -= dt;
      if (this.storyTimer <= 0) this.hideStory();
    }
  }

  /* ---------- Interacción ---------- */

  private findNearest(): Connectable | null {
    let best: Connectable | null = null;
    let bestD = Infinity;
    const p = this.nexus.position;
    for (const obj of this.connections.all) {
      const d = obj.distanceFrom(p.x, p.z);
      if (d < INTERACT_REACH && d < bestD) {
        best = obj;
        bestD = d;
      }
    }
    return best;
  }

  private interact(obj: Connectable): void {
    this.nexus.reach();
    // Las cosas chicas se despiertan con la mochila, no con cables
    if (obj instanceof Sleeper) {
      this.wakeWithBackpack(obj);
      return;
    }
    this.connections.interact(obj);
  }

  /** Tocar/clic directo sobre un objeto (a cualquier distancia, como en el 2D). */
  private onTap(e: PointerEvent): void {
    if (this.busy || this.voltio.active || !document.body.classList.contains('mode-world')) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [...this.connections.all.map((c) => c.group), ...this.residents.map((r) => r.root)];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.connectable && !o.userData.resident) o = o.parent;
      if (o?.userData.resident) {
        this.speak(o.userData.resident as Resident3D);
        return;
      }
      if (o) {
        this.interact(o.userData.connectable as Connectable);
        return;
      }
    }
  }

  /* ---------- Loop ---------- */

  /** Detrás de la pantalla de título: el barrio vive, pero el Nexus no recibe controles. */
  idle(dt: number): void {
    this.time += dt;
    this.nexus.move(0, 0, dt);
    this.nexus.idleFacing = ISO_FACING;
    this.nexus.animate(dt);
    for (const obj of this.connections.all) obj.update(dt, this.time);
    this.granChispa.update(dt, this.time);
    this.world.home.update(dt, this.time);
    for (const f of this.fragments) f.update(this.time);
    for (const r of this.residents) r.update(dt, this.nexus.position);
    this.updateCameras(dt);
    this.updateLife(dt);
    this.voltio.update(dt, this.time, this.nexus.position);
    this.world.update(dt, this.time, this.nexus.position, this.camera.position);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.input.consumeView() && !this.inside) this.setView(!this.iso);
    if (this.input.consumeVolt()) this.toggleVoltio();

    // Movimiento relativo a la cámara
    const mv = this.input.move;
    let fx: number;
    let fz: number;
    if (this.iso) {
      fx = -Math.SQRT1_2;
      fz = -Math.SQRT1_2;
    } else {
      fx = Math.sin(this.camYaw);
      fz = Math.cos(this.camYaw);
    }
    const dirX = fx * mv.y + -fz * mv.x;
    const dirZ = fz * mv.y + fx * mv.x;
    const blockers = [
      ...this.connections.all.map((c) => ({ x: c.x, z: c.z, r: c.collideRadius })),
      ...this.residents.map((r) => ({ x: r.x, z: r.z, r: 0.4 })),
    ];
    if (this.rideOn) {
      this.updateRideOn(dt);
    } else if (this.zip) {
      this.updateZip(dt);
    } else {
      const still = this.busy || this.nexus.dancing;
      if (this.nexus.riding) {
        if (!this.skate.grinding) {
          this.skate.move(this.nexus, still ? 0 : dirX, still ? 0 : dirZ, dt, !this.grounded, (this.voltio.active ? 1.25 : 1) * (this.helps('ruedas') ? 1.25 : 1));
          const wantX = this.nexus.position.x;
          const wantZ = this.nexus.position.z;
          this.world.resolve(this.nexus.position, NEXUS_RADIUS, blockers, this.nexus.position.y);
          if (Math.hypot(this.nexus.position.x - wantX, this.nexus.position.z - wantZ) > 0.03) this.skate.bonk();
        }
      } else {
        this.nexus.speedScale = this.walkScale(dt);
        this.nexus.move(still ? 0 : dirX, still ? 0 : dirZ, dt);
        this.world.resolve(this.nexus.position, NEXUS_RADIUS, blockers, this.nexus.position.y);
      }
      this.updateVertical(dt);
    }
    if (this.input.consumeDance() && !this.busy && !this.zip && this.grounded && !this.nexus.riding) this.danceParty();
    this.nexus.idleFacing = this.iso ? ISO_FACING : null;
    this.nexus.animate(dt);
    this.playground.update(dt, this.time, this.nexus.position, this.nexus.velocity, blockers);
    this.sparkTip();
    const full = this.pickups.update(dt, this.time, this.nexus.position, MAX_CHARGE - this.progress.charge, (id) => {
      if (id) this.progress.collectSpark(id);
      this.addCharge(1);
    });
    this.fullWarned -= dt;
    if (full && this.fullWarned <= 0) {
      this.fullWarned = 4;
      this.toast('¡Tu mochila está llena! Despierta algo dormido para hacer lugar', 'info');
    }

    for (const obj of this.connections.all) obj.update(dt, this.time);
    for (const f of this.fragments) f.update(this.time);

    if (!this.introShown) {
      this.introShown = true;
      if (!this.progress.hasHeard('intro')) {
        this.progress.markHeard('intro');
        this.showStory(
          'Miga · La Gran Chispa',
          'El barrio se quedó sin color: la Gran Chispa que lo llenaba de vida se apagó y se rompió en chispitas. Tu mochila Atrapachispas puede juntarlas. Lleva la energía a la farola de la plaza y guía la chispa por el cable.',
        );
      }
    }
    this.updateResidents(dt);

    this.nearest = this.findNearest();
    // Si un vecino está más cerca que cualquier objeto (y no hay un cable en la mano), el botón sirve para hablar
    const resident = this.findNearestResident();
    const p = this.nexus.position;
    const objD = this.nearest ? this.nearest.distanceFrom(p.x, p.z) : Infinity;
    this.nearestResident = resident && !this.connections.hasSelection() && Math.hypot(resident.x - p.x, resident.z - p.z) < objD ? resident : null;
    // Poste de luz cerca (y nada más cerca): el botón engancha la tirolesa
    this.nearestPole = !this.zip && this.grounded && !this.nexus.riding && !this.nearestResident && !this.connections.hasSelection() ? this.findNearestPole(objD) : null;
    this.doorway = this.findDoorway(objD);
    if (this.doorway) {
      this.nearestResident = null;
      this.nearestPole = null;
    }
    // En el Mundo Voltio no se conecta ni se habla: solo se dibuja con la estela
    if (this.voltio.active) {
      this.nearest = null;
      this.nearestResident = null;
      this.nearestPole = null;
    }
    const sk = this.world.skate;
    const boardD = Math.hypot(p.x - sk.board.x, p.z - sk.board.z);
    const residentD = this.nearestResident ? Math.hypot(this.nearestResident.x - p.x, this.nearestResident.z - p.z) : Infinity;
    this.nearBoard = !this.hasBoard && !this.voltio.active && !this.doorway && boardD < 1.8 && boardD < residentD;
    if (this.nearBoard) this.nearestResident = null;
    this.boardToggle = null;
    if (this.hasBoard && !this.inside && !this.zip && !this.busy && this.grounded && !this.nearest && !this.nearestResident && !this.nearestPole && !this.doorway && !this.connections.hasSelection()) {
      this.boardToggle = this.nexus.riding ? 'off' : 'on';
    }
    this.rideSpot = this.findRideSpot();
    this.stopSpot = !this.rideOn && !this.rideSpot && !this.nearest && !this.doorway && !this.connections.hasSelection() ? this.nearStop() : null;
    this.homeSpot = !this.rideOn && !this.rideSpot && !this.stopSpot && !this.doorway && !this.connections.hasSelection() ? this.findHomeSpot() : null;
    if (this.homeSpot) this.nearest = null;
    this.raceSpot = !this.rideOn && !this.rideSpot && !this.stopSpot && !this.homeSpot && !this.doorway && !this.inside && !this.voltio.active && !this.connections.hasSelection() ? this.races.nearStart(this.nexus.position) : null;
    if (this.raceSpot) this.nearest = null;
    if (this.rideOn || this.rideSpot || this.stopSpot || this.homeSpot || this.raceSpot) {
      this.nearestResident = null;
      this.nearestPole = null;
      this.boardToggle = null;
    }
    const pressed = this.input.consumeInteract();
    if (pressed && !this.busy && !this.zip && this.raceSpot) {
      this.startRace(this.raceSpot);
    } else if (pressed && !this.busy && !this.zip && this.homeSpot) {
      this.useHomeItem(this.homeSpot);
    } else if (pressed && !this.busy && !this.zip && this.stopSpot) {
      if (this.train.isActive) this.cb.travel?.();
      else this.setMessage(this.train.unlocked ? 'El tren está dormido: llevale energía en la Estación' : 'El tren está dormido en la Estación, al sureste. Nora sabe qué le pasa');
    } else if (pressed && !this.busy && !this.zip && (this.rideOn || this.rideSpot)) {
      if (this.rideOn) this.leaveRide();
      else if (this.rideSpot) this.boardRide(this.rideSpot);
    } else if (pressed && !this.busy && !this.zip) {
      if (this.doorway?.kind === 'enter') this.enterHouse(this.doorway.room);
      else if (this.doorway?.kind === 'exit') this.leaveHouse();
      else if (this.nearBoard) this.takeBoard();
      else if (this.nearestResident) this.speak(this.nearestResident);
      else if (this.nearestPole) this.startZip(this.nearestPole);
      else if (this.nearest) this.interact(this.nearest);
      else if (this.boardToggle === 'on') this.mount();
      else if (this.boardToggle === 'off') this.dismount();
    }
    if (this.el.interact) {
      this.el.interact.hidden = (!this.nearest && !this.nearestResident && !this.nearestPole && !this.doorway && !this.nearBoard && !this.boardToggle && !this.rideSpot && !this.rideOn && !this.stopSpot && !this.homeSpot && !this.raceSpot) || this.busy || !!this.zip || (this.rideOn === this.coaster && !!this.rideOn);
      this.el.interact.textContent = this.raceSpot
        ? '🏁 Carrera'
        : this.homeSpot
        ? this.homeLabel(this.homeSpot)
        : this.stopSpot
        ? '🚂 Viajar'
        : this.rideOn
        ? 'Bajar'
        : this.rideSpot
          ? this.rideSpot === this.boat
            ? '⛵ Subir'
            : this.rideSpot === this.chairlift
            ? this.chairlift.side === 0
              ? '🚡 Subir'
              : '🚡 Bajar'
            : this.rideSpot === this.lancha
            ? this.lancha.side === 0
              ? '🚤 A la isla'
              : '🚤 Volver'
            : this.rideSpot === this.tractor
            ? '🚜 Subir'
            : '🎠 Subir'
          : this.nearBoard
        ? 'Patineta'
        : this.boardToggle && !this.nearest && !this.nearestResident && !this.nearestPole && !this.doorway
          ? this.boardToggle === 'on'
            ? '🛹 Subir'
            : 'Bajar'
          : this.doorway?.kind === 'enter'
        ? 'Entrar'
        : this.doorway?.kind === 'exit'
          ? 'Salir'
          : this.nearestResident
        ? 'Hablar'
        : this.nearestPole
          ? 'Tirolesa'
          : this.connections.hasSelection()
            ? 'Conectar'
            : 'Tocar';
    }
    this.checkFragments();
    this.checkSummit();
    this.checkTreeTop();
    this.checkMaze();
    this.updateClock(dt);
    this.updateFactory(dt);
    this.updateAlto(dt);
    this.updatePlaya(dt);
    this.updateIsla(dt);
    this.updateNieve();
    const note = this.voltio.active || this.inside ? null : this.notes.update(dt, this.time, this.nexus.position);
    if (note) this.onNote(note.id);
    this.updateRace(dt);
    this.pedestals.update(dt);
    this.questTimer -= dt;
    if (this.questTimer <= 0) {
      this.questTimer = 0.5;
      this.checkQuests();
    }
    // La cueva está a oscuras hasta prender los cristales (con la capucha se ven igual)
    document.body.classList.toggle('cave-dark', this.inside?.id === 'cueva' && !this.voltio.active && !this.progress.hasFlag('cave-lit'));

    this.warnClosedShop(dt);
    this.updatePacks(dt);
    this.updateCompanion(dt);
    // Mundo Voltio
    this.voltio.update(dt, this.time, this.nexus.position);
    if (this.voltio.active && this.voltio.voltage <= 0) this.exitVoltio('Se acabó el voltaje ⚡: volviste al mundo normal');
    const fill = document.getElementById('voltFill');
    if (fill) {
      const k = this.voltio.voltage / this.voltio.maxVolt;
      fill.style.width = `${Math.round(k * 100)}%`;
      fill.classList.toggle('low', k < 0.25);
    }

    if (this.eventTimer > 0) {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) this.showObjective();
    }
    this.updateHint(dt);
    this.districtCheck -= dt;
    if (this.districtCheck <= 0) {
      this.districtCheck = 0.5;
      this.checkDistrict();
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast?.classList.remove('show');
    }

    this.updateCameras(dt);
    this.updateLife(dt);
    this.updateLabels(dt);
    this.connections.update(dt, this.camera, this.nexus.plugPoint());
    this.world.update(dt, this.time, this.nexus.position, this.camera.position);
  }

  private updateCameras(dt: number): void {
    const p = this.nexus.position;
    const v = this.nexus.velocity;
    this.focus.x = damp(this.focus.x, p.x + v.x * 0.25, 5, dt);
    this.focus.z = damp(this.focus.z, p.z + v.z * 0.25, 5, dt);
    // La cámara sube un poco cuando el Nexus está alto (techo de un auto, tirolesa); en lo muy alto
    // (cerro, faro) lo sigue casi entero para que no se salga de la pantalla
    this.focus.y = damp(this.focus.y, p.y < 2.5 ? p.y * 0.6 : p.y - 1, 4, dt);
    this.isoCam.position.copy(this.focus).add(ISO_OFFSET);
    this.isoCam.lookAt(this.focus.x, this.focus.y + 0.8, this.focus.z);

    if (this.nexus.speed > 0.5) this.camYaw = dampAngle(this.camYaw, this.nexus.heading, 2.2, dt);
    const back = 6;
    this.chaseCam.position.set(p.x - Math.sin(this.camYaw) * back, 3.3 + p.y, p.z - Math.cos(this.camYaw) * back);
    this.chaseCam.lookAt(p.x + Math.sin(this.camYaw) * 2, 1.0 + p.y, p.z + Math.cos(this.camYaw) * 2);
  }

  /* ---------- Silueta cuando algo tapa al Nexus (solo isométrica) ---------- */

  private readonly xrayMat = new THREE.MeshBasicMaterial({
    color: '#ffc23a',
    transparent: true,
    opacity: 0.6,
    depthTest: true,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
    fog: false,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
  });
  private readonly xraySaved: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[]; visible: boolean }[] = [];

  private prepareSilhouette(): void {
    const hook = (m: THREE.Mesh) => {
      m.material = (m.material as THREE.Material).clone();
      Object.assign(m.material, {
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      });
    };
    this.nexus.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) hook(o as THREE.Mesh);
    });
    // Los accesorios del armario que se agregan después también entran en la silueta
    this.nexus.materialHook = hook;
  }

  private renderSilhouette(renderer: Renderer): void {
    this.xraySaved.length = 0;
    this.nexus.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      this.xraySaved.push({ mesh: m, mat: m.material, visible: m.visible });
      if (m.userData.isOutline) m.visible = false;
      else m.material = this.xrayMat;
    });
    renderer.gl.autoClear = false;
    renderer.gl.render(this.nexus.root, this.isoCam);
    renderer.gl.autoClear = true;
    for (const s of this.xraySaved) {
      s.mesh.material = s.mat;
      s.mesh.visible = s.visible;
    }
  }

  render(renderer: Renderer, time: number): void {
    const aspect = renderer.width / renderer.height;
    // En vertical se aleja un poco, para que el ancho visible no quede demasiado angosto
    const base = this.inside ? ISO_HALF * 0.92 : ISO_HALF;
    const half = aspect < 1 ? Math.min(base / aspect, 9) : base;
    // La sombra cubre justo lo que muestra la cámara isométrica (la vista "detrás" mira más lejos).
    this.world.setShadowSpan(this.iso ? Math.min(26, half * 2 + 4) : 26);
    this.isoCam.left = -half * aspect;
    this.isoCam.right = half * aspect;
    this.isoCam.top = half;
    this.isoCam.bottom = -half;
    this.isoCam.updateProjectionMatrix();
    this.chaseCam.aspect = aspect;
    this.chaseCam.fov = aspect < 1 ? 70 : 55;
    this.chaseCam.updateProjectionMatrix();
    this.world.sky.visible = !this.iso;
    renderer.voltio = this.voltio.amount;
    renderer.night = this.world.night;
    renderer.render(this.world.scene, this.camera, time, this.iso ? () => this.renderSilhouette(renderer) : undefined);
  }
}
