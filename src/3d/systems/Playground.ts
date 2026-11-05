import * as THREE from 'three';
import type { AudioSystem } from '../../systems/AudioSystem';
import { box, rounded, toon, withLife } from '../core/render';
import type { Circle, World } from '../world/World';

/*
 * El barrio reacciona al Nexus mientras camina (sin acciones nuevas, Decisión 008):
 * palomas que se espantan, charcos que salpican, montoncitos de hojas que vuelan al correr
 * y pelotas que se pueden patear. Hace que caminar ya sea divertido.
 */

interface Pigeon {
  g: THREE.Group;
  wingL: THREE.Object3D;
  wingR: THREE.Object3D;
  head: THREE.Object3D;
  home: THREE.Vector3;
  away: THREE.Vector3;
  t: number; // <0 en el piso; >=0 volando (segundos)
  p: number;
}

interface Drop {
  m: THREE.Mesh;
  v: THREE.Vector3;
  life: number;
}

interface Leaf {
  m: THREE.Mesh;
  v: THREE.Vector3;
  spin: number;
  airborne: boolean;
}

interface Ball {
  g: THREE.Group;
  vel: THREE.Vector3;
  y: number;
  vy: number;
  r: number;
  cooldown: number;
}


export class Playground {
  private readonly scene: THREE.Scene;
  private readonly world: World;
  private readonly audio: AudioSystem;
  private readonly pigeons: Pigeon[] = [];
  private readonly flocks: { x: number; z: number; birds: Pigeon[]; cooldown: number }[] = [];
  private readonly puddles: { x: number; z: number; r: number; cooldown: number }[] = [];
  /** Se llama al pisar un charco (la ayudita de Agua da un impulso). */
  onSplash: (() => void) | null = null;
  private readonly drops: Drop[] = [];
  private readonly piles: { x: number; z: number; leaves: Leaf[]; cooldown: number }[] = [];
  readonly balls: Ball[] = [];
  private readonly dropGeo = new THREE.SphereGeometry(0.05, 5, 4);
  private readonly dropMat = new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.85 });

  constructor(scene: THREE.Scene, world: World, audio: AudioSystem) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    for (const [x, z] of [[-21, -16], [-13.5, 11.5], [21, 16.5], [-12, 49.3], [26, -12]] as const) this.flock(x, z);
    for (const [x, z, r] of [[-8, -3.5, 0.9], [-26, 4.5, 0.7], [9, 2.8, 1.0], [-3, 21, 0.8], [20, 40, 0.8], [-17, 50, 0.7]] as const) this.puddle(x, z, r);
    for (const [x, z] of [[-27, -20], [-12, 22], [33, -24], [-24, 58], [6, 44]] as const) this.leafPile(x, z);
    for (const [x, z, a, b] of [[-14, -21, '#e0453a', '#ffffff'], [-17, 51.5, '#2f6fd1', '#ffd23a'], [-23, 12, '#2bb3a8', '#ffffff']] as const) this.ball(x, z, a, b);
  }

  /* ---------- Palomas ---------- */

  private flock(cx: number, cz: number): void {
    const birds: Pigeon[] = [];
    for (let i = 0; i < 5; i += 1) {
      const a = i * 2.4;
      const home = new THREE.Vector3(cx + Math.cos(a) * (0.6 + (i % 3) * 0.5), 0, cz + Math.sin(a) * (0.6 + (i % 3) * 0.5));
      if (!this.world.isWalkable(home.x, home.z, 0.2)) continue;
      const g = new THREE.Group();
      const body = rounded(new THREE.SphereGeometry(0.16, 10, 8), toon('#8c93a8'), 0.01);
      body.scale.set(0.85, 0.8, 1.25);
      body.position.y = 0.2;
      g.add(body);
      const head = new THREE.Group();
      head.position.set(0, 0.36, 0.15);
      const skull = rounded(new THREE.SphereGeometry(0.08, 8, 6), toon('#6f7690'), 0.008);
      head.add(skull);
      const neck = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon('#6aa89a'));
      neck.position.set(0, -0.06, -0.02);
      head.add(neck);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 5), toon('#f2c14e'));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0, 0.09);
      head.add(beak);
      g.add(head);
      const tail = box(0.12, 0.03, 0.16, '#5e6478', { outline: false });
      tail.position.set(0, 0.2, -0.22);
      tail.rotation.x = -0.3;
      g.add(tail);
      const wings: THREE.Object3D[] = [];
      for (const s of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.1, 0.26, 0);
        const wing = box(0.26, 0.03, 0.22, '#7a8199', { outline: 0.006 });
        wing.position.x = s * 0.12;
        pivot.add(wing);
        g.add(pivot);
        wings.push(pivot);
      }
      for (const lx of [-0.05, 0.05]) {
        const leg = box(0.02, 0.08, 0.02, '#e07a6a', { outline: false });
        leg.position.set(lx, 0.04, 0);
        g.add(leg);
      }
      g.position.copy(home);
      g.rotation.y = a;
      g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
      this.scene.add(g);
      const away = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const pg: Pigeon = { g, wingL: wings[0], wingR: wings[1], head, home, away, t: -1, p: Math.random() * 10 };
      birds.push(pg);
      this.pigeons.push(pg);
    }
    this.flocks.push({ x: cx, z: cz, birds, cooldown: 0 });
  }

  private updatePigeons(dt: number, time: number, nexus: THREE.Vector3): void {
    for (const f of this.flocks) {
      f.cooldown -= dt;
      const near = Math.hypot(nexus.x - f.x, nexus.z - f.z) < 3.2;
      if (near && f.birds.every((b) => b.t < 0) && f.cooldown <= 0) {
        // ¡Se espantan! Vuelan lejos del Nexus
        for (const b of f.birds) {
          b.t = 0;
          b.away.set(b.home.x - nexus.x, 0, b.home.z - nexus.z).normalize();
        }
        f.cooldown = 4;
        this.audio.noise(0, 0.35, 0.06, 3000);
        this.audio.noise(0.12, 0.3, 0.05, 3000);
      }
    }
    for (const b of this.pigeons) {
      if (b.t < 0) {
        // En el piso: picotean el suelo y dan pasitos
        const peck = Math.max(0, Math.sin(time * 3 + b.p * 5)) ** 6;
        b.head.position.y = 0.36 - peck * 0.15;
        b.head.position.z = 0.15 + peck * 0.06;
        // Alas plegadas contra el cuerpo
        b.wingL.rotation.z = 1.25;
        b.wingR.rotation.z = -1.25;
        continue;
      }
      b.t += dt;
      const t = b.t;
      const flap = Math.sin(time * 28 + b.p) * 0.9;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
      const pos = b.g.position;
      if (t < 2.5) {
        // Despegan alejándose
        const k = t / 2.5;
        pos.set(b.home.x + b.away.x * k * 7, Math.sin(k * Math.PI * 0.5) * 4.5, b.home.z + b.away.z * k * 7);
        b.g.rotation.y = Math.atan2(b.away.x, b.away.z);
      } else if (t < 7) {
        // Dan vueltas arriba
        const a = (t - 2.5) * 0.9 + b.p;
        const cx = b.home.x + b.away.x * 7;
        const cz = b.home.z + b.away.z * 7;
        pos.set(cx + Math.cos(a) * 2.5, 4.5 + Math.sin(a * 2) * 0.3, cz + Math.sin(a) * 2.5);
        b.g.rotation.y = -a;
      } else if (t < 9.5) {
        // Vuelven y se posan en su lugar
        const k = (t - 7) / 2.5;
        const fromX = b.home.x + b.away.x * 7;
        const fromZ = b.home.z + b.away.z * 7;
        pos.set(fromX + (b.home.x - fromX) * k, 4.5 * (1 - k * k), fromZ + (b.home.z - fromZ) * k);
        b.g.rotation.y = Math.atan2(b.home.x - fromX, b.home.z - fromZ);
      } else {
        pos.copy(b.home);
        b.t = -1;
      }
    }
  }

  /* ---------- Charcos ---------- */

  private puddle(x: number, z: number, r: number): void {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 20),
      withLife(new THREE.MeshToonMaterial({ color: '#6a8fb8', transparent: true, opacity: 0.85 })),
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(1.3, 1, 1);
    m.position.set(x, 0.035, z);
    m.receiveShadow = true;
    this.scene.add(m);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(r * 0.35, 12), new THREE.MeshBasicMaterial({ color: '#c9dcf0', transparent: true, opacity: 0.5 }));
    shine.rotation.x = -Math.PI / 2;
    shine.position.set(x - r * 0.3, 0.04, z - r * 0.2);
    this.scene.add(shine);
    this.puddles.push({ x, z, r, cooldown: 0 });
  }

  private splash(x: number, z: number, n: number, power: number): void {
    for (let i = 0; i < n; i += 1) {
      const m = new THREE.Mesh(this.dropGeo, this.dropMat);
      m.position.set(x, 0.1, z);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * power * (0.6 + Math.random() * 0.6), 2.2 + Math.random() * 1.5, Math.sin(a) * power * (0.6 + Math.random() * 0.6));
      this.scene.add(m);
      this.drops.push({ m, v, life: 0 });
    }
  }

  /* ---------- Hojas ---------- */

  private leafPile(x: number, z: number): void {
    const leaves: Leaf[] = [];
    const cols = ['#c07a3a', '#d9a03a', '#9a5a2a', '#b8862a'];
    for (let i = 0; i < 14; i += 1) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.09, 5), toon(cols[i % cols.length]));
      m.material.side = THREE.DoubleSide;
      m.scale.set(1.6, 0.8, 1);
      m.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * 0.6;
      m.position.set(x + Math.cos(a) * rr, 0.04 + Math.random() * 0.06, z + Math.sin(a) * rr);
      this.scene.add(m);
      leaves.push({ m, v: new THREE.Vector3(), spin: 0, airborne: false });
    }
    this.piles.push({ x, z, leaves, cooldown: 0 });
  }

  /* ---------- Pelotas ---------- */

  private ball(x: number, z: number, a: string, b: string): void {
    const g = new THREE.Group();
    const r = 0.32;
    for (let i = 0; i < 6; i += 1) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10, (i / 6) * Math.PI * 2, Math.PI / 3), toon(i % 2 ? a : b));
      seg.castShadow = true;
      g.add(seg);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 8, 6), toon('#ffd23a'));
    cap.position.y = r * 0.97;
    g.add(cap);
    g.position.set(x, r, z);
    this.scene.add(g);
    this.balls.push({ g, vel: new THREE.Vector3(), y: 0, vy: 0, r, cooldown: 0 });
  }

  private readonly tmp = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();

  private updateBalls(dt: number, nexus: THREE.Vector3, nexusVel: THREE.Vector3, blockers: Circle[]): void {
    for (const b of this.balls) {
      b.cooldown -= dt;
      const p = b.g.position;
      const dx = p.x - nexus.x;
      const dz = p.z - nexus.z;
      const d = Math.hypot(dx, dz);
      if (d < b.r + 0.45 && b.cooldown <= 0) {
        // ¡Patada! Sale hacia donde empujó el Nexus
        const speed = Math.hypot(nexusVel.x, nexusVel.z);
        const nx = dx / (d || 1);
        const nz = dz / (d || 1);
        const push = 2.5 + speed * 1.4;
        b.vel.set(nx * push + nexusVel.x * 0.5, 0, nz * push + nexusVel.z * 0.5);
        b.vy = 1.5 + speed * 0.5;
        b.cooldown = 0.35;
        this.audio.tone(180, 0, 0.12, 'triangle', 0.12);
      }
      // Rodar con rozamiento y rebotar
      p.x += b.vel.x * dt;
      p.z += b.vel.z * dt;
      b.vel.multiplyScalar(Math.exp(-1.1 * dt));
      b.vy -= 12 * dt;
      b.y += b.vy * dt;
      if (b.y < 0) {
        b.y = 0;
        if (b.vy < -1.2) this.audio.tone(140, 0, 0.06, 'triangle', 0.05);
        b.vy = Math.abs(b.vy) > 1.2 ? -b.vy * 0.45 : 0;
      }
      this.tmp.set(p.x, 0, p.z);
      this.world.resolve(this.tmp, b.r, blockers);
      const ox = this.tmp.x - p.x;
      const oz = this.tmp.z - p.z;
      const o = Math.hypot(ox, oz);
      if (o > 1e-4) {
        // Choque contra una pared: rebota
        const nx = ox / o;
        const nz = oz / o;
        const dot = b.vel.x * nx + b.vel.z * nz;
        if (dot < 0) {
          b.vel.x -= 1.7 * dot * nx;
          b.vel.z -= 1.7 * dot * nz;
          if (dot < -1) this.audio.tone(160, 0, 0.06, 'triangle', 0.06);
        }
        p.x = this.tmp.x;
        p.z = this.tmp.z;
      }
      p.y = b.r + b.y;
      const sp = Math.hypot(b.vel.x, b.vel.z);
      if (sp > 0.01) {
        this.axis.set(b.vel.z, 0, -b.vel.x).normalize();
        this.q.setFromAxisAngle(this.axis, (sp * dt) / b.r);
        b.g.quaternion.premultiply(this.q);
      }
    }
  }

  update(dt: number, time: number, nexus: THREE.Vector3, nexusVel: THREE.Vector3, blockers: Circle[]): void {
    const speed = Math.hypot(nexusVel.x, nexusVel.z);
    this.updatePigeons(dt, time, nexus);

    for (const pd of this.puddles) {
      pd.cooldown -= dt;
      if (pd.cooldown <= 0 && speed > 1.2 && Math.hypot(nexus.x - pd.x, nexus.z - pd.z) < pd.r * 1.2) {
        this.splash(nexus.x, nexus.z, 10, 0.8 + speed * 0.25);
        this.audio.noise(0, 0.25, 0.08, 2200);
        this.onSplash?.();
        pd.cooldown = 0.45;
      }
    }

    for (const pile of this.piles) {
      pile.cooldown -= dt;
      if (pile.cooldown <= 0 && speed > 2.2 && Math.hypot(nexus.x - pile.x, nexus.z - pile.z) < 1.1) {
        for (const l of pile.leaves) {
          l.airborne = true;
          l.v.set((Math.random() - 0.5) * 2 + nexusVel.x * 0.3, 2 + Math.random() * 2, (Math.random() - 0.5) * 2 + nexusVel.z * 0.3);
          l.spin = (Math.random() - 0.5) * 10;
        }
        pile.cooldown = 1.2;
        this.audio.noise(0, 0.4, 0.05, 900);
      }
      for (const l of pile.leaves) {
        if (!l.airborne) continue;
        l.v.y -= 3.2 * dt; // caen despacito, como hojas
        l.v.x *= Math.exp(-1.5 * dt);
        l.v.z *= Math.exp(-1.5 * dt);
        l.m.position.addScaledVector(l.v, dt);
        l.m.rotation.z += l.spin * dt;
        l.m.rotation.x = -Math.PI / 2 + Math.sin(time * 6 + l.spin) * 0.6;
        if (l.m.position.y <= 0.04 && l.v.y < 0) {
          l.m.position.y = 0.04;
          l.m.rotation.x = -Math.PI / 2;
          l.airborne = false;
        }
      }
    }

    for (let i = this.drops.length - 1; i >= 0; i -= 1) {
      const d = this.drops[i];
      d.life += dt;
      d.v.y -= 12 * dt;
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < 0.03) {
        this.scene.remove(d.m);
        this.drops.splice(i, 1);
      }
    }

    this.updateBalls(dt, nexus, nexusVel, blockers);
  }
}
