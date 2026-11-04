import './style.css';
import { Input } from './core/input';
import { Renderer } from './core/render';
import { updateTweens } from './core/tween';
import type { Connectable } from './objects/Connectable';
import { MuseumMode } from './scenes/MuseumMode';
import { TunnelMode } from './scenes/TunnelMode';
import { WorldMode } from './scenes/WorldMode';
import { AudioSystem } from '../systems/AudioSystem';

type Mode = 'title' | 'world' | 'tunnel' | 'museum';

/**
 * Los Nexus 3D: entrada. Maneja los cuatro modos (título, mundo, túnel, museo),
 * las transiciones con fundido y el loop principal.
 */
class Game {
  private readonly renderer: Renderer;
  private readonly input = new Input();
  private world: WorldMode;
  private readonly tunnel: TunnelMode;
  private readonly museum = new MuseumMode();
  private mode: Mode = 'title';
  private last = performance.now();
  private readonly fade = document.getElementById('fade')!;

  constructor() {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas);
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());

    if (this.input.touch) document.body.classList.add('touch');
    this.world = this.makeWorld();
    this.tunnel = new TunnelMode(this.input);
    this.setupTitle();
    this.setupMute();
    document.getElementById('museumBack')?.addEventListener('click', () => this.leaveMuseum());
    window.addEventListener('keydown', (e) => {
      if (this.mode === 'museum' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) this.leaveMuseum();
    });

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

  private setupTitle(): void {
    const has = this.world.progress.hasProgress();
    const play = document.getElementById('play')!;
    const cont = document.getElementById('continue')!;
    const fresh = document.getElementById('newGame')!;
    play.hidden = has;
    cont.hidden = !has;
    fresh.hidden = !has;
    const start = () => this.transition(() => this.setMode('world'));
    play.addEventListener('click', start);
    cont.addEventListener('click', start);
    fresh.addEventListener('click', () => {
      this.world.progress.resetProgress();
      // El mundo se reconstruye desde cero para que todo vuelva a estar "apagado"
      window.location.reload();
    });
    window.addEventListener('keydown', (e) => {
      if (this.mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        start();
      }
    });
  }

  private setupMute(): void {
    const btn = document.getElementById('muteBtn')!;
    const label = () => (btn.textContent = AudioSystem.isMuted() ? '🔇' : '🔊');
    label();
    btn.addEventListener('click', () => {
      AudioSystem.setMuted(!AudioSystem.isMuted());
      label();
    });
  }

  private openTunnel(source: Connectable, target: Connectable): void {
    this.transition(() => {
      this.setMode('tunnel');
      this.tunnel.start((success) => {
        this.transition(() => {
          this.setMode('world');
          this.world.finishTunnel(source, target, success);
        });
      });
    });
  }

  private enterMuseum(): void {
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
      if (this.mode === 'world') this.world.update(h);
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
        // En el título el barrio se ve de fondo, pero el Nexus no se mueve
        if (this.mode === 'world') this.world.update(dt);
        else this.world.idle(dt);
        this.world.render(this.renderer, time);
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

new Game();
