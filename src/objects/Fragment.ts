import Phaser from 'phaser';

const FRAGMENT_COLOR = 0xffd93d;

/**
 * Objeto coleccionable simple. No forma parte de ConnectionSystem:
 * aparece cuando la puerta se abre y se recoge por cercanía con el Nexus.
 */
export class Fragment extends Phaser.GameObjects.Container {
  private collected = false;
  private shard: Phaser.GameObjects.Star;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.shard = scene.add.star(0, 0, 5, 8, 16, FRAGMENT_COLOR);
    const glow = scene.add.circle(0, 0, 18, FRAGMENT_COLOR, 0.2);

    this.add([glow, this.shard]);
    this.setSize(36, 36);
    this.setVisible(false);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this.shard,
      angle: 360,
      duration: 4000,
      repeat: -1,
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
    });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;

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
