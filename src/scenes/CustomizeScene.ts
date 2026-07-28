import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import type { NexusAppearance } from '../entities/Nexus';
import { ProgressSystem } from '../systems/ProgressSystem';

type AppearanceKey = keyof NexusAppearance;

interface SwatchRow {
  key: AppearanceKey;
  label: string;
  colors: number[];
  y: number;
}

const ROWS: SwatchRow[] = [
  { key: 'bodyColor', label: 'Cuerpo', colors: [0x3a3f5c, 0x5c3a4f, 0x3a5c48, 0x5c4a3a], y: 0 },
  { key: 'jacketColor', label: 'Chaqueta', colors: [0xff8c42, 0x42a5ff, 0xff4266, 0x8c42ff], y: 0 },
  { key: 'capColor', label: 'Gorra', colors: [0x5ee7ff, 0xffe066, 0x9be37a, 0xff6b6b], y: 0 },
  { key: 'shoesColor', label: 'Zapatos', colors: [0x2b2e43, 0xf4f1e8, 0x8a4b1f, 0x1b6b3a], y: 0 },
];

const SWATCH_SIZE = 34;
const SWATCH_GAP = 12;
const ROW_GAP = 64;

export class CustomizeScene extends Phaser.Scene {
  private progress!: ProgressSystem;
  private appearance!: NexusAppearance;
  private preview!: Nexus;
  private swatchMarkers = new Map<AppearanceKey, Phaser.GameObjects.Rectangle[]>();

  constructor() {
    super('CustomizeScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.progress = new ProgressSystem();
    this.appearance = this.progress.getAppearance();

    this.cameras.main.setBackgroundColor('#f4f1e8');

    this.add
      .text(width / 2, 32, 'Elige tu Nexus', {
        fontFamily: 'sans-serif',
        fontSize: '28px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    this.preview = new Nexus(this, width / 2, 150, { ...this.appearance });
    this.preview.playIdle();

    const panelX = width / 2 - 220;
    const panelStartY = 240;

    ROWS.forEach((row, index) => {
      row.y = panelStartY + index * ROW_GAP;
      this.buildRow(row, panelX);
    });

    // El botón va justo debajo de los swatches, no pegado al borde inferior:
    // en pantallas altas (celular vertical) el borde puede quedar fuera del
    // área realmente visible por la barra de direcciones del navegador.
    const buttonY = Math.min(height - 50, panelStartY + ROWS.length * ROW_GAP + 50);
    this.buildPlayButton(width / 2, buttonY);
  }

  private buildRow(row: SwatchRow, startX: number): void {
    this.add
      .text(startX, row.y - 22, row.label, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#1b1f3b',
      })
      .setOrigin(0, 0.5);

    const markers: Phaser.GameObjects.Rectangle[] = [];

    row.colors.forEach((color, i) => {
      const x = startX + i * (SWATCH_SIZE + SWATCH_GAP);
      const swatch = this.add
        .rectangle(x, row.y, SWATCH_SIZE, SWATCH_SIZE, color)
        .setStrokeStyle(2, 0x1b1f3b, 0.3)
        .setInteractive({ useHandCursor: true });

      const marker = this.add
        .rectangle(x, row.y, SWATCH_SIZE + 8, SWATCH_SIZE + 8)
        .setStrokeStyle(3, 0x1b1f3b, this.appearance[row.key] === color ? 1 : 0);

      markers.push(marker);

      swatch.on('pointerdown', () => this.selectColor(row.key, color, markers, marker));
    });

    this.swatchMarkers.set(row.key, markers);
  }

  private selectColor(
    key: AppearanceKey,
    color: number,
    rowMarkers: Phaser.GameObjects.Rectangle[],
    activeMarker: Phaser.GameObjects.Rectangle,
  ): void {
    this.appearance = { ...this.appearance, [key]: color };

    rowMarkers.forEach((marker) => marker.setStrokeStyle(3, 0x1b1f3b, 0));
    activeMarker.setStrokeStyle(3, 0x1b1f3b, 1);

    this.preview.destroy();
    this.preview = new Nexus(this, this.scale.width / 2, 150, { ...this.appearance });
    this.preview.playIdle();
  }

  private buildPlayButton(x: number, y: number): void {
    const button = this.add
      .rectangle(x, y, 160, 44, 0x5ee7ff)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'Jugar', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5);

    button.on('pointerdown', () => {
      this.progress.saveAppearance(this.appearance);
      this.scene.start('WorldScene');
    });
  }
}
