import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sharedOutline } from './render';

const CELL = 24; // metros por celda: se agrupa por zona para que la cámara pueda descartar lo que no ve

/**
 * Junta toda la escenografía quieta en pocas mallas (una por material y por celda del barrio).
 * El barrio tiene ~3000 piezas sueltas; dibujarlas una por una es demasiado para un celular.
 * Lo que tenga `userData.dynamic = true` (o un ancestro así) se deja intacto.
 */
export function batchStatic(root: THREE.Object3D, sharedOutline: THREE.Material): number {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean }>();
  const consumed: THREE.Mesh[] = [];
  const center = new THREE.Vector3();

  const visit = (o: THREE.Object3D): void => {
    if (o.userData.dynamic) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.visible) {
      let geo = mesh.geometry.clone();
      let mat = mesh.material as THREE.Material;
      if (mesh.userData.isOutline) {
        // Casco invertido: se "hornea" el engrosado en la geometría y todos comparten un material
        const t = (mat as THREE.ShaderMaterial).uniforms?.thickness?.value ?? 0;
        if (t > 0) {
          const pos = geo.getAttribute('position');
          const nor = geo.getAttribute('normal');
          for (let i = 0; i < pos.count; i += 1) {
            pos.setXYZ(i, pos.getX(i) + nor.getX(i) * t, pos.getY(i) + nor.getY(i) * t, pos.getZ(i) + nor.getZ(i) * t);
          }
        }
        mat = sharedOutline;
      }
      if (geo.index) geo = geo.toNonIndexed();
      for (const name of Object.keys(geo.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
      }
      if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      geo.applyMatrix4(mesh.matrixWorld);
      geo.computeBoundingBox();
      geo.boundingBox!.getCenter(center);
      // Lo enorme (suelo, agua, muros del canal) va en su propia celda
      const size = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
      const cell = size > CELL * 2 ? 'big' : `${Math.floor(center.x / CELL)},${Math.floor(center.z / CELL)}`;
      const key = `${mat.uuid}|${mesh.castShadow}|${cell}`;
      let b = buckets.get(key);
      if (!b) {
        b = { mat, geos: [], cast: mesh.castShadow };
        buckets.set(key, b);
      }
      b.geos.push(geo);
      consumed.push(mesh);
    }
    for (const c of o.children) visit(c);
  };
  visit(root);

  for (const m of consumed) m.removeFromParent();
  for (const b of buckets.values()) {
    const merged = mergeGeometries(b.geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return consumed.length;
}

/** ¿Es un casco de contorno que se puede hornear (material de contorno con grosor)? */
function isBakeableHull(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  return Boolean(m.isMesh && m.userData.isOutline && (m.material as THREE.ShaderMaterial).uniforms?.thickness);
}

/** Geometría lista para unir: sin índices, con posición, normal y uv, transformada por `matrix`. */
function prepared(src: THREE.BufferGeometry, matrix: THREE.Matrix4, inflate = 0): THREE.BufferGeometry | null {
  if (!src.getAttribute('position')) return null;
  let geo = src.clone();
  if (geo.index) geo = geo.toNonIndexed();
  for (const name of Object.keys(geo.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
  }
  if (!geo.getAttribute('normal')) geo.computeVertexNormals();
  if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
  if (inflate > 0) {
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    for (let i = 0; i < pos.count; i += 1) {
      pos.setXYZ(i, pos.getX(i) + nor.getX(i) * inflate, pos.getY(i) + nor.getY(i) * inflate, pos.getZ(i) + nor.getZ(i) * inflate);
    }
  }
  geo.applyMatrix4(matrix);
  return geo;
}

/**
 * Une las piezas quietas de un personaje u objeto (Etapa A de rendimiento): dentro de cada grupo, las mallas
 * hermanas que comparten material pasan a ser una sola, y sus contornos otra. Así el Nexus pasa de ~80
 * dibujos a ~25 y cada objeto conectable a unos pocos. No toca lo que esté en `protect` (piezas que el código
 * anima, oculta o recolorea por separado), ni mallas transparentes o con datos propios (`userData`).
 * Recolorear un material sigue funcionando: la malla unida usa el mismo material.
 */
export function mergeParts(root: THREE.Object3D, protect: Set<THREE.Object3D> = new Set()): number {
  let removed = 0;
  const visit = (node: THREE.Object3D): void => {
    const kids = node.children.slice();
    const bodies = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; cast: boolean; recv: boolean; look?: string }>();
    const hulls: THREE.BufferGeometry[] = [];
    const used: THREE.Mesh[] = [];
    if (!protect.has(node) || node === root) {
      for (const c of kids) {
        const m = c as THREE.Mesh;
        if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || protect.has(m) || !m.visible || m.userData.isOutline) continue;
        if (Array.isArray(m.material) || m.material.transparent || m.morphTargetInfluences) continue;
        if (Object.keys(m.userData).some((k) => k !== 'look')) continue;
        if (!m.children.every(isBakeableHull)) continue;
        m.updateMatrix();
        const body = prepared(m.geometry, m.matrix);
        if (!body) continue;
        const hullGeos: THREE.BufferGeometry[] = [];
        let ok = true;
        for (const h of m.children as THREE.Mesh[]) {
          h.updateMatrix();
          const t = ((h.material as THREE.ShaderMaterial).uniforms.thickness.value as number) || 0;
          const g = prepared(h.geometry, new THREE.Matrix4().multiplyMatrices(m.matrix, h.matrix), t);
          if (!g) ok = false;
          else hullGeos.push(g);
        }
        if (!ok) continue;
        const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}|${m.userData.look ?? ''}`;
        let b = bodies.get(key);
        if (!b) {
          b = { mat: m.material, geos: [], cast: m.castShadow, recv: m.receiveShadow, look: m.userData.look as string | undefined };
          bodies.set(key, b);
        }
        b.geos.push(body);
        hulls.push(...hullGeos);
        used.push(m);
      }
    }
    // Vale la pena solo si se ahorran dibujos
    const before = used.length + used.reduce((n, m) => n + m.children.length, 0);
    const after = bodies.size + (hulls.length ? 1 : 0);
    if (used.length >= 2 && after < before) {
      for (const m of used) m.removeFromParent();
      for (const b of bodies.values()) {
        const g = mergeGeometries(b.geos, false);
        if (!g) continue;
        const mesh = new THREE.Mesh(g, b.mat);
        mesh.castShadow = b.cast;
        mesh.receiveShadow = b.recv;
        if (b.look) mesh.userData.look = b.look;
        node.add(mesh);
      }
      if (hulls.length) {
        const g = mergeGeometries(hulls, false);
        if (g) {
          const hull = new THREE.Mesh(g, sharedOutline);
          hull.userData.isOutline = true;
          node.add(hull);
        }
      }
      removed += before - after;
    }
    for (const c of node.children) if (!(c as THREE.Mesh).userData?.isOutline) visit(c);
  };
  visit(root);
  trimShadows(root);
  return removed;
}

/**
 * Sombras más livianas: los contornos y las piezas diminutas (ojos, botones, remaches) no tiran sombra;
 * en el mapa de sombras no se notan y cada una es un dibujo más por cuadro.
 */
export function trimShadows(root: THREE.Object3D, minRadius = 0.12): void {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.castShadow) return;
    if (m.userData.isOutline) {
      m.castShadow = false;
      return;
    }
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    const r = (m.geometry.boundingSphere?.radius ?? 1) * m.matrixWorld.getMaxScaleOnAxis();
    if (r < minRadius) m.castShadow = false;
  });
}

/**
 * Lo que un objeto guarda en sus campos (mallas, grupos, listas, registros): eso lo anima o recolorea
 * el código, así que no se une. Los hijos directos de un grupo guardado tampoco (algunos se recorren por
 * posición, como las flores del cantero o los juguetes del desfile).
 */
export function referencedParts(obj: object, skip: Set<THREE.Object3D> = new Set()): Set<THREE.Object3D> {
  const out = new Set<THREE.Object3D>();
  const seen = new Set<unknown>();
  const take = (v: unknown, depth: number): void => {
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 3) return;
    seen.add(v);
    if (v instanceof THREE.Object3D) {
      if (skip.has(v)) return;
      out.add(v);
      if (!(v as THREE.Mesh).isMesh) for (const c of v.children) out.add(c);
      return;
    }
    if (v instanceof THREE.Material || v instanceof THREE.BufferGeometry || v instanceof THREE.Texture) return;
    if (Array.isArray(v)) for (const x of v) take(x, depth + 1);
    else if (Object.getPrototypeOf(v) === Object.prototype || v instanceof Map) {
      const vals = v instanceof Map ? [...v.values()] : Object.values(v);
      for (const x of vals) take(x, depth + 1);
    }
  };
  for (const val of Object.values(obj)) take(val, 0);
  return out;
}
