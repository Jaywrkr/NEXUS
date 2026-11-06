import './style.css';
import { Input } from './core/input';
import { Renderer } from './core/render';
import { Settings, flashScreen, vibrate } from './core/settings';
import { LOOK_PARTS, loadLook, saveLook } from './data/wardrobe';
import { CARDS, CARD_BY_ID, RARITY_NAMES, TOTAL_CARDS, TYPES, TYPE_ORDER } from './data/chispis';
import { drawCard, drawChispi } from './ui/cardArt';
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
  /** Zoom del mapa: cerca del Nexus o toda la ciudad (se cambia tocando el mapa). */
  private mapZoom: 'near' | 'all' = 'near';

  constructor() {
    Settings.apply();
    const canvas = $('game') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas);
    this.renderer.resize();
    this.renderer.fancy = Settings.fx;
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
      card: (id, kicker) => this.showCard(id, kicker),
      pack: (ids) => this.showPack(ids),
      trade: (o) => this.showTrade(o),
      album: () => this.showAlbum(),
      ending: (s) => this.showEnding(s),
      travel: () => this.showTravel(),
      credits: (s) => this.showCredits(s),
      wardrobe: () => this.showWardrobe(),
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
    $('packOk').addEventListener('click', () => this.closePop('packPop'));
    $('endOk').addEventListener('click', () => this.closePop('endPop'));
    $('cardBuddy').addEventListener('click', () => {
      const id = ($('cardBuddy') as HTMLButtonElement).dataset.card;
      if (!id) return;
      this.world.setCompanion(id);
      ($('cardBuddy') as HTMLButtonElement).disabled = true;
      $('cardBuddy').textContent = '⭐ Es tu compañero';
      vibrate([20, 30, 20]);
      // Si el álbum está abierto, se marca la estrella nueva
      if (!$('albumPop').hidden) this.markBuddy();
    });
    $('buddy').addEventListener('click', () => this.showAlbum());
    $('tradeNo').addEventListener('click', () => this.closePop('tradePop'));
    $('albumBack').addEventListener('click', () => this.closePop('albumPop'));
    $('travelNo').addEventListener('click', () => this.closePop('travelPop'));
    $('creditsOk').addEventListener('click', () => this.closePop('creditsPop'));
    $('wardrobeOk').addEventListener('click', () => this.closePop('wardrobePop'));
    $('questOk').addEventListener('click', () => this.closePop('questPop'));
    $('questBtn').addEventListener('click', () => this.showQuests());
    $('mQuests').addEventListener('click', () => {
      $('menu').hidden = true;
      this.showQuests();
    });
    $('mWardrobe').addEventListener('click', () => {
      if (this.world.progress.hasFlag('casa-armario')) {
        $('menu').hidden = true;
        this.showWardrobe();
      } else {
        this.closeMenu();
        this.world.wardrobeLocked();
      }
    });
    $('mSong').addEventListener('click', () => {
      this.closeMenu();
      this.world.playSong();
    });
    $('mapCanvas').addEventListener('click', () => {
      this.mapZoom = this.mapZoom === 'near' ? 'all' : 'near';
      $('mapZoomHint').textContent = this.mapZoom === 'near' ? '🔍 Tocá el mapa para ver toda la ciudad' : '🔍 Tocá el mapa para verlo de cerca';
    });
    $('mapTravel').addEventListener('click', () => {
      $('mapPanel').hidden = true;
      this.mapOpen = false;
      this.showTravel();
    });
    $('mAlbum').addEventListener('click', () => {
      $('menu').hidden = true;
      this.showAlbum();
    });
    $('cardOk').addEventListener('click', () => {
      this.closePop('cardPop');
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
    toggle('optPerf', () => Settings.perf, (v) => (Settings.perf = v));
    toggle('optFx', () => Settings.fx, (v) => {
      Settings.fx = v;
      this.renderer.fancy = v;
    });
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
    $('mapTravel').hidden = !this.world.trainAwake;
    document.body.classList.add('paused');
    this.input.flush();
  }

  private closeMenu(): void {
    this.paused = false;
    this.mapOpen = false;
    $('menu').hidden = true;
    for (const k of ['cardPop', 'packPop', 'tradePop', 'albumPop', 'endPop', 'travelPop', 'creditsPop', 'wardrobePop', 'questPop']) $(k).hidden = true;
    $('mapPanel').hidden = true;
    document.body.classList.remove('paused');
    this.input.flush();
  }

  /** Clic suave en todos los botones de la interfaz. */
  private readonly uiAudio = new AudioSystem();

  private setupUiSounds(): void {
    const audio = this.uiAudio;
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

  /** Pausa el mundo mientras hay una ventana abierta (carta, sobre, cambio, álbum). */
  private pauseFor(id: string): void {
    this.paused = true;
    document.body.classList.add('paused');
    $(id).hidden = false;
    this.input.flush();
  }

  private closePop(id: string): void {
    $(id).hidden = true;
    if (['cardPop', 'packPop', 'tradePop', 'albumPop', 'endPop', 'travelPop', 'creditsPop', 'wardrobePop', 'questPop'].some((k) => !$(k).hidden)) return;
    this.closeMenu();
  }

  /** Carta grande de un Chispi: pausa el mundo hasta tocar «¡Genial!». */
  private showCard(id: string, kicker = '¡Nueva carta!'): void {
    const c = CARD_BY_ID.get(id);
    if (!c) return;
    const t = TYPES[c.type];
    $('cardKicker').textContent = kicker;
    $('cardName').textContent = c.name;
    $('cardType').textContent = `${t.icon} Chispi de ${t.name} · ${RARITY_NAMES[c.rarity]}`;
    $('cardText').textContent = c.phrase;
    $('cardHelper').textContent = `Ayudita de compañero: ${t.helper.toLowerCase()}`;
    const buddyBtn = $('cardBuddy') as HTMLButtonElement;
    buddyBtn.dataset.card = id;
    const isBuddy = this.world.companionId === id;
    buddyBtn.disabled = isBuddy;
    buddyBtn.textContent = isBuddy ? '⭐ Es tu compañero' : '⭐ Elegir de compañero';
    $('cardBox').className = `chispi-card rare-${c.rarity}`;
    const art = $('cardArt') as HTMLCanvasElement;
    const g = art.getContext('2d');
    if (g) {
      g.clearRect(0, 0, art.width, art.height);
      drawChispi(g, c, art.width / 2, art.height * 0.56, 54);
    }
    this.pauseFor('cardPop');
  }

  /** Abrir un sobre: tres cartas boca abajo que se dan vuelta al tocarlas (la más rara, última). */
  private showPack(ids: string[]): void {
    const row = $('packRow');
    row.innerHTML = '';
    $('packOk').hidden = true;
    $('packTip').textContent = 'Tocá cada carta para darla vuelta';
    let opened = 0;
    const seen = new Set<string>();
    ids.forEach((id, i) => {
      const c = CARD_BY_ID.get(id)!;
      // ¿Es nueva? (la colección ya la cuenta: es nueva si hay exactamente las copias de este sobre)
      const copiesHere = ids.filter((k) => k === id).length;
      const isNew = this.world.progress.cardCount(id) === copiesHere && !seen.has(id);
      seen.add(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `flip-card rare-${c.rarity}`;
      btn.dataset.card = id;
      btn.innerHTML = `<div class="flip-inner"><div class="flip-back">✦</div><div class="flip-front"><canvas width="200" height="280"></canvas></div></div>`;
      drawCard(btn.querySelector('canvas')!, id);
      if (isNew) {
        const tag = document.createElement('span');
        tag.className = 'flip-new';
        tag.textContent = '¡NUEVA!';
        tag.hidden = true;
        btn.appendChild(tag);
      }
      btn.addEventListener('click', () => {
        if (btn.classList.contains('open')) {
          this.showCard(id, c.rarity === 'dorada' ? '¡Carta dorada!' : 'Carta del sobre');
          return;
        }
        // Se dan vuelta en orden: la más rara (la última) se guarda para el final
        if (i !== opened) return;
        btn.classList.add('open');
        const tag = btn.querySelector('.flip-new') as HTMLElement | null;
        if (tag) window.setTimeout(() => (tag.hidden = false), 450);
        opened += 1;
        this.uiAudio.tone(c.rarity === 'dorada' ? 1320 : c.rarity === 'brillante' ? 990 : 660, 0.2, 0.15, 'triangle', 0.07);
        if (c.rarity === 'dorada') {
          flashScreen(300);
          vibrate([30, 40, 60]);
        }
        if (opened === ids.length) {
          $('packOk').hidden = false;
          $('packTip').textContent = '¡Ya están en tu álbum!';
        }
      });
      row.appendChild(btn);
    });
    this.pauseFor('packPop');
  }

  /** Cambio con un vecino: elegís una repetida y recibís su Chispi. */
  private showTrade(o: { who: string; name: string; text: string; card: string; duplicates: string[] }): void {
    $('tradeWho').textContent = `${o.name} te propone un cambio`;
    $('tradeText').textContent = o.text;
    drawCard($('tradeCard') as HTMLCanvasElement, o.card);
    const box = $('tradeDups');
    box.innerHTML = '';
    for (const id of o.duplicates) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ui-btn';
      b.dataset.card = id;
      b.title = CARD_BY_ID.get(id)?.name ?? id;
      b.innerHTML = '<canvas width="120" height="168"></canvas>';
      drawCard(b.querySelector('canvas')!, id);
      b.addEventListener('click', () => {
        const got = this.world.trade(o.who, id);
        $('tradePop').hidden = true;
        if (got) this.showCard(got, `¡${o.name} te cambió su carta!`);
        else this.closePop('tradePop');
      });
      box.appendChild(b);
    }
    this.pauseFor('tradePop');
  }

  private markBuddy(): void {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('#albumGrid .mini-card'))) {
      el.classList.toggle('is-buddy', el.dataset.card === this.world.companionId);
    }
  }

  /** Libreta de encargos: por distrito, con su Pieza y el avance de cada encargo. */
  private showQuests(): void {
    if (this.mode !== 'world') return;
    const w = this.world;
    const book = w.questBook();
    const total = book.reduce((n, d) => n + d.quests.length, 0);
    const done = book.reduce((n, d) => n + d.quests.filter((q) => q.done).length, 0);
    const broken = w.progress.hasFlag('chispa-rota');
    $('questSub').textContent = broken
      ? `◆ Piezas de la Gran Chispa: ${w.pieces}/12 · Encargos: ${done}/${total}. Terminá todos los encargos de un lugar y su Pieza vuelve.`
      : `Encargos: ${done}/${total}. Los vecinos te piden ayuda: cada encargo da chispitas o un sobre.`;
    const list = $('questList');
    list.innerHTML = '';
    for (const d of book) {
      const sec = document.createElement('section');
      sec.className = 'quest-district';
      const n = d.quests.filter((q) => q.done).length;
      sec.innerHTML = `<h3><span>${d.name}</span><small>${n}/${d.quests.length}${broken && d.hasPiece ? (d.piece ? ' · ◆' : ' · ◇') : ''}</small></h3>`;
      for (const q of d.quests) {
        const row = document.createElement('div');
        row.className = `quest-row${q.done ? ' done' : ''}`;
        row.dataset.quest = q.id;
        const prog = !q.done && q.progress ? ` <em>${q.progress[0]}/${q.progress[1]}</em>` : '';
        row.innerHTML = `<b>${q.done ? '✓' : '○'}</b><div><strong>${q.title}${prog}</strong><small>${q.text}</small></div>`;
        if (q.done && !q.claimed) {
          const claim = document.createElement('button');
          claim.type = 'button';
          claim.className = 'ui-btn quest-claim';
          claim.textContent = `🎁 ${q.reward}`;
          claim.title = 'Cobrar el premio';
          claim.addEventListener('click', () => {
            const got = w.claimReward(q.id);
            claim.remove();
            if (got === 'sobre') this.closePop('questPop');
          });
          row.appendChild(claim);
        }
        if (!q.done) {
          const go = document.createElement('button');
          go.type = 'button';
          go.className = 'ui-btn quest-go';
          go.textContent = '📍';
          go.title = 'Mostrame dónde';
          go.addEventListener('click', () => {
            this.closePop('questPop');
            w.pointQuest(q.id);
          });
          row.appendChild(go);
        }
        sec.appendChild(row);
      }
      list.appendChild(sec);
    }
    this.pauseFor('questPop');
  }

  /** Armario: cada parte con sus opciones; lo bloqueado dice cómo se gana. */
  private showWardrobe(): void {
    const look = loadLook();
    const box = $('wardrobeParts');
    box.innerHTML = '';
    for (const part of LOOK_PARTS) {
      const sec = document.createElement('section');
      sec.className = 'wardrobe-part';
      sec.innerHTML = `<h3>${part.title}</h3>`;
      const row = document.createElement('div');
      row.className = 'wardrobe-row';
      for (const o of part.options) {
        const locked = !!o.need && !this.world.progress.hasFlag(o.need);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `ui-btn look-chip${look[part.key] === o.id ? ' on' : ''}${locked ? ' locked' : ''}`;
        b.dataset.part = part.key;
        b.dataset.look = o.id;
        const sw = o.color ? `<i style="background:${o.color2 && o.color2 !== o.color ? `linear-gradient(90deg, ${o.color} 50%, ${o.color2} 50%)` : o.color}"></i>` : '';
        b.innerHTML = `${sw}<span>${locked ? '🔒 ' : ''}${o.label}</span>`;
        b.addEventListener('click', () => {
          if (locked) {
            b.querySelector('span')!.textContent = `🔒 ${o.hint ?? 'Todavía no'}`;
            return;
          }
          look[part.key] = o.id;
          saveLook(look);
          this.world.nexus.applyLook(look);
          for (const other of Array.from(row.querySelectorAll('.look-chip'))) other.classList.toggle('on', other === b);
        });
        row.appendChild(b);
      }
      sec.appendChild(row);
      box.appendChild(sec);
    }
    this.pauseFor('wardrobePop');
  }

  /** Final del juego: vuelve la Gran Chispa (créditos). */
  private showCredits(s: { places: number; placesTotal: number; awake: number; awakeTotal: number; cards: number; cardsTotal: number; chispis: number }): void {
    const items: [string, string][] = [
      ['★ Lugares con vida', `${s.places}/${s.placesTotal}`],
      ['✦ Cosas despiertas', `${s.awake}/${s.awakeTotal}`],
      ['🃏 Cartas', `${s.cards}/${s.cardsTotal}`],
      ['⚡ Chispis rescatados', `${s.chispis}`],
    ];
    $('creditsStats').innerHTML = items.map(([k, v]) => `<li><b>${v}</b>${k}</li>`).join('');
    this.pauseFor('creditsPop');
  }

  /** Cartel del tren: una parada por distrito abierto. */
  private showTravel(): void {
    const list = $('travelList');
    list.innerHTML = '';
    for (const st of this.world.trainStops) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `ui-btn travel-stop${st.here ? ' here' : ''}`;
      b.dataset.stop = st.id;
      b.disabled = st.here;
      b.innerHTML = `<b>${st.name}</b><small>${st.here ? 'estás acá' : st.visited ? 'ya fuiste' : '¡nueva!'}</small>`;
      b.addEventListener('click', () => {
        this.closePop('travelPop');
        this.world.travelTo(st.id);
      });
      list.appendChild(b);
    }
    this.pauseFor('travelPop');
  }

  /** Final del capítulo 1: resultados de la partida. */
  private showEnding(s: { places: number; placesTotal: number; awake: number; awakeTotal: number; cards: number; cardsTotal: number; chispis: number }): void {
    const items: [string, string][] = [
      ['★ Lugares con vida', `${s.places}/${s.placesTotal}`],
      ['✦ Cosas despiertas', `${s.awake}/${s.awakeTotal}`],
      ['🃏 Cartas', `${s.cards}/${s.cardsTotal}`],
      ['⚡ Chispis rescatados', `${s.chispis}`],
    ];
    $('endStats').innerHTML = items.map(([k, v]) => `<li><b>${v}</b>${k}</li>`).join('');
    this.pauseFor('endPop');
  }

  /** Álbum: las 40 cartas por tipo; las que faltan se ven como sombra. */
  private showAlbum(): void {
    const p = this.world.progress;
    const grid = $('albumGrid');
    grid.innerHTML = '';
    $('albumCount').textContent = `${p.uniqueCards} / ${TOTAL_CARDS} cartas`;
    for (const type of TYPE_ORDER) {
      const t = TYPES[type];
      const list = CARDS.filter((c) => c.type === type);
      const h = document.createElement('p');
      h.className = 'album-type';
      h.textContent = `${t.icon} ${t.name} · ${list.filter((c) => p.hasCard(c.id)).length}/${list.length}`;
      grid.appendChild(h);
      for (const c of list) {
        const owned = p.hasCard(c.id);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `mini-card ${owned ? `rare-${c.rarity}` : 'missing'}${this.world.companionId === c.id ? ' is-buddy' : ''}`;
        b.dataset.card = c.id;
        b.innerHTML = '<canvas width="120" height="168"></canvas>';
        drawCard(b.querySelector('canvas')!, c.id, owned);
        const n = p.cardCount(c.id);
        if (n > 1) {
          const tag = document.createElement('span');
          tag.className = 'count';
          tag.textContent = `×${n}`;
          b.appendChild(tag);
        }
        b.addEventListener('click', () => {
          if (!owned) return;
          this.showCard(c.id, 'Tu carta');
        });
        grid.appendChild(b);
      }
    }
    this.pauseFor('albumPop');
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

  /** Medidor de rendimiento (Opciones → Mostrar rendimiento). */
  private perfFrames = 0;
  private perfTime = 0;

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const raw = (now - this.last) / 1000;
    const info = this.renderer.gl.info;
    info.autoReset = false;
    if (raw < 0.5) {
      this.perfFrames += 1;
      this.perfTime += raw;
      if (this.perfTime >= 0.5) {
        if (document.body.classList.contains('show-perf')) {
          const pill = document.getElementById('perfPill');
          if (pill) pill.textContent = `${Math.round(this.perfFrames / this.perfTime)} fps · ${info.render.calls} dib. · ${this.renderer.dprLabel}`;
        }
        this.perfFrames = 0;
        this.perfTime = 0;
      }
    }
    info.reset();
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
        if (this.mapOpen) drawMap($('mapCanvas') as HTMLCanvasElement, this.world.mapData(), time, this.mapZoom);
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
