import Phaser from 'phaser';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from './AudioSystem';

const CABLE_COLOR = 0x5ee7ff;
const CABLE_COLOR_INVALID = 0xff6b6b;

export interface ConnectionRule {
  sourceId: string;
  targetId: string;
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

    const isValid = this.rules.some(
      (rule) => rule.sourceId === source.id && rule.targetId === target.id,
    );

    this.drawCable(source, target, isValid);

    if (isValid) {
      source.activate();
      target.activate();
      this.showFeedback('¡Conexión correcta!', '#1b6b3a');
      this.audio.playSuccess();
      this.scene.events.emit('connection-made', target.id);
    } else {
      this.showFeedback('Esa conexión no encaja, prueba otra', '#8a4b1f');
      this.audio.playError();
    }
  }

  private drawCable(from: ConnectableObject, to: ConnectableObject, valid: boolean): void {
    const start = from.getPlugPoint();
    const end = to.getPlugPoint();
    const color = valid ? CABLE_COLOR : CABLE_COLOR_INVALID;

    this.cableGraphics.clear();
    this.cableGraphics.lineStyle(4, color, 0.9);

    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 40;

    this.cableGraphics.beginPath();
    this.cableGraphics.moveTo(start.x, start.y);
    this.cableGraphics.lineTo(midX, midY);
    this.cableGraphics.lineTo(end.x, end.y);
    this.cableGraphics.strokePath();

    if (!valid) {
      this.scene.time.delayedCall(500, () => this.cableGraphics.clear());
    }
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
