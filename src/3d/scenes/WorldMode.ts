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
import { Beacon, BridgeLever, Door, EnergySource, Fountain, Fragment, StreetLamp } from '../objects/objects';
import { Connections } from '../systems/Connections';
import type { FeedbackKind } from '../systems/Connections';
import { World } from '../world/World';
import { SECRET_FRAGMENT, ZONE_FRAGMENTS } from './MuseumMode';

const INTERACT_REACH = 2.2; // metros desde el borde del objeto
const NEXUS_RADIUS = 0.32;
const ISO_HALF = 4.8;
/** La cámara isométrica mira desde el sureste (+X+Z) hacia el noroeste: ve las fachadas que dan a +X y +Z. */
const ISO_OFFSET = new THREE.Vector3(20, 22, 20);
const VIEW_KEY = 'los-nexus-3d-view';
const START = new THREE.Vector3(-20, 0, -11);

const [PLAZA_ID, FOUNTAIN_ID, BEACON_ID, BRIDGE_ID] = ZONE_FRAGMENTS.map((f) => f.id);

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
  private time = 0;
  private busy = false;

  private readonly lamp: StreetLamp;
  private readonly door: Door;
  private readonly fountain: Fountain;
  private readonly beacon: Beacon;
  private readonly bridge: BridgeLever;
  private readonly fragmentById = new Map<string, Fragment>();

  private readonly el = {
    msg: document.getElementById('msg'),
    stars: document.getElementById('stars'),
    toast: document.getElementById('toast'),
    interact: document.getElementById('interact') as HTMLButtonElement | null,
    view: document.getElementById('viewBtn'),
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
      made: (s, t) => {
        this.progress.saveConnection(s.id, t.id);
        this.applyConnection(t, true);
      },
      tunnel: (s, t) => this.cb.tunnel(s, t),
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

    for (const obj of [source, this.lamp, this.door, fountainSource, this.fountain, beaconA, beaconB, decoy, this.beacon, bridgeSource, this.bridge]) {
      // Los objetos conectables no se apagan con el pueblo: se ven como "lo que se puede tocar"
      keepVivid(obj.group);
      scene.add(obj.group);
      this.connections.register(obj);
    }
    this.connections.addRule({ sourceId: source.id, targetId: this.lamp.id, useTunnel: true });
    this.connections.addRule({ sourceId: this.lamp.id, targetId: this.door.id });
    this.connections.addRule({ sourceId: fountainSource.id, targetId: this.fountain.id });
    this.connections.addRule({ sourceId: beaconA.id, targetId: this.beacon.id });
    this.connections.addRule({ sourceId: beaconB.id, targetId: this.beacon.id });
    this.connections.addRule({ sourceId: bridgeSource.id, targetId: this.bridge.id });

    // Fragmentos: uno por zona + el secreto detrás de la casa (Decisión 019), que ya está visible
    for (const [id, x, y, z] of [
      [PLAZA_ID, -15.5, 1.0, -24.2],
      [FOUNTAIN_ID, -20, 1.0, 20.4],
      [BEACON_ID, 30.5, 1.0, -15.2],
      [BRIDGE_ID, 18, 1.0, 40.5],
      [SECRET_FRAGMENT.id, -18, 1.0, -39.6],
    ] as const) {
      const f = new Fragment(id, x, y, z);
      keepVivid(f.group);
      scene.add(f.group);
      this.fragments.push(f);
      this.fragmentById.set(id, f);
    }

    LIFE.reset();
    this.restoreProgress({ source, fountainSource, beaconA, beaconB, bridgeSource });
    this.setView(this.iso);

    this.el.interact?.addEventListener('click', () => this.input.queueInteract());
    this.el.view?.addEventListener('click', () => this.input.queueView());
    const canvas = document.getElementById('game');
    canvas?.addEventListener('pointerdown', (e) => this.onTap(e));
  }

  /* ---------- Progreso guardado ---------- */

  private restoreProgress(srcs: Record<'source' | 'fountainSource' | 'beaconA' | 'beaconB' | 'bridgeSource', Connectable>): void {
    const p = this.progress;
    // Partidas anteriores a guardar conexiones: si hay fragmento pero no conexiones, se deducen
    const legacy: [string, Connectable, Connectable][] = [
      [PLAZA_ID, srcs.source, this.lamp],
      [PLAZA_ID, this.lamp, this.door],
      [FOUNTAIN_ID, srcs.fountainSource, this.fountain],
      [BEACON_ID, srcs.beaconA, this.beacon],
      [BEACON_ID, srcs.beaconB, this.beacon],
      [BRIDGE_ID, srcs.bridgeSource, this.bridge],
    ];
    for (const [fragment, s, t] of legacy) if (p.hasFragment(fragment)) p.saveConnection(s.id, t.id);

    // Rehacer cada conexión guardada, sin animación (también los trabajos a medias)
    const byId = (id: string) => this.connections.all.find((o) => o.id === id);
    for (const c of p.getConnections()) {
      const s = byId(c.sourceId);
      const t = byId(c.targetId);
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
    if (done === 4) return 'Ya le devolviste la vida a todo el barrio';
    if (done === 0) return 'El barrio está triste y sin color. Conecta la fuente con la farola';
    return `Le devolviste la vida a ${done} de 4 lugares — sigue explorando`;
  }

  /** Zonas resueltas (no hace falta haber juntado el fragmento). */
  private zonesDone(): number {
    return [this.door.isActive, this.fountain.isActive, this.beacon.isFullyActive, this.bridge.isActive].filter(Boolean).length;
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
    this.world.mood = this.zonesDone() / 4;
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
      if (this.zonesDone() === 4) this.reviveWholeTown(animate);
    };
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

  finishTunnel(source: Connectable, target: Connectable, success: boolean): void {
    this.input.flush();
    this.connections.finishTunnel(source, target, success);
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
    if (this.el.stars) this.el.stars.textContent = `★ ${n}/4`;
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

  /* ---------- Interacción ---------- */

  private findNearest(): Connectable | null {
    let best: Connectable | null = null;
    let bestD = Infinity;
    const p = this.nexus.position;
    for (const obj of this.connections.all) {
      const d = Math.hypot(obj.x - p.x, obj.z - p.z) - obj.collideRadius;
      if (d < INTERACT_REACH && d < bestD) {
        best = obj;
        bestD = d;
      }
    }
    return best;
  }

  private interact(obj: Connectable): void {
    this.nexus.reach();
    this.connections.interact(obj);
  }

  /** Tocar/clic directo sobre un objeto (a cualquier distancia, como en el 2D). */
  private onTap(e: PointerEvent): void {
    if (this.busy || !document.body.classList.contains('mode-world')) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.connections.all.map((c) => c.group), true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.connectable) o = o.parent;
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
    this.nexus.animate(dt);
    for (const obj of this.connections.all) obj.update(dt, this.time);
    for (const f of this.fragments) f.update(this.time);
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
    this.nexus.move(this.busy ? 0 : dirX, this.busy ? 0 : dirZ, dt);
    const blockers = this.connections.all.map((c) => ({ x: c.x, z: c.z, r: c.collideRadius }));
    this.world.resolve(this.nexus.position, NEXUS_RADIUS, blockers);
    this.nexus.animate(dt);

    for (const obj of this.connections.all) obj.update(dt, this.time);
    for (const f of this.fragments) f.update(this.time);

    this.nearest = this.findNearest();
    if (this.input.consumeInteract() && this.nearest && !this.busy) this.interact(this.nearest);
    if (this.el.interact) {
      this.el.interact.hidden = !this.nearest || this.busy;
      this.el.interact.textContent = this.connections.hasSelection() ? 'Conectar' : 'Tocar';
    }
    this.checkFragments();

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast?.classList.remove('show');
    }

    this.updateCameras(dt);
    this.updateLife(dt);
    this.connections.update(dt, this.camera, this.nexus.plugPoint());
    this.world.update(dt, this.time, this.nexus.position, this.camera.position);
  }

  private updateCameras(dt: number): void {
    const p = this.nexus.position;
    const v = this.nexus.velocity;
    this.focus.x = damp(this.focus.x, p.x + v.x * 0.25, 5, dt);
    this.focus.z = damp(this.focus.z, p.z + v.z * 0.25, 5, dt);
    this.focus.y = 0;
    this.isoCam.position.copy(this.focus).add(ISO_OFFSET);
    this.isoCam.lookAt(this.focus.x, 0.8, this.focus.z);

    if (this.nexus.speed > 0.5) this.camYaw = dampAngle(this.camYaw, this.nexus.heading, 2.2, dt);
    const back = 6;
    this.chaseCam.position.set(p.x - Math.sin(this.camYaw) * back, 3.3, p.z - Math.cos(this.camYaw) * back);
    this.chaseCam.lookAt(p.x + Math.sin(this.camYaw) * 2, 1.0, p.z + Math.cos(this.camYaw) * 2);
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
    const half = aspect < 1 ? Math.min(ISO_HALF / aspect, 11) : ISO_HALF;
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
