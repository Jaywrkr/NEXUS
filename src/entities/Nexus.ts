import Phaser from 'phaser';
import { loadAppearance } from '../data/appearance';
import { applyNexusPose, drawAccessory } from '../art/nexusLook';
import { NEXUS_ASSET_KEYS } from './nexusAssets';

const SPEED = 220;
const ACCEL_MS = 90;
const WALK_FRAME_MS = 150;
const GROUND_Y = 34;
const DISPLAY_HEIGHT = 120;

/**
 * El Nexus: personaje jugable dibujado con sprites reales (ver Decisión
 * 033/035). Las poses originales y direccionales están en public/assets/sketch/
 * y se cargan vía
 * loadNexusAssets() desde BootScene.preload().
 */
export class Nexus extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private visual: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  private sprite: Phaser.GameObjects.Image;
  private facing: 1 | -1 = 1;
  private walkTime = 0;
  private walkFrame: 0 | 1 = 0;
  private direction: 'front' | 'back' | 'side' = 'front';
  private previousX: number;
  private previousY: number;
  private velX = 0;
  private velY = 0;
  private celebrating = false;
  private look = loadAppearance();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.previousX = x; this.previousY = y;

    this.visual = scene.add.container(0, 0);

    this.shadow = scene.add.ellipse(0, GROUND_Y, 40, 12, 0x000000, 0.2);
    this.add(this.shadow);

    this.sprite = scene.add.image(0, GROUND_Y, NEXUS_ASSET_KEYS.idle).setOrigin(0.5, 1);
    applyNexusPose(this.sprite, NEXUS_ASSET_KEYS.idle, this.look);
    this.applySpriteScale();
    const accessory = drawAccessory(scene, this.look);
    this.visual.add([this.sprite, accessory]);
    if (this.look.name !== 'Nexus') this.add(scene.add.text(0, -100, this.look.name, {
      fontFamily: '"Patrick Hand", cursive', fontSize: '12px', color: '#34494e', backgroundColor: '#ffefd1', padding: { x: 5, y: 2 },
      wordWrap: { width: 120 }, align: 'center',
    }).setOrigin(0.5, 1));
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Collision is the footprint, not the character's head and torso.
    this.body.setSize(32, 20);
    this.body.setOffset(-16, GROUND_Y - 20);
    this.body.setCollideWorldBounds(true);
  }

  private applySpriteScale(): void {
    const frameHeight = this.sprite.height;
    if (frameHeight > 0) {
      this.sprite.setScale(DISPLAY_HEIGHT / frameHeight);
    }
  }

  move(dx: number, dy: number, delta: number): void {
    // Suaviza el arranque y la frenada en vez de velocidad instantánea,
    // para que el Nexus se sienta con algo de peso al moverse.
    const smoothing = 1 - Math.exp(-delta / ACCEL_MS);
    this.velX += (dx * SPEED - this.velX) * smoothing;
    this.velY += (dy * SPEED - this.velY) * smoothing;
    this.body.setVelocity(this.velX, this.velY);

    const distance = Math.hypot(this.x - this.previousX, this.y - this.previousY);
    this.previousX = this.x; this.previousY = this.y;
    const isMoving = distance > .15 && distance < 32;
    const direction = Math.abs(dx) >= Math.abs(dy) && dx !== 0 ? 'side'
      : dy < 0 ? 'back' : dy > 0 ? 'front' : this.direction;

    const newFacing = dx > 0 ? 1 : dx < 0 ? -1 : this.facing;
    if (!this.celebrating && (newFacing !== this.facing || direction !== this.direction)) {
      this.facing = newFacing;
      this.direction = direction;
      this.playTurnSquash();
    }

    if (this.celebrating) return;

    if (isMoving) {
      this.walkTime += distance / SPEED * 1000;
      const bob = -Math.abs(Math.sin(this.walkTime / 95)) * 1.5;
      // Estira un poco arriba de cada salto del paso y se achata al tocar
      // el piso, para que el caminar se sienta con más peso e impulso.
      const stretch = Math.cos(this.walkTime / 95) * 0.012;
      this.visual.setY(bob);
      this.visual.scaleY = 1 + stretch;

      const frame = Math.floor(this.walkTime / WALK_FRAME_MS) % 2 === 0 ? 0 : 1;
      const pose = this.direction === 'back' ? frame === 0 ? NEXUS_ASSET_KEYS.back1 : NEXUS_ASSET_KEYS.back2
        : this.direction === 'side' ? frame === 0 ? NEXUS_ASSET_KEYS.side1 : NEXUS_ASSET_KEYS.side2
        : frame === 0 ? NEXUS_ASSET_KEYS.walk1 : NEXUS_ASSET_KEYS.walk2;
      if (frame !== this.walkFrame || !this.sprite.texture.key.startsWith(pose)) {
        this.walkFrame = frame;
        applyNexusPose(this.sprite, pose, this.look);
        this.applySpriteScale();
      }
    } else {
      this.walkTime = 0;
      this.visual.setY(0);
      this.visual.scaleY = 1;
      const idle = this.idlePose();
      if (this.sprite.texture.key.split('-outfit-')[0] !== idle) {
        applyNexusPose(this.sprite, idle, this.look);
        this.applySpriteScale();
      }
    }
  }

  /** Giro corto, sin rebote y sin acumular animaciones al cambiar de dirección. */
  private playTurnSquash(): void {
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setAngle(0);
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: this.direction === 'side' ? this.facing : 1,
      duration: 65,
      ease: 'Sine.easeOut',
    });
  }

  playIdle(): void {
    this.walkTime = 0;
    this.visual.setY(0);
    this.visual.setScale(this.direction === 'side' ? this.facing : 1, 1);
    applyNexusPose(this.sprite, this.idlePose(), this.look);
    this.applySpriteScale();
  }

  /** Animación corta de celebración: salto y chispas, con la pose de festejo. */
  celebrate(): void {
    if (this.celebrating) return;
    this.walkTime = 0;
    this.velX = 0;
    this.velY = 0;
    this.body.setVelocity(0, 0);
    this.celebrating = true;

    applyNexusPose(this.sprite, NEXUS_ASSET_KEYS.celebrate, this.look);
    this.applySpriteScale();

    this.scene.tweens.add({
      targets: this.visual,
      scaleY: 0.8,
      duration: 90,
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.visual,
          y: -26,
          duration: 220,
          yoyo: true,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.celebrating = false;
            this.playIdle();
          },
        });
      },
    });

    this.spawnCelebrationSparkles();
  }

  get groundY(): number { return this.y + GROUND_Y; }

  private idlePose(): string {
    return this.direction === 'back' ? NEXUS_ASSET_KEYS.backIdle : this.direction === 'side' ? NEXUS_ASSET_KEYS.sideIdle : NEXUS_ASSET_KEYS.idle;
  }

  interactAt(point: Phaser.Math.Vector2): void {
    if (this.celebrating) return;
    const dx = point.x - this.x, dy = point.y - this.y;
    this.direction = Math.abs(dx) >= Math.abs(dy) ? 'side' : dy < 0 ? 'back' : 'front';
    this.facing = dx < 0 ? -1 : 1;
    this.playTurnSquash();
    this.playIdle();
    this.visual.setAngle(0);
    this.scene.tweens.add({ targets: this.visual, angle: this.direction === 'side' ? this.facing * 3 : 0,
      duration: 100, yoyo: true, ease: 'Sine.easeInOut' });
  }

  private spawnCelebrationSparkles(): void {
    const colors = [0xffe066, 0x5ee7ff, 0xff9ff3];

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const color = colors[i % colors.length];
      const dot = this.scene.add.circle(this.x, this.y - 20, 4, color).setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: dot,
        x: this.x + Math.cos(angle) * 46,
        y: this.y - 20 + Math.sin(angle) * 46,
        alpha: 0,
        duration: 550,
        ease: 'Sine.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }
}
