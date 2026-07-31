import Phaser from 'phaser';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from './AudioSystem';

const CABLE_COLOR = 0x5ee7ff;
const CABLE_COLOR_INVALID = 0xff6b6b;

export interface ConnectionRule {
  sourceId: string;
  targetId: string;
  /** Si es true, antes de completarse hay que superar el mini-túnel del cable (ver CableTunnelScene). */
  useTunnel?: boolean;
}

/**
 * Sistema que permite conectar dos ConnectableObject mediante clic:
 * primero el origen, luego el destino. Dibuja el cable y aplica el
 * feedback (encender objetivo si la regla es válida).
 */
export class ConnectionSystem {
  private scene: Phaser.Scene;
  private objects: ConnectableObject[] = [];
  private rules: ConnectionRule[] = [];
  private selected: ConnectableObject | null = null;
  private cableGraphics: Phaser.GameObjects.Graphics;
  private feedbackText: Phaser.GameObjects.Text;
  private audio: AudioSystem;

  constructor(scene: Phaser.Scene, audio: AudioSystem) {
    this.scene = scene;
    this.audio = audio;
    this.cableGraphics = scene.add.graphics().setDepth(15);

    this.feedbackText = scene.add
      .text(scene.scale.width / 2, scene.scale.height - 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0)
      .setAlpha(0);
  }

  register(object: ConnectableObject): void {
    this.objects.push(object);
    object.on('pointerdown', () => this.interact(object));
  }

  addRule(rule: ConnectionRule): void {
    this.rules.push(rule);
  }

  /** Punto de entrada público: tocar el objeto directamente o presionar el botón de interacción hacen lo mismo. */
  interact(object: ConnectableObject): void {
    this.handleClick(object);
  }

  hasSelection(): boolean {
    return this.selected !== null;
  }

  private handleClick(object: ConnectableObject): void {
    if (!this.selected) {
      if (!object.canInitiate()) return;
      this.selected = object;
      this.showFeedback('Ahora conecta con algo...', '#1b1f3b');
      return;
    }

    if (object === this.selected) {
      this.selected = null;
      this.cableGraphics.clear();
      return;
    }

    const source = this.selected;
    const target = object;
    this.selected = null;

    const rule = this.rules.find(
      (r) => r.sourceId === source.id && r.targetId === target.id,
    );

    if (!rule) {
      this.drawCable(source, target, false);
      this.showFeedback('Esa conexión no encaja, prueba otra', '#8a4b1f');
      this.audio.playError();
      return;
    }

    if (rule.useTunnel) {
      this.scene.events.emit('tunnel-requested', { source, target });
      return;
    }

    this.completeConnection(source, target);
  }

  /** Se llama cuando el jugador supera (o pierde) el mini-túnel de una conexión con useTunnel. */
  finishTunnel(source: ConnectableObject, target: ConnectableObject, success: boolean): void {
    if (success) {
      this.completeConnection(source, target);
      return;
    }

    this.drawCable(source, target, false);
    this.showFeedback('Perdiste el control en el túnel, ¡inténtalo de nuevo!', '#8a4b1f');
    this.audio.playError();
  }

  private completeConnection(source: ConnectableObject, target: ConnectableObject): void {
    this.drawCable(source, target, true);
    source.activate();
    target.activate();
    this.showFeedback('¡Conexión correcta!', '#1b6b3a');
    this.audio.playSuccess();
    this.spawnConnectBurst(target.getPlugPoint());
    this.scene.events.emit('connection-made', target.id);
  }

  /** Ráfaga de chispas que se disparan desde el objetivo al completar una conexión, como remate visual. */
  private spawnConnectBurst(at: Phaser.Math.Vector2): void {
    const sparkCount = 10;
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 30 + Math.random() * 20;
      const spark = this.scene.add.circle(at.x, at.y, 3 + Math.random() * 2, CABLE_COLOR).setDepth(16);

      this.scene.tweens.add({
        targets: spark,
        x: at.x + Math.cos(angle) * distance,
        y: at.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 450 + Math.random() * 150,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private drawCable(from: ConnectableObject, to: ConnectableObject, valid: boolean): void {
    const start = from.getPlugPoint();
    const end = to.getPlugPoint();
    const color = valid ? CABLE_COLOR : CABLE_COLOR_INVALID;

    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 40;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(start.x, start.y),
      new Phaser.Math.Vector2(midX, midY),
      new Phaser.Math.Vector2(end.x, end.y),
    );

    this.cableGraphics.clear();
    this.cableGraphics.lineStyle(4, color, 0.9);
    curve.draw(this.cableGraphics, 32);

    if (!valid) {
      this.scene.time.delayedCall(500, () => this.cableGraphics.clear());
      return;
    }

    this.spawnEnergyPulse(curve, color);
  }

  /** Chispa de energía que recorre el cable una vez, para reforzar la conexión válida. */
  private spawnEnergyPulse(curve: Phaser.Curves.QuadraticBezier, color: number): void {
    const pulse = this.scene.add.circle(0, 0, 6, color).setDepth(16);
    const point = curve.getPoint(0);
    pulse.setPosition(point.x, point.y);

    this.scene.tweens.add({
      targets: pulse,
      duration: 500,
      onUpdate: (tween) => {
        const p = curve.getPoint(tween.progress);
        pulse.setPosition(p.x, p.y);
      },
      onComplete: () => pulse.destroy(),
    });
  }

  private showFeedback(message: string, color: string): void {
    this.feedbackText.setText(message);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);

    this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      delay: 1200,
      duration: 400,
    });
  }
}
