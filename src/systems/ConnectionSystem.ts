import Phaser from 'phaser';
import type { SavedConnection } from '../data/gameState';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from './AudioSystem';
import { EffectsSettings } from './EffectsSettings';
import { connectionSurprise } from '../data/chapter';

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
  private completed = new Set<string>();
  private selected: ConnectableObject | null = null;
  private cableGraphics: Phaser.GameObjects.Graphics;
  private feedbackText: Phaser.GameObjects.Text;
  private audio: AudioSystem;
  private hintRing: Phaser.GameObjects.Arc;
  private hintObject: ConnectableObject | null = null;
  private lastInteractionAt: number;


  constructor(scene: Phaser.Scene, audio: AudioSystem) {
    this.scene = scene;
    this.audio = audio;
    this.lastInteractionAt = scene.game.loop.now;
    this.hintRing = scene.add.circle(0, 0, 38)
      .setStrokeStyle(3, 0x1b6b3a, 0.65).setDepth(14).setVisible(false);
    this.cableGraphics = scene.add.graphics().setDepth(15);

    this.feedbackText = scene.add
      .text(scene.scale.width / 2, scene.scale.height - 132, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
        wordWrap: { width: Math.min(480, scene.scale.width - 48), useAdvancedWrap: true },
        align: 'center',
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

  /** Replay only registered rules, in puzzle order, without tunnel, sound or rewards. */
  restoreConnections(connections: SavedConnection[]): void {
    for (const rule of this.rules) {
      if (!connections.some((c) => c.sourceId === rule.sourceId && c.targetId === rule.targetId)) continue;
      const source = this.objects.find((object) => object.id === rule.sourceId);
      const target = this.objects.find((object) => object.id === rule.targetId);
      const key = JSON.stringify([rule.sourceId, rule.targetId]);
      if (!source || !target || !source.canInitiate() || this.completed.has(key)) continue;
      this.completed.add(key);
      source.activate();
      target.activate();
    }
  }

  /** Punto de entrada público: tocar el objeto directamente o presionar el botón de interacción hacen lo mismo. */
  interact(object: ConnectableObject): void {
    this.resetHint();
    this.handleClick(object);
  }

  hasSelection(): boolean {
    return this.selected !== null;
  }

  resetHint(): void {
    // The scene clock can still be stale in a resume callback.
    this.lastInteractionAt = this.scene.game.loop.now;
    this.hintObject = null;
    this.hintRing.setVisible(false);
  }

  /** After ten seconds without interaction, suggest one visible unfinished step. */
  updateHint(): void {
    if (this.scene.game.loop.now - this.lastInteractionAt < 10_000) {
      this.hintObject = null;
      this.hintRing.setVisible(false);
      return;
    }
    const visible = this.scene.cameras.main.worldView;
    const candidates: ConnectableObject[] = [];
    for (const rule of this.rules) {
      if (this.completed.has(JSON.stringify([rule.sourceId, rule.targetId]))) continue;
      const source = this.objects.find(o => o.id === rule.sourceId);
      const target = this.objects.find(o => o.id === rule.targetId);
      if (!source?.canInitiate() || !target || target.isActive) continue;
      if (this.selected && source !== this.selected) continue;
      const object = this.selected ? target : source;
      if (visible.contains(object.x, object.y)) candidates.push(object);
    }
    // Prefer the center of the current view, without pointing into another zone.
    candidates.sort((a, b) => Math.abs(a.x - visible.centerX) - Math.abs(b.x - visible.centerX));
    this.hintObject = candidates[0] ?? null;
    this.hintRing.setVisible(this.hintObject !== null);
    if (!this.hintObject) return;
    this.hintRing.setPosition(this.hintObject.x, this.hintObject.y);
    const pulse = EffectsSettings.isReduced() ? 0 : Math.sin(this.scene.time.now / 600);
    this.hintRing.setScale(1 + pulse * 0.08).setAlpha(0.65 + pulse * 0.12);
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
      const surprise = connectionSurprise(source.id, target.id);
      this.showFeedback(surprise ? '¡Una conexión inesperada!' : 'Esa conexión no encaja, prueba otra', '#8a4b1f');
      if (surprise) this.scene.events.emit('connection-surprise', surprise);
      this.audio.playError();
      return;
    }

    if (this.completed.has(JSON.stringify([source.id, target.id]))) {
      this.showFeedback('Esa conexión ya está lista', '#1b6b3a');
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
    const key = JSON.stringify([source.id, target.id]);
    if (this.completed.has(key)) return;
    this.completed.add(key);
    this.resetHint();
    this.drawCable(source, target, true);
    source.activate();
    target.activate();
    this.showFeedback('¡Conexión correcta!', '#1b6b3a');
    this.audio.playSuccess();
    this.spawnConnectBurst(target.getPlugPoint());
    this.spawnGlowRing(target.getPlugPoint());
    this.scene.events.emit('connection-made', target.id, source.id);
  }

  /** Ráfaga de chispas que se disparan desde el objetivo al completar una conexión, como remate visual. */
  private spawnConnectBurst(at: Phaser.Math.Vector2): void {
    if (EffectsSettings.isReduced()) return;
    const sparkColors = [CABLE_COLOR, 0xffffff, 0xbdf5ff];
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
      const distance = 25 + Math.random() * 35;
      const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      const isStar = i % 3 === 0;
      const size = 2 + Math.random() * 3;

      const spark = isStar
        ? this.scene.add.star(at.x, at.y, 4, size * 0.5, size, color).setDepth(16)
        : this.scene.add.circle(at.x, at.y, size, color).setDepth(16);

      this.scene.tweens.add({
        targets: spark,
        x: at.x + Math.cos(angle) * distance,
        y: at.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        rotation: isStar ? Math.random() * Math.PI : 0,
        duration: 400 + Math.random() * 250,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  /** Anillo que se expande y desvanece en el punto de conexión, como remate adicional al de las chispas. */
  private spawnGlowRing(at: Phaser.Math.Vector2): void {
    if (EffectsSettings.isReduced()) return;
    const ring = this.scene.add.circle(at.x, at.y, 8, undefined).setDepth(16);
    ring.setStrokeStyle(3, CABLE_COLOR, 0.9);

    this.scene.tweens.add({
      targets: ring,
      radius: 34,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onUpdate: () => ring.setStrokeStyle(3, CABLE_COLOR, ring.alpha),
      onComplete: () => ring.destroy(),
    });
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
