import Phaser from 'phaser';
import { ART } from '../art/interfaceArt';
import { ConnectableObject } from '../objects/ConnectableObject';
import { AudioSystem } from '../systems/AudioSystem';
import { EffectsSettings } from '../systems/EffectsSettings';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

const TUNNEL_LENGTH = 2200;
const FORWARD_SPEED = 0.32; // progreso (profundidad) por ms
const TUBE_RADIUS = 210;
const WAVE_AMPLITUDE_X = 160;
const WAVE_AMPLITUDE_Y = 140;
const WAVE_FREQUENCY_X = 0.0026;
const WAVE_FREQUENCY_Y = 0.0034;
const FOCAL_LENGTH = 260;
const VIEW_DEPTH = 900;
const RING_STEP = 90;
const RING_COLOR_FAR = new Phaser.Display.Color(16, 23, 57); // profundidad del túnel, casi negro
const RING_COLOR_NEAR = new Phaser.Display.Color(65, 93, 201); // banda más cercana, iluminada por la chispa
const SHIP_ACCEL_MS = 90;
const SHIP_SPEED = 220;
const VANISHING_POINT_Y_RATIO = 0.4;
const TRAIL_LENGTH = 14;
const DANGER_RATIO = 0.78; // fracción de TUBE_RADIUS a partir de la que las paredes avisan peligro
const SPARK_COUNT = 36;

export interface CableTunnelData {
  source: ConnectableObject;
  target: ConnectableObject;
  skipPractice?: boolean;
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
  private joystick!: VirtualJoystick;
  private tunnelGraphics!: Phaser.GameObjects.Graphics;
  private ship!: Phaser.GameObjects.Arc;
  private shipGlow!: Phaser.GameObjects.Arc;
  private progressBarFill!: Phaser.GameObjects.Rectangle;
  private starGraphics!: Phaser.GameObjects.Graphics;
  private sparkGraphics!: Phaser.GameObjects.Graphics;
  private sparks: { angle: number; radiusFrac: number; depthOffset: number }[] = [];
  private trail: { x: number; y: number }[] = [];
  private progress = 0;
  private shipX = 0;
  private shipY = 0;
  private shipVelX = 0;
  private shipVelY = 0;
  private elapsed = 0;
  private finished = false;
  private phase: 'practice' | 'running' | 'failed' | 'finished' = 'practice';
  private instructionText!: Phaser.GameObjects.Text;
  private menuObjects: Phaser.GameObjects.GameObject[] = [];
  private shakeCooldown = false;

  constructor() {
    super('CableTunnelScene');
  }

  init(data: CableTunnelData): void {
    this.phase = data.skipPractice ? 'running' : 'practice';
    this.menuObjects = [];
    this.source = data.source;
    this.target = data.target;
    this.progress = 0;
    this.shipX = 0;
    this.shipY = 0;
    this.shipVelX = 0;
    this.shipVelY = 0;
    this.elapsed = 0;
    this.trail = [];
    this.finished = false;
    this.shakeCooldown = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.audio = new AudioSystem();

    this.cameras.main.setBackgroundColor('#101739');
    this.cameras.main.fadeIn(200, 10, 31, 46);

    const hud=this.add.graphics().setDepth(19);
    hud.fillStyle(0x14234e,.9).fillRoundedRect(20,12,width-40,58,12);
    hud.lineStyle(1,0x57cdeb,.45).strokeRoundedRect(24,16,width-48,50,9);
    this.instructionText = this.add
      .text(width / 2, 20, 'Guía la chispa por el cable — no toques las paredes', {
        fontFamily: ART.body,
        fontSize: '16px',
        color: '#d8f4ff',
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.tunnelGraphics = this.add.graphics().setDepth(1);
    this.sparkGraphics = this.add.graphics().setDepth(2);
    this.starGraphics = this.add.graphics().setDepth(3);

    // Motas de polvo/chispas fijas en ángulo y radio dentro del tubo (no
    // solo detrás de la nave) que viajan hacia la cámara igual que los
    // anillos, dibujadas como trazos cortos (no puntos) para dar sensación
    // de velocidad real, tipo líneas de "warp".
    this.sparks = Array.from({ length: SPARK_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radiusFrac: 0.35 + Math.random() * 0.6,
      depthOffset: Math.random() * VIEW_DEPTH,
    }));

    // Viñeta radial (generada una sola vez en un canvas) para oscurecer las
    // esquinas y dar sensación de profundidad/lente en vez de un rectángulo
    // parejo — el detalle que más se nota como "más realista".
    if (!this.textures.exists('tunnel-vignette')) {
      const canvasTex = this.textures.createCanvas('tunnel-vignette', width, height);
      const ctx = canvasTex!.getContext();
      const cx = width / 2;
      const cy = height * VANISHING_POINT_Y_RATIO;
      const radius = Math.max(width, height) * 0.75;
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      canvasTex!.refresh();
    }
    this.add.image(width / 2, height / 2, 'tunnel-vignette').setDepth(6).setScrollFactor(0);

    // El barco arranca exactamente en el centro real del tubo (en progreso 0),
    // pero a partir de ahí su posición es propia — si el tubo se curva y no
    // lo seguís, el tubo se "aleja" de vos de verdad.
    const startCenter = this.tubeCenterAt(0);
    this.shipX = startCenter.x;
    this.shipY = startCenter.y;

    const shipAnchorX = width / 2;
    const shipAnchorY = height * VANISHING_POINT_Y_RATIO;
    this.shipGlow = this.add.circle(shipAnchorX, shipAnchorY, 20, 0x5ee7ff, 0.3).setDepth(4);
    this.ship = this.add.circle(shipAnchorX, shipAnchorY, 11, 0xffe342).setStrokeStyle(2,0xffffff,.9).setDepth(5);

    // Barra de progreso del túnel.
    this.add.rectangle(width / 2, height - 20, width - 80, 10, 0x14324a).setStrokeStyle(1,0x57cdeb,.5).setDepth(10);
    this.progressBarFill = this.add
      .rectangle(40, height - 20, 1, 10, 0x5ee7ff)
      .setOrigin(0, 0.5)
      .setDepth(11);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.joystick = new VirtualJoystick(this, 90, height - 90);
    if (this.phase === 'practice') this.showMenu(false);

    const onSpace = (): void => {
      if (this.phase === 'practice') this.startRun();
      else if (this.phase === 'failed') this.retry();
    };
    const onEscape = (): void => {
      if (this.phase === 'practice' || this.phase === 'failed') this.leaveTunnel();
    };
    this.input.keyboard!.on('keydown-SPACE', onSpace);
    this.input.keyboard!.on('keydown-ESC', onEscape);
    this.events.once('shutdown', () => {
      this.input.keyboard!.off('keydown-SPACE', onSpace);
      this.input.keyboard!.off('keydown-ESC', onEscape);
    });
    this.drawTunnel();
  }

  private showMenu(failed: boolean): void {
    const { width, height } = this.scale;
    this.instructionText.setText(failed
      ? '¡Casi! Vuelve a intentarlo'
      : 'Practica con las flechas, WASD o el joystick');
    const message = this.add.text(width / 2, height - 235,
      failed ? 'Tu progreso está a salvo' : 'Aquí puedes probar sin perder', {
        fontFamily: ART.body, fontSize: '18px', color: '#d8f4ff',
        align: 'center', wordWrap: { width: width - 40 },
      }).setOrigin(0.5).setDepth(70);
    this.menuObjects.push(message);
    this.buildMenuButton(height - 155, failed ? 'Reintentar' : 'Empezar', 0x5ee7ff, () => {
      if (failed) this.retry();
      else this.startRun();
    });
    this.buildMenuButton(height - 90, 'Volver al mundo', 0xb9d4e0, () => this.leaveTunnel());
  }

  private buildMenuButton(y: number, label: string, color: number, onPress: () => void): void {
    ensureRoundedRectTexture(this, 'tunnel-menu-button', 220, 52, 14);
    const button = this.add.image(this.scale.width / 2, y, 'tunnel-menu-button')
      .setTint(color).setDepth(70).setInteractive({ useHandCursor: true });
    const text = this.add.text(this.scale.width / 2, y, label, {
      fontFamily: ART.body, fontSize: '20px', fontStyle: 'bold', color: '#1b1f3b',
    }).setOrigin(0.5).setDepth(71);
    button.on('pointerover', () => button.setTint(0x9be37a));
    button.on('pointerout', () => button.setTint(color));
    button.on('pointerdown', onPress);
    this.menuObjects.push(button, text);
  }

  private startRun(): void {
    if (this.phase !== 'practice') return;
    this.phase = 'running';
    const center = this.tubeCenterAt(0);
    this.shipX = center.x;
    this.shipY = center.y;
    this.shipVelX = 0;
    this.shipVelY = 0;
    this.trail = [];
    this.elapsed = 0;
    this.joystick.reset();
    this.menuObjects.forEach((object) => object.destroy());
    this.menuObjects = [];
    this.instructionText.setText('Guía la chispa por el cable — no toques las paredes');
  }

  private retry(): void {
    if (this.phase !== 'failed') return;
    this.phase = 'finished';
    this.scene.restart({ source: this.source, target: this.target, skipPractice: true });
  }

  private leaveTunnel(): void {
    if (this.phase !== 'practice' && this.phase !== 'failed') return;
    this.phase = 'finished';
    this.finished = true;
    this.scene.stop();
    // No result: cancelling must not award a connection or report a new failure.
    this.scene.resume('WorldScene');
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

    const joyVector = this.joystick.getVector();
    if (joyVector.x !== 0 || joyVector.y !== 0) {
      dx = joyVector.x;
      dy = joyVector.y;
    }

    const smoothing = 1 - Math.exp(-delta / SHIP_ACCEL_MS);
    this.shipVelX += (dx * SHIP_SPEED - this.shipVelX) * smoothing;
    this.shipVelY += (dy * SHIP_SPEED - this.shipVelY) * smoothing;
    this.shipX += (this.shipVelX * delta) / 1000;
    this.shipY += (this.shipVelY * delta) / 1000;

    if (this.phase === 'running') this.progress += FORWARD_SPEED * delta;
    else {
      const center = this.tubeCenterAt(0);
      const offset = new Phaser.Math.Vector2(this.shipX - center.x, this.shipY - center.y);
      if (offset.length() > TUBE_RADIUS - 30) {
        offset.setLength(TUBE_RADIUS - 30);
        this.shipX = center.x + offset.x;
        this.shipY = center.y + offset.y;
      }
    }
    this.elapsed += delta;

    this.trail.push({ x: this.shipX, y: this.shipY });
    if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    this.drawTunnel();
    this.progressBarFill.width = Math.max(1, (this.scale.width - 80) * Math.min(1, this.progress / TUNNEL_LENGTH));

    const currentCenter = this.tubeCenterAt(this.progress);
    const deviationX = this.shipX - currentCenter.x;
    const deviationY = this.shipY - currentCenter.y;
    const offCenter = Math.sqrt(deviationX * deviationX + deviationY * deviationY);
    if (this.phase === 'running' && offCenter > TUBE_RADIUS - 10) {
      this.finish(false);
      return;
    }

    if (this.progress >= TUNNEL_LENGTH) {
      this.finish(true);
    }
  }

  /** Dibuja el tubo como bandas concéntricas rellenas (como una diana) que se agrandan al acercarse. */
  private drawTunnel(): void {
    const { width, height } = this.scale;
    const vanishingX = width / 2;
    const vanishingY = height * VANISHING_POINT_Y_RATIO;
    // Todo se dibuja relativo a dónde está REALMENTE el barco (no al centro
    // del tubo): así, si el tubo se curva y no lo seguís, se ve la pared
    // (el anillo de "acá y ahora") desplazarse lejos del centro de la
    // pantalla — la señal de que te estás quedando atrás.
    const baseCenter = new Phaser.Math.Vector2(this.shipX, this.shipY);

    this.tunnelGraphics.clear();
    this.tunnelGraphics.fillStyle(0x101739, 1);
    this.tunnelGraphics.fillRect(0, 0, width, height);

    // Cada banda tiene una profundidad que disminuye con el progreso (por
    // eso "se acercan" de verdad) y da la vuelta al llegar a 0, para que el
    // túnel sea infinito. Sin esta fase las bandas quedaban quietas.
    const ringCount = Math.floor(VIEW_DEPTH / RING_STEP);
    const rings = [];
    for (let i = 0; i < ringCount; i += 1) {
      const cycleDepth = (((i * RING_STEP - this.progress) % VIEW_DEPTH) + VIEW_DEPTH) % VIEW_DEPTH;
      const scale = FOCAL_LENGTH / (FOCAL_LENGTH + cycleDepth);
      const ringCenter = this.tubeCenterAt(this.progress + cycleDepth);
      // La luz de la chispa "ilumina" las bandas cercanas y se pierde en la
      // oscuridad hacia el fondo del túnel — gradiente real de profundidad
      // en vez de dos colores alternados, con un leve parpadeo por banda
      // para que no se vea perfectamente liso.
      const lit = Phaser.Display.Color.Interpolate.ColorWithColor(RING_COLOR_FAR, RING_COLOR_NEAR, 1, scale);
      const flicker = 1 + Math.sin(this.elapsed * 0.002 + i * 1.7) * 0.04;
      rings.push({
        offsetX: (ringCenter.x - baseCenter.x) * scale,
        offsetY: (ringCenter.y - baseCenter.y) * scale,
        radius: TUBE_RADIUS * scale,
        color: Phaser.Display.Color.GetColor(
          Phaser.Math.Clamp(lit.r * flicker, 0, 255),
          Phaser.Math.Clamp(lit.g * flicker, 0, 255),
          Phaser.Math.Clamp(lit.b * flicker, 0, 255),
        ),
      });
    }

    // Dibuja de radio grande a chico, así cada banda más chica se recorta
    // sobre la anterior y quedan como anillos concéntricos limpios. Cada
    // banda lleva además un aro fino más claro pegado a su borde interior,
    // para dar sensación de tubo iluminado en vez de círculos planos.
    rings.sort((a, b) => b.radius - a.radius);
    rings.forEach((ring) => {
      this.tunnelGraphics.fillStyle(ring.color, 1);
      this.tunnelGraphics.fillCircle(vanishingX + ring.offsetX, vanishingY + ring.offsetY, ring.radius);
      this.tunnelGraphics.lineStyle(2, 0x3fb8e0, 0.3);
      this.tunnelGraphics.strokeCircle(vanishingX + ring.offsetX, vanishingY + ring.offsetY, ring.radius);
      this.tunnelGraphics.lineStyle(1,0x57cdeb,.22).strokeCircle(vanishingX+ring.offsetX,vanishingY+ring.offsetY,ring.radius-5);
      for(let i=0;i<6;i++) {
        const angle=i*Math.PI/3;
        this.tunnelGraphics.fillStyle(0xd7e9d8,.4).fillCircle(vanishingX+ring.offsetX+Math.cos(angle)*ring.radius,vanishingY+ring.offsetY+Math.sin(angle)*ring.radius,1.5);
      }
    });

    // Borde brillante de la pared real, AHORA MISMO (profundidad 0). Si el
    // tubo se curva y no lo seguís, este círculo se desplaza lejos del
    // centro — esa es la señal de que te estás quedando atrás de la curva.
    // Cuando te acercás al límite de choque, el borde vira a un tono de
    // alerta y pulsa más rápido, como aviso visual además del gameplay.
    const currentCenter = this.tubeCenterAt(this.progress);
    const wallOffsetX = currentCenter.x - baseCenter.x;
    const wallOffsetY = currentCenter.y - baseCenter.y;
    const deviation = Math.sqrt(wallOffsetX * wallOffsetX + wallOffsetY * wallOffsetY);
    const dangerT = Phaser.Math.Clamp((deviation / TUBE_RADIUS - DANGER_RATIO) / (1 - DANGER_RATIO), 0, 1);
    const wallColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(94, 231, 255),
      new Phaser.Display.Color(255, 90, 90),
      1,
      dangerT,
    );
    const pulse = 0.6 + 0.4 * Math.sin(this.elapsed * (0.004 + dangerT * 0.012));
    this.tunnelGraphics.lineStyle(3 + dangerT * 2, Phaser.Display.Color.GetColor(wallColor.r, wallColor.g, wallColor.b), 0.6 + pulse * 0.3);
    this.tunnelGraphics.strokeCircle(vanishingX + wallOffsetX, vanishingY + wallOffsetY, TUBE_RADIUS);
    if (this.phase === 'running' && dangerT > 0.5 && !this.shakeCooldown && !EffectsSettings.isReduced()) {
      this.cameras.main.shake(120, 0.002 * dangerT);
      this.shakeCooldown = true;
      this.time.delayedCall(200, () => {
        this.shakeCooldown = false;
      });
    }

    // Motas de polvo dispersas dentro del tubo (no solo detrás de la nave),
    // dibujadas como trazos cortos entre dos profundidades consecutivas
    // para simular estela de velocidad ("warp streaks") en vez de puntos
    // estáticos — dan textura al interior del túnel, que si no queda liso.
    this.sparkGraphics.clear();
    this.sparks.forEach((spark) => {
      const cycleDepth = (((spark.depthOffset - this.progress) % VIEW_DEPTH) + VIEW_DEPTH) % VIEW_DEPTH;
      const trailDepth = Math.min(cycleDepth + 40, VIEW_DEPTH);
      const scaleA = FOCAL_LENGTH / (FOCAL_LENGTH + cycleDepth);
      const scaleB = FOCAL_LENGTH / (FOCAL_LENGTH + trailDepth);
      const centerA = this.tubeCenterAt(this.progress + cycleDepth);
      const centerB = this.tubeCenterAt(this.progress + trailDepth);
      const rA = TUBE_RADIUS * spark.radiusFrac * scaleA;
      const rB = TUBE_RADIUS * spark.radiusFrac * scaleB;
      const ax = vanishingX + (centerA.x - baseCenter.x) * scaleA + Math.cos(spark.angle) * rA;
      const ay = vanishingY + (centerA.y - baseCenter.y) * scaleA + Math.sin(spark.angle) * rA;
      const bx = vanishingX + (centerB.x - baseCenter.x) * scaleB + Math.cos(spark.angle) * rB;
      const by = vanishingY + (centerB.y - baseCenter.y) * scaleB + Math.sin(spark.angle) * rB;
      const alpha = Phaser.Math.Clamp(scaleA * 0.9, 0, 0.85);
      this.sparkGraphics.lineStyle(1.5, 0xbfeeff, alpha);
      this.sparkGraphics.lineBetween(ax, ay, bx, by);
    });

    // Rastro de chispas que se van apagando detrás de la nave, dibujado en
    // el mismo espacio relativo al tubo actual para que "quede atrás" si el
    // barco se mueve.
    this.starGraphics.clear();
    this.trail.forEach((point, i) => {
      const t = i / TRAIL_LENGTH;
      const relX = (point.x - this.shipX) * 0.5;
      const relY = (point.y - this.shipY) * 0.5;
      this.starGraphics.fillStyle(0x5ee7ff, t * 0.35);
      this.starGraphics.fillCircle(vanishingX + relX, vanishingY + relY, 4 + t * 4);
    });

    // La chispa siempre se dibuja en el punto de fuga: ella ES el punto de
    // vista de la cámara, lo que se mueve alrededor suyo es el tubo. Un
    // leve pulso en el glow le da vida sin distraer del control.
    this.ship.setPosition(vanishingX, vanishingY);
    this.shipGlow.setPosition(this.ship.x, this.ship.y);
    this.shipGlow.setScale(1 + pulse * 0.5);
  }

  private finish(success: boolean): void {
    this.finished = true;
    this.phase = success ? 'finished' : 'failed';

    if (success) {
      this.audio.playSuccess();
      if (!EffectsSettings.isReduced()) this.cameras.main.flash(200, 94, 231, 255);
    } else {
      this.audio.playError();
      if (!EffectsSettings.isReduced()) this.cameras.main.flash(200, 255, 107, 107);
      this.joystick.reset();
      this.showMenu(true);
      return;
    }

    this.time.delayedCall(250, () => {
      this.scene.stop();
      this.scene.resume('WorldScene', { tunnelSuccess: success, source: this.source, target: this.target });
    });
  }
}
