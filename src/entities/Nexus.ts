import Phaser from 'phaser';

export interface NexusAppearance {
  bodyColor: number;
  jacketColor: number;
  shoesColor: number;
  capColor: number;
}

export const DEFAULT_APPEARANCE: NexusAppearance = {
  bodyColor: 0x3a3f5c,
  jacketColor: 0xff8c42,
  shoesColor: 0x2b2e43,
  capColor: 0x5ee7ff,
};

const SPEED = 220;

export class Nexus extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;

  private visual: Phaser.GameObjects.Container;
  private leftEye!: Phaser.GameObjects.Arc;
  private rightEye!: Phaser.GameObjects.Arc;
  private antenna!: Phaser.GameObjects.Arc;
  private facing: 1 | -1 = 1;
  private walkTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, appearance: NexusAppearance = DEFAULT_APPEARANCE) {
    super(scene, x, y);

    this.visual = this.buildVisual(appearance);
    this.add(this.visual);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 64);
    this.body.setOffset(-24, -32);
    this.body.setCollideWorldBounds(true);
  }

  private buildVisual(appearance: NexusAppearance): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // Sombra pintada
    const shadow = this.scene.add.ellipse(0, 34, 40, 12, 0x000000, 0.2);

    // Mochila / núcleo energético
    const backpack = this.scene.add.rectangle(-16, -4, 14, 24, 0x2f6690).setOrigin(0.5);
    const core = this.scene.add.circle(-16, -4, 5, 0x5ee7ff);

    // Zapatos
    const leftShoe = this.scene.add.rectangle(-8, 30, 12, 8, appearance.shoesColor);
    const rightShoe = this.scene.add.rectangle(8, 30, 12, 8, appearance.shoesColor);

    // Piernas
    const leftLeg = this.scene.add.rectangle(-8, 18, 10, 16, appearance.bodyColor);
    const rightLeg = this.scene.add.rectangle(8, 18, 10, 16, appearance.bodyColor);

    // Cuerpo / chaqueta
    const torso = this.scene.add.rectangle(0, -2, 34, 30, appearance.jacketColor, 1).setOrigin(0.5);

    // Brazos
    const leftArm = this.scene.add.rectangle(-20, 0, 8, 22, appearance.jacketColor);
    const rightArm = this.scene.add.rectangle(20, 0, 8, 22, appearance.jacketColor);

    // Cabeza (no anatómica)
    const head = this.scene.add.ellipse(0, -30, 34, 28, appearance.bodyColor);

    // Gorra
    const cap = this.scene.add.rectangle(0, -42, 30, 8, appearance.capColor).setOrigin(0.5);
    const capBrim = this.scene.add.rectangle(10, -38, 14, 4, appearance.capColor);

    // Antena
    this.antenna = this.scene.add.circle(0, -54, 4, appearance.capColor);
    const antennaStick = this.scene.add.rectangle(0, -48, 2, 10, 0x888888);

    // Ojos luminosos
    this.leftEye = this.scene.add.circle(-8, -30, 4, 0x5ee7ff);
    this.rightEye = this.scene.add.circle(8, -30, 4, 0x5ee7ff);

    container.add([
      shadow,
      backpack,
      core,
      leftLeg,
      rightLeg,
      leftShoe,
      rightShoe,
      torso,
      leftArm,
      rightArm,
      head,
      cap,
      capBrim,
      antennaStick,
      this.antenna,
      this.leftEye,
      this.rightEye,
    ]);

    return container;
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
}
