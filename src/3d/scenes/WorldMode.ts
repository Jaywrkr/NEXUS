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
import { districtAt } from '../world/districts';
import { BRIDGE_X, CANAL_MAX_Z } from '../world/World';
import { CANAL_MIN_Z, ZIP_SAG } from '../world/World';
import { SkateRamp, makeBoard } from '../objects/skate';
import { Skate, type Trick } from '../systems/Skate';
import { MAX_VOLT, Voltio } from '../systems/Voltio';
import type { InteriorInfo } from '../world/MigaHouse';

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

const [PLAZA_ID, FOUNTAIN_ID, BEACON_ID, BRIDGE_ID, GARDEN_ID] = ZONE_FRAGMENTS.map((f) => f.id);
/** Lugares que se pueden devolver a la vida (uno por fragmento de zona). */
const ZONE_COUNT = ZONE_FRAGMENTS.length;

export interface WorldCallbacks {
  /** Pide abrir el mini-túnel; debe llamar a `finishTunnel` al terminar. */
  tunnel: (source: Connectable, target: Connectable) => void;
  /** Ir al museo (tras recoger un fragmento). */
  museum: () => void;
  /** Mostrar la carta de un Chispi rescatado (pausa el mundo hasta cerrarla). */
  card?: (id: string) => void;
}

/** Una habitación que se visita: dónde está su puerta afuera y cuándo se abre. */
interface Interior {
  id: string;
  info: InteriorInfo;
  door: { x: number; z: number };
  out: { x: number; z: number };
  open: () => boolean;
  story: [string, string];
}

const TRICKS: Trick[] = ['ollie', 'air', 'grind'];
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
  private bigSteps: { s: Connectable; t: Connectable; sName: string; tName: string }[] = [];
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

    const labels: [Connectable, string][] = [
      [source, 'Energía'], [this.lamp, 'Farola'], [this.door, 'Puerta'],
      [fountainSource, 'Energía'], [this.fountain, 'Fuente'],
      [beaconA, 'Energía'], [beaconB, 'Energía'], [decoy, 'Energía'], [this.beacon, 'Antena'],
      [bridgeSource, 'Energía'], [this.bridge, 'Palanca del puente'],
      [gardenSource, 'Energía'], [this.sprinkler, 'Aspersor'], [this.flowerBed, 'Flores'],
      [skateSource, 'Energía'], [this.ramp, 'Rampa'],
    ];
    for (const [obj, label] of labels) obj.label = label;

    for (const obj of [source, this.lamp, this.door, fountainSource, this.fountain, beaconA, beaconB, decoy, this.beacon, bridgeSource, this.bridge, gardenSource, this.sprinkler, this.flowerBed, skateSource, this.ramp]) {
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
    ];

    // Fragmentos: uno por zona + el secreto detrás de la casa (Decisión 019), que ya está visible
    for (const [id, x, y, z] of [
      [PLAZA_ID, -15.5, 1.0, -24.2],
      [FOUNTAIN_ID, -20, 1.0, 20.4],
      [BEACON_ID, 30.5, 1.0, -15.2],
      [BRIDGE_ID, 18, 1.0, 40.5],
      [GARDEN_ID, -13, 1.0, 58.2],
      [SECRET_FRAGMENT.id, -18, 1.0, -39.6],
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
      if (t === this.beacon) this.beacon.activate();
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
    if (done === ZONE_COUNT) return 'Ya le devolviste la vida a todo el barrio';
    if (done === 0) return 'El barrio está triste y sin color. Conecta la fuente con la farola';
    return `Le devolviste la vida a ${done} de ${ZONE_COUNT} lugares — sigue explorando`;
  }

  /** Zonas resueltas (no hace falta haber juntado el fragmento). */
  private zonesDone(): number {
    return [this.door.isActive, this.fountain.isActive, this.beacon.isFullyActive, this.bridge.isActive, this.flowerBed.isActive].filter(Boolean).length;
  }

  /* ---------- Vida del barrio ---------- */

  /** Círculos de color que crecen en el mundo (ver LIFE en core/render.ts). */
  private readonly lifeSpots: { x: number; z: number; current: number; target: number }[] = [];

  private addLife(x: number, z: number, radius: number, animate: boolean): void {
    if (this.lifeSpots.length >= LIFE_SPOTS) {
      // Sin lugar: agrandar el más cercano en vez de perder la vida nueva
      const near = this.lifeSpots.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b));
      near.target = Math.max(near.target, radius);
      return;
    }
    this.lifeSpots.push({ x, z, current: animate ? 0.5 : radius, target: radius });
  }

  private updateLife(dt: number): void {
    this.lifeSpots.forEach((spot, i) => {
      // La ola de color avanza rápido al principio y se frena al llegar
      spot.current += (spot.target - spot.current) * Math.min(1, dt * 1.6);
      LIFE.spots[i].set(spot.x, spot.z, spot.current, 0);
    });
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
    const pending = this.bigSteps.filter((b) => !this.progress.hasConnection(b.s.id, b.t.id) && b.s.canInitiate() && reachable(b.s));
    const forSel = sel ? pending.find((b) => b.s === sel) : undefined;
    if (forSel) {
      text = `Tenés el cable de ${forSel.sName}: llevalo hasta ${forSel.tName}.`;
      where = forSel.t;
    } else if (pending.length) {
      const b = pending.reduce((a, c) => (dist(a.s) < dist(c.s) ? a : c));
      text = `Tocá ${b.sName} y después ${b.tName}. ¡Ahí empieza la carrera de luz!`;
      where = b.s;
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
        text = '¡El barrio está lleno de vida! Explorá: hay chispitas escondidas, techos y tirolesas.';
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
          '¡Bienvenido a mi casa! Fue lo primero que volvió a tener color. En ese banco arreglo cosas… y dicen que arriba se escondió una chispita. ¿Llegás saltando?',
        ],
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
      this.nexus.position.set(room.out.x, 0, room.out.z);
      this.nexus.velocity.set(0, 0, 0);
      this.nexus.heading = 0;
      this.camYaw = 0;
      this.hintTimer = 0;
      document.body.classList.remove('inside');
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
    ];
    return {
      life: (x, z) => LIFE.at(x, z),
      walls: this.world.rects.filter((r) => r.h === undefined && r.maxX - r.minX < 40 && r.maxZ - r.minZ < 40),
      canal: { minZ: CANAL_MIN_Z, maxZ: CANAL_MAX_Z, bridgeX: BRIDGE_X, bridgeOpen: this.bridge.isActive },
      places,
      things: this.sleepers.map((s) => ({ x: s.x, z: s.z, awake: s.isActive })),
      nests: this.sparks.map((s) => ({ x: s.x, z: s.z, ready: s.ready })),
      nexus: { x: n.x, z: n.z, heading: this.inside ? 0 : this.nexus.heading },
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
    return new Voltio(
      this.world.scene,
      this.world.skate,
      {
        rescue: (id, x, z) => this.onRescue(id, x, z),
        circuit: () => {
          this.progress.setFlag('sala-open');
          this.openShutter(true);
          this.audio.playSuccess();
          this.setMessage('¡Circuito cerrado! Afuera se abrió la sala del skatepark');
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
      { rescued: this.progress.hasChispi('rueditas'), circuit: this.progress.hasFlag('sala-open') },
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
    this.skate.reset();
    this.skate.speed = Math.min(this.nexus.speed, 4);
    this.audio.tone(330, 0, 0.08, 'triangle', 0.06);
    this.audio.tone(440, 0.05, 0.08, 'triangle', 0.06);
  }

  /** Bajarse de la patineta (la lleva en la mochila). */
  dismount(): void {
    if (!this.nexus.riding) return;
    this.nexus.riding = false;
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
    if (this.inside) {
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
    this.audio.playSuccess();
    this.connections.celebrate(new THREE.Vector3(x, 1.2, z));
    this.pickups.burst(3, x, z, 1.2);
    this.setMessage('¡Rescataste a Rueditas, un Chispi de Ruedas!');
    this.cb.card?.(id);
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
    if (this.voltio.active) {
      if (this.voltio.chispiCaged) return { text: 'Cerrá un círculo con tu estela alrededor de la jaula del Chispi', at: sk.chispi };
      if (!p.hasFlag('sala-open')) {
        const n = this.voltio.litNodes;
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
      this.vy = JUMP_V * (this.voltio.active ? 1.2 : 1);
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
    const hangY = (t: number) => z.a.y - Math.sin(t * Math.PI) * ZIP_SAG - ZIP_HANG;
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
    const zone =
      target === this.lamp || target === this.door
        ? 'plaza'
        : target === this.fountain
          ? 'fountain'
          : target === this.beacon
            ? 'beacon'
            : target === this.bridge
              ? 'bridge'
              : target === this.ramp
                ? 'skate'
                : 'garden';
    return planTunnel(zone, this.progress.tunnelSkill);
  }

  /** Una cosa dormida se despertó: un poquito de color alrededor y el contador. */
  private onWake(sl: Sleeper, animate: boolean): void {
    this.addLife(sl.x, sl.z, 3.2, animate);
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
    };
    for (const r of this.residents) r.setHappy(restored[r.id] ?? false, instant);
  }

  private residentText(r: Resident3D): string {
    if (r.id === 'rulo') return this.ruloText();
    const info = RESIDENTS.find((i) => i.id === r.id)!;
    // En 3D la fuente todavía no tiene bomba ni válvulas (eso es de la 2D): Bombo pide otra cosa
    if (r.id === 'bombo' && !this.fountain.isActive) {
      return 'Mi fuente se quedó sin agua y el barrio sin ritmo. Llévale energía desde la estrella de al lado.';
    }
    return residentLine(info, this.progress.snapshot());
  }

  private speak(r: Resident3D): void {
    this.progress.markHeard(r.id);
    r.setHeard(true);
    r.talk();
    this.nexus.wave();
    this.showStory(r.name, this.residentText(r));
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
      if (!this.progress.hasHeard(r.id) && Math.hypot(r.x - p.x, r.z - p.z) < 2.6) this.speak(r);
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
    if (this.zip) {
      this.updateZip(dt);
    } else {
      const still = this.busy || this.nexus.dancing;
      if (this.nexus.riding) {
        if (!this.skate.grinding) {
          this.skate.move(this.nexus, still ? 0 : dirX, still ? 0 : dirZ, dt, !this.grounded, this.voltio.active ? 1.25 : 1);
          const wantX = this.nexus.position.x;
          const wantZ = this.nexus.position.z;
          this.world.resolve(this.nexus.position, NEXUS_RADIUS, blockers, this.nexus.position.y);
          if (Math.hypot(this.nexus.position.x - wantX, this.nexus.position.z - wantZ) > 0.03) this.skate.bonk();
        }
      } else {
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
    if (this.input.consumeInteract() && !this.busy && !this.zip) {
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
      this.el.interact.hidden = (!this.nearest && !this.nearestResident && !this.nearestPole && !this.doorway && !this.nearBoard && !this.boardToggle) || this.busy || !!this.zip;
      this.el.interact.textContent = this.nearBoard
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

    // Mundo Voltio
    this.voltio.update(dt, this.time, this.nexus.position);
    if (this.voltio.active && this.voltio.voltage <= 0) this.exitVoltio('Se acabó el voltaje ⚡: volviste al mundo normal');
    const fill = document.getElementById('voltFill');
    if (fill) {
      const k = this.voltio.voltage / MAX_VOLT;
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
    // La cámara sube un poco cuando el Nexus está alto (techo de un auto, tirolesa)
    this.focus.y = damp(this.focus.y, p.y * 0.6, 4, dt);
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
    this.nexus.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = (m.material as THREE.Material).clone();
      Object.assign(m.material, {
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      });
    });
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
    renderer.render(this.world.scene, this.camera, time, this.iso ? () => this.renderSilhouette(renderer) : undefined);
  }
}
