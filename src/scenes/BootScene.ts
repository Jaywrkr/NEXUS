import Phaser from 'phaser';
import { fadeToScene } from '../utils/sceneTransition';
import { ProgressSystem } from '../systems/ProgressSystem';

const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 48;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const progress = new ProgressSystem();
    const hasProgress = progress.getCollectedFragments().length > 0;

    this.cameras.main.setBackgroundColor('#f4f1e8');
    this.cameras.main.fadeIn(300, 244, 241, 232);

    this.add
      .text(width / 2, height / 2 - 100, 'Los Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 50, 'Conecta el mundo', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#5a5e78',
      })
      .setOrigin(0.5);

    const firstButtonY = hasProgress ? height / 2 + 20 : height / 2 + 40;

    if (hasProgress) {
      this.buildButton(width / 2, firstButtonY, 'Continuar', 0x9be37a, () => {
        fadeToScene(this, 'WorldScene', [207, 232, 216]);
      });
      this.buildButton(width / 2, firstButtonY + BUTTON_HEIGHT + 16, 'Nueva partida', 0x5ee7ff, () => {
        fadeToScene(this, 'CustomizeScene', [244, 241, 232]);
      });
    } else {
      this.buildButton(width / 2, firstButtonY, 'Jugar', 0x5ee7ff, () => {
        fadeToScene(this, 'CustomizeScene', [244, 241, 232]);
      });
    }
  }

  private buildButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, color)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    button.on('pointerdown', onClick);
  }
}
