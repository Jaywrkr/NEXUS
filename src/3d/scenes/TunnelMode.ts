import * as THREE from 'three';
import type { Input } from '../core/input';
import type { Renderer } from '../core/render';
import { clamp, damp } from '../core/util';

const LENGTH = 110; // metros de túnel
const SPEED = 15; // m/s hacia adelante → ~7 s, como el túnel 2D
const RADIUS = 3.0;
const SPARK_R = 0.32;
const STEER = 6.2; // velocidad lateral máxima de la chispa
const DANGER = 0.78; // fracción del radio a partir de la que las paredes avisan

/** Centro del tubo según la profundidad: serpentea en X e Y. La chispa NO lo sigue sola (hay que guiarla). */
function center(z: number, out = new THREE.Vector3()): THREE.Vector3 {
  const d = -z;
  const ramp = clamp(d / 14, 0, 1); // los primeros metros son rectos, para arrancar tranquilo
  return out.set(
    ramp * (2.1 * Math.sin(d * 0.085) + 0.9 * Math.sin(d * 0.21 + 1.3)),
    ramp * (1.5 * Math.sin(d * 0.12 + 2.0)),
    z,
  );
}

type Phase = 'ready' | 'countdown' | 'run' | 'failed' | 'won';

/**
 * Mini-túnel dentro del cable (idea de Luca, Decisión 016) llevado a 3D: vamos dentro del tubo,
 * detrás de la chispa, y hay que mantenerla lejos de las paredes mientras el cable serpentea.
 *
 * Fases: práctica (la chispa se mueve pero no avanza ni puede chocar) → EMPEZAR → cuenta 3-2-1 →
 * carrera → choque (REINTENTAR / VOLVER AL BARRIO) o victoria. En el celular se maneja arrastrando
 * el dedo en cualquier parte de la pantalla; en PC con flechas/WASD. ESPACIO empieza o reintenta, ESC vuelve.
 */
export class TunnelMode {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
  private readonly input: Input;
  private readonly tubeMat: THREE.ShaderMaterial;
  private readonly spark: THREE.Group;
  private readonly trail: THREE.Mesh[] = [];
  private readonly offset = new THREE.Vector2();
  private readonly vel = new THREE.Vector2();
  private z = 0;
  private t = 0;
  private phase: Phase = 'won';
  private countdown = 0;
  private result: ((success: boolean) => void) | null = null;
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

  constructor(input: Input) {
    this.input = input;
    this.scene.background = new THREE.Color('#060f1c');
    this.scene.fog = new THREE.Fog('#060f1c', 12, 60);

    const pts: THREE.Vector3[] = [];
    for (let z = 8; z >= -LENGTH - 30; z -= 2) pts.push(center(z));
    const curve = new THREE.CatmullRomCurve3(pts);
    this.tubeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { danger: { value: 0 }, time: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying float vDepth;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float danger; uniform float time; varying vec2 vUv; varying float vDepth;
        void main(){
          float ring = step(fract(vUv.x * 150.0), 0.14);
          float seam = step(fract(vUv.y * 12.0), 0.05);
          float pulse = step(fract(vUv.x * 6.0 - time * 0.6), 0.04);
          vec3 base = vec3(0.03, 0.07, 0.12);
          vec3 near = vec3(0.25, 0.66, 0.84);
          float fade = 1.0 - smoothstep(4.0, 55.0, vDepth);
          vec3 c = base + (ring * 0.9 + seam * 0.35) * near * fade + pulse * vec3(1.0, 0.85, 0.4) * fade * 0.7;
          c = mix(c, vec3(1.0, 0.3, 0.25) * (0.4 + ring), danger * 0.6);
          gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 600, RADIUS, 20, false), this.tubeMat));

    // Meta: un disco de luz al final del cable
    const goal = new THREE.Mesh(new THREE.CircleGeometry(RADIUS, 32), new THREE.MeshBasicMaterial({ color: '#ffe066', fog: false }));
    goal.position.copy(center(-LENGTH - 2));
    this.scene.add(goal);

    // La chispa: núcleo blanco + halo cian + estela
    this.spark = new THREE.Group();
    this.spark.add(new THREE.Mesh(new THREE.SphereGeometry(SPARK_R * 0.6, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })));
    this.spark.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(SPARK_R, 16, 12),
        new THREE.MeshBasicMaterial({ color: '#5ee7ff', transparent: true, opacity: 0.45, depthWrite: false, fog: false }),
      ),
    );
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

  start(onDone: (success: boolean) => void): void {
    this.result = onDone;
    this.reset();
    this.el.hud?.removeAttribute('hidden');
    this.showPanel(
      'Práctica: mueve la chispa arrastrando el dedo por la pantalla (o con las flechas). Cuando estés listo, ¡empieza! No toques las paredes del cable.',
      'EMPEZAR',
    );
    if (this.el.msg) this.el.msg.textContent = 'Dentro del cable';
  }

  private reset(): void {
    this.z = 0;
    this.t = 0;
    this.phase = 'ready';
    this.offset.set(0, 0);
    this.vel.set(0, 0);
    this.tubeMat.uniforms.danger.value = 0;
    if (this.el.bar) this.el.bar.style.width = '0%';
    if (this.el.count) this.el.count.textContent = '';
    const p = center(0);
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

  /** Volver al barrio sin terminar el cable (sin castigo: se puede intentar de nuevo). */
  leave(): void {
    if (this.phase !== 'ready' && this.phase !== 'failed') return;
    this.close(false);
  }

  private close(success: boolean): void {
    const done = this.result;
    this.result = null;
    this.hidePanel();
    window.setTimeout(() => {
      this.el.hud?.setAttribute('hidden', '');
      done?.(success);
    }, success ? 700 : 150);
  }

  private steer(dt: number): void {
    const mv = this.input.move;
    this.vel.x = damp(this.vel.x, mv.x * STEER, 11, dt);
    this.vel.y = damp(this.vel.y, mv.y * STEER, 11, dt);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.phase === 'ready') {
      // Práctica: la chispa se mueve, pero no avanza ni puede chocar
      this.steer(dt);
      this.offset.x += this.vel.x * dt;
      this.offset.y += this.vel.y * dt;
      const max = RADIUS * DANGER;
      if (this.offset.length() > max) this.offset.setLength(max);
      return;
    }
    if (this.phase === 'countdown') {
      this.steer(dt);
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (this.el.count) this.el.count.textContent = this.countdown > 0 ? String(now) : '¡YA!';
      if (now !== before && navigator.vibrate) navigator.vibrate(15);
      if (this.countdown <= 0) {
        this.phase = 'run';
        this.t = 0;
        window.setTimeout(() => {
          if (this.el.count && this.phase === 'run') this.el.count.textContent = '';
        }, 500);
      }
      return;
    }
    if (this.phase !== 'run') return;

    // Arranque suave durante el primer segundo
    const speed = SPEED * clamp(this.t / 1.0, 0.15, 1);
    this.z -= speed * dt;
    this.steer(dt);

    // La chispa mantiene su posición lateral en el mundo; el tubo se mueve debajo de ella
    const prevC = center(this.z + speed * dt);
    const c = center(this.z);
    this.offset.x += this.vel.x * dt - (c.x - prevC.x);
    this.offset.y += this.vel.y * dt - (c.y - prevC.y);

    const dist = this.offset.length();
    this.tubeMat.uniforms.danger.value = damp(this.tubeMat.uniforms.danger.value, dist > RADIUS * DANGER ? 1 : 0, 10, dt);
    if (this.el.bar) this.el.bar.style.width = `${clamp(-this.z / LENGTH, 0, 1) * 100}%`;
    if (dist > RADIUS - SPARK_R) {
      this.phase = 'failed';
      if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      this.showPanel('¡Tocaste la pared del cable! Puedes intentarlo otra vez ahora mismo.', 'REINTENTAR');
      return;
    }
    if (-this.z >= LENGTH) {
      this.phase = 'won';
      if (this.el.count) this.el.count.textContent = '¡LO LOGRASTE!';
      this.close(true);
    }
  }

  render(renderer: Renderer, time: number): void {
    this.tubeMat.uniforms.time.value = time;
    const c = center(this.z);
    this.spark.position.set(c.x + this.offset.x, c.y + this.offset.y, this.z);
    (this.spark.children[1] as THREE.Mesh).scale.setScalar(1 + Math.sin(time * 20) * 0.12);
    for (let i = this.trail.length - 1; i > 0; i -= 1) this.trail[i].position.lerp(this.trail[i - 1].position, 0.6);
    this.trail[0].position.copy(this.spark.position);

    // Cámara detrás de la chispa, a medio camino entre el centro del tubo y la chispa (siempre dentro del tubo)
    const back = center(this.z + 4.5);
    this.camera.position.set(back.x + this.offset.x * 0.45, back.y + this.offset.y * 0.45 + 0.35, back.z);
    const look = center(this.z - 8);
    this.camera.lookAt(look.x * 0.6 + this.spark.position.x * 0.4, look.y * 0.6 + this.spark.position.y * 0.4, look.z);
    this.camera.aspect = renderer.width / renderer.height;
    this.camera.fov = renderer.width < renderer.height ? 85 : 70;
    this.camera.updateProjectionMatrix();
    renderer.render(this.scene, this.camera, time);
  }
}
