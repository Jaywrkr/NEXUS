import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
