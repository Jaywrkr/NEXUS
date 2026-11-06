import * as THREE from 'three';
import { AudioSystem } from '../../systems/AudioSystem';
import type { Input } from '../core/input';
import type { Renderer } from '../core/render';
import { clamp, damp } from '../core/util';
import { vibrate } from '../core/settings';

/*
 * La carrera de luz (idea de Luca, Decisiones 016 y 041): cada vez que una fuente de energía se
 * conecta con algo grande, la energía viaja por adentro del cable y hay que guiar la chispa.
 * Cada carrera se arma distinta: forma del tubo, colores según el lugar, velocidad, largo,
 * compuertas que giran y chispitas para juntar (van a la mochila Atrapachispas).
 * La dificultad se adapta: sube de a poco al ganar y, si choca dos veces seguidas, la misma
 * carrera se rehace más fácil.
 */

const SPARK_R = 0.32;
const STEER = 6.4;
const DANGER = 0.78;
const RAMP = 14; // metros iniciales rectos para arrancar tranquilo

export type TunnelShape = 'suave' | 'zigzag' | 'espiral' | 'ondas' | 'angosto';
const SHAPES: TunnelShape[] = ['suave', 'zigzag', 'espiral', 'ondas', 'angosto'];
const SHAPE_NAMES: Record<TunnelShape, string> = {
  suave: 'curvas suaves',
  zigzag: 'zigzag',
  espiral: 'espiral',
  ondas: 'sube y baja',
  angosto: 'pasadizo angosto',
};

export type TunnelDeco = 'estrellas' | 'burbujas' | 'ondas' | 'hojas' | 'petalos';

export interface TunnelTheme {
  name: string;
  base: string;
  near: string;
  pulse: string;
  spark: string;
  bg: string;
  deco: TunnelDeco;
}

/** Colores del cable según el lugar al que va la energía. */
export const TUNNEL_THEMES: Record<string, TunnelTheme> = {
  plaza: { name: 'Cable dorado', base: '#1a1206', near: '#ffcf5a', pulse: '#fff2b0', spark: '#ffd23a', bg: '#120c04', deco: 'estrellas' },
  fountain: { name: 'Cable de agua', base: '#04121f', near: '#5ec8ff', pulse: '#d6f4ff', spark: '#8fe3ff', bg: '#031019', deco: 'burbujas' },
  beacon: { name: 'Cable de radio', base: '#0f0820', near: '#b77cff', pulse: '#ffd1ff', spark: '#e0b0ff', bg: '#0a0516', deco: 'ondas' },
  bridge: { name: 'Cable del bosque', base: '#06150a', near: '#7be07a', pulse: '#e8ffb0', spark: '#b6ff8a', bg: '#041008', deco: 'hojas' },
  casa: { name: 'Cable de la casa', base: '#160d06', near: '#ffb070', pulse: '#fff0c8', spark: '#ffd08a', bg: '#0f0804', deco: 'estrellas' },
  helado: { name: 'Cable de helado', base: '#140814', near: '#ff9fd0', pulse: '#e8fbff', spark: '#9be7ff', bg: '#0e050e', deco: 'burbujas' },
  cartas: { name: 'Cable de cartas', base: '#0c0618', near: '#c08cff', pulse: '#ffe8a0', spark: '#ffc23a', bg: '#080412', deco: 'estrellas' },
  taller: { name: 'Cable de juguete', base: '#120a1a', near: '#c7a0ef', pulse: '#ffe8a0', spark: '#ffc23a', bg: '#0b0612', deco: 'estrellas' },
  faroles: { name: 'Cable de faroles', base: '#0a1408', near: '#9be37a', pulse: '#fff6c0', spark: '#ffb84a', bg: '#060d05', deco: 'hojas' },
  fiesta: { name: 'Cable de fiesta', base: '#160610', near: '#ff9ff3', pulse: '#fff3a8', spark: '#7dffef', bg: '#0e040a', deco: 'petalos' },
  feria: { name: 'Cable de feria', base: '#180608', near: '#ff5a6e', pulse: '#ffe066', spark: '#ffe066', bg: '#100405', deco: 'estrellas' },
  montana: { name: 'Cable de montaña rusa', base: '#140a02', near: '#ffe066', pulse: '#ff5a6e', spark: '#5ec8ff', bg: '#0c0601', deco: 'ondas' },
  espejos: { name: 'Cable de espejos', base: '#08101a', near: '#c9ecff', pulse: '#ff9ff3', spark: '#ffffff', bg: '#050a10', deco: 'burbujas' },
  hielo: { name: 'Cable de hielo', base: '#06121a', near: '#bfefff', pulse: '#ffffff', spark: '#9be7ff', bg: '#040c12', deco: 'burbujas' },
  mar: { name: 'Cable de mar', base: '#04101f', near: '#3f7fd6', pulse: '#bfefff', spark: '#7dffef', bg: '#020a14', deco: 'burbujas' },
  faro: { name: 'Cable del faro', base: '#141004', near: '#fff6c0', pulse: '#ff5a6e', spark: '#ffe066', bg: '#0c0902', deco: 'estrellas' },
  fogon: { name: 'Cable del fogón', base: '#1a0a04', near: '#ff9f43', pulse: '#fff3a8', spark: '#ffd23a', bg: '#100604', deco: 'hojas' },
  molino: { name: 'Cable de viento', base: '#0a1210', near: '#cfeefa', pulse: '#fff3dc', spark: '#7be07a', bg: '#060c0a', deco: 'hojas' },
  granja: { name: 'Cable de la granja', base: '#160e04', near: '#ffd23a', pulse: '#ff9f43', spark: '#fff3dc', bg: '#0e0802', deco: 'petalos' },
  mercado: { name: 'Cable del mercado', base: '#1a0c10', near: '#e0453f', pulse: '#ffd23a', spark: '#9be37a', bg: '#10080a', deco: 'ondas' },
  cine: { name: 'Cable del cine', base: '#0e0a18', near: '#ffd23a', pulse: '#fff6c0', spark: '#e77fa6', bg: '#06040c', deco: 'estrellas' },
  biblio: { name: 'Cable de la biblioteca', base: '#0c1020', near: '#c7a0ef', pulse: '#fff3dc', spark: '#4fa8e0', bg: '#060812', deco: 'ondas' },
  fabrica: { name: 'Cable de la fábrica', base: '#141008', near: '#ffc23a', pulse: '#7dffef', spark: '#ff9f43', bg: '#0c0904', deco: 'ondas' },
  via: { name: 'Cable de vías', base: '#120c06', near: '#c7a17a', pulse: '#fff3a8', spark: '#ffb84a', bg: '#0b0703', deco: 'ondas' },
  skate: { name: 'Cable grafiti', base: '#140a04', near: '#ff9f43', pulse: '#d8ff6a', spark: '#7dff8a', bg: '#0d0703', deco: 'estrellas' },
  garden: { name: 'Cable de flores', base: '#1a0712', near: '#ff8fc8', pulse: '#fff0a8', spark: '#ffb3da', bg: '#12040c', deco: 'petalos' },
};

export interface TunnelPlan {
  theme: TunnelTheme;
  shape: TunnelShape;
  /** 0 = muy fácil, 1 = desafiante. */
  difficulty: number;
  seed: number;
}

/** Arma una carrera nueva para un lugar: forma al azar (distinta a las dos anteriores) y la dificultad pedida. */
// Las dos últimas formas (una carrera que se rearma más fácil tras dos choques también cuenta)
const recentShapes: TunnelShape[] = [];
export function planTunnel(zone: string, difficulty: number, seed = Math.floor(Math.random() * 1e9)): TunnelPlan {
  const rng = mulberry(seed);
  const options = SHAPES.filter((sh) => !recentShapes.includes(sh));
  const shape = options[Math.floor(rng() * options.length)];
  recentShapes.push(shape);
  if (recentShapes.length > 2) recentShapes.shift();
  return { theme: TUNNEL_THEMES[zone] ?? TUNNEL_THEMES.plaza, shape, difficulty: clamp(difficulty, 0, 1), seed };
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Course {
  length: number;
  speed: number;
  radius: number;
  center: (z: number, out?: THREE.Vector3) => THREE.Vector3;
  radiusAt: (depth: number) => number;
}

/** Arma la forma del recorrido a partir del plan. */
function buildCourse(plan: TunnelPlan): Course {
  const d = plan.difficulty;
  const rng = mulberry(plan.seed);
  const p1 = rng() * 6;
  const p2 = rng() * 6;
  const p3 = rng() * 6;
  const amp = 0.6 + 0.9 * d;
  const length = 85 + 45 * d;
  const speed = 12 + 6 * d;
  const radius = 3.2 - 0.6 * d;
  const ramp = (depth: number) => clamp(depth / RAMP, 0, 1);
  let fx: (t: number) => number;
  let fy: (t: number) => number;
  switch (plan.shape) {
    case 'zigzag':
      fx = (t) => amp * 2.3 * (2 / Math.PI) * Math.asin(0.92 * Math.sin(t * 0.11 + p1));
      fy = (t) => amp * 0.6 * Math.sin(t * 0.09 + p2);
      break;
    case 'espiral':
      fx = (t) => amp * 1.7 * Math.sin(t * 0.085 + p1);
      fy = (t) => amp * 1.7 * (Math.cos(t * 0.085 + p1) - Math.cos(p1));
      break;
    case 'ondas':
      fx = (t) => amp * 0.7 * Math.sin(t * 0.07 + p1);
      fy = (t) => amp * 2.0 * Math.sin(t * 0.13 + p2);
      break;
    case 'angosto':
      fx = (t) => amp * 0.8 * (1.6 * Math.sin(t * 0.08 + p1) + 0.6 * Math.sin(t * 0.19 + p2));
      fy = (t) => amp * 0.8 * Math.sin(t * 0.11 + p3);
      break;
    default:
      fx = (t) => amp * (2.1 * Math.sin(t * 0.085 + p1) + 0.9 * Math.sin(t * 0.21 + p2));
      fy = (t) => amp * 1.5 * Math.sin(t * 0.12 + p3);
  }
  const center = (z: number, out = new THREE.Vector3()) => {
    const depth = -z;
    const k = ramp(depth);
    return out.set(k * fx(depth), k * fy(depth), z);
  };
  const radiusAt =
    plan.shape === 'angosto'
      ? (depth: number) => radius * (1 - 0.3 * ramp(depth) * (0.5 + 0.5 * Math.sin(depth * 0.1 + p3)))
      : () => radius;
  return { length, speed, radius, center, radiusAt };
}

type Phase = 'ready' | 'countdown' | 'run' | 'failed' | 'won';

interface Gate {
  z: number;
  angle0: number;
  spin: number;
  mesh: THREE.Group;
}

interface Pickup {
  z: number;
  off: THREE.Vector2;
  mesh: THREE.Mesh;
  taken: boolean;
}

export class TunnelMode {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
  /** Para las pruebas: la chispa se maneja sola esquivando compuertas y juntando chispitas. */
  autopilot = false;
  private readonly input: Input;
  private readonly audio = new AudioSystem();
  private readonly tubeMat: THREE.ShaderMaterial;
  private readonly spark: THREE.Group;
  private readonly sparkCore: THREE.MeshBasicMaterial;
  private readonly sparkHalo: THREE.MeshBasicMaterial;
  private readonly trail: THREE.Mesh[] = [];
  private readonly offset = new THREE.Vector2();
  private readonly vel = new THREE.Vector2();
  private track = new THREE.Group();
  private course!: Course;
  private plan!: TunnelPlan;
  private gates: Gate[] = [];
  private pickups: Pickup[] = [];
  private decos: { m: THREE.Object3D; base: THREE.Vector3; p: number }[] = [];
  private z = 0;
  private t = 0;
  private runT = 0;
  private phase: Phase = 'won';
  private countdown = 0;
  private fails = 0;
  private collected = 0;
  private result: ((success: boolean, sparks: number) => void) | null = null;
  private readonly el = {
    hud: document.getElementById('tunnelHud'),
    bar: document.getElementById('tunnelBar'),
    msg: document.getElementById('tunnelMsg'),
    count: document.getElementById('tunnelCount'),
    panel: document.getElementById('tunnelPanel'),
    panelText: document.getElementById('tunnelPanelText'),
    go: document.getElementById('tunnelGo'),
    back: document.getElementById('tunnelBack'),
  };

  /** Para las pruebas: la partida terminó (ganada, o volviendo al barrio). */
  get done(): boolean {
    return this.phase === 'won' || this.result === null;
  }

  get state(): Phase {
    return this.phase;
  }

  /** La carrera actual (para las pruebas y el HUD). */
  get current(): { shape: TunnelShape; theme: string; difficulty: number; gates: number; sparks: number } | null {
    return this.plan
      ? { shape: this.plan.shape, theme: this.plan.theme.name, difficulty: this.plan.difficulty, gates: this.gates.length, sparks: this.collected }
      : null;
  }

  constructor(input: Input) {
    this.input = input;
    this.scene.background = new THREE.Color('#060f1c');
    this.scene.fog = new THREE.Fog('#060f1c', 12, 60);
    this.tubeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        danger: { value: 0 },
        time: { value: 0 },
        base: { value: new THREE.Color() },
        near: { value: new THREE.Color() },
        pulseCol: { value: new THREE.Color() },
        stripes: { value: 150 },
      },
      vertexShader: `varying vec2 vUv; varying float vDepth;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float danger; uniform float time; uniform vec3 base; uniform vec3 near; uniform vec3 pulseCol; uniform float stripes;
        varying vec2 vUv; varying float vDepth;
        void main(){
          float ring = step(fract(vUv.x * stripes), 0.14);
          float seam = step(fract(vUv.y * 12.0 + vUv.x * 8.0), 0.05);
          float pulse = step(fract(vUv.x * 6.0 - time * 0.6), 0.04);
          float fade = 1.0 - smoothstep(4.0, 55.0, vDepth);
          vec3 c = base + (ring * 0.9 + seam * 0.35) * near * fade + pulse * pulseCol * fade * 0.8;
          c = mix(c, vec3(1.0, 0.3, 0.25) * (0.4 + ring), danger * 0.6);
          gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
        }`,
    });

    this.sparkCore = new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false });
    this.sparkHalo = new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0.45, depthWrite: false, fog: false });
    this.spark = new THREE.Group();
    this.spark.add(new THREE.Mesh(new THREE.SphereGeometry(SPARK_R * 0.6, 16, 12), this.sparkCore));
    this.spark.add(new THREE.Mesh(new THREE.SphereGeometry(SPARK_R, 16, 12), this.sparkHalo));
    this.scene.add(this.spark);
    for (let i = 0; i < 14; i += 1) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(SPARK_R * 0.5 * (1 - i / 16), 8, 6),
        new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0.5 * (1 - i / 14), depthWrite: false, fog: false }),
      );
      this.trail.push(m);
      this.scene.add(m);
    }

    this.el.go?.addEventListener('click', () => this.primary());
    this.el.back?.addEventListener('click', () => this.leave());
    window.addEventListener('keydown', (e) => {
      if (!document.body.classList.contains('mode-tunnel') || this.result === null) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.primary();
      }
      if (e.code === 'Escape') this.leave();
    });
  }

  /* ---------- Armar la carrera ---------- */

  private build(plan: TunnelPlan): void {
    this.plan = plan;
    this.scene.remove(this.track);
    this.track.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        if (m.material !== this.tubeMat) (m.material as THREE.Material).dispose();
      }
    });
    this.track = new THREE.Group();
    this.scene.add(this.track);
    this.gates = [];
    this.pickups = [];
    this.decos = [];

    const th = plan.theme;
    const course = buildCourse(plan);
    this.course = course;
    const rng = mulberry(plan.seed ^ 0x9e3779b9);
    const bg = new THREE.Color(th.bg);
    (this.scene.background as THREE.Color).copy(bg);
    (this.scene.fog as THREE.Fog).color.copy(bg);
    // Un toque distinto cada vez: el color de las rayas se corre un poquito hacia el blanco
    this.tubeMat.uniforms.base.value.set(th.base);
    this.tubeMat.uniforms.near.value.set(th.near).lerp(new THREE.Color('#ffffff'), rng() * 0.2);
    this.tubeMat.uniforms.pulseCol.value.set(th.pulse);
    this.tubeMat.uniforms.stripes.value = 110 + Math.floor(rng() * 80);
    this.sparkHalo.color.set(th.spark);
    for (const m of this.trail) (m.material as THREE.MeshBasicMaterial).color.set(th.spark);

    // Tubo (con radio variable en el pasadizo angosto)
    const pts: THREE.Vector3[] = [];
    for (let z = 8; z >= -course.length - 30; z -= 2) pts.push(course.center(z));
    const curve = new THREE.CatmullRomCurve3(pts);
    const segs = 600;
    const radial = 20;
    const geo = new THREE.TubeGeometry(curve, segs, course.radius, radial, false);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const P = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i <= segs; i += 1) {
      curve.getPointAt(i / segs, P);
      const s = course.radiusAt(-P.z) / course.radius;
      if (s === 1) continue;
      for (let j = 0; j <= radial; j += 1) {
        const idx = i * (radial + 1) + j;
        v.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(s).add(P);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    this.track.add(new THREE.Mesh(geo, this.tubeMat));

    // Meta: disco de luz al final
    const goal = new THREE.Mesh(new THREE.CircleGeometry(course.radius, 32), new THREE.MeshBasicMaterial({ color: th.pulse, fog: false }));
    goal.position.copy(course.center(-course.length - 2));
    this.track.add(goal);

    // Compuertas que giran (solo cuando la dificultad ya subió)
    const d = plan.difficulty;
    const nGates = d < 0.3 ? 0 : Math.round(1 + 3 * d);
    for (let i = 0; i < nGates; i += 1) {
      const gz = -(RAMP + 18 + ((course.length - RAMP - 30) * (i + 0.5)) / nGates);
      const g = new THREE.Group();
      const r = course.radiusAt(-gz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(r * 2.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: th.pulse, fog: false }));
      g.add(bar);
      const glowBar = new THREE.Mesh(
        new THREE.BoxGeometry(r * 2.2, 0.6, 0.12),
        new THREE.MeshBasicMaterial({ color: th.near, transparent: true, opacity: 0.35, depthWrite: false, fog: false }),
      );
      g.add(glowBar);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
      g.add(hub);
      g.position.copy(course.center(gz));
      this.track.add(g);
      this.gates.push({ z: gz, angle0: rng() * Math.PI, spin: (0.45 + 0.6 * d) * (rng() < 0.5 ? -1 : 1), mesh: g });
    }

    // Chispitas para la mochila
    const nSparks = 6 + Math.floor(rng() * 4);
    const geoS = new THREE.OctahedronGeometry(0.28);
    for (let i = 0; i < nSparks; i += 1) {
      const pz = -(RAMP + 6 + ((course.length - RAMP - 12) * (i + rng() * 0.6)) / nSparks);
      // no justo encima de una compuerta
      if (this.gates.some((g) => Math.abs(g.z - pz) < 3)) continue;
      const a = rng() * Math.PI * 2;
      const rr = rng() * course.radiusAt(-pz) * 0.5;
      const off = new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr);
      const m = new THREE.Mesh(geoS, new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false }));
      const c = course.center(pz);
      m.position.set(c.x + off.x, c.y + off.y, pz);
      this.track.add(m);
      this.pickups.push({ z: pz, off, mesh: m, taken: false });
    }

    // Decoración del tema flotando dentro del cable
    for (let i = 0; i < 46; i += 1) {
      const dz = -(rng() * (course.length + 10));
      const a = rng() * Math.PI * 2;
      const rr = (0.35 + rng() * 0.5) * course.radiusAt(-dz);
      const c = course.center(dz);
      const base = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, dz);
      const m = this.decoMesh(th, rng);
      m.position.copy(base);
      this.track.add(m);
      this.decos.push({ m, base, p: rng() * 10 });
    }
  }

  private decoMesh(th: TunnelTheme, rng: () => number): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({ color: th.near, transparent: true, opacity: 0.55, depthWrite: false, fog: true, side: THREE.DoubleSide });
    switch (th.deco) {
      case 'burbujas':
        return new THREE.Mesh(new THREE.SphereGeometry(0.08 + rng() * 0.12, 8, 6), mat);
      case 'ondas':
        return new THREE.Mesh(new THREE.TorusGeometry(0.25 + rng() * 0.2, 0.025, 4, 18), mat);
      case 'hojas':
      case 'petalos': {
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.14, 5), mat);
        m.scale.set(1.6, 0.8, 1);
        if (th.deco === 'petalos') mat.color.set(rng() < 0.5 ? '#ffb3da' : '#fff0a8');
        return m;
      }
      default:
        return new THREE.Mesh(new THREE.OctahedronGeometry(0.1 + rng() * 0.08), mat);
    }
  }

  /* ---------- Ciclo de la carrera ---------- */

  start(plan: TunnelPlan, onDone: (success: boolean, sparks: number) => void): void {
    this.result = onDone;
    this.fails = 0;
    this.collected = 0;
    this.build(plan);
    this.reset();
    this.el.hud?.removeAttribute('hidden');
    this.showPanel(
      `${plan.theme.name} · ${SHAPE_NAMES[plan.shape]}. Guía la chispa arrastrando el dedo (o con las flechas) y junta chispitas ✦ para tu mochila. No toques las paredes${this.gates.length ? ' ni las compuertas que giran' : ''}.`,
      'EMPEZAR',
    );
    this.updateMsg();
  }

  private updateMsg(): void {
    if (this.el.msg) this.el.msg.textContent = `${this.plan.theme.name} · ✦ ${this.collected}`;
  }

  private reset(): void {
    this.z = 0;
    this.t = 0;
    this.runT = 0;
    this.phase = 'ready';
    this.offset.set(0, 0);
    this.vel.set(0, 0);
    this.tubeMat.uniforms.danger.value = 0;
    if (this.el.bar) this.el.bar.style.width = '0%';
    if (this.el.count) this.el.count.textContent = '';
    const p = this.course.center(0);
    this.trail.forEach((m) => m.position.copy(p));
  }

  private showPanel(text: string, primary: string): void {
    if (this.el.panelText) this.el.panelText.textContent = text;
    if (this.el.go) this.el.go.textContent = primary;
    this.el.panel?.removeAttribute('hidden');
  }

  private hidePanel(): void {
    this.el.panel?.setAttribute('hidden', '');
  }

  /** Botón principal: EMPEZAR desde la práctica, REINTENTAR tras chocar. */
  primary(): void {
    if (this.phase === 'ready') {
      this.hidePanel();
      this.phase = 'countdown';
      this.countdown = 3;
    } else if (this.phase === 'failed') {
      this.reset();
      this.hidePanel();
      this.phase = 'countdown';
      this.countdown = 3;
    }
  }

  /** Volver al barrio sin terminar (sin castigo; las chispitas juntadas se guardan igual). */
  leave(): void {
    if (this.phase !== 'ready' && this.phase !== 'failed') return;
    this.close(false);
  }

  private close(success: boolean): void {
    const done = this.result;
    this.result = null;
    this.hidePanel();
    const sparks = this.collected;
    window.setTimeout(() => {
      this.el.hud?.setAttribute('hidden', '');
      done?.(success, sparks);
    }, success ? 700 : 150);
  }

  private crash(text: string): void {
    this.phase = 'failed';
    this.fails += 1;
    this.audio.tone(180, 0, 0.25, 'sawtooth', 0.08);
    vibrate([60, 40, 60]);
    if (this.fails >= 2 && this.plan.difficulty > 0.05) {
      // Dos choques seguidos: la misma carrera, pero más fácil (más ancha, lenta y sin tantas compuertas)
      this.fails = 0;
      const kept = this.collected;
      this.build({ ...this.plan, difficulty: Math.max(0, this.plan.difficulty - 0.25) });
      this.collected = kept;
      this.reset();
      this.phase = 'failed';
      this.showPanel(`${text} La hice un poquito más fácil. ¡Prueba otra vez!`, 'REINTENTAR');
      return;
    }
    this.showPanel(`${text} Puedes intentarlo otra vez ahora mismo.`, 'REINTENTAR');
  }

  private steer(dt: number): void {
    const mv = this.input.move;
    this.vel.x = damp(this.vel.x, mv.x * STEER, 11, dt);
    this.vel.y = damp(this.vel.y, mv.y * STEER, 11, dt);
  }

  private gateAngle(g: Gate): number {
    return g.angle0 + g.spin * this.t;
  }

  /** Piloto automático (pruebas): esquiva la compuerta que viene, si no busca la próxima chispita. */
  private autopilotOffset(): void {
    const ahead = this.gates.find((g) => g.z < this.z + 0.5 && g.z > this.z - 4);
    if (ahead) {
      const a = this.gateAngle(ahead);
      this.offset.set(-Math.sin(a) * 1.0, Math.cos(a) * 1.0);
    } else {
      const next = this.pickups.find((p) => !p.taken && p.z < this.z && p.z > this.z - 6);
      this.offset.copy(next ? next.off : new THREE.Vector2());
    }
    this.vel.set(0, 0);
  }

  update(dt: number): void {
    this.t += dt;
    for (const g of this.gates) g.mesh.rotation.z = this.gateAngle(g);
    if (this.phase === 'ready') {
      this.steer(dt);
      this.offset.x += this.vel.x * dt;
      this.offset.y += this.vel.y * dt;
      const max = this.course.radius * DANGER;
      if (this.offset.length() > max) this.offset.setLength(max);
      return;
    }
    if (this.phase === 'countdown') {
      this.steer(dt);
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (this.el.count) this.el.count.textContent = this.countdown > 0 ? String(now) : '¡YA!';
      if (now !== before) vibrate(15);
      if (this.countdown <= 0) {
        this.phase = 'run';
        this.runT = 0;
        window.setTimeout(() => {
          if (this.el.count && this.phase === 'run') this.el.count.textContent = '';
        }, 500);
      }
      return;
    }
    if (this.phase !== 'run') return;

    this.runT += dt;
    const course = this.course;
    const speed = course.speed * clamp(this.runT / 1.0, 0.15, 1);
    this.z -= speed * dt;
    this.steer(dt);
    const prevC = course.center(this.z + speed * dt);
    const c = course.center(this.z);
    this.offset.x += this.vel.x * dt - (c.x - prevC.x);
    this.offset.y += this.vel.y * dt - (c.y - prevC.y);
    if (this.autopilot) this.autopilotOffset();

    // Chispitas
    for (const p of this.pickups) {
      if (p.taken || Math.abs(p.z - this.z) > 0.8) continue;
      if (p.off.distanceTo(this.offset) < 0.75) {
        p.taken = true;
        p.mesh.visible = false;
        this.collected += 1;
        this.audio.tone(1320 + this.collected * 60, 0, 0.12, 'sine', 0.09);
        this.updateMsg();
      }
    }

    const depth = -this.z;
    const r = course.radiusAt(depth);
    const dist = this.offset.length();
    this.tubeMat.uniforms.danger.value = damp(this.tubeMat.uniforms.danger.value, dist > r * DANGER ? 1 : 0, 10, dt);
    if (this.el.bar) this.el.bar.style.width = `${clamp(depth / course.length, 0, 1) * 100}%`;
    if (dist > r - SPARK_R) {
      this.crash('¡Tocaste la pared del cable!');
      return;
    }
    for (const g of this.gates) {
      if (Math.abs(g.z - this.z) > 0.35) continue;
      const a = this.gateAngle(g);
      if (Math.abs(-Math.sin(a) * this.offset.x + Math.cos(a) * this.offset.y) < 0.15 + SPARK_R) {
        this.crash('¡Chocaste con una compuerta!');
        return;
      }
    }
    if (depth >= course.length) {
      this.phase = 'won';
      this.audio.playCollect();
      if (this.el.count) this.el.count.textContent = '¡LO LOGRASTE!';
      this.close(true);
    }
  }

  render(renderer: Renderer, time: number): void {
    this.tubeMat.uniforms.time.value = time;
    const course = this.course;
    const c = course.center(this.z);
    this.spark.position.set(c.x + this.offset.x, c.y + this.offset.y, this.z);
    (this.spark.children[1] as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 20) * 0.12);
    for (let i = this.trail.length - 1; i > 0; i -= 1) this.trail[i].position.lerp(this.trail[i - 1].position, 0.6);
    this.trail[0].position.copy(this.spark.position);
    for (const p of this.pickups) {
      p.mesh.rotation.y = time * 3;
      p.mesh.rotation.x = time * 2;
    }
    for (const d of this.decos) {
      d.m.position.set(d.base.x + Math.sin(time * 1.3 + d.p) * 0.15, d.base.y + Math.sin(time * 0.9 + d.p) * 0.2, d.base.z);
      d.m.rotation.set(time * 0.7 + d.p, time * 0.5 + d.p, 0);
    }

    const back = course.center(this.z + 4.5);
    this.camera.position.set(back.x + this.offset.x * 0.45, back.y + this.offset.y * 0.45 + 0.35, back.z);
    const look = course.center(this.z - 8);
    this.camera.lookAt(look.x * 0.6 + this.spark.position.x * 0.4, look.y * 0.6 + this.spark.position.y * 0.4, look.z);
    this.camera.aspect = renderer.width / renderer.height;
    this.camera.fov = renderer.width < renderer.height ? 85 : 70;
    this.camera.updateProjectionMatrix();
    renderer.render(this.scene, this.camera, time);
  }
}
