import * as THREE from 'three';
import type { AudioSystem } from '../../systems/AudioSystem';
import type { Connectable } from '../objects/Connectable';

const CABLE_COLOR = new THREE.Color('#5ee7ff');
const CABLE_COLOR_INVALID = new THREE.Color('#ff6b6b');
const SPARK_COLORS = ['#5ee7ff', '#ffffff', '#bdf5ff'];

export interface ConnectionRule {
  sourceId: string;
  targetId: string;
  /** Antes de completarse hay que superar el mini-túnel del cable (Decisión 016). */
  useTunnel?: boolean;
  /** El cable se desvanece después de conectar (cosas chicas: no llenan el barrio de cables). */
  ephemeral?: boolean;
  /** Si devuelve false, la conexión todavía no se puede hacer (ej.: el escenario de la fiesta). */
  available?: () => boolean;
  /** Qué se dice cuando todavía no está disponible. */
  blockedMessage?: string;
}

export type FeedbackKind = 'info' | 'ok' | 'error';

export interface ConnectionEvents {
  feedback: (message: string, kind: FeedbackKind) => void;
  made: (source: Connectable, target: Connectable) => void;
  tunnel: (source: Connectable, target: Connectable) => void;
  /**
   * Conexión que no encaja. Si devuelve true, ya se respondió con algo especial
   * (una broma de los vecinos) y no se muestra el aviso genérico.
   */
  invalid?: (source: Connectable, target: Connectable) => boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  max: number;
  spin: number;
}

/**
 * La mecánica de conectar, en 3D. Misma lógica que el ConnectionSystem 2D:
 * primer toque elige el origen, segundo toque el destino, y una regla decide si encaja.
 * Novedades del 3D: mientras hay un origen elegido, el cable sale de la mochila del Nexus
 * y lo sigue; las conexiones hechas quedan dibujadas en el mundo; no se puede repetir una conexión.
 */
export class Connections {
  private readonly scene: THREE.Scene;
  private readonly audio: AudioSystem;
  private readonly events: ConnectionEvents;
  private readonly objects: Connectable[] = [];
  private readonly rules: ConnectionRule[] = [];
  private readonly made = new Set<string>();
  private selected: Connectable | null = null;
  private pending: THREE.Mesh | null = null;
  private readonly pendingMat = new THREE.MeshBasicMaterial({ color: CABLE_COLOR, transparent: true, opacity: 0.85, fog: false });
  private readonly particles: Particle[] = [];
  private readonly rings: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly pulses: { mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; t: number }[] = [];
  private readonly fading: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly sparkGeos = [new THREE.SphereGeometry(0.06, 6, 4), new THREE.OctahedronGeometry(0.09)];
  private time = 0;

  constructor(scene: THREE.Scene, audio: AudioSystem, events: ConnectionEvents) {
    this.scene = scene;
    this.audio = audio;
    this.events = events;
  }

  register(obj: Connectable): void {
    this.objects.push(obj);
  }

  addRule(rule: ConnectionRule): void {
    this.rules.push(rule);
  }

  get all(): readonly Connectable[] {
    return this.objects;
  }

  get selection(): Connectable | null {
    return this.selected;
  }

  hasSelection(): boolean {
    return this.selected !== null;
  }

  /** Tocar el objeto directamente o con el botón de interacción hace lo mismo. */
  interact(obj: Connectable): void {
    if (!this.selected) {
      if (obj.poke()) return;
      if (!obj.canInitiate()) {
        this.events.feedback(obj.role === 'target' ? 'Primero toca algo que tenga energía' : '', 'info');
        return;
      }
      this.selected = obj;
      this.events.feedback('Ahora conecta con algo...', 'info');
      return;
    }

    if (obj === this.selected) {
      this.cancel();
      return;
    }

    const source = this.selected;
    const target = obj;
    this.clearPending();
    this.selected = null;

    if (target.onceOnly && target.isActive) {
      target.poke();
      this.events.feedback('¡Eso ya está despierto!', 'info');
      return;
    }

    if (this.made.has(`${source.id}>${target.id}`)) {
      this.events.feedback('¡Eso ya está conectado!', 'info');
      return;
    }

    const rule = this.rules.find((r) => r.sourceId === source.id && r.targetId === target.id);
    if (!rule) {
      this.drawCable(source, target, false);
      if (this.events.invalid?.(source, target)) return;
      this.events.feedback('Esa conexión no encaja, prueba otra', 'error');
      this.audio.playError();
      return;
    }
    if (rule.available && !rule.available()) {
      this.drawCable(source, target, false);
      this.events.feedback(rule.blockedMessage ?? 'Todavía no se puede conectar', 'info');
      this.audio.playError();
      return;
    }

    if (rule.useTunnel) {
      this.events.tunnel(source, target);
      return;
    }

    this.complete(source, target, rule.ephemeral);
  }

  cancel(): void {
    this.selected = null;
    this.clearPending();
  }

  /** Resultado del mini-túnel. */
  finishTunnel(source: Connectable, target: Connectable, success: boolean): void {
    if (success) {
      this.complete(source, target);
      return;
    }
    this.drawCable(source, target, false);
    this.events.feedback('El cable quedó sin terminar. Puedes intentarlo otra vez cuando quieras', 'info');
  }

  /** Dibuja una conexión ya hecha en una partida guardada, sin efectos. */
  restore(source: Connectable, target: Connectable): void {
    this.made.add(`${source.id}>${target.id}`);
    const rule = this.rules.find((r) => r.sourceId === source.id && r.targetId === target.id);
    if (!rule?.ephemeral) this.drawCable(source, target, true, false);
  }

  private complete(source: Connectable, target: Connectable, ephemeral = false): void {
    this.made.add(`${source.id}>${target.id}`);
    this.drawCable(source, target, true, true, ephemeral);
    source.activate();
    target.activate();
    this.events.feedback('¡Conexión correcta!', 'ok');
    this.audio.playSuccess();
    const at = target.plugPoint();
    this.burst(at);
    this.ring(at);
    this.events.made(source, target);
  }

  /** Rayito desde un punto (la mochila del Nexus) hasta algo chico: se desvanece solo. */
  zap(from: THREE.Vector3, target: Connectable): void {
    const curve = this.curveBetween(from, target.plugPoint());
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.05, 6), new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, fog: false }));
    this.scene.add(tube);
    this.fading.push({ mesh: tube, life: 1.0 });
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
    this.scene.add(pulse);
    this.pulses.push({ mesh: pulse, curve, t: 0 });
    const at = target.plugPoint();
    this.burst(at);
    this.ring(at);
    this.audio.playSuccess();
  }

  private curveBetween(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y = Math.max(a.y, b.y) + 0.8 + a.distanceTo(b) * 0.18;
    return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
  }

  private drawCable(from: Connectable, to: Connectable, valid: boolean, effects = true, ephemeral = false): void {
    const curve = this.curveBetween(from.plugPoint(), to.plugPoint());
    const mat = new THREE.MeshBasicMaterial({ color: valid ? CABLE_COLOR : CABLE_COLOR_INVALID, transparent: !valid || ephemeral, fog: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, valid ? 0.06 : 0.05, 8), mat);
    this.scene.add(tube);
    if (!valid) {
      this.fading.push({ mesh: tube, life: 0.7 });
    } else if (ephemeral) {
      this.fading.push({ mesh: tube, life: 1.4 });
    }
    if (!valid) return;
    if (effects) {
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
      this.scene.add(pulse);
      this.pulses.push({ mesh: pulse, curve, t: 0 });
    }
  }

  private clearPending(): void {
    if (!this.pending) return;
    this.scene.remove(this.pending);
    this.pending.geometry.dispose();
    this.pending = null;
  }

  /** Ráfaga de chispas variadas (esferas y octaedros, cian/blanco) desde el destino. */
  private burst(at: THREE.Vector3): void {
    for (let i = 0; i < 18; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: SPARK_COLORS[i % SPARK_COLORS.length], transparent: true, fog: false });
      const mesh = new THREE.Mesh(this.sparkGeos[i % 3 === 0 ? 1 : 0], mat);
      mesh.position.copy(at);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize();
      this.scene.add(mesh);
      this.particles.push({ mesh, vel: dir.multiplyScalar(2.5 + Math.random() * 2.5), life: 0, max: 0.5 + Math.random() * 0.3, spin: (Math.random() - 0.5) * 12 });
    }
  }

  /** Anillo que se expande y desvanece mirando a la cámara. */
  private ring(at: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 32),
      new THREE.MeshBasicMaterial({ color: CABLE_COLOR, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }),
    );
    mesh.position.copy(at);
    mesh.scale.setScalar(0.2);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0 });
  }

  /** Chispas de celebración de colores (al completar las cuatro zonas). */
  celebrate(at: THREE.Vector3): void {
    const colors = ['#ffe066', '#5ee7ff', '#ff9ff3', '#9be37a'];
    for (let i = 0; i < 16; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, fog: false });
      const mesh = new THREE.Mesh(this.sparkGeos[i % 2], mat);
      mesh.position.copy(at);
      mesh.scale.setScalar(1.8);
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize();
      this.scene.add(mesh);
      this.particles.push({ mesh, vel: dir.multiplyScalar(4 + Math.random() * 3), life: 0, max: 0.9, spin: 6 });
    }
  }

  update(dt: number, camera: THREE.Camera, nexusPlug: THREE.Vector3): void {
    this.time += dt;

    // Cable "en la mano": de la fuente elegida a la mochila del Nexus
    if (this.selected) {
      const curve = this.curveBetween(this.selected.plugPoint(), nexusPlug);
      const geo = new THREE.TubeGeometry(curve, 24, 0.045, 6);
      if (this.pending) {
        this.pending.geometry.dispose();
        this.pending.geometry = geo;
      } else {
        this.pending = new THREE.Mesh(geo, this.pendingMat);
        this.scene.add(this.pending);
      }
      this.pendingMat.opacity = 0.6 + Math.sin(this.time * 8) * 0.25;
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life += dt;
      const k = p.life / p.max;
      p.vel.multiplyScalar(Math.exp(-3 * dt));
      p.vel.y -= 2 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.y += p.spin * dt;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      if (k >= 1) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life += dt / 0.5;
      const k = 1 - (1 - Math.min(r.life, 1)) ** 3;
      r.mesh.scale.setScalar(0.2 + k * 1.1);
      r.mesh.quaternion.copy(camera.quaternion);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      if (r.life >= 1) {
        this.scene.remove(r.mesh);
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i -= 1) {
      const p = this.pulses[i];
      p.t += dt / 0.5;
      p.curve.getPoint(Math.min(p.t, 1), p.mesh.position);
      if (p.t >= 1) {
        this.scene.remove(p.mesh);
        this.pulses.splice(i, 1);
      }
    }

    for (let i = this.fading.length - 1; i >= 0; i -= 1) {
      const f = this.fading[i];
      f.life -= dt;
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, f.life / 0.3);
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        this.fading.splice(i, 1);
      }
    }
  }
}
