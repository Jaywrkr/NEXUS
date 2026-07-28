import Phaser from 'phaser';

export type CapStyle = 'none' | 'gorra' | 'gorro';

export interface NexusAppearance {
  bodyColor: number;
  jacketColor: number;
  shoesColor: number;
  capColor: number;
  capStyle: CapStyle;
}

export const DEFAULT_APPEARANCE: NexusAppearance = {
  bodyColor: 0x2b2e43,
  jacketColor: 0x2ea3a3,
  shoesColor: 0xf4f1e8,
  capColor: 0x5ee7ff,
  capStyle: 'none',
};

const FACE_COLOR = 0x14161f;
const HEAD_COLOR = 0xf4f1e8;
const EYE_COLOR = 0xffe066;
const SLEEVE_COLOR = 0x2b2e43;
const COLLAR_COLOR = 0xff8c42;
const EAR_TIP_ACCENT = 0xff8c42;
const CABLE_COLOR = 0xd4e157;

const SPEED = 220;

export class Nexus extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private visual: Phaser.GameObjects.Container;
  private leftEye!: Phaser.GameObjects.Ellipse;
  private rightEye!: Phaser.GameObjects.Ellipse;
  private earTips: Phaser.GameObjects.Arc[] = [];
  private facing: 1 | -1 = 1;
  private walkTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, appearance: NexusAppearance = DEFAULT_APPEARANCE) {
    super(scene, x, y);

    this.visual = this.buildVisual(appearance);
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 70);
    this.body.setOffset(-24, -40);
    this.body.setCollideWorldBounds(true);
  }

  private buildVisual(appearance: NexusAppearance): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Sombra pintada
    const shadow = this.scene.add.ellipse(0, 34, 40, 12, 0x000000, 0.2);

    // Mochila / núcleo energético, con cable de energía colgando
    const backpack = this.scene.add.rectangle(-18, -6, 16, 26, HEAD_COLOR).setStrokeStyle(2, 0x8a8f9c, 0.5);
    const core = this.scene.add.circle(-18, -6, 6, appearance.capColor);
    const cable = this.scene.add.graphics();
    cable.lineStyle(2, CABLE_COLOR, 0.9);
    cable.beginPath();
    cable.moveTo(-18, 6);
    cable.lineTo(-13, 16);
    cable.lineTo(-17, 24);
    cable.lineTo(-12, 30);
    cable.strokePath();
    const cableTip = this.scene.add.circle(-12, 30, 3, CABLE_COLOR);

    // Piernas
    const leftLeg = this.scene.add.rectangle(-8, 18, 10, 16, appearance.bodyColor);
    const rightLeg = this.scene.add.rectangle(8, 18, 10, 16, appearance.bodyColor);

    // Zapatos
    const leftShoe = this.scene.add.rectangle(-8, 30, 12, 8, appearance.shoesColor).setStrokeStyle(1, 0x8a8f9c, 0.4);
    const rightShoe = this.scene.add
      .rectangle(8, 30, 12, 8, appearance.shoesColor)
      .setStrokeStyle(1, 0x8a8f9c, 0.4);
    const leftShoeAccent = this.scene.add.rectangle(-8, 27, 8, 2, appearance.capColor);
    const rightShoeAccent = this.scene.add.rectangle(8, 27, 8, 2, appearance.capColor);

    // Brazos (mangas oscuras, como en la referencia)
    const leftArm = this.scene.add.rectangle(-20, 0, 8, 22, SLEEVE_COLOR);
    const rightArm = this.scene.add.rectangle(20, 0, 8, 22, SLEEVE_COLOR);

    // Hoodie / torso
    const torso = this.scene.add.rectangle(0, -2, 34, 30, appearance.jacketColor).setOrigin(0.5);

    // Cuello/capucha asomando detrás de la cabeza
    const collar = this.scene.add.ellipse(0, -18, 26, 12, COLLAR_COLOR);

    // Orejas/antenas reactivas (detrás de la cabeza)
    const leftEar = this.scene.add.ellipse(-13, -60, 11, 32, HEAD_COLOR).setAngle(-16);
    const rightEar = this.scene.add.ellipse(13, -60, 11, 32, HEAD_COLOR).setAngle(16);

    // Cabeza (no anatómica) y cara expresiva
    const head = this.scene.add.ellipse(0, -34, 40, 36, HEAD_COLOR);
    const face = this.scene.add.ellipse(0, -30, 27, 23, FACE_COLOR);

    // Ojos luminosos ovalados
    this.leftEye = this.scene.add.ellipse(-7, -30, 6, 10, EYE_COLOR);
    this.rightEye = this.scene.add.ellipse(7, -30, 6, 10, EYE_COLOR);

    // Puntas de las orejas (encima de la cabeza, con acento de color)
    const leftEarTip = this.scene.add.circle(-19, -76, 5, appearance.capColor);
    const rightEarTip = this.scene.add.circle(19, -76, 5, EAR_TIP_ACCENT);
    this.earTips = [leftEarTip, rightEarTip];

    const capParts = this.buildCap(appearance);

    container.add([
      shadow,
      backpack,
      core,
      cable,
      cableTip,
      leftLeg,
      rightLeg,
      leftShoe,
      rightShoe,
      leftShoeAccent,
      rightShoeAccent,
      leftArm,
      rightArm,
      torso,
      collar,
      leftEar,
      rightEar,
      head,
      face,
      this.leftEye,
      this.rightEye,
      leftEarTip,
      rightEarTip,
      ...capParts,
    ]);

    return container;
  }

  /** Gorra opcional, un accesorio real (no solo color) sobre la cabeza. */
  private buildCap(appearance: NexusAppearance): Phaser.GameObjects.GameObject[] {
    if (appearance.capStyle === 'gorra') {
      const band = this.scene.add.ellipse(0, -48, 34, 12, appearance.capColor);
      const brim = this.scene.add.ellipse(10, -43, 16, 6, appearance.capColor);
      return [band, brim];
    }

    if (appearance.capStyle === 'gorro') {
      const dome = this.scene.add.ellipse(0, -52, 32, 20, appearance.capColor);
      const pompom = this.scene.add.circle(0, -62, 5, EAR_TIP_ACCENT);
      return [dome, pompom];
    }

    return [];
  }

  move(dx: number, dy: number, delta: number): void {
    this.body.setVelocity(dx * SPEED, dy * SPEED);

    const isMoving = dx !== 0 || dy !== 0;

    if (dx > 0) this.facing = 1;
    if (dx < 0) this.facing = -1;
    this.visual.setScale(this.facing, 1);

    if (isMoving) {
      this.walkTime += delta;
      const bob = Math.sin(this.walkTime / 80) * 3;
      this.visual.setY(bob);
    } else {
      this.walkTime = 0;
      this.visual.setY(0);
    }
  }

  playIdle(): void {
    this.walkTime = 0;
    this.visual.setY(0);
  }

  /** Animación corta de celebración: salto, orejas brillantes y chispas. */
  celebrate(): void {
    this.walkTime = 0;
    this.body.setVelocity(0, 0);

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
        });
      },
    });

    this.scene.tweens.add({
      targets: [this.leftEye, this.rightEye, ...this.earTips],
      scale: { from: 1, to: 1.6 },
      duration: 160,
      yoyo: true,
      repeat: 2,
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
