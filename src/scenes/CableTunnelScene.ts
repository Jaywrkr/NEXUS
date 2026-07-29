import Phaser from 'phaser';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from '../systems/AudioSystem';

const TUNNEL_LENGTH = 2200;
const FORWARD_SPEED = 0.32; // progreso por ms
const HALF_WIDTH = 66;
const WAVE_AMPLITUDE = 78;
const WAVE_FREQUENCY = 0.0032;
const SPARK_SCREEN_X_RATIO = 0.28;
const SPARK_ACCEL_MS = 90;
const SPARK_SPEED = 260;

export interface CableTunnelData {
  source: ConnectableObject;
  target: ConnectableObject;
}

/**
 * Mini-juego que se abre "dentro" del cable al conectar ciertos pares
 * (idea de Luca): la chispa avanza sola por el túnel y hay que guiarla
 * con el teclado para que no toque las paredes onduladas.
 */
export class CableTunnelScene extends Phaser.Scene {
  private source!: ConnectableObject;
  private target!: ConnectableObject;
  private audio!: AudioSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private wallsGraphics!: Phaser.GameObjects.Graphics;
  private spark!: Phaser.GameObjects.Arc;
  private progressBarFill!: Phaser.GameObjects.Rectangle;
  private progress = 0;
  private sparkY = 0;
  private sparkVelY = 0;
  private finished = false;

  constructor() {
    super('CableTunnelScene');
  }

  init(data: CableTunnelData): void {
    this.source = data.source;
    this.target = data.target;
    this.progress = 0;
    this.sparkVelY = 0;
    this.finished = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.audio = new AudioSystem();
    this.sparkY = height / 2;

    this.cameras.main.setBackgroundColor('#0a1f2e');
    this.cameras.main.fadeIn(200, 10, 31, 46);

    this.add
      .text(width / 2, 20, 'Guía la chispa por el cable — no toques los bordes', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#d8f4ff',
      })
      .setOrigin(0.5, 0);

    this.wallsGraphics = this.add.graphics().setDepth(1);

    const sparkScreenX = width * SPARK_SCREEN_X_RATIO;
    this.spark = this.add.circle(sparkScreenX, this.sparkY, 8, 0x5ee7ff).setDepth(5);
    this.add.circle(sparkScreenX, this.sparkY, 14, 0x5ee7ff, 0.25).setDepth(4);

    // Barra de progreso del túnel.
    this.add.rectangle(width / 2, height - 20, width - 80, 10, 0x14324a).setDepth(10);
    this.progressBarFill = this.add
      .rectangle(40, height - 20, 1, 10, 0x5ee7ff)
      .setOrigin(0, 0.5)
      .setDepth(11);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  private centerYAt(worldProgress: number): number {
    return this.scale.height / 2 + Math.sin(worldProgress * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    let dy = 0;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    const smoothing = 1 - Math.exp(-delta / SPARK_ACCEL_MS);
    this.sparkVelY += (dy * SPARK_SPEED - this.sparkVelY) * smoothing;
    this.sparkY += (this.sparkVelY * delta) / 1000;
    this.spark.setPosition(this.spark.x, this.sparkY);

    this.progress += FORWARD_SPEED * delta;

    this.drawTunnel();
    this.progressBarFill.width = Math.max(1, (this.scale.width - 80) * Math.min(1, this.progress / TUNNEL_LENGTH));

    const center = this.centerYAt(this.progress);
    if (Math.abs(this.sparkY - center) > HALF_WIDTH) {
      this.finish(false);
      return;
    }

    if (this.progress >= TUNNEL_LENGTH) {
      this.finish(true);
    }
  }

  private drawTunnel(): void {
    const { width, height } = this.scale;
    const sparkScreenX = width * SPARK_SCREEN_X_RATIO;
    const step = 12;

    this.wallsGraphics.clear();
    this.wallsGraphics.lineStyle(4, 0x5ee7ff, 0.7);
    this.wallsGraphics.fillStyle(0x123246, 1);

    const topPoints: Phaser.Math.Vector2[] = [];
    const bottomPoints: Phaser.Math.Vector2[] = [];

    for (let x = 0; x <= width; x += step) {
      const worldProgress = this.progress + (x - sparkScreenX);
      const center = this.centerYAt(worldProgress);
      topPoints.push(new Phaser.Math.Vector2(x, Math.max(0, center - HALF_WIDTH)));
      bottomPoints.push(new Phaser.Math.Vector2(x, Math.min(height, center + HALF_WIDTH)));
    }

    this.wallsGraphics.fillRect(0, 0, width, height);
    this.wallsGraphics.fillStyle(0x0a1f2e, 1);

    this.wallsGraphics.beginPath();
    this.wallsGraphics.moveTo(0, 0);
    topPoints.forEach((p) => this.wallsGraphics.lineTo(p.x, p.y));
    this.wallsGraphics.lineTo(width, 0);
    this.wallsGraphics.closePath();
    this.wallsGraphics.fillPath();

    this.wallsGraphics.beginPath();
    this.wallsGraphics.moveTo(0, height);
    bottomPoints.forEach((p) => this.wallsGraphics.lineTo(p.x, p.y));
    this.wallsGraphics.lineTo(width, height);
    this.wallsGraphics.closePath();
    this.wallsGraphics.fillPath();

    this.wallsGraphics.beginPath();
    topPoints.forEach((p, i) => (i === 0 ? this.wallsGraphics.moveTo(p.x, p.y) : this.wallsGraphics.lineTo(p.x, p.y)));
    this.wallsGraphics.strokePath();

    this.wallsGraphics.beginPath();
    bottomPoints.forEach((p, i) => (i === 0 ? this.wallsGraphics.moveTo(p.x, p.y) : this.wallsGraphics.lineTo(p.x, p.y)));
    this.wallsGraphics.strokePath();
  }

  private finish(success: boolean): void {
    this.finished = true;

    if (success) {
      this.audio.playSuccess();
      this.cameras.main.flash(200, 94, 231, 255);
    } else {
      this.audio.playError();
      this.cameras.main.flash(200, 255, 107, 107);
    }

    this.time.delayedCall(250, () => {
      this.scene.stop();
      this.scene.resume('WorldScene', { tunnelSuccess: success, source: this.source, target: this.target });
    });
  }
}
