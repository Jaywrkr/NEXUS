import * as THREE from 'three';
import { isTouch } from './util';

/**
 * Look "fondo de anime en gouache" (heredado del prototipo Calle 85):
 * toon de 3 bandas duras + contorno por casco invertido + textura de pincel
 * multiplicada + post-proceso Kuwahara (manchas de pincel) con grading cálido.
 */

export const FOG_COLOR = new THREE.Color('#9fbbe6');
export const FOG_NEAR = 40;
export const FOG_FAR = 260;
const OUTLINE_COLOR = new THREE.Color('#231a36');

export const gradientMap = (() => {
  const data = new Uint8Array([105, 105, 105, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

/** Papel + trazos de pincel, en gris claro: se multiplica sobre el color del material. */
const brushTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f4';
  g.fillRect(0, 0, 256, 256);
  let s = 7;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < 900; i += 1) {
    const x = r() * 256;
    const y = r() * 256;
    const len = 6 + r() * 26;
    const a = r() * Math.PI;
    const v = r() < 0.5 ? 255 : 185 + r() * 35;
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.3})`;
    g.lineWidth = 2 + r() * 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();

const toonCache = new Map<string, THREE.MeshToonMaterial>();

/** Material toon compartido. `brush` = cuántas veces se repite la textura de pincel (0 = liso). */
export function toon(color: THREE.ColorRepresentation, brush = 0): THREE.MeshToonMaterial {
  const key = `${new THREE.Color(color).getHexString()}|${brush}`;
  const cached = toonCache.get(key);
  if (cached) return cached;
  const params: THREE.MeshToonMaterialParameters = { color, gradientMap };
  if (brush) {
    const t = brushTexture.clone();
    t.needsUpdate = true;
    t.repeat.set(brush, brush);
    params.map = t;
  }
  const mat = new THREE.MeshToonMaterial(params);
  toonCache.set(key, mat);
  return mat;
}

/** Material toon propio (no compartido), para objetos que cambian de color al conectarse. */
export function toonUnique(color: THREE.ColorRepresentation, brush = 0): THREE.MeshToonMaterial {
  return toon(color, brush).clone();
}

const flatCache = new Map<string, THREE.MeshBasicMaterial>();

/** Color plano sin luz (líneas de la calle, flores). Compartido por color. */
export function flat(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  const key = new THREE.Color(color).getHexString();
  let m = flatCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    flatCache.set(key, m);
  }
  return m;
}

/** Material que brilla (no le afecta la luz): ojos, chispas, luces encendidas. */
export function glow(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });
}

const outlineBase = new THREE.ShaderMaterial({
  uniforms: {
    thickness: { value: 0.02 },
    color: { value: OUTLINE_COLOR },
    fogColor: { value: FOG_COLOR },
    fogNear: { value: FOG_NEAR },
    fogFar: { value: FOG_FAR },
  },
  vertexShader: `uniform float thickness; varying float vDepth;
    void main(){ vec4 mv = modelViewMatrix * vec4(position + normal * thickness, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 color; uniform vec3 fogColor; uniform float fogNear, fogFar; varying float vDepth;
    void main(){ float f = smoothstep(fogNear, fogFar, vDepth); gl_FragColor = vec4(mix(color, fogColor, f), 1.0); }`,
  side: THREE.BackSide,
});

/** Material de contorno único (grosor ya "horneado" en la geometría), para la escenografía agrupada. */
export const sharedOutline = (() => {
  const m = outlineBase.clone();
  m.uniforms.thickness.value = 0;
  return m;
})();

/** Contorno para mallas redondeadas: infla la malla por la normal. */
export function outline<T extends THREE.Mesh>(mesh: T, thickness = 0.02): T {
  const mat = outlineBase.clone();
  mat.uniforms.thickness.value = thickness;
  const hull = new THREE.Mesh(mesh.geometry, mat);
  hull.userData.isOutline = true;
  mesh.add(hull);
  return mesh;
}

/** Contorno para cajas/extrusiones: escala la malla en vez de inflar normales (no se abre en las esquinas). */
export function outlineScaled<T extends THREE.Mesh>(mesh: T, sx: number, sy: number, sz: number): T {
  const mat = outlineBase.clone();
  mat.uniforms.thickness.value = 0;
  const hull = new THREE.Mesh(mesh.geometry, mat);
  hull.scale.set(sx, sy, sz);
  hull.userData.isOutline = true;
  mesh.add(hull);
  return mesh;
}

export interface BoxOpts {
  brush?: number;
  mat?: THREE.Material;
  outline?: number | false;
  cast?: boolean;
}

/** Caja toon con sombra y contorno: el ladrillo básico de todo el barrio. */
export function box(w: number, h: number, d: number, color: THREE.ColorRepresentation, opts: BoxOpts = {}): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, opts.mat ?? toon(color, opts.brush ?? 0));
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = true;
  if (opts.outline !== false) {
    const t = opts.outline ?? 0.05;
    outlineScaled(mesh, (w + 2 * t) / w, (h + 2 * t) / h, (d + 2 * t) / d);
  }
  return mesh;
}

/** Malla toon redondeada (esfera, cápsula, cilindro...) con sombra y contorno. */
export function rounded(geo: THREE.BufferGeometry, mat: THREE.Material, thickness = 0.02): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (thickness > 0) outline(mesh, thickness);
  return mesh;
}

/* ---------- Renderer + post-proceso ---------- */

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly dpr: number;
  private target: THREE.WebGLRenderTarget | null = null;
  private readonly postScene = new THREE.Scene();
  private readonly postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMat: THREE.ShaderMaterial;
  width = 1;
  height = 1;

  constructor(canvas: HTMLCanvasElement) {
    const touch = isTouch();
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, touch ? 1.25 : 1.5);
    this.gl.setPixelRatio(this.dpr);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;

    // En el celular el Kuwahara usa una ventana más chica (25 lecturas por píxel en vez de 49).
    const radius = touch ? 2 : 3;
    const quadrant = (radius + 1) * (radius + 1);
    this.postMat = new THREE.ShaderMaterial({
      defines: { KR: radius, KQ: `${quadrant}.0` },
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        res: { value: new THREE.Vector2(1, 1) },
        flash: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; uniform float flash; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 toSRGB(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
        void main(){
          vec2 px = 1.5 / res;
          vec3 m0 = vec3(0.), m1 = vec3(0.), m2 = vec3(0.), m3 = vec3(0.);
          vec3 s0 = vec3(0.), s1 = vec3(0.), s2 = vec3(0.), s3 = vec3(0.);
          for (int j = -KR; j <= KR; j++) {
            for (int i = -KR; i <= KR; i++) {
              vec3 t = toSRGB(texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * px).rgb);
              vec3 t2 = t * t;
              if (i <= 0 && j <= 0) { m0 += t; s0 += t2; }
              if (i >= 0 && j <= 0) { m1 += t; s1 += t2; }
              if (i <= 0 && j >= 0) { m2 += t; s2 += t2; }
              if (i >= 0 && j >= 0) { m3 += t; s3 += t2; }
            }
          }
          m0 /= KQ; m1 /= KQ; m2 /= KQ; m3 /= KQ;
          float v0 = dot(abs(s0 / KQ - m0 * m0), vec3(1.));
          float v1 = dot(abs(s1 / KQ - m1 * m1), vec3(1.));
          float v2 = dot(abs(s2 / KQ - m2 * m2), vec3(1.));
          float v3 = dot(abs(s3 / KQ - m3 * m3), vec3(1.));
          vec3 c = m0; float bv = v0;
          if (v1 < bv) { bv = v1; c = m1; }
          if (v2 < bv) { bv = v2; c = m2; }
          if (v3 < bv) { bv = v3; c = m3; }
          float l = dot(c, vec3(.299, .587, .114));
          c += vec3(0.0, 0.01, 0.05) * (1.0 - l);                           // sombras hacia azul
          c *= mix(vec3(1.0), vec3(1.07, 1.01, 0.88), smoothstep(.45, 1., l)); // luces doradas
          c = mix(vec3(l), c, 1.2);                                          // saturación
          c = pow(c, vec3(1.06));                                            // contraste
          float g = hash(floor(vUv * res / 1.5) + fract(time * 7.0) * 91.0) - .5;
          c += g * 0.02;                                                     // grano
          vec2 q = vUv - .5; c *= 1.0 - dot(q, q) * 0.35;                    // viñeta
          c = mix(c, vec3(1.0, 0.95, 0.75), flash);                          // destello de celebración
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));
  }

  set flash(v: number) {
    this.postMat.uniforms.flash.value = v;
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.gl.setSize(w, h, false);
    const W = Math.floor(w * this.dpr);
    const H = Math.floor(h * this.dpr);
    this.target?.dispose();
    this.target = new THREE.WebGLRenderTarget(W, H, {
      samples: isTouch() ? 0 : 4,
      stencilBuffer: true,
      type: THREE.HalfFloatType,
    });
    this.postMat.uniforms.tDiffuse.value = this.target.texture;
    this.postMat.uniforms.res.value.set(W, H);
  }

  /** Dibuja la escena al buffer intermedio; `extra` permite pasadas adicionales (silueta) antes del post-proceso. */
  render(scene: THREE.Scene, camera: THREE.Camera, time: number, extra?: () => void): void {
    this.postMat.uniforms.time.value = time;
    this.gl.setRenderTarget(this.target);
    this.gl.render(scene, camera);
    extra?.();
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
  }
}

/** Cielo degradado cobalto (cénit) → azul claro (horizonte). Sigue a la cámara. */
export function makeSky(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(500, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vP;
        vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){ float h = vP.y; vec3 top = vec3(0.08, 0.20, 0.58); vec3 mid = vec3(0.16, 0.36, 0.78); vec3 hor = vec3(0.58, 0.70, 0.90);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.7, h));
          c = mix(c, vec3(0.62, 0.72, 0.86), smoothstep(0.0, -0.2, h));
          gl_FragColor = vec4(toLinear(c), 1.0); }`,
    }),
  );
}
