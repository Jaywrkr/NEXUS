import * as THREE from 'three';
import { box, rounded, toon } from '../core/render';
import { damp, dampAngle } from '../core/util';

/** Cómo se ve cada habitante del capítulo 1 en 3D (los textos vienen de src/data/chapter.ts). */
export interface ResidentLook {
  body: string;
  pants: string;
  skin: string;
  hair: string;
  /** 1 = normal; >1 = más ancho (Bombo). */
  girth?: number;
  accessory: 'hardhat' | 'raincoat' | 'headphones' | 'tophat' | 'mayor';
}

export const RESIDENT_LOOKS: Record<string, ResidentLook> = {
  // Miga: encargada de mantenimiento, casco amarillo y llave inglesa
  miga: { body: '#2bb3a8', pants: '#3b4f7a', skin: '#e8b48a', hair: '#6b4226', accessory: 'hardhat' },
  // Bombo: cree que su goteo es una orquesta; impermeable y tambor
  bombo: { body: '#4fa8e0', pants: '#2c3f66', skin: '#c98e6b', hair: '#2a1d14', girth: 1.3, accessory: 'raincoat' },
  // Vera: locutora de radio, auriculares y micrófono
  vera: { body: '#e77fa6', pants: '#4a3a6a', skin: '#f0c39a', hair: '#7b4fb0', accessory: 'headphones' },
  // Don Paso: se cree celebridad; galera, lentes oscuros y moño
  'don-paso': { body: '#f2c14e', pants: '#3a3d48', skin: '#d9a77e', hair: '#d8d8d8', accessory: 'tophat' },
  // Alcalde Goteo: confunde tener un aspersor con gobernar; banda de alcalde, bombín, bigote y regadera
  goteo: { body: '#4d6b8a', pants: '#2c3040', skin: '#e3a986', hair: '#bdbdbd', girth: 1.15, accessory: 'mayor' },
};

/**
 * Vecino del barrio armado con primitivas. Está triste (cabizbajo, quieto) mientras su lugar
 * no tiene vida, y se alegra cuando Nexus lo restaura. Gira hacia el Nexus cuando está cerca
 * y gesticula al hablar. Sus materiales se apagan con el pueblo (no son "vivos" como el Nexus).
 */
export class Resident3D {
  readonly id: string;
  readonly name: string;
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly notice: THREE.Sprite;
  private happy = 0;
  private targetHappy = 0;
  private talkT = -1;
  private time = Math.random() * 10;
  private facing = 0;

  constructor(id: string, name: string, x: number, z: number, facing: number) {
    this.id = id;
    this.name = name;
    this.facing = facing;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = facing;
    this.root.scale.setScalar(1.25);
    this.root.userData.resident = this;
    const look = RESIDENT_LOOKS[id];
    const g = look.girth ?? 1;
    this.root.add(this.body);

    for (const lx of [0.08, -0.08]) {
      const leg = rounded(new THREE.CapsuleGeometry(0.065, 0.2, 4, 10), toon(look.pants), 0.014);
      leg.position.set(lx * g, 0.2, 0);
      this.body.add(leg);
      const shoe = box(0.12, 0.07, 0.2, '#3a2a22', { outline: 0.012 });
      shoe.position.set(lx * g, 0.035, 0.03);
      this.body.add(shoe);
    }
    const torso = rounded(new THREE.CapsuleGeometry(0.16, 0.18, 6, 14), toon(look.body, 2), 0.016);
    torso.scale.set(1.05 * g, 1, 0.85 * g);
    torso.position.y = 0.55;
    this.body.add(torso);

    for (const [arm, ax] of [[this.armL, 0.2], [this.armR, -0.2]] as const) {
      arm.position.set(ax * g, 0.68, 0);
      const sleeve = rounded(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), toon(look.body, 2), 0.012);
      sleeve.position.y = -0.13;
      arm.add(sleeve);
      const hand = rounded(new THREE.SphereGeometry(0.055, 10, 8), toon(look.skin), 0.012);
      hand.position.y = -0.29;
      arm.add(hand);
      this.body.add(arm);
    }

    this.head.position.y = 0.82;
    const skull = rounded(new THREE.SphereGeometry(0.2, 18, 14), toon(look.skin, 2), 0.018);
    skull.position.y = 0.15;
    this.head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(look.hair));
    hair.position.y = 0.17;
    hair.rotation.x = -0.25;
    this.head.add(hair);
    for (const ex of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), toon('#231a36'));
      eye.scale.set(0.8, 1.2, 0.5);
      eye.position.set(ex, 0.17, 0.185);
      this.head.add(eye);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), toon('#ef8f8f'));
      cheek.position.set(ex * 1.45, 0.11, 0.19);
      this.head.add(cheek);
    }
    this.addAccessory(look.accessory);
    this.body.add(this.head);

    // "!" sobre la cabeza mientras no hablaron con el Nexus
    this.notice = new THREE.Sprite(new THREE.SpriteMaterial({ map: noticeTexture(), depthTest: false, fog: false }));
    this.notice.scale.set(0.35, 0.45, 1);
    this.notice.position.y = 1.55;
    this.root.add(this.notice);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private addAccessory(kind: ResidentLook['accessory']): void {
    const h = this.head;
    if (kind === 'hardhat') {
      const hat = rounded(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ffc23a'), 0.016);
      hat.position.y = 0.2;
      h.add(hat);
      const brim = rounded(new THREE.CylinderGeometry(0.27, 0.27, 0.03, 18), toon('#ffc23a'), 0.012);
      brim.position.set(0, 0.21, 0.04);
      h.add(brim);
      const wrench = new THREE.Group();
      const handle = box(0.04, 0.26, 0.03, '#b8bcc6', { outline: 0.01 });
      wrench.add(handle);
      const jaw = rounded(new THREE.TorusGeometry(0.05, 0.018, 6, 12, Math.PI * 1.5), toon('#b8bcc6'), 0.008);
      jaw.position.y = 0.15;
      wrench.add(jaw);
      wrench.position.set(0, -0.36, 0.06);
      this.armR.add(wrench);
    } else if (kind === 'raincoat') {
      const hat = rounded(new THREE.ConeGeometry(0.3, 0.16, 16), toon('#ffd23a'), 0.014);
      hat.position.y = 0.33;
      h.add(hat);
      const drum = rounded(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 16), toon('#c8452f'), 0.014);
      drum.rotation.x = Math.PI / 2;
      drum.position.set(0, 0.45, 0.22);
      this.body.add(drum);
      const skin = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), toon('#f4efe6'));
      skin.position.set(0, 0.45, 0.295);
      this.body.add(skin);
    } else if (kind === 'headphones') {
      const band = rounded(new THREE.TorusGeometry(0.22, 0.022, 6, 18, Math.PI), toon('#2c2838'), 0.01);
      band.position.y = 0.15;
      h.add(band);
      for (const cx of [-0.22, 0.22]) {
        const cup = rounded(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), toon('#2c2838'), 0.01);
        cup.rotation.z = Math.PI / 2;
        cup.position.set(cx, 0.14, 0);
        h.add(cup);
      }
      const mic = rounded(new THREE.SphereGeometry(0.05, 10, 8), toon('#3a3d48'), 0.01);
      mic.position.set(0, -0.33, 0.05);
      this.armR.add(mic);
    } else if (kind === 'mayor') {
      // Banda cruzada roja con borde dorado
      const sash = box(0.07, 0.5, 0.36, '#c8452f', { outline: false });
      sash.position.set(0, 0.56, 0);
      sash.rotation.z = 0.75;
      sash.scale.z = 1.05;
      this.body.add(sash);
      const medal = rounded(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), toon('#f2c14e'), 0.008);
      medal.rotation.x = Math.PI / 2;
      medal.position.set(-0.06, 0.5, 0.16);
      this.body.add(medal);
      // Bombín
      const bowler = rounded(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#2c2838'), 0.012);
      bowler.position.y = 0.3;
      h.add(bowler);
      const brim = rounded(new THREE.CylinderGeometry(0.24, 0.24, 0.025, 18), toon('#2c2838'), 0.01);
      brim.position.y = 0.3;
      h.add(brim);
      // Bigote
      for (const side of [-1, 1]) {
        const tuft = rounded(new THREE.SphereGeometry(0.06, 8, 6), toon('#d8d8d8'), 0.006);
        tuft.scale.set(1.4, 0.55, 0.6);
        tuft.position.set(side * 0.055, 0.09, 0.19);
        tuft.rotation.z = side * -0.3;
        h.add(tuft);
      }
      // Regadera verde en la mano
      const can = new THREE.Group();
      const tank = rounded(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 12), toon('#4f8f3a'), 0.01);
      can.add(tank);
      const spout = rounded(new THREE.CylinderGeometry(0.015, 0.025, 0.22, 6), toon('#4f8f3a'), 0.006);
      spout.rotation.z = -1.0;
      spout.position.set(0.13, 0.05, 0);
      can.add(spout);
      const handle = rounded(new THREE.TorusGeometry(0.07, 0.014, 6, 12, Math.PI), toon('#3a6f2c'), 0.006);
      handle.position.y = 0.08;
      can.add(handle);
      can.position.set(0.02, -0.38, 0.06);
      this.armR.add(can);
    } else {
      const crown = rounded(new THREE.CylinderGeometry(0.15, 0.15, 0.24, 16), toon('#1d1630'), 0.014);
      crown.position.y = 0.42;
      h.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.05, 16), toon('#c8452f'));
      band.position.y = 0.33;
      h.add(band);
      const brim = rounded(new THREE.CylinderGeometry(0.25, 0.25, 0.025, 18), toon('#1d1630'), 0.01);
      brim.position.y = 0.3;
      h.add(brim);
      for (const gx of [-0.07, 0.07]) {
        const lens = box(0.09, 0.05, 0.02, '#1d1630', { outline: false });
        lens.position.set(gx, 0.17, 0.2);
        h.add(lens);
      }
      const tie = box(0.12, 0.06, 0.04, '#c8452f', { outline: 0.01 });
      tie.position.set(0, 0.72, 0.13);
      this.body.add(tie);
    }
  }

  get x(): number {
    return this.root.position.x;
  }

  get z(): number {
    return this.root.position.z;
  }

  /** Se alegra cuando su lugar recupera la vida. */
  setHappy(happy: boolean, instant = false): void {
    this.targetHappy = happy ? 1 : 0;
    if (instant) this.happy = this.targetHappy;
  }

  setHeard(heard: boolean): void {
    this.notice.visible = !heard;
  }

  talk(): void {
    this.talkT = 0;
  }

  update(dt: number, nexus: THREE.Vector3): void {
    this.time += dt;
    this.happy = damp(this.happy, this.targetHappy, 2, dt);
    const k = this.happy;

    // Mira al Nexus si está cerca; si no, vuelve a su postura
    const dx = nexus.x - this.x;
    const dz = nexus.z - this.z;
    const near = Math.hypot(dx, dz) < 7;
    this.root.rotation.y = dampAngle(this.root.rotation.y, near ? Math.atan2(dx, dz) : this.facing, 4, dt);

    // Triste: cabizbajo, hombros caídos, casi quieto. Feliz: rebota y balancea los brazos.
    const bounce = Math.abs(Math.sin(this.time * 4)) * 0.05 * k;
    this.body.position.y = bounce + Math.sin(this.time * 1.5) * 0.008;
    this.head.rotation.x = 0.45 * (1 - k) - 0.05 * k;
    this.body.rotation.x = 0.12 * (1 - k);
    this.armL.rotation.z = 0.08 + 0.25 * k + Math.sin(this.time * 4) * 0.12 * k;
    this.armR.rotation.z = -0.08 - 0.25 * k - Math.sin(this.time * 4 + 1) * 0.12 * k;
    this.armL.rotation.x = 0;
    this.armR.rotation.x = 0;

    // Al hablar: saluda con un brazo
    if (this.talkT >= 0) {
      this.talkT += dt / 1.6;
      const w = Math.sin(Math.min(this.talkT, 1) * Math.PI);
      this.armR.rotation.x = -2.4 * w;
      this.armR.rotation.z = -0.3 - Math.sin(this.time * 12) * 0.35 * w;
      if (this.talkT >= 1) this.talkT = -1;
    }

    this.notice.position.y = 1.55 + Math.sin(this.time * 3) * 0.06;
  }
}

let noticeTex: THREE.CanvasTexture | null = null;
function noticeTexture(): THREE.CanvasTexture {
  if (noticeTex) return noticeTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 80;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffc23a';
  g.strokeStyle = '#1d1630';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(32, 36, 26, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#1d1630';
  g.font = 'bold 40px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('!', 32, 38);
  noticeTex = new THREE.CanvasTexture(c);
  noticeTex.colorSpace = THREE.SRGBColorSpace;
  return noticeTex;
}
