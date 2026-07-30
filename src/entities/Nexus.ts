import Phaser from 'phaser';
import { NEXUS_ASSET_KEYS } from './nexusAssets';

const SPEED = 220;
const ACCEL_MS = 90;
const WALK_FRAME_MS = 150;
const GROUND_Y = 34;
const DISPLAY_HEIGHT = 120;

/**
 * El Nexus: personaje jugable dibujado con sprites reales (ver Decisión
 * 017), no con formas de Phaser. Las 4 imágenes (idle, dos de caminata,
 * celebrar) están en public/assets/nexus/ y se cargan vía
 * loadNexusAssets() desde BootScene.preload().
 */
export class Nexus extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private visual: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Image;
  private facing: 1 | -1 = 1;
  private walkTime = 0;
  private walkFrame: 0 | 1 = 0;
  private velX = 0;
  private velY = 0;
  private celebrating = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.visual = scene.add.container(0, 0);

    const shadow = scene.add.ellipse(0, GROUND_Y, 40, 12, 0x000000, 0.2);

    this.sprite = scene.add.image(0, GROUND_Y, NEXUS_ASSET_KEYS.idle).setOrigin(0.5, 1);
    this.applySpriteScale();

    this.visual.add([shadow, this.sprite]);
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 70);
    this.body.setOffset(-24, -40);
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

    const isMoving = dx !== 0 || dy !== 0;

    const newFacing = dx > 0 ? 1 : dx < 0 ? -1 : this.facing;
    if (newFacing !== this.facing) {
      this.facing = newFacing;
      this.playTurnSquash();
    }

    if (this.celebrating) return;

    if (isMoving) {
      this.walkTime += delta;
      const bob = Math.sin(this.walkTime / 80) * 3;
      // Estira un poco arriba de cada salto del paso y se achata al tocar
      // el piso, para que el caminar se sienta con más peso e impulso.
      const stretch = Math.cos(this.walkTime / 80) * 0.05;
      this.visual.setY(bob);
      this.visual.scaleY = 1 + stretch;

      const frame = Math.floor(this.walkTime / WALK_FRAME_MS) % 2 === 0 ? 0 : 1;
      if (frame !== this.walkFrame) {
        this.walkFrame = frame;
        this.sprite.setTexture(frame === 0 ? NEXUS_ASSET_KEYS.walk1 : NEXUS_ASSET_KEYS.walk2);
        this.applySpriteScale();
      }
    } else {
      this.walkTime = 0;
      this.visual.setY(0);
      this.visual.scaleY = 1;
      if (this.sprite.texture.key !== NEXUS_ASSET_KEYS.idle) {
        this.sprite.setTexture(NEXUS_ASSET_KEYS.idle);
        this.applySpriteScale();
      }
    }
  }

  /** Achica el ancho a 0 y lo vuelve a abrir del lado nuevo, en vez de girar instantáneo. */
  private playTurnSquash(): void {
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: { from: 0, to: this.facing },
      duration: 90,
      ease: 'Back.easeOut',
    });
  }

  playIdle(): void {
    this.walkTime = 0;
    this.visual.setY(0);
    this.sprite.setTexture(NEXUS_ASSET_KEYS.idle);
    this.applySpriteScale();
  }

  /** Animación corta de celebración: salto y chispas, con la pose de festejo. */
  celebrate(): void {
    this.walkTime = 0;
    this.velX = 0;
    this.velY = 0;
    this.body.setVelocity(0, 0);
    this.celebrating = true;

    this.sprite.setTexture(NEXUS_ASSET_KEYS.celebrate);
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
