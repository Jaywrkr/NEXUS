import * as THREE from 'three';

/*
 * Etapa C (pulido): ambiente del lugar. Partículas que siguen a la cámara —nieve en la Montaña, hojas en el
 * Bosque y el Parque, brillitos sobre el mar, polen en la Granja y luciérnagas de noche— y sombras de nubes
 * que pasan por el piso de día. Cada tipo de partícula es un solo dibujo (Points con shader): la posición la
 * calcula la placa de video a partir de una semilla y el tiempo, así que no cuesta nada al procesador.
 */

export type AmbienceKind = 'none' | 'snow' | 'leaves' | 'glints' | 'pollen' | 'fireflies';

const COUNT = 420;
const AREA = new THREE.Vector3(46, 14, 46);

interface Look {
  colors: [string, string];
  size: number;
  fall: number;
  sway: number;
  additive: boolean;
  /** Altura de las partículas: 0 = caen desde arriba; >0 = flotan cerca del piso. */
  float: number;
  twinkle: number;
}

const LOOKS: Record<Exclude<AmbienceKind, 'none'>, Look> = {
  snow: { colors: ['#ffffff', '#dfeaff'], size: 8, fall: 1.4, sway: 0.6, additive: false, float: 0, twinkle: 0 },
  leaves: { colors: ['#e07a2a', '#c9a227'], size: 6, fall: 0.8, sway: 1.6, additive: false, float: 0, twinkle: 0 },
  glints: { colors: ['#ffffff', '#c9f4ff'], size: 4, fall: 0, sway: 0.2, additive: true, float: 0.1, twinkle: 1 },
  pollen: { colors: ['#fff3a0', '#ffffff'], size: 3, fall: 0.05, sway: 0.8, additive: true, float: 1.6, twinkle: 0.4 },
  fireflies: { colors: ['#d9ff6a', '#fff27a'], size: 7, fall: 0, sway: 0.9, additive: true, float: 1.2, twinkle: 1 },
};

function lin(c: string): THREE.Color {
  const k = new THREE.Color(c);
  return new THREE.Color(Math.pow(k.r, 2.2), Math.pow(k.g, 2.2), Math.pow(k.b, 2.2));
}

export class Ambience {
  private readonly points = new Map<AmbienceKind, THREE.Points>();
  private readonly clouds: THREE.Mesh[] = [];
  private current: AmbienceKind = 'none';
  private readonly fade = new Map<AmbienceKind, number>();
  private readonly cloudMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    const seeds = new Float32Array(COUNT * 4);
    for (let i = 0; i < seeds.length; i += 1) seeds[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));
    for (const [kind, look] of Object.entries(LOOKS) as [Exclude<AmbienceKind, 'none'>, Look][]) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          center: { value: new THREE.Vector3() },
          area: { value: AREA },
          colA: { value: lin(look.colors[0]) },
          colB: { value: lin(look.colors[1]) },
          size: { value: look.size },
          fall: { value: look.fall },
          sway: { value: look.sway },
          hover: { value: look.float },
          minZ: { value: -1e9 },
          twinkle: { value: look.twinkle },
          alpha: { value: 0 },
          edge: { value: kind === 'snow' ? 0.55 : 1 },
          pxRatio: { value: 1 },
        },
        vertexShader: `attribute vec4 seed; uniform float time; uniform vec3 center; uniform vec3 area; uniform float size;
          uniform float fall; uniform float sway; uniform float hover; uniform float twinkle; uniform float pxRatio; uniform float minZ;
          varying vec4 vSeed; varying float vBlink;
          void main(){
            vSeed = seed;
            float t = time * (0.6 + seed.w * 0.8);
            vec3 p;
            p.x = seed.x * area.x + sin(t * 0.7 + seed.y * 30.0) * sway;
            p.z = seed.z * area.z + cos(t * 0.5 + seed.x * 30.0) * sway;
            if (hover > 0.0) p.y = 0.25 + seed.y * hover * 2.0 + sin(t + seed.z * 20.0) * 0.3;
            else p.y = area.y - mod(seed.y * area.y + t * fall, area.y);
            // Se repite alrededor de la cámara: siempre hay partículas cerca, sin moverlas desde el procesador
            vec3 base = center - area * 0.5;
            p.x = base.x + mod(p.x - base.x, area.x);
            p.z = base.z + mod(p.z - base.z, area.z);
            if (hover <= 0.0) p.y += center.y;
            vBlink = twinkle > 0.0 ? mix(1.0, 0.5 + 0.5 * sin(time * (2.0 + seed.w * 4.0) + seed.x * 40.0), twinkle) : 1.0;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = p.z < minZ ? 0.0 : size * pxRatio * (0.6 + seed.w * 0.8);
          }`,
        fragmentShader: `uniform vec3 colA; uniform vec3 colB; uniform float alpha; uniform float edge; varying vec4 vSeed; varying float vBlink;
          void main(){
            vec2 d = gl_PointCoord - 0.5;
            float r = length(d);
            if (r > 0.5) discard;
            float a = smoothstep(0.5, 0.15, r) * alpha * vBlink;
            // Borde un poco más oscuro: la nieve se ve aunque caiga sobre la nieve
            vec3 c = mix(colA, colB, vSeed.y) * mix(1.0, edge, smoothstep(0.18, 0.42, r));
            gl_FragColor = vec4(c, a);
          }`,
        transparent: true,
        depthWrite: false,
        blending: look.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        fog: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.visible = false;
      pts.renderOrder = 5;
      pts.userData.noCull = true;
      scene.add(pts);
      this.points.set(kind, pts);
      this.fade.set(kind, 0);
    }
    // Sombras de nubes: manchas grandes y suaves que cruzan el piso despacio
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(30,30,60,1)');
    grd.addColorStop(1, 'rgba(30,30,60,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.cloudMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    for (let i = 0; i < 5; i += 1) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.cloudMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(26 + i * 6, 18 + i * 4, 1);
      m.position.y = 0.09;
      m.userData.seed = i * 37.3;
      m.userData.noCull = true;
      m.renderOrder = -2;
      m.frustumCulled = false;
      scene.add(m);
      this.clouds.push(m);
    }
  }

  get kind(): AmbienceKind {
    return this.current;
  }

  /** Elige el ambiente y lo mueve con la cámara; `day` (0..1) apaga las sombras de nubes de noche. */
  /** Los brillitos solo sobre el mar (al sur de esta z). */
  seaZ = -1e9;

  update(dt: number, time: number, center: THREE.Vector3, kind: AmbienceKind, day: number, pxRatio: number, cloudsOn: boolean): void {
    this.current = kind;
    for (const [k, pts] of this.points) {
      const target = k === kind ? 1 : 0;
      const f = THREE.MathUtils.damp(this.fade.get(k)!, target, 2, dt);
      this.fade.set(k, f);
      pts.visible = f > 0.01;
      if (!pts.visible) continue;
      const u = (pts.material as THREE.ShaderMaterial).uniforms;
      u.time.value = time;
      u.center.value.copy(center);
      u.alpha.value = f * (k === 'fireflies' ? 1 : 0.85);
      u.pxRatio.value = pxRatio;
      u.minZ.value = k === 'glints' ? this.seaZ : -1e9;
    }
    // Nubes: cruzan de oeste a este y vuelven a aparecer del otro lado (en un cuadrado de 160 m alrededor de la cámara)
    this.cloudMat.opacity = THREE.MathUtils.damp(this.cloudMat.opacity, cloudsOn ? 0.13 * day : 0, 1.5, dt);
    const span = 160;
    for (const c of this.clouds) {
      const s = c.userData.seed as number;
      const x = ((s * 13 + time * 1.6) % span) - span / 2;
      const z = (((s * 29) % span) - span / 2) * 0.9;
      c.position.x = center.x + x;
      c.position.z = center.z + z;
      c.visible = this.cloudMat.opacity > 0.005;
    }
  }
}
