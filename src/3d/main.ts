import './style.css';
import { Input } from './core/input';
import { Renderer } from './core/render';
import { Settings, vibrate } from './core/settings';
import { updateTweens } from './core/tween';
import type { Connectable } from './objects/Connectable';
import { MuseumMode } from './scenes/MuseumMode';
import { TunnelMode } from './scenes/TunnelMode';
import { WorldMode } from './scenes/WorldMode';
import { drawMap } from './ui/MapView';
import { AudioSystem } from '../systems/AudioSystem';

type Mode = 'title' | 'world' | 'tunnel' | 'museum';
type Sheet = 'menuMain' | 'menuOptions' | 'menuHelp';

const $ = (id: string) => document.getElementById(id)!;

/**
 * Los Nexus 3D: entrada. Maneja los cuatro modos (título, mundo, túnel, museo),
 * el menú de pausa (mapa, opciones, ayuda), las transiciones con fundido y el loop principal.
 */
class Game {
  private readonly renderer: Renderer;
  private readonly input = new Input();
  private world: WorldMode;
  private readonly tunnel: TunnelMode;
  private readonly museum = new MuseumMode();
  private mode: Mode = 'title';
  private last = performance.now();
  private readonly fade = $('fade');
  /** Menú o mapa abiertos: el mundo queda quieto. */
  private paused = false;
  private mapOpen = false;

  constructor() {
    Settings.apply();
    const canvas = $('game') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas);
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    if (this.input.touch) document.body.classList.add('touch');
    this.world = this.makeWorld();
    this.world.setView(!Settings.chase);
    this.tunnel = new TunnelMode(this.input);
    this.setupTitle();
    this.setupMenu();
    this.setupUiSounds();
    $('museumBack').addEventListener('click', () => this.leaveMuseum());
    window.addEventListener('keydown', (e) => this.onKey(e));

    this.setMode('title');
    requestAnimationFrame((t) => this.frame(t));

    // Hooks de depuración para pruebas automatizadas (Playwright): `__nexus3d.step(seg)` avanza la
    // lógica a 60 Hz sin depender de los fps (en un navegador sin GPU el juego corre a ~2 fps).
    Object.assign(window, { __nexus3d: this });
  }

  private makeWorld(): WorldMode {
    return new WorldMode(this.input, {
      tunnel: (s, t) => this.openTunnel(s, t),
      museum: () => this.transition(() => this.enterMuseum()),
      card: (id) => this.showCard(id),
    });
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    document.body.classList.remove('mode-title', 'mode-world', 'mode-tunnel', 'mode-museum');
    document.body.classList.add(`mode-${mode}`);
    this.input.flush();
  }

  /** Fundido a negro, cambio, fundido de vuelta. */
  private transition(change: () => void): void {
    this.fade.classList.add('on');
    window.setTimeout(() => {
      change();
      this.fade.classList.remove('on');
    }, 280);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.mode === 'museum' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
      this.leaveMuseum();
      return;
    }
    if (this.mode === 'title' && (e.code === 'Enter' || e.code === 'Space') && !this.paused) {
      e.preventDefault();
      this.startGame();
      return;
    }
    if (this.mode !== 'world') return;
    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.paused) this.closeMenu();
      else this.openMenu('menuMain');
    } else if (e.code === 'KeyM') {
      if (this.mapOpen) this.closeMenu();
      else this.openMap();
    }
  }

  /* ---------- Título ---------- */

  private setupTitle(): void {
    const has = this.world.progress.hasProgress();
    $('play').hidden = has;
    $('continue').hidden = !has;
    $('newGame').hidden = !has;
    $('play').addEventListener('click', () => this.startGame());
    $('continue').addEventListener('click', () => this.startGame());
    $('newGame').addEventListener('click', () => this.resetGame(false));
  }

  private startGame(): void {
    if (this.mode !== 'title') return;
    this.transition(() => this.setMode('world'));
  }

  /** Borra la partida (las opciones se conservan) y reconstruye el barrio apagado. */
  private resetGame(ask: boolean): void {
    if (ask && !window.confirm('¿Borrar toda la partida? El barrio vuelve a estar gris y la mochila vacía.')) return;
    this.world.progress.resetProgress();
    window.location.reload();
  }

  /* ---------- Menú de pausa ---------- */

  private setupMenu(): void {
    $('menuBtn').addEventListener('click', () => this.openMenu('menuMain'));
    $('mResume').addEventListener('click', () => this.closeMenu());
    $('mMap').addEventListener('click', () => this.openMap());
    $('mMuseum').addEventListener('click', () => {
      this.closeMenu();
      this.transition(() => this.enterMuseum());
    });
    $('mDance').addEventListener('click', () => {
      this.closeMenu();
      this.world.dance();
    });
    $('mWave').addEventListener('click', () => {
      this.closeMenu();
      this.world.waveHello();
    });
    $('mHelp').addEventListener('click', () => this.showSheet('menuHelp'));
    $('helpBack').addEventListener('click', () => this.showSheet('menuMain'));
    $('mOptions').addEventListener('click', () => this.showSheet('menuOptions'));
    $('optBack').addEventListener('click', () => this.showSheet('menuMain'));
    $('mTitle').addEventListener('click', () => {
      this.closeMenu();
      this.world.exitVoltio();
      this.transition(() => {
        this.setMode('title');
        const has = this.world.progress.hasProgress();
        $('play').hidden = has;
        $('continue').hidden = !has;
        $('newGame').hidden = !has;
      });
    });
    $('mapBack').addEventListener('click', () => this.closeMenu());
    $('cardOk').addEventListener('click', () => {
      $('cardPop').hidden = true;
      this.closeMenu();
    });
    // Tocar fuera de la hoja cierra
    for (const id of ['menu', 'mapPanel']) {
      $(id).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) this.closeMenu();
      });
    }

    // Opciones
    const toggle = (id: string, get: () => boolean, set: (v: boolean) => void) => {
      const box = $(id) as HTMLInputElement;
      box.checked = get();
      box.addEventListener('change', () => {
        set(box.checked);
        vibrate(15);
      });
    };
    toggle('optSound', () => Settings.sound, (v) => (Settings.sound = v));
    toggle('optVibe', () => Settings.vibration, (v) => (Settings.vibration = v));
    toggle('optCalm', () => Settings.calm, (v) => (Settings.calm = v));
    toggle('optChase', () => Settings.chase, (v) => this.world.setView(!v));
    toggle('optBig', () => Settings.bigButtons, (v) => (Settings.bigButtons = v));
    $('optReset').addEventListener('click', () => this.resetGame(true));
  }

  private showSheet(sheet: Sheet): void {
    for (const id of ['menuMain', 'menuOptions', 'menuHelp'] as Sheet[]) $(id).hidden = id !== sheet;
    if (sheet === 'menuOptions') {
      // la cámara puede haber cambiado con V
      ($('optChase') as HTMLInputElement).checked = !this.world.isIso;
    }
  }

  private openMenu(sheet: Sheet): void {
    if (this.mode !== 'world') return;
    this.paused = true;
    this.mapOpen = false;
    $('mapPanel').hidden = true;
    $('menu').hidden = false;
    this.showSheet(sheet);
    document.body.classList.add('paused');
    this.input.flush();
  }

  private openMap(): void {
    if (this.mode !== 'world') return;
    this.paused = true;
    this.mapOpen = true;
    $('menu').hidden = true;
    $('mapPanel').hidden = false;
    document.body.classList.add('paused');
    this.input.flush();
  }

  private closeMenu(): void {
    this.paused = false;
    this.mapOpen = false;
    $('menu').hidden = true;
    $('cardPop').hidden = true;
    $('mapPanel').hidden = true;
    document.body.classList.remove('paused');
    this.input.flush();
  }

  /** Clic suave en todos los botones de la interfaz. */
  private setupUiSounds(): void {
    const audio = new AudioSystem();
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest?.('.ui-btn, .objective, .opt');
      if (!btn) return;
      audio.tone(660, 0, 0.05, 'triangle', 0.04);
      audio.tone(990, 0.04, 0.05, 'triangle', 0.03);
      vibrate(8);
    });
  }

  /* ---------- Túnel y museo ---------- */

  private openTunnel(source: Connectable, target: Connectable): void {
    this.transition(() => {
      this.setMode('tunnel');
      this.tunnel.start(this.world.tunnelPlanFor(target), (success, sparks) => {
        this.transition(() => {
          this.setMode('world');
          this.world.finishTunnel(source, target, success, sparks);
        });
      });
    });
  }

  /** Carta del Chispi rescatado: pausa el mundo hasta tocar «¡Genial!». */
  private showCard(id: string): void {
    const cards: Record<string, { name: string; type: string; text: string }> = {
      rueditas: {
        name: 'Rueditas',
        type: 'Chispi de Ruedas · ★',
        text: 'Le encanta la velocidad y hacer chispas al frenar. Lo encontraste en el Skatepark, atrapado por la Estática.',
      },
    };
    const c = cards[id] ?? { name: id, type: 'Chispi', text: '' };
    $('cardName').textContent = c.name;
    $('cardType').textContent = c.type;
    $('cardText').textContent = c.text;
    drawChispiCard($('cardArt') as HTMLCanvasElement);
    this.paused = true;
    document.body.classList.add('paused');
    $('cardPop').hidden = false;
    this.input.flush();
  }

  private enterMuseum(): void {
    this.world.exitVoltio();
    this.setMode('museum');
    this.museum.enter(this.world.progress);
  }

  private leaveMuseum(): void {
    if (this.mode !== 'museum') return;
    this.transition(() => {
      this.museum.exit();
      this.setMode('world');
      this.world.resume();
    });
  }

  /** Avanza la simulación `seconds` segundos en pasos fijos, sin dibujar (solo para pruebas). */
  step(seconds: number): void {
    const h = 1 / 60;
    for (let i = 0; i < Math.round(seconds * 60); i += 1) {
      updateTweens(h);
      if (this.mode === 'world' && !this.paused) this.world.update(h);
      else if (this.mode === 'tunnel') this.tunnel.update(h);
    }
  }

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const raw = (now - this.last) / 1000;
    const dt = Math.min(raw, 0.05);
    if (raw < 0.5) this.renderer.adapt(raw);
    this.last = now;
    const time = now / 1000;
    updateTweens(dt);

    switch (this.mode) {
      case 'title':
      case 'world':
        // En el título (y con el menú abierto) el barrio se ve de fondo, pero el Nexus no se mueve
        if (this.mode === 'world' && !this.paused) this.world.update(dt);
        else this.world.idle(dt);
        this.world.render(this.renderer, time);
        if (this.mapOpen) drawMap($('mapCanvas') as HTMLCanvasElement, this.world.mapData(), time);
        break;
      case 'tunnel':
        this.tunnel.update(dt);
        this.tunnel.render(this.renderer, time);
        break;
      case 'museum':
        this.museum.render(this.renderer, time);
        break;
    }
  }
}

/** Dibujo de Rueditas para la carta (bolita de luz con ruedas, criatura original). */
function drawChispiCard(canvas: HTMLCanvasElement): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const W = canvas.width;
  const H = canvas.height;
  g.clearRect(0, 0, W, H);
  for (let i = 0; i < 18; i += 1) {
    g.fillStyle = i % 2 ? '#ffe066' : '#7dffef';
    g.globalAlpha = 0.5;
    g.fillRect((i * 53) % W, (i * 37) % H, 4, 4);
  }
  g.globalAlpha = 1;
  const glowG = g.createRadialGradient(W / 2, 92, 10, W / 2, 92, 80);
  glowG.addColorStop(0, 'rgba(155,231,255,0.9)');
  glowG.addColorStop(1, 'rgba(155,231,255,0)');
  g.fillStyle = glowG;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#9be7ff';
  g.strokeStyle = '#1d1630';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(W / 2, 92, 50, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#1d1630';
  g.beginPath();
  g.ellipse(W / 2 - 17, 86, 7, 11, 0, 0, Math.PI * 2);
  g.ellipse(W / 2 + 17, 86, 7, 11, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.beginPath();
  g.arc(W / 2, 104, 12, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  for (const dx of [-32, 32]) {
    g.fillStyle = '#ff9f43';
    g.beginPath();
    g.arc(W / 2 + dx, 154, 17, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#1d1630';
    g.beginPath();
    g.arc(W / 2 + dx, 154, 5, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#ffe066';
  g.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 6 : 14;
    g.lineTo(W / 2 + Math.cos(a) * r, 30 + Math.sin(a) * r);
  }
  g.fill();
}

new Game();
