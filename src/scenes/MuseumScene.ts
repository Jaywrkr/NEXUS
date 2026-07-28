import Phaser from 'phaser';
import { ProgressSystem } from '../systems/ProgressSystem';

const FRAGMENTS = [
  { id: 'plaza-fragment', label: 'Fragmento de la plaza' },
  { id: 'fountain-fragment', label: 'Fragmento de la fuente' },
];

export class MuseumScene extends Phaser.Scene {
  private progress!: ProgressSystem;

  constructor() {
    super('MuseumScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.progress = new ProgressSystem();

    this.cameras.main.setBackgroundColor('#20233a');

    this.add
      .text(width / 2, 40, 'Museo Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#f4f1e8',
      })
      .setOrigin(0.5);

    const spacing = 220;
    const startX = width / 2 - (spacing * (FRAGMENTS.length - 1)) / 2;

    FRAGMENTS.forEach((fragment, index) => {
      this.buildVitrina(startX + index * spacing, height / 2, fragment.id, fragment.label);
    });

    this.add
      .text(width / 2, height - 40, 'Presiona ESPACIO para volver', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#c9cbe0',
      })
      .setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('WorldScene');
    });
  }

  private buildVitrina(x: number, y: number, fragmentId: string, label: string): void {
    this.add.rectangle(x, y + 80, 100, 20, 0x3a3d55);
    const glass = this.add.rectangle(x, y, 120, 160, 0x4a4e75, 0.3);
    glass.setStrokeStyle(2, 0x8a8dc0, 0.6);

    if (this.progress.hasFragment(fragmentId)) {
      const shard = this.add.star(x, y, 5, 10, 20, 0xffd93d);
      this.tweens.add({
        targets: shard,
        angle: 360,
        duration: 5000,
        repeat: -1,
      });

      this.add
        .text(x, y + 100, label, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#f4f1e8',
        })
        .setOrigin(0.5);
    } else {
      this.add
        .text(x, y, 'Vitrina vacía', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#8a8dc0',
        })
        .setOrigin(0.5);
    }
  }
}
