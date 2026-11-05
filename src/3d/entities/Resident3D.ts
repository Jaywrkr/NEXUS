import * as THREE from 'three';
import { box, glow, rounded, toon } from '../core/render';
import { damp, dampAngle } from '../core/util';

/** Cómo se ve cada habitante del capítulo 1 en 3D (los textos vienen de src/data/chapter.ts). */
export interface ResidentLook {
  body: string;
  pants: string;
  skin: string;
  hair: string;
  /** 1 = normal; >1 = más ancho (Bombo). */
  girth?: number;
  accessory: 'hardhat' | 'raincoat' | 'headphones' | 'tophat' | 'mayor' | 'skater' | 'inventor' | 'lamplighter';
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
  // Rulo: patinador del Skatepark (Fase 1); gorra al revés, rodilleras y muñequeras
  rulo: { body: '#ff9f43', pants: '#2c3f66', skin: '#b9825f', hair: '#1d1630', accessory: 'skater' },
  // Pipa: inventora de juguetes del taller; antiparras en la frente y delantal con bolsillos
  pipa: { body: '#c7a0ef', pants: '#3d3550', skin: '#f0c39a', hair: '#e0563f', accessory: 'inventor' },
  // Lucio: farolero; gorra con visera, chaleco verde y una vara para encender faroles
  lucio: { body: '#9be37a', pants: '#2c3f66', skin: '#c98e6b', hair: '#3a2a22', accessory: 'lamplighter' },
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
  private readonly brows: THREE.Mesh[] = [];
  private readonly smile: THREE.Mesh;
  private readonly frown: THREE.Mesh;
  private readonly g: number;

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
    this.g = g;
    this.root.add(this.body);

    for (const lx of [0.08, -0.08]) {
      const leg = rounded(new THREE.CapsuleGeometry(0.065, 0.2, 4, 10), toon(look.pants), 0.014);
      leg.position.set(lx * g, 0.2, 0);
      this.body.add(leg);
      const shoeCol = look.accessory === 'raincoat' ? '#ffd23a' : look.accessory === 'tophat' ? '#1d1630' : '#3a2a22';
      const shoe = box(0.12, 0.07, 0.2, shoeCol, { outline: 0.012 });
      shoe.position.set(lx * g, 0.045, 0.03);
      this.body.add(shoe);
      const sole = box(0.125, 0.025, 0.21, '#f4efe6', { outline: false });
      sole.position.set(lx * g, 0.0125, 0.03);
      this.body.add(sole);
    }
    const torso = rounded(new THREE.CapsuleGeometry(0.16, 0.18, 6, 14), toon(look.body, 2), 0.016);
    torso.scale.set(1.05 * g, 1, 0.85 * g);
    torso.position.y = 0.55;
    this.body.add(torso);
    const front = 0.138 * g;
    const belt = rounded(new THREE.TorusGeometry(0.155, 0.022, 6, 18), toon('#2a2230'), 0);
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.06 * g, 0.86 * g, 1);
    belt.position.y = 0.4;
    this.body.add(belt);
    const buckleB = box(0.06, 0.045, 0.02, '#f2c14e', { outline: false });
    buckleB.position.set(0, 0.4, front + 0.01);
    this.body.add(buckleB);
    for (const by of [0.52, 0.6, 0.68]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), toon('#f4efe6'));
      btn.position.set(0, by, front + 0.005);
      this.body.add(btn);
    }
    const neck = rounded(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 10), toon(look.skin), 0);
    neck.position.y = 0.79;
    this.body.add(neck);

    for (const [arm, ax] of [[this.armL, 0.2], [this.armR, -0.2]] as const) {
      arm.position.set(ax * g, 0.68, 0);
      const sleeve = rounded(new THREE.CapsuleGeometry(0.05, 0.18, 4, 10), toon(look.body, 2), 0.012);
      sleeve.position.y = -0.13;
      arm.add(sleeve);
      const cuff = rounded(new THREE.TorusGeometry(0.048, 0.014, 5, 12), toon('#f4efe6'), 0);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.235;
      arm.add(cuff);
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
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), glow('#ffffff'));
      shine.position.set(ex - 0.008, 0.182, 0.2);
      this.head.add(shine);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), toon('#ef8f8f'));
      cheek.position.set(ex * 1.45, 0.11, 0.19);
      this.head.add(cheek);
      // Cejas: se inclinan cuando está triste y se relajan cuando está contento
      const brow = box(0.06, 0.014, 0.012, look.hair, { outline: false });
      brow.position.set(ex, 0.225, 0.19);
      this.head.add(brow);
      this.brows.push(brow);
      // Orejas
      const ear = rounded(new THREE.SphereGeometry(0.04, 8, 6), toon(look.skin), 0.008);
      ear.scale.set(0.5, 1, 0.8);
      ear.position.set(ex * 2.85, 0.14, 0);
      this.head.add(ear);
    }
    const nose = rounded(new THREE.SphereGeometry(0.026, 8, 6), toon(look.skin), 0.006);
    nose.position.set(0, 0.13, 0.2);
    this.head.add(nose);
    // Boca: sonrisa o boca triste según el ánimo
    this.smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 4, 10, Math.PI), toon('#7a2a2a'));
    this.smile.rotation.z = Math.PI;
    this.smile.position.set(0, 0.085, 0.188);
    this.head.add(this.smile);
    this.frown = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 4, 10, Math.PI), toon('#7a2a2a'));
    this.frown.position.set(0, 0.06, 0.19);
    this.head.add(this.frown);
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
      // Mameluco: tirantes del color del pantalón y bolsillo; chaleco con banda reflectiva
      const f = 0.14 * this.g;
      for (const sx of [-0.07, 0.07]) {
        const strap = box(0.04, 0.24, 0.015, RESIDENT_LOOKS.miga.pants, { outline: false });
        strap.position.set(sx, 0.56, f);
        this.body.add(strap);
      }
      const bib = box(0.16, 0.1, 0.015, RESIDENT_LOOKS.miga.pants, { outline: 0.006 });
      bib.position.set(0, 0.47, f + 0.003);
      this.body.add(bib);
      const reflect = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 18, 1, true), toon('#ffd23a'));
      reflect.scale.set(1.06 * this.g, 1, 0.87 * this.g);
      reflect.position.y = 0.62;
      this.body.add(reflect);
      // Cinturón de herramientas con dos bolsitas
      for (const sx of [-0.13, 0.13]) {
        const pouch = box(0.07, 0.08, 0.05, '#8a5a3a', { outline: 0.006 });
        pouch.position.set(sx * this.g, 0.36, 0.08);
        this.body.add(pouch);
      }
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
      // Zigzag del tambor, botones grandes del impermeable y palillos
      const rim = rounded(new THREE.TorusGeometry(0.15, 0.015, 5, 16), toon('#f2c14e'), 0);
      rim.position.set(0, 0.45, 0.292);
      this.body.add(rim);
      for (const by of [0.6, 0.7]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), toon('#ffd23a'));
        btn.position.set(0.05, by, 0.14 * this.g + 0.01);
        this.body.add(btn);
      }
      for (const arm of [this.armL, this.armR]) {
        const stick = rounded(new THREE.CylinderGeometry(0.01, 0.012, 0.24, 6), toon('#d9b27a'), 0.005);
        stick.position.set(0, -0.36, 0.09);
        stick.rotation.x = 1.0;
        arm.add(stick);
        const tipS = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon('#f4efe6'));
        tipS.position.set(0, -0.3, 0.19);
        arm.add(tipS);
      }
      const hood = rounded(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(RESIDENT_LOOKS.bombo.body), 0.01);
      hood.rotation.x = -Math.PI / 2 - 0.3;
      hood.position.set(0, 0.74, -0.12);
      this.body.add(hood);
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
      const micGrill = rounded(new THREE.SphereGeometry(0.055, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#b8bcc6'), 0);
      micGrill.position.set(0, -0.33, 0.05);
      this.armR.add(micGrill);
      // Luz "AL AIRE" en los auriculares, cola de caballo y bufanda
      const onAir = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), glow('#ff5a5a'));
      onAir.position.set(0.25, 0.14, 0);
      h.add(onAir);
      const tail = rounded(new THREE.CapsuleGeometry(0.05, 0.14, 4, 8), toon(RESIDENT_LOOKS.vera.hair), 0.01);
      tail.position.set(0, 0.12, -0.22);
      tail.rotation.x = 0.5;
      h.add(tail);
      const tie = rounded(new THREE.TorusGeometry(0.03, 0.012, 5, 10), toon('#ffd23a'), 0);
      tie.position.set(0, 0.2, -0.2);
      h.add(tie);
      const scarf = rounded(new THREE.TorusGeometry(0.085, 0.03, 6, 14), toon('#ffd23a'), 0.008);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 0.77;
      this.body.add(scarf);
      const star = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), toon('#ffd23a'));
      star.position.set(-0.07, 0.62, 0.14 * this.g + 0.01);
      this.body.add(star);
    } else if (kind === 'skater') {
      // Gorra al revés (la visera mira hacia atrás)
      const cap = rounded(new THREE.SphereGeometry(0.235, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#7dff8a'), 0.014);
      cap.position.y = 0.2;
      h.add(cap);
      const visor = box(0.24, 0.025, 0.18, '#3d3550', { outline: 0.01 });
      visor.position.set(0, 0.22, -0.26);
      h.add(visor);
      // Remera con raya, rodilleras y muñequeras
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.05, 18, 1, true), toon('#fff3dc'));
      stripe.scale.set(1.06, 1, 0.87);
      stripe.position.y = 0.58;
      this.body.add(stripe);
      for (const lx of [0.08, -0.08]) {
        const pad = rounded(new THREE.SphereGeometry(0.06, 10, 8), toon('#3d3550'), 0.008);
        pad.scale.set(1, 0.8, 0.7);
        pad.position.set(lx, 0.22, 0.05);
        this.body.add(pad);
      }
      for (const arm of [this.armL, this.armR]) {
        const band = rounded(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10), toon('#7dff8a'), 0.006);
        band.position.y = -0.28;
        arm.add(band);
      }
    } else if (kind === 'inventor') {
      // Pelo con rodete, antiparras en la frente y delantal con herramientas
      const bun = rounded(new THREE.SphereGeometry(0.12, 10, 8), toon(RESIDENT_LOOKS.pipa.hair), 0.01);
      bun.position.set(0, 0.42, -0.1);
      h.add(bun);
      const strap = rounded(new THREE.TorusGeometry(0.235, 0.022, 6, 22), toon('#3d3550'), 0.006);
      strap.rotation.x = Math.PI / 2 - 0.25;
      strap.position.y = 0.24;
      h.add(strap);
      for (const s of [-1, 1]) {
        const lens = rounded(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), toon('#5ec8ff'), 0.008);
        lens.rotation.x = Math.PI / 2 - 0.25;
        lens.position.set(s * 0.085, 0.3, 0.2);
        h.add(lens);
      }
      const apron = box(0.26, 0.32, 0.02, '#fff3dc', { outline: 0.006 });
      apron.position.set(0, 0.48, 0.15 * this.g);
      this.body.add(apron);
      const pocket = box(0.14, 0.07, 0.015, '#ffc23a', { outline: false });
      pocket.position.set(0, 0.42, 0.162 * this.g);
      this.body.add(pocket);
      const wrench = box(0.035, 0.22, 0.03, '#8b8f9a', { outline: 0.006 });
      wrench.position.set(0, -0.34, 0.06);
      this.armR.add(wrench);
    } else if (kind === 'lamplighter') {
      // Gorra con visera, chaleco y la vara de encender faroles con una llamita
      const cap = rounded(new THREE.SphereGeometry(0.23, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#2c3f66'), 0.014);
      cap.position.y = 0.2;
      h.add(cap);
      const visor = box(0.26, 0.025, 0.16, '#2c3f66', { outline: 0.008 });
      visor.position.set(0, 0.22, 0.26);
      h.add(visor);
      const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 18, 1, true), toon('#4f8f3a'));
      vest.scale.set(1.07 * this.g, 1, 0.88 * this.g);
      vest.position.y = 0.6;
      this.body.add(vest);
      const rod = rounded(new THREE.CylinderGeometry(0.014, 0.014, 1.1, 6), toon('#7a4a2e'), 0.005);
      rod.position.set(0, -0.1, 0.08);
      this.armR.add(rod);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), glow('#ffb84a'));
      flame.position.set(0, 0.5, 0.08);
      this.armR.add(flame);
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
      // Cadena del reloj de bolsillo y botones dorados del saco
      const chain = rounded(new THREE.TorusGeometry(0.06, 0.006, 4, 10, Math.PI), toon('#f2c14e'), 0);
      chain.rotation.z = Math.PI;
      chain.position.set(0.07, 0.46, 0.155);
      this.body.add(chain);
      for (const by of [0.47, 0.57]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), toon('#f2c14e'));
        btn.position.set(0.04, by, 0.16);
        this.body.add(btn);
      }
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
      // Solapas oscuras, flor en el ojal y bastón
      for (const sx of [-1, 1]) {
        const lapel = box(0.05, 0.2, 0.015, '#1d1630', { outline: false });
        lapel.position.set(sx * 0.06, 0.62, 0.14 * this.g + 0.004);
        lapel.rotation.z = sx * 0.3;
        this.body.add(lapel);
      }
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), toon('#e0563f'));
      flower.position.set(-0.1, 0.66, 0.15 * this.g);
      this.body.add(flower);
      const cane = new THREE.Group();
      const shaft = rounded(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), toon('#1d1630'), 0.005);
      shaft.position.y = -0.2;
      cane.add(shaft);
      const crook = rounded(new THREE.TorusGeometry(0.04, 0.012, 5, 10, Math.PI), toon('#1d1630'), 0.005);
      crook.position.set(0.04, 0.05, 0);
      cane.add(crook);
      const ferrule = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), toon('#f2c14e'));
      ferrule.position.y = -0.45;
      cane.add(ferrule);
      cane.position.set(0, -0.3, 0.05);
      this.armL.add(cane);
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

  private danceT = 0;
  private dancing = false;

  /** Bailar con el Nexus: contentos bailan de verdad; tristes levantan la cabeza y se balancean un poquito. */
  dance(delay = 0): void {
    this.dancing = true;
    this.danceT = -delay; // una pequeña demora para que no bailen todos igual
  }

  get isHappy(): boolean {
    return this.targetHappy > 0.5;
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

    // Cara: cejas caídas y boca triste → cejas relajadas y sonrisa
    // (triste = la punta de adentro de cada ceja sube)
    this.brows[0].rotation.z = 0.4 * (1 - k) - 0.1 * k;
    this.brows[1].rotation.z = -0.4 * (1 - k) + 0.1 * k;
    for (const b of this.brows) b.position.y = 0.225 + 0.012 * k;
    this.smile.visible = k > 0.5;
    this.frown.visible = !this.smile.visible;

    // Al hablar: saluda con un brazo
    if (this.talkT >= 0) {
      this.talkT += dt / 1.6;
      const w = Math.sin(Math.min(this.talkT, 1) * Math.PI);
      this.armR.rotation.x = -2.4 * w;
      this.armR.rotation.z = -0.3 - Math.sin(this.time * 12) * 0.35 * w;
      if (this.talkT >= 1) this.talkT = -1;
    }

    // Baile (después de una pequeña demora para que no bailen todos igual)
    if (this.dancing) {
      this.danceT += dt;
      const d = this.danceT;
      if (d >= 0) {
        const beat = Math.sin(d * 8);
        if (k > 0.5) {
          this.body.rotation.y = Math.sin(d * 4) * 0.7;
          this.body.position.y += Math.abs(beat) * 0.14;
          this.armL.rotation.x = -2.2 + Math.max(0, beat) * 0.7;
          this.armR.rotation.x = -2.2 + Math.max(0, -beat) * 0.7;
          this.head.rotation.x = -0.15;
        } else {
          this.head.rotation.x = 0.05;
          this.body.rotation.z = Math.sin(d * 3) * 0.08;
        }
        if (d >= 2.4) {
          this.dancing = false;
          this.body.rotation.y = 0;
          this.body.rotation.z = 0;
        }
      }
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
