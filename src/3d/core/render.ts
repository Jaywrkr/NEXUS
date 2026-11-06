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
  // Filtrado anisótropo: el piso visto en diagonal (cámara isométrica) no se borronea a lo lejos.
  tex.anisotropy = 8;
  return tex;
})();

/* ---------- Vida del barrio ----------
 * El pueblo empieza triste y sin color. Cada conexión abre un "círculo de vida" en el mundo
 * (x, z, radio) donde vuelve el color; al resolver una zona el círculo es grande, y al terminar
 * todo el barrio recupera el color entero. Se hace en el shader de los materiales del mundo
 * (toon() y flat()); el Nexus y los objetos conectables usan copias sin este efecto: ellos
 * traen el color y se distinguen como lo que se puede tocar.
 */
export const LIFE_SPOTS = 32;
const lifeUniforms = {
  lifeSpots: { value: Array.from({ length: LIFE_SPOTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
  lifeGlobal: { value: 0 },
};

export const LIFE = {
  spots: lifeUniforms.lifeSpots.value,
  get global(): number {
    return lifeUniforms.lifeGlobal.value;
  },
  set global(v: number) {
    lifeUniforms.lifeGlobal.value = v;
  },
  /** Cuánta vida (0..1) hay en un punto del barrio; misma cuenta que el shader. */
  at(x: number, z: number): number {
    let l = lifeUniforms.lifeGlobal.value;
    for (const s of lifeUniforms.lifeSpots.value) {
      if (s.z <= 0) continue;
      const d = Math.hypot(x - s.x, z - s.y);
      const t = Math.min(1, Math.max(0, (d - s.z * 0.75) / (s.z * 0.25)));
      l = Math.max(l, 1 - t * t * (3 - 2 * t));
    }
    return l;
  },
  reset(): void {
    lifeUniforms.lifeGlobal.value = 0;
    for (const s of lifeUniforms.lifeSpots.value) s.set(0, 0, 0, 0);
  },
};

const LIFE_GLSL = `
  float lifeAmount = lifeGlobal;
  for (int i = 0; i < ${LIFE_SPOTS}; i++) {
    vec4 s = lifeSpots[i];
    if (s.z > 0.0) lifeAmount = max(lifeAmount, 1.0 - smoothstep(s.z * 0.75, s.z, distance(vLifePos.xz, s.xy)));
  }
  float lifeGray = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  vec3 gloom = mix(vec3(lifeGray), outgoingLight, 0.12) * vec3(0.9, 0.94, 1.03) * 0.86;
  outgoingLight = mix(gloom, outgoingLight, lifeAmount);
`;

/** Aplica el efecto "pueblo triste → con vida" a un material del mundo. */
export function withLife<T extends THREE.Material>(mat: T): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.lifeSpots = lifeUniforms.lifeSpots;
    shader.uniforms.lifeGlobal = lifeUniforms.lifeGlobal;
    shader.vertexShader = 'varying vec3 vLifePos;\n' + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  #ifdef USE_INSTANCING\n  vLifePos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\n  #else\n  vLifePos = (modelMatrix * vec4(transformed, 1.0)).xyz;\n  #endif',
    );
    shader.fragmentShader =
      `varying vec3 vLifePos;\nuniform vec4 lifeSpots[${LIFE_SPOTS}];\nuniform float lifeGlobal;\n` +
      shader.fragmentShader.replace('#include <opaque_fragment>', LIFE_GLSL + '#include <opaque_fragment>');
  };
  return mat;
}

/**
 * Copia los materiales de un objeto para que NO se apaguen con el pueblo (el Nexus, los objetos
 * conectables, los fragmentos). `clone()` no copia el onBeforeCompile, así que la copia queda "viva".
 */
export function keepVivid(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const mat = m.material as THREE.Material;
    if (mat.onBeforeCompile === THREE.Material.prototype.onBeforeCompile) return;
    if (mat.userData.unique) {
      // Material propio del objeto (toonUnique): se le saca el efecto en el lugar, así las clases que
      // guardan una referencia para cambiarle el color (al conectarse) siguen apuntando al que se ve.
      mat.onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
      mat.needsUpdate = true;
      return;
    }
    m.material = mat.clone();
  });
}

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
  const mat = withLife(new THREE.MeshToonMaterial(params));
  toonCache.set(key, mat);
  return mat;
}

/**
 * Etapa B: luz de borde (rim) para los personajes: el contorno que mira de costado a la cámara se aclara
 * un poco, como en las películas animadas, y el personaje se despega del fondo. Reemplaza el onBeforeCompile
 * del material (usar en copias propias, no en materiales compartidos).
 */
export function withRim<T extends THREE.Material>(mat: T, color = '#fff2d0', strength = 0.32): T {
  const c = new THREE.Color(color);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: c };
    shader.uniforms.rimStrength = { value: strength };
    shader.fragmentShader =
      'uniform vec3 rimColor;\nuniform float rimStrength;\n' +
      shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `{ vec3 rv = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
           float rim = pow(1.0 - clamp(dot(normalize(normal), rv), 0.0, 1.0), 3.0);
           outgoingLight += rimColor * smoothstep(0.25, 0.8, rim) * rimStrength; }
        #include <opaque_fragment>`,
      );
  };
  mat.customProgramCacheKey = () => 'rim';
  mat.needsUpdate = true;
  return mat;
}

/** Etapa B: textura de ondas (líneas claras curvas) para el agua animada; se repite y se desplaza. */
export function rippleTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, 256, 256);
  g.lineCap = 'round';
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 97) % 256;
    const y = (i * 61) % 256;
    const w = 18 + ((i * 13) % 30);
    g.strokeStyle = `rgba(235, 250, 255, ${0.22 + ((i * 7) % 5) * 0.06})`;
    g.lineWidth = 2 + (i % 3);
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.quadraticCurveTo(x, y - 5, x + w / 2, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

let blobTex: THREE.Texture | null = null;
/** Sombra de contacto: un círculo oscuro y difuso en el piso, debajo de un personaje. */
export function contactShadow(radius: number): THREE.Mesh {
  if (!blobTex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(20,14,40,0.55)');
    grd.addColorStop(0.6, 'rgba(20,14,40,0.22)');
    grd.addColorStop(1, 'rgba(20,14,40,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(cv);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = -1;
  m.userData.noXray = true;
  return m;
}

/** Material toon propio (no compartido), para objetos que cambian de color al conectarse. */
export function toonUnique(color: THREE.ColorRepresentation, brush = 0): THREE.MeshToonMaterial {
  const m = withLife(toon(color, brush).clone());
  m.userData.unique = true;
  return m;
}

const flatCache = new Map<string, THREE.MeshBasicMaterial>();

/** Color plano sin luz (líneas de la calle, flores). Compartido por color. */
export function flat(color: THREE.ColorRepresentation): THREE.MeshBasicMaterial {
  const key = new THREE.Color(color).getHexString();
  let m = flatCache.get(key);
  if (!m) {
    m = withLife(new THREE.MeshBasicMaterial({ color }));
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
  /** Resolución real (píxeles de dibujo por píxel de pantalla). La ajusta `adapt()` según la fluidez. */
  dpr: number;
  private readonly maxDpr: number;
  private readonly minDpr: number;
  private slowTime = 0;
  private fastTime = 0;
  private frameAvg = 1 / 60;
  private target: THREE.WebGLRenderTarget | null = null;
  private readonly postScene = new THREE.Scene();
  private readonly postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly postMat: THREE.ShaderMaterial;
  /** Etapa B: imagen chica desenfocada (sirve para el brillo y para el efecto maqueta). */
  private small: THREE.WebGLRenderTarget | null = null;
  private smallB: THREE.WebGLRenderTarget | null = null;
  private readonly downMat: THREE.ShaderMaterial;
  private readonly blurMat: THREE.ShaderMaterial;
  private readonly passScene = new THREE.Scene();
  private readonly passQuad: THREE.Mesh;
  /** Brillo y efecto maqueta (Opciones → Efectos de luz). */
  fancy = true;
  width = 1;
  height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: true });
    // Definición: se dibuja a la resolución real de la pantalla (hasta 2×). Antes el celular
    // dibujaba a 1.25× y estiraba la imagen, por eso se veía borrosa y con escalones.
    this.maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.minDpr = Math.min(this.maxDpr, 1);
    this.dpr = this.maxDpr;
    this.gl.setPixelRatio(this.dpr);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;

    // Kuwahara de radio 2 (25 lecturas por píxel) con paso de ~0.8 px de pantalla: pincelada
    // fina que ya no se come los detalles chicos (ojos, carteles, piezas de las máquinas).
    const radius = 2;
    const quadrant = (radius + 1) * (radius + 1);
    this.postMat = new THREE.ShaderMaterial({
      defines: { KR: radius, KQ: `${quadrant}.0` },
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        res: { value: new THREE.Vector2(1, 1) },
        flash: { value: 0 },
        step: { value: 1.5 },
        voltio: { value: 0 },
        night: { value: 0 },
        tBlur: { value: null },
        bloom: { value: 0 },
        tilt: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tBlur; uniform float bloom; uniform float tilt; uniform float time; uniform vec2 res; uniform float flash; uniform float step; uniform float voltio; uniform float night; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 toSRGB(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
        void main(){
          vec2 px = step / res;
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
          // Detalle: se devuelve parte de la imagen nítida (bordes, ojos, letras) sobre la pincelada
          // y se realza un poco el contraste local (máscara de enfoque sobre el promedio de la ventana).
          vec3 sharp = toSRGB(texture2D(tDiffuse, vUv).rgb);
          vec3 avg = (m0 + m1 + m2 + m3) * 0.25;
          c = mix(c, sharp, 0.35);
          c += (sharp - avg) * 0.22;
          float l = dot(c, vec3(.299, .587, .114));
          c += vec3(0.0, 0.01, 0.05) * (1.0 - l);                           // sombras hacia azul
          c *= mix(vec3(1.0), vec3(1.07, 1.01, 0.88), smoothstep(.45, 1., l)); // luces doradas
          c = mix(vec3(l), c, 1.2);                                          // saturación
          c = pow(c, vec3(1.06));                                            // contraste
          float g = hash(floor(vUv * res / 1.5) + fract(time * 7.0) * 91.0) - .5;
          c += g * 0.02;                                                     // grano
          vec2 q = vUv - .5; c *= 1.0 - dot(q, q) * 0.35;                    // viñeta
          // Mundo Voltio: todo oscuro y las formas dibujadas con líneas de neón (bordes de la imagen);
          // lo que ya brilla (chispitas, nodos, estela, Estática) se queda encendido.
          if (voltio > 0.001) {
            vec2 o = px * 1.5;
            float lc = dot(sharp, vec3(.299, .587, .114));
            float lx = dot(toSRGB(texture2D(tDiffuse, vUv + vec2(o.x, 0.)).rgb), vec3(.299, .587, .114));
            float ly = dot(toSRGB(texture2D(tDiffuse, vUv + vec2(0., o.y)).rgb), vec3(.299, .587, .114));
            float lx2 = dot(toSRGB(texture2D(tDiffuse, vUv - vec2(o.x, 0.)).rgb), vec3(.299, .587, .114));
            float ly2 = dot(toSRGB(texture2D(tDiffuse, vUv - vec2(0., o.y)).rgb), vec3(.299, .587, .114));
            float edge = smoothstep(0.09, 0.26, abs(lx - lx2) + abs(ly - ly2));
            vec3 neon = mix(vec3(0.15, 0.95, 1.0), vec3(1.0, 0.3, 0.85), smoothstep(0.35, 0.75, vUv.y + sin(vUv.x * 6.0 + time * 0.6) * 0.08));
            vec3 v = vec3(0.025, 0.02, 0.08) + vec3(0.03, 0.02, 0.09) * lc;
            v += neon * edge * 0.95;
            float bright = smoothstep(0.78, 0.95, max(max(sharp.r, sharp.g), sharp.b));
            v = mix(v, sharp * 1.15, bright);
            v *= 1.0 - dot(q, q) * 0.6;
            c = mix(c, v, voltio);
          }
          // Noche: todo más oscuro y azul, pero lo que brilla (faroles, ventanas, chispitas) sigue encendido
          if (night > 0.001) {
            float glowK = smoothstep(0.62, 0.9, max(max(sharp.r, sharp.g), sharp.b));
            vec3 n = c * vec3(0.46, 0.52, 0.8) + vec3(0.01, 0.015, 0.04);
            c = mix(c, mix(n, c * 1.08, glowK), night);
          }
          // Etapa B: brillo suave alrededor de lo que se ilumina (faroles, chispas, el cable) y efecto
          // maqueta (arriba y abajo de la pantalla un poco desenfocado, como una ciudad en miniatura)
          if (bloom > 0.001 || tilt > 0.001) {
            vec3 bl = texture2D(tBlur, vUv).rgb;
            float edgeY = smoothstep(0.28, 0.5, abs(vUv.y - 0.5));
            c = mix(c, toSRGB(bl) * (1.0 - dot(q, q) * 0.35), tilt * edgeY);
            // Lo que brilla: claro y con color (luces, chispas, el cable); lo blanco apagado casi no suma
            float hi = max(max(bl.r, bl.g), bl.b);
            float lo = min(min(bl.r, bl.g), bl.b);
            float sat = hi > 0.0 ? (hi - lo) / hi : 0.0;
            float k = smoothstep(0.55, 0.92, hi) * mix(0.35, 1.0, smoothstep(0.15, 0.55, sat));
            c += toSRGB(bl * k) * bloom * 0.55;
          }
          c = mix(c, vec3(1.0, 0.95, 0.75), flash);                          // destello de celebración
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    // Achicar (promedio de 4 lecturas) y desenfocar en dos pasadas (horizontal y vertical), a un cuarto de resolución
    const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
    this.downMat = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2(1, 1) } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D src; uniform vec2 texel; varying vec2 vUv;
        void main(){ vec2 o = texel * 0.75;
          vec3 c = texture2D(src, vUv + vec2(-o.x, -o.y)).rgb + texture2D(src, vUv + vec2(o.x, -o.y)).rgb
                 + texture2D(src, vUv + vec2(-o.x, o.y)).rgb + texture2D(src, vUv + vec2(o.x, o.y)).rgb;
          gl_FragColor = vec4(min(c * 0.25, vec3(4.0)), 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, dir: { value: new THREE.Vector2(1, 0) } },
      vertexShader: vs,
      fragmentShader: `uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(src, vUv).rgb * 0.2270270;
          c += (texture2D(src, vUv + dir * 1.3846153).rgb + texture2D(src, vUv - dir * 1.3846153).rgb) * 0.3162162;
          c += (texture2D(src, vUv + dir * 3.2307692).rgb + texture2D(src, vUv - dir * 3.2307692).rgb) * 0.0702702;
          gl_FragColor = vec4(c, 1.0); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.passQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.downMat);
    this.passScene.add(this.passQuad);
  }

  /** Brillo (0 = nada). WorldMode lo sube un poco de noche. */
  set bloom(v: number) {
    this.postMat.uniforms.bloom.value = v;
  }

  /** Efecto maqueta (0 = nada): solo en la vista isométrica. */
  set tilt(v: number) {
    this.postMat.uniforms.tilt.value = v;
  }

  set flash(v: number) {
    this.postMat.uniforms.flash.value = v;
  }

  /** 0 = día, 1 = noche cerrada (oscurece y azula sin apagar lo que brilla). */
  set night(v: number) {
    this.postMat.uniforms.night.value = v;
  }

  /** 0 = mundo normal, 1 = Mundo Voltio (bordes de neón sobre negro). */
  set voltio(v: number) {
    this.postMat.uniforms.voltio.value = v;
  }

  /**
   * Resolución adaptable: si el equipo no llega a ~45 cuadros por segundo durante un rato, baja la
   * resolución de a poco (nunca menos de 1×); si va sobrado, la vuelve a subir. Así un celular
   * potente ve todo nítido y uno modesto sigue fluido. Se desactiva en pruebas automáticas.
   */
  adapt(dt: number): void {
    if (navigator.webdriver || dt <= 0) return;
    this.frameAvg += (dt - this.frameAvg) * 0.05;
    if (this.frameAvg > 1 / 45) {
      this.slowTime += dt;
      this.fastTime = 0;
    } else if (this.frameAvg < 1 / 57) {
      this.fastTime += dt;
      this.slowTime = 0;
    } else {
      this.slowTime = this.fastTime = 0;
    }
    if (this.slowTime > 2 && this.dpr > this.minDpr) this.setDpr(this.dpr - 0.25);
    else if (this.fastTime > 6 && this.dpr < this.maxDpr) this.setDpr(this.dpr + 0.25);
  }

  /** Resolución actual, para el medidor de rendimiento. */
  get dprLabel(): string {
    return `${this.dpr.toFixed(2).replace(/0$/, '')}×`;
  }

  private setDpr(v: number): void {
    this.dpr = Math.min(this.maxDpr, Math.max(this.minDpr, v));
    this.slowTime = this.fastTime = 0;
    this.frameAvg = 1 / 52;
    this.gl.setPixelRatio(this.dpr);
    this.resize();
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
    const sw = Math.max(1, Math.floor(W / 4));
    const sh = Math.max(1, Math.floor(H / 4));
    this.small?.dispose();
    this.smallB?.dispose();
    this.small = new THREE.WebGLRenderTarget(sw, sh, { type: THREE.HalfFloatType, depthBuffer: false });
    this.smallB = new THREE.WebGLRenderTarget(sw, sh, { type: THREE.HalfFloatType, depthBuffer: false });
    this.downMat.uniforms.texel.value.set(1 / W, 1 / H);
    this.postMat.uniforms.tBlur.value = this.small.texture;
    // La pincelada mide lo mismo en pantalla sea cual sea la resolución (~0.8 px de pantalla por paso).
    this.postMat.uniforms.step.value = Math.max(1, 0.8 * this.dpr);
  }

  /** Dibuja la escena al buffer intermedio; `extra` permite pasadas adicionales (silueta) antes del post-proceso. */
  render(scene: THREE.Scene, camera: THREE.Camera, time: number, extra?: () => void): void {
    this.postMat.uniforms.time.value = time;
    this.gl.setRenderTarget(this.target);
    this.gl.render(scene, camera);
    extra?.();
    const on = this.fancy && (this.postMat.uniforms.bloom.value > 0.001 || this.postMat.uniforms.tilt.value > 0.001);
    if (on && this.small && this.smallB && this.target) {
      // Achicar → desenfocar horizontal → vertical (dos veces, para que el brillo sea amplio y suave)
      this.passQuad.material = this.downMat;
      this.downMat.uniforms.src.value = this.target.texture;
      this.gl.setRenderTarget(this.small);
      this.gl.render(this.passScene, this.postCam);
      this.passQuad.material = this.blurMat;
      const w = this.small.width;
      const h = this.small.height;
      for (let k = 0; k < 2; k += 1) {
        this.blurMat.uniforms.src.value = this.small.texture;
        this.blurMat.uniforms.dir.value.set((1 + k) / w, 0);
        this.gl.setRenderTarget(this.smallB);
        this.gl.render(this.passScene, this.postCam);
        this.blurMat.uniforms.src.value = this.smallB.texture;
        this.blurMat.uniforms.dir.value.set(0, (1 + k) / h);
        this.gl.setRenderTarget(this.small);
        this.gl.render(this.passScene, this.postCam);
      }
    }
    const savedBloom = this.postMat.uniforms.bloom.value;
    const savedTilt = this.postMat.uniforms.tilt.value;
    if (!on) {
      this.postMat.uniforms.bloom.value = 0;
      this.postMat.uniforms.tilt.value = 0;
    }
    this.gl.setRenderTarget(null);
    this.gl.render(this.postScene, this.postCam);
    this.postMat.uniforms.bloom.value = savedBloom;
    this.postMat.uniforms.tilt.value = savedTilt;
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
      uniforms: { skyLife: { value: 0 }, skyNight: { value: 0 } },
      fragmentShader: `varying vec3 vP; uniform float skyLife; uniform float skyNight;
        float sh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        vec3 toLinear(vec3 c){ return pow(c, vec3(2.2)); }
        void main(){ float h = vP.y; vec3 top = vec3(0.08, 0.20, 0.58); vec3 mid = vec3(0.16, 0.36, 0.78); vec3 hor = vec3(0.58, 0.70, 0.90);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.7, h));
          c = mix(c, vec3(0.62, 0.72, 0.86), smoothstep(0.0, -0.2, h));
          float g = dot(c, vec3(0.299, 0.587, 0.114));
          c = mix(vec3(g) * vec3(0.92, 0.95, 1.0), c, 0.25 + 0.75 * skyLife);
          // Noche: azul profundo con estrellas
          vec3 nightSky = mix(vec3(0.05, 0.07, 0.2), vec3(0.01, 0.02, 0.08), smoothstep(0.0, 0.6, h));
          float star = step(0.9965, sh(floor(vP * 260.0))) * smoothstep(0.05, 0.3, h);
          nightSky += vec3(star);
          c = mix(c, nightSky, skyNight);
          gl_FragColor = vec4(toLinear(c), 1.0); }`,
    }),
  );
}
