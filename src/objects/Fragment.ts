import Phaser from 'phaser';

const FRAGMENT_COLOR = 0xff9ff3;

/**
 * Objeto coleccionable simple. No forma parte de ConnectionSystem:
 * aparece cuando la puerta se abre y se recoge por cercanía con el Nexus.
 */
export class Fragment extends Phaser.GameObjects.Container {
  private collected = false;
  private shard: Phaser.GameObjects.Star;
  private glow: Phaser.GameObjects.Arc;
  private baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.baseY = y;

    this.glow = scene.add.circle(0, 0, 24, FRAGMENT_COLOR, 0.25);
    this.shard = scene.add
      .star(0, 0, 5, 8, 18, FRAGMENT_COLOR)
      .setStrokeStyle(2, 0xffffff, 0.8);

    this.add([this.glow, this.shard]);
    this.setSize(40, 40);
    this.setVisible(false);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this.shard,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.15, to: 0.4 },
      scale: { from: 0.9, to: 1.15 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  reveal(): void {
    this.setVisible(true);
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => this.startFloating(),
    });
  }

  private startFloating(): void {
    const body = this.body as Phaser.Physics.Arcade.StaticBody;

    this.scene.tweens.add({
      targets: this,
      y: this.baseY - 10,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        body.y = this.y - body.halfHeight;
      },
    });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 250,
      onComplete: () => this.setVisible(false),
    });
  }

  get isCollected(): boolean {
    return this.collected;
  }
}
