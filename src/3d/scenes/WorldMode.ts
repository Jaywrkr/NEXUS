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
import { CANAL_MIN_Z, ZIP_SAG } from '../world/World';

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
}

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
    view: document.getElementById('viewBtn'),
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

    const labels: [Connectable, string][] = [
      [source, 'Energía'], [this.lamp, 'Farola'], [this.door, 'Puerta'],
      [fountainSource, 'Energía'], [this.fountain, 'Fuente'],
      [beaconA, 'Energía'], [beaconB, 'Energía'], [decoy, 'Energía'], [this.beacon, 'Antena'],
      [bridgeSource, 'Energía'], [this.bridge, 'Palanca del puente'],
      [gardenSource, 'Energía'], [this.sprinkler, 'Aspersor'], [this.flowerBed, 'Flores'],
    ];
    for (const [obj, label] of labels) obj.label = label;

    for (const obj of [source, this.lamp, this.door, fountainSource, this.fountain, beaconA, beaconB, decoy, this.beacon, bridgeSource, this.bridge, gardenSource, this.sprinkler, this.flowerBed]) {
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

    LIFE.reset();
    this.restoreProgress({ source, fountainSource, beaconA, beaconB, bridgeSource, gardenSource });
    this.makeLabels();
    this.placeResidents();
    this.setView(this.iso);
    this.el.story?.addEventListener('click', () => this.hideStory());

    this.el.interact?.addEventListener('click', () => this.input.queueInteract());
    this.el.view?.addEventListener('click', () => this.input.queueView());
    document.getElementById('jumpBtn')?.addEventListener('click', () => this.input.queueJump());
    document.getElementById('danceBtn')?.addEventListener('click', () => this.input.queueDance());
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
    this.setMessage(this.statusMessage());
  }

  private statusMessage(): string {
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
    const flash = document.getElementById('flash');
    flash?.classList.add('on');
    after(0.25, () => flash?.classList.remove('on'));
  }

  /** Se llama al volver del museo. */
  resume(): void {
    this.setMessage(this.statusMessage());
    this.input.flush();
  }

  /* ---------- Saltar, tirolesa y bailar (Decisión 042) ---------- */

  /** Gravedad, salto y plataformas (bancos, tachos, autos). */
  private updateVertical(dt: number): void {
    const p = this.nexus.position;
    if (this.input.consumeJump() && this.grounded && !this.busy && !this.nexus.dancing) {
      this.vy = JUMP_V;
      this.grounded = false;
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

  private setMessage(m: string): void {
    if (this.el.msg) this.el.msg.textContent = m;
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

  private setView(iso: boolean): void {
    this.iso = iso;
    localStorage.setItem(VIEW_KEY, iso ? 'iso' : 'chase');
    if (this.el.view) this.el.view.textContent = iso ? 'VISTA: ISOMÉTRICA' : 'VISTA: DETRÁS';
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
    };
    for (const r of this.residents) r.setHappy(restored[r.id] ?? false, instant);
  }

  private residentText(r: Resident3D): string {
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
    if (this.busy || !document.body.classList.contains('mode-world')) return;
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
    this.world.update(dt, this.time, this.nexus.position, this.camera.position);
  }

  update(dt: number): void {
    this.time += dt;
    if (this.input.consumeView()) this.setView(!this.iso);

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
      this.nexus.move(still ? 0 : dirX, still ? 0 : dirZ, dt);
      this.world.resolve(this.nexus.position, NEXUS_RADIUS, blockers, this.nexus.position.y);
      this.updateVertical(dt);
    }
    if (this.input.consumeDance() && !this.busy && !this.zip && this.grounded) this.danceParty();
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
    this.nearestPole = !this.zip && this.grounded && !this.nearestResident && !this.connections.hasSelection() ? this.findNearestPole(objD) : null;
    if (this.input.consumeInteract() && !this.busy && !this.zip) {
      if (this.nearestResident) this.speak(this.nearestResident);
      else if (this.nearestPole) this.startZip(this.nearestPole);
      else if (this.nearest) this.interact(this.nearest);
    }
    if (this.el.interact) {
      this.el.interact.hidden = (!this.nearest && !this.nearestResident && !this.nearestPole) || this.busy || !!this.zip;
      this.el.interact.textContent = this.nearestResident
        ? 'Hablar'
        : this.nearestPole
          ? 'Tirolesa'
          : this.connections.hasSelection()
            ? 'Conectar'
            : 'Tocar';
    }
    this.checkFragments();

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
    const half = aspect < 1 ? Math.min(ISO_HALF / aspect, 9) : ISO_HALF;
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
    renderer.render(this.world.scene, this.camera, time, this.iso ? () => this.renderSilhouette(renderer) : undefined);
  }
}
