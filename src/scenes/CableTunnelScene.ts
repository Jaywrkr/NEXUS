import Phaser from 'phaser';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from '../systems/AudioSystem';

const TUNNEL_LENGTH = 2200;
const FORWARD_SPEED = 0.32; // progreso (profundidad) por ms
const TUBE_RADIUS = 100;
const WAVE_AMPLITUDE_X = 70;
const WAVE_AMPLITUDE_Y = 60;
const WAVE_FREQUENCY_X = 0.0026;
const WAVE_FREQUENCY_Y = 0.0034;
const FOCAL_LENGTH = 220;
const VIEW_DEPTH = 900;
const RING_STEP = 24;
const SHIP_ACCEL_MS = 90;
const SHIP_SPEED = 220;
const VANISHING_POINT_Y_RATIO = 0.42;
const SHIP_ANCHOR_Y_RATIO = 0.78;

export interface CableTunnelData {
  source: ConnectableObject;
  target: ConnectableObject;
}

/**
 * Mini-juego que se abre "dentro" del cable al conectar ciertos pares
 * (idea de Luca): la chispa vuela sola hacia adelante por un tubo que
 * serpentea, visto desde atrás (perspectiva estilo Mario Kart, con
 * anillos concéntricos que se agrandan al acercarse). El jugador se
 * mueve libre en 2D (arriba/abajo/izquierda/derecha) dentro del tubo
 * para no tocar sus paredes.
 */
export class CableTunnelScene extends Phaser.Scene {
  private source!: ConnectableObject;
  private target!: ConnectableObject;
  private audio!: AudioSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private tunnelGraphics!: Phaser.GameObjects.Graphics;
  private ship!: Phaser.GameObjects.Arc;
  private shipGlow!: Phaser.GameObjects.Arc;
  private progressBarFill!: Phaser.GameObjects.Rectangle;
  private progress = 0;
  private shipX = 0;
  private shipY = 0;
  private shipVelX = 0;
  private shipVelY = 0;
  private finished = false;

  constructor() {
    super('CableTunnelScene');
  }

  init(data: CableTunnelData): void {
    this.source = data.source;
    this.target = data.target;
    this.progress = 0;
    this.shipX = 0;
    this.shipY = 0;
    this.shipVelX = 0;
    this.shipVelY = 0;
    this.finished = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.audio = new AudioSystem();

    this.cameras.main.setBackgroundColor('#0a1f2e');
    this.cameras.main.fadeIn(200, 10, 31, 46);

    this.add
      .text(width / 2, 20, 'Guía la chispa por el cable — no toques las paredes', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#d8f4ff',
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.tunnelGraphics = this.add.graphics().setDepth(1);

    const shipAnchorX = width / 2;
    const shipAnchorY = height * SHIP_ANCHOR_Y_RATIO;
    this.shipGlow = this.add.circle(shipAnchorX, shipAnchorY, 16, 0x5ee7ff, 0.3).setDepth(4);
    this.ship = this.add.circle(shipAnchorX, shipAnchorY, 9, 0x5ee7ff).setDepth(5);

    // Barra de progreso del túnel.
    this.add.rectangle(width / 2, height - 20, width - 80, 10, 0x14324a).setDepth(10);
    this.progressBarFill = this.add
      .rectangle(40, height - 20, 1, 10, 0x5ee7ff)
      .setOrigin(0, 0.5)
      .setDepth(11);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  /** Centro del tubo (offset respecto al eje recto) a una profundidad dada. */
  private tubeCenterAt(worldProgress: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Math.sin(worldProgress * WAVE_FREQUENCY_X) * WAVE_AMPLITUDE_X,
      Math.sin(worldProgress * WAVE_FREQUENCY_Y + 1.3) * WAVE_AMPLITUDE_Y,
    );
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const norm = Math.SQRT1_2;
      dx *= norm;
      dy *= norm;
    }

    const smoothing = 1 - Math.exp(-delta / SHIP_ACCEL_MS);
    this.shipVelX += (dx * SHIP_SPEED - this.shipVelX) * smoothing;
    this.shipVelY += (dy * SHIP_SPEED - this.shipVelY) * smoothing;
    this.shipX += (this.shipVelX * delta) / 1000;
    this.shipY += (this.shipVelY * delta) / 1000;

    this.progress += FORWARD_SPEED * delta;

    this.drawTunnel();
    this.progressBarFill.width = Math.max(1, (this.scale.width - 80) * Math.min(1, this.progress / TUNNEL_LENGTH));

    const offCenter = Math.sqrt(this.shipX * this.shipX + this.shipY * this.shipY);
    if (offCenter > TUBE_RADIUS - 10) {
      this.finish(false);
      return;
    }

    if (this.progress >= TUNNEL_LENGTH) {
      this.finish(true);
    }
  }

  /** Dibuja el tubo como anillos concéntricos que se agrandan al acercarse (perspectiva tipo Mario Kart). */
  private drawTunnel(): void {
    const { width, height } = this.scale;
    const vanishingX = width / 2;
    const vanishingY = height * VANISHING_POINT_Y_RATIO;
    const baseCenter = this.tubeCenterAt(this.progress);

    this.tunnelGraphics.clear();
    this.tunnelGraphics.fillStyle(0x0a1f2e, 1);
    this.tunnelGraphics.fillRect(0, 0, width, height);

    for (let depth = VIEW_DEPTH; depth >= 0; depth -= RING_STEP) {
      const scale = FOCAL_LENGTH / (FOCAL_LENGTH + depth);
      const ringCenter = this.tubeCenterAt(this.progress + depth);
      const offsetX = (ringCenter.x - baseCenter.x) * scale;
      const offsetY = (ringCenter.y - baseCenter.y) * scale;
      const radius = TUBE_RADIUS * scale;
      const alpha = 0.25 + 0.6 * scale;

      this.tunnelGraphics.lineStyle(Math.max(1, 4 * scale), 0x5ee7ff, alpha);
      this.tunnelGraphics.strokeCircle(vanishingX + offsetX, vanishingY + offsetY, radius);
    }

    // Reticle central, referencia de "hacia dónde se mira".
    this.tunnelGraphics.lineStyle(1, 0x5ee7ff, 0.35);
    this.tunnelGraphics.strokeCircle(vanishingX, vanishingY, 4);

    // Posición visible de la chispa: anclada abajo, desplazada por su offset dentro del tubo.
    this.ship.setPosition(width / 2 + this.shipX, height * SHIP_ANCHOR_Y_RATIO + this.shipY);
    this.shipGlow.setPosition(this.ship.x, this.ship.y);
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
