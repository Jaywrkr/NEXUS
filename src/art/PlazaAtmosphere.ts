import Phaser from 'phaser';
import { cableColor } from '../data/appearance';
import { PLAZA, PLAZA_FRAME } from './plazaAssets';
import { EffectsSettings } from '../systems/EffectsSettings';
import { stepSpring, type SpringState } from '../utils/dampedSpring';
import type { Nexus } from '../entities/Nexus';
import type { ConnectableObject } from '../objects/ConnectableObject';

/** Cosmetic physics: no decorative body can block movement or capture input. */
export class PlazaAtmosphere {
  private plants: { art: Phaser.GameObjects.Image; spring: SpringState; phase: number }[] = [];
  private birds: { art: Phaser.GameObjects.Sprite; home: Phaser.Math.Vector2; velocity: Phaser.Math.Vector2; fleeUntil: number; cooldown: number }[] = [];
  private cables: Phaser.GameObjects.Graphics;
  private lampLight: Phaser.GameObjects.Ellipse;
  private dustAt = 0;
  private color = cableColor();
  private cableSpring: SpringState = { value: 0, velocity: 0 };
  private scene: Phaser.Scene;
  private nexus: Nexus;
  private source: ConnectableObject;
  private lamp: ConnectableObject;
  private door: ConnectableObject;

  constructor(scene: Phaser.Scene, nexus: Nexus, source: ConnectableObject, lamp: ConnectableObject, door: ConnectableObject) {
    this.scene = scene; this.nexus = nexus; this.source = source; this.lamp = lamp; this.door = door;
    const v = scene.scale.height / 540, mid = scene.scale.height / 2;
    for (const [i, x] of [215, 420, 740, 1080].entries()) {
      const art = scene.add.image(x, mid + (i % 2 ? 170 : 145) * v, PLAZA.sprites, PLAZA_FRAME.leaves)
        .setOrigin(.5, 1).setDisplaySize(96, 96).setDepth(10.95);
      this.plants.push({ art, spring: { value: 0, velocity: 0 }, phase: i * 1.8 });
    }
    const flapKey = 'plaza-bird-flap';
    if (!scene.anims.exists(flapKey)) scene.anims.create({ key: flapKey,
      frames: [{ key: PLAZA.sprites, frame: PLAZA_FRAME.bird }, { key: PLAZA.states, frame: PLAZA_FRAME.bird }],
      frameRate: 7, repeat: -1 });
    for (const [x, offset] of [[610, 140], [1035, 95]]) {
      const home = new Phaser.Math.Vector2(x, mid + offset * v);
      const art = scene.add.sprite(home.x, home.y, PLAZA.sprites, PLAZA_FRAME.bird).setDisplaySize(58, 58).setDepth(10.8);
      this.birds.push({ art, home, velocity: new Phaser.Math.Vector2(), fleeUntil: 0, cooldown: 0 });
    }
    this.cables = scene.add.graphics().setDepth(9.8);
    this.lampLight = scene.add.ellipse(lamp.x, lamp.y + 48, 170, 65, 0xffdb7d, 0).setDepth(8);
    const onConnect = (targetId: string): void => {
      if (!['lamp', 'door'].includes(targetId) || EffectsSettings.isReduced()) return;
      this.cableSpring.velocity += 85;
      this.plants.forEach(plant => { plant.spring.velocity += 25; });
    };
    scene.events.on('connection-made', onConnect);
    scene.events.once('shutdown', () => scene.events.off('connection-made', onConnect));
  }

  update(time: number, delta: number): void {
    const reduced = EffectsSettings.isReduced();
    const dt = Math.max(0, Math.min(64, delta)) / 1000;
    const speed = this.nexus.body.velocity.length();
    for (const plant of this.plants) {
      const distance = Phaser.Math.Distance.Between(this.nexus.x, this.nexus.y + 34, plant.art.x, plant.art.y);
      const push = distance < 100 && speed > 20 ? (this.nexus.x < plant.art.x ? 1 : -1) * (1 - distance / 100) * 13 : 0;
      if (!reduced) stepSpring(plant.spring, Math.sin(time / 900 + plant.phase) * 2 + push, delta);
      plant.art.setAngle(reduced ? 0 : plant.spring.value);
    }
    for (const bird of this.birds) {
      if (reduced) { bird.art.anims.stop(); bird.art.setPosition(bird.home.x, bird.home.y); continue; }
      const distance = Phaser.Math.Distance.Between(this.nexus.x, this.nexus.y + 30, bird.art.x, bird.art.y);
      if (distance < 115 && time > bird.cooldown) { bird.fleeUntil = time + 1300; bird.cooldown = time + 5000; }
      const flying = time < bird.fleeUntil || Phaser.Math.Distance.Between(bird.art.x, bird.art.y, bird.home.x, bird.home.y) > 5;
      const targetX = time < bird.fleeUntil ? bird.home.x + 145 : bird.home.x;
      const targetY = time < bird.fleeUntil ? bird.home.y - 100 : bird.home.y;
      bird.velocity.x += ((targetX - bird.art.x) * 10 - bird.velocity.x * 6) * dt;
      bird.velocity.y += ((targetY - bird.art.y) * 10 - bird.velocity.y * 6) * dt;
      bird.art.x += bird.velocity.x * dt; bird.art.y += bird.velocity.y * dt;
      bird.art.setFlipX(bird.velocity.x < -3).setAngle(Phaser.Math.Clamp(bird.velocity.y * .06, -12, 12));
      if (flying) bird.art.play('plaza-bird-flap', true);
      else { bird.art.anims.stop(); bird.art.setFrame(PLAZA_FRAME.bird); bird.art.setAngle(0); }
    }
    this.lampLight.setAlpha(this.lamp.isActive ? .25 : 0);
    if (!reduced) stepSpring(this.cableSpring, Math.sin(time / 1100) * 3, delta);
    this.cables.clear();
    if (this.lamp.isActive) this.drawCable(this.source, this.lamp, reduced ? 0 : this.cableSpring.value, time, reduced);
    if (this.door.isActive) this.drawCable(this.lamp, this.door, reduced ? 0 : this.cableSpring.value, time, reduced);
    // Feet sort against the three illustrated props, keeping the original hit areas steady.
    this.nexus.setDepth(10 + (this.nexus.y + 34) / this.scene.scale.height);
    for (const object of [this.source, this.lamp, this.door]) object.setDepth(10 + (object.y + 45) / this.scene.scale.height);
    if (!reduced && speed > 70 && this.nexus.x < 1160 && time > this.dustAt) {
      this.dustAt = time + 170;
      const dust = this.scene.add.ellipse(this.nexus.x, this.nexus.y + 32, 14, 5, 0xf5e3bd, .3).setDepth(9);
      this.scene.tweens.add({ targets: dust, alpha: 0, scale: 1.7, y: dust.y - 8, duration: 380, onComplete: () => dust.destroy() });
    }
  }

  private drawCable(from: ConnectableObject, to: ConnectableObject, sway: number, time: number, reduced: boolean): void {
    const a = from.getPlugPoint(), b = to.getPlugPoint();
    const curve = new Phaser.Curves.QuadraticBezier(a, new Phaser.Math.Vector2((a.x + b.x) / 2, Math.max(a.y, b.y) + 32 + sway), b);
    this.cables.lineStyle(7, 0x142b42, .55); curve.draw(this.cables, 24);
    this.cables.lineStyle(3, this.color, .9); curve.draw(this.cables, 24);
    if (!reduced) { const p = curve.getPoint((time % 1800) / 1800); this.cables.fillStyle(0xfff3b2).fillCircle(p.x, p.y, 3); }
  }
}
