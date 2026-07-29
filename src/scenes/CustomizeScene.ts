import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import type { NexusAppearance, CapStyle, BackpackStyle } from '../entities/Nexus';
import { ProgressSystem } from '../systems/ProgressSystem';

type AppearanceKey = keyof NexusAppearance;

interface SwatchRow {
  key: 'bodyColor' | 'jacketColor' | 'capColor' | 'shoesColor';
  label: string;
  colors: number[];
  y: number;
}

interface StyleOption<T extends string> {
  value: T;
  label: string;
}

const ROWS: SwatchRow[] = [
  { key: 'bodyColor', label: 'Cuerpo', colors: [0x3a3f5c, 0x5c3a4f, 0x3a5c48, 0x5c4a3a], y: 0 },
  { key: 'jacketColor', label: 'Chaqueta', colors: [0x2ea3a3, 0xff8c42, 0xff4266, 0x8c42ff], y: 0 },
  { key: 'capColor', label: 'Acento', colors: [0x5ee7ff, 0xffe066, 0x9be37a, 0xff6b6b], y: 0 },
  { key: 'shoesColor', label: 'Zapatos', colors: [0x2b2e43, 0xf4f1e8, 0x8a4b1f, 0x1b6b3a], y: 0 },
];

const CAP_STYLES: StyleOption<CapStyle>[] = [
  { value: 'none', label: 'Sin gorra' },
  { value: 'gorra', label: 'Gorra' },
  { value: 'gorro', label: 'Gorro' },
];

const BACKPACK_STYLES: StyleOption<BackpackStyle>[] = [
  { value: 'core', label: 'Núcleo' },
  { value: 'square', label: 'Cuadrada' },
  { value: 'round', label: 'Redonda' },
];

const SWATCH_SIZE = 34;
const SWATCH_GAP = 12;
const ROW_GAP = 48;
const STYLE_BTN_WIDTH = 84;
const STYLE_BTN_HEIGHT = 30;
const STYLE_BTN_GAP = 8;

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

    this.preview = new Nexus(this, width / 2, 120, { ...this.appearance });
    this.preview.playIdle();

    const panelX = width / 2 - 220;
    const panelStartY = 190;

    ROWS.forEach((row, index) => {
      row.y = panelStartY + index * ROW_GAP;
      this.buildRow(row, panelX);
    });

    const capRowY = panelStartY + ROWS.length * ROW_GAP;
    this.buildStyleRow(panelX, capRowY, 'Gorra', CAP_STYLES, this.appearance.capStyle, (value) => {
      this.appearance = { ...this.appearance, capStyle: value };
      this.refreshPreview();
    });

    const backpackRowY = capRowY + ROW_GAP;
    this.buildStyleRow(panelX, backpackRowY, 'Mochila', BACKPACK_STYLES, this.appearance.backpackStyle, (value) => {
      this.appearance = { ...this.appearance, backpackStyle: value };
      this.refreshPreview();
    });

    // El botón va justo debajo de los controles, no pegado al borde inferior:
    // en pantallas altas (celular vertical) el borde puede quedar fuera del
    // área realmente visible por la barra de direcciones del navegador.
    const buttonY = Math.min(height - 50, backpackRowY + 50);
    this.buildPlayButton(width / 2, buttonY);
  }

  private buildStyleRow<T extends string>(
    startX: number,
    y: number,
    label: string,
    options: StyleOption<T>[],
    currentValue: T,
    onSelect: (value: T) => void,
  ): void {
    this.add
      .text(startX, y - 22, label, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#1b1f3b',
      })
      .setOrigin(0, 0.5);

    const buttons: Phaser.GameObjects.Rectangle[] = [];

    options.forEach((option, i) => {
      const x = startX + STYLE_BTN_WIDTH / 2 + i * (STYLE_BTN_WIDTH + STYLE_BTN_GAP);
      const isSelected = currentValue === option.value;

      const btn = this.add
        .rectangle(x, y, STYLE_BTN_WIDTH, STYLE_BTN_HEIGHT, 0xffffff, 0.6)
        .setStrokeStyle(2, 0x1b1f3b, isSelected ? 1 : 0.3)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(x, y, option.label, {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          color: '#1b1f3b',
        })
        .setOrigin(0.5);

      buttons.push(btn);
      btn.on('pointerdown', () => {
        buttons.forEach((b) => b.setStrokeStyle(2, 0x1b1f3b, 0.3));
        btn.setStrokeStyle(2, 0x1b1f3b, 1);
        onSelect(option.value);
      });
    });
  }

  private refreshPreview(): void {
    this.preview.destroy();
    this.preview = new Nexus(this, this.scale.width / 2, 120, { ...this.appearance });
    this.preview.playIdle();
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

    this.refreshPreview();
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
