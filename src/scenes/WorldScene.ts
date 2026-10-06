import Phaser from 'phaser';
import { sideResidentLine } from '../data/sideStories';
import { drawNeighborhood, drawSky } from '../art/neighborhood';
import { Nexus } from '../entities/Nexus';
import { EnergySource } from '../objects/EnergySource';
import { Lamp } from '../objects/Lamp';
import { Door } from '../objects/Door';
import { Fountain } from '../objects/Fountain';
import { Beacon } from '../objects/Beacon';
import { Bridge } from '../objects/Bridge';
import { Sprinkler } from '../objects/Sprinkler';
import { FlowerBed } from '../objects/FlowerBed';
import { COLLECTION } from '../data/collection';
import { RESIDENTS, chapterObjective, chapterTask, residentLine, type ResidentInfo, type CONNECTION_SURPRISES } from '../data/chapter';
import { Resident } from '../objects/Resident';
import { StoryCard } from '../ui/StoryCard';
import { WorkshopZone } from '../zones/WorkshopZone';
import { ReturnCircuits } from '../zones/ReturnCircuits';
import { RadioStation } from '../zones/RadioStation';
import { RADIO_SOURCE_ID } from '../data/radio';
import { LanternZone } from '../zones/LanternZone';
import { Fragment } from '../objects/Fragment';
import { ConnectionSystem } from '../systems/ConnectionSystem';
import { ProgressSystem } from '../systems/ProgressSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { EffectsSettings } from '../systems/EffectsSettings';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractButton } from '../ui/InteractButton';
import type { ConnectableObject } from '../objects/ConnectableObject';
import { fadeToScene } from '../utils/sceneTransition';
import { ensureRoundedRectTexture } from '../utils/uiTextures';

const HUD_PILL_TEXTURE = 'hud-pill-bg';

const INTERACT_RADIUS = 90;

const PLAZA_FRAGMENT_ID = 'plaza-fragment';
const FOUNTAIN_FRAGMENT_ID = 'fountain-fragment';
const BEACON_FRAGMENT_ID = 'beacon-fragment';
const BRIDGE_FRAGMENT_ID = 'bridge-fragment';
const GARDEN_FRAGMENT_ID = 'garden-fragment';
const ALL_FRAGMENT_IDS = COLLECTION.map(item => item.id);
const WORLD_WIDTH = 6100;
const GAP_X = 2610;
const GAP_WIDTH = 100;

export class WorldScene extends Phaser.Scene {
  private nexus!: Nexus;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private connectionSystem!: ConnectionSystem;
  private progress!: ProgressSystem;
  private door!: Door;
  private plazaFragment!: Fragment;
  private fountain!: Fountain;
  private fountainFragment!: Fragment;
  private beacon!: Beacon;
  private beaconFragment!: Fragment;
  private bridge!: Bridge;
  private bridgeFragment!: Fragment;
  private sprinkler!: Sprinkler;
  private flowerBed!: FlowerBed;
  private gardenFragment!: Fragment;
  private gardenGround!: Phaser.GameObjects.Image;
  private bridgeDeck!: Phaser.GameObjects.Image;
  private bridgeBlocker!: Phaser.GameObjects.Zone;
  private bridgeCollider!: Phaser.Physics.Arcade.Collider;
  private instructionText!: Phaser.GameObjects.Text;
  private fragmentHud!: Phaser.GameObjects.Text;
  private muteButton!: Phaser.GameObjects.Text;
  private houseWindow!: Phaser.GameObjects.Rectangle;
  private treeCrown!: Phaser.GameObjects.Arc;
  private plazaGround!: Phaser.GameObjects.Image;
  private lamp!: Lamp;
  private joystick!: VirtualJoystick;
  private audio!: AudioSystem;
  private interactButton!: InteractButton;
  private connectables: ConnectableObject[] = [];
  private residents: Resident[] = [];
  private storyCard!: StoryCard;
  private plazaFlowers!: Phaser.GameObjects.Graphics;
  private radioBanner!: Phaser.GameObjects.Text;
  private workshop!: WorkshopZone;
  private lanterns!: LanternZone;
  private radio!: RadioStation;
  private returnCircuits!: ReturnCircuits;
  private hintTask = '';
  private hintLevel = 0;
  private leavingChapter = false;
  private leavingWorld = false;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.hintTask = '';
    this.hintLevel = 0;
    this.leavingChapter = false;
    this.leavingWorld = false;
    const { height } = this.scale;
    const width = WORLD_WIDTH;
    // En pantallas verticales (más altas), separamos más los objetos en
    // el eje Y para aprovechar el espacio en vez de dejarlos apretados
    // en una franja angosta en el medio.
    const vScale = height / 540;

    this.progress = new ProgressSystem();
    this.audio = new AudioSystem();

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    this.buildParallaxBackground(width, height, vScale);
    this.buildStaticZone(width, height, vScale);
    this.buildAmbientLife(width, height, vScale);
    drawNeighborhood(this, height);

    this.nexus = new Nexus(this, 480, height / 2 + 100 * vScale);
    this.nexus.setDepth(10);
    this.cameras.main.startFollow(this.nexus, true, 0.12, 0.12);

    this.setupConnections(height, vScale);

    this.cameras.main.setBackgroundColor('#cfe8d8');
    this.cameras.main.fadeIn(300, 207, 232, 216);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.joystick = new VirtualJoystick(this, 90, height - 90);

    this.interactButton = new InteractButton(this, this.scale.width / 2, this.scale.height - 40);
    this.interactButton.onPress(() => {
      const target = this.findNearestConnectable();
      if (target) this.connectionSystem.interact(target);
    });

    ensureRoundedRectTexture(this, HUD_PILL_TEXTURE, 100, 36, 18);

    this.add.graphics().setDepth(19).setScrollFactor(0)
      .fillStyle(0x34494e, 0.94).fillRoundedRect(110, 14, this.scale.width - 220, 58, 16)
      .lineStyle(1, 0xcab98d, 0.6).strokeRoundedRect(114, 18, this.scale.width - 228, 50, 12);

    this.instructionText = this.add
      .text(this.scale.width / 2, 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffefd1',
        wordWrap: { width: this.scale.width - 220, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0)
      .setDepth(20)
      .setScrollFactor(0)
      .setShadow(0, 1, 'rgba(0,0,0,0.3)', 2, false, true);

    this.add
      .image(this.scale.width - 16 - 42, 16 + 18, HUD_PILL_TEXTURE)
      .setDisplaySize(84, 36)
      .setTint(0xffffff)
      .setAlpha(0.55)
      .setDepth(19)
      .setScrollFactor(0);

    this.fragmentHud = this.add
      .text(this.scale.width - 16, 16 + 18, this.fragmentHudLabel(), {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#8a6d1f',
      })
      .setOrigin(1, 0.5)
      .setDepth(20)
      .setScrollFactor(0);

    const mutePill = this.add
      .image(16 + 42, 16 + 18, HUD_PILL_TEXTURE)
      .setDisplaySize(84, 36)
      .setTint(0xffffff)
      .setAlpha(0.55)
      .setDepth(19)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.muteButton = this.add
      .text(16 + 42, 16 + 18, this.muteButtonLabel(), {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0);

    mutePill.on('pointerover', () => mutePill.setAlpha(0.8));
    mutePill.on('pointerout', () => mutePill.setAlpha(0.55));
    mutePill.on('pointerdown', () => {
      AudioSystem.setMuted(!AudioSystem.isMuted());
      this.muteButton.setText(this.muteButtonLabel());
    });

    const wardrobe = this.add.image(65, height - 185, HUD_PILL_TEXTURE).setDisplaySize(106, 36)
      .setTint(0xffefd1).setDepth(50).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.add.text(65, height - 185, 'Mi Nexus', { fontFamily: 'sans-serif', fontSize: '14px', color: '#34494e' })
      .setOrigin(0.5).setDepth(51).setScrollFactor(0);
    wardrobe.on('pointerdown', () => { if (this.leavingWorld) return; this.leavingWorld = true; this.scene.start('CustomizeScene', { returnScene: 'WorldScene' }); });

    const journal = this.add.image(65, height - 230, HUD_PILL_TEXTURE).setDisplaySize(106, 36)
      .setTint(0xffefd1).setDepth(50).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.add.text(65, height - 230, 'Diario', { fontFamily: 'sans-serif', fontSize: '14px', color: '#34494e' })
      .setOrigin(0.5).setDepth(51).setScrollFactor(0);
    journal.on('pointerdown', () => { if (this.leavingWorld) return; this.leavingWorld = true; this.scene.start('JournalScene'); });

    const plazaDone = this.progress.hasFragment(PLAZA_FRAGMENT_ID);
    const fountainDone = this.progress.hasFragment(FOUNTAIN_FRAGMENT_ID);
    const beaconDone = this.progress.hasFragment(BEACON_FRAGMENT_ID);
    const bridgeDone = this.progress.hasFragment(BRIDGE_FRAGMENT_ID);
    const gardenDone = this.progress.hasFragment(GARDEN_FRAGMENT_ID);

    if (plazaDone) {
      this.door.activate();
      this.lamp.activate();
      this.transformWorld(false);
    }

    if (fountainDone) {
      this.fountain.activate();
    }

    if (beaconDone) {
      this.beacon.forceFullyActive();
    }

    if (bridgeDone) {
      this.bridge.forceActive();
      this.revealBridgeDeck(false);
      this.removeBridgeBlocker();
    }

    if (gardenDone) {
      this.sprinkler.activate();
      this.flowerBed.activate();
    }
    if (this.progress.hasFragment('workshop-fragment')) this.workshop.restoreCollected();
    if (this.progress.hasFragment('lantern-fragment')) this.lanterns.restoreCollected();

    this.connectionSystem.restoreConnections(this.progress.getConnections());
    this.radio.refresh();
    this.workshop.refresh(this.progress.hasFragment('workshop-fragment'));
    this.lanterns.refresh(this.progress.hasFragment('lantern-fragment'));
    if (this.lamp.isActive) this.lightHouseWindow(false);
    if (this.door.isActive && !plazaDone) {
      this.plazaFragment.reveal();
      this.transformWorld(false);
    }
    if (this.fountain.isActive && !fountainDone) this.fountainFragment.reveal();
    if (this.beacon.isFullyActive && !beaconDone) this.beaconFragment.reveal();
    if (this.bridge.isActive && !bridgeDone) {
      this.revealBridgeDeck(false);
      this.removeBridgeBlocker();
      this.bridgeFragment.reveal();
    }
    if (this.flowerBed.isActive) {
      this.gardenGround.setTint(0xd4edb6);
      if (!gardenDone) this.gardenFragment.reveal();
    }

    const position = this.progress.getPosition();
    if (position) {
      // Keep the body inside the world, and on the near side of a closed bridge.
      const maxX = this.bridge.isActive ? WORLD_WIDTH - 26 : GAP_X - (GAP_WIDTH - 20) / 2 - 26;
      this.nexus.setPosition(
        Phaser.Math.Clamp(position.x, 26, maxX),
        Phaser.Math.Clamp(position.yRatio * height, 42, height - 32),
      );
      this.nexus.body.updateFromGameObject();
    }

    this.instructionText.setText(this.getStatusMessage());
    this.storyCard = new StoryCard(this);
    const hint = this.add.image(this.scale.width - 62, height - 86, HUD_PILL_TEXTURE)
      .setDisplaySize(92, 44).setTint(0xffe066).setDepth(50).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.add.text(hint.x, hint.y, 'Pista', { fontFamily: 'sans-serif', fontSize: '18px', color: '#20233a' })
      .setOrigin(0.5).setDepth(51).setScrollFactor(0);
    hint.on('pointerdown', () => {
      const task = this.returnCircuits.taskNear(this.nexus.x) ?? chapterTask(this.progress.snapshot());
      if (task.id !== this.hintTask) { this.hintTask = task.id; this.hintLevel = 0; }
      const level = Math.min(this.hintLevel++, task.clues.length - 1);
      this.storyCard.show(`Pista ${level + 1}/${task.clues.length}`, task.clues[level]);
      this.connectionSystem.resetHint();
    });
    this.residents = RESIDENTS.map(info => new Resident(this, info, height / 2 + info.offsetY * vScale, () => this.speakResident(info)));
    this.applyChapterConsequences();
    const onSurprise = (surprise: typeof CONNECTION_SURPRISES[number]): void => {
      this.progress.markDiscovery(surprise.id);
      this.storyCard.show(surprise.speaker, surprise.line);
      if (surprise.id === 'singing-door' && !EffectsSettings.isReduced()) {
        this.tweens.killTweensOf(this.door);
        this.door.setAngle(0);
        this.tweens.add({ targets: this.door, angle: -5, duration: 120, yoyo: true, repeat: 1 });
      }
    };
    this.events.on('connection-surprise', onSurprise);
    this.events.once('shutdown', () => this.events.off('connection-surprise', onSurprise));
    if (!this.progress.hasHeardResident('intro')) {
      this.progress.markResidentHeard('intro');
      this.storyCard.show('Miga · La ciudad al revés', 'El manual lo escribió un pato. Hay que preparar una fiesta. Empieza por la luz de la plaza.');
    }
    if (this.lanterns.confetti.isActive && !this.progress.hasSeenChapter()) this.finishChapter();

    // Save movement periodically, and flush before leaving or hiding the world.
    const savePosition = (): void => this.progress.savePosition(this.nexus.x, this.nexus.y / height);
    this.time.addEvent({ delay: 500, loop: true, callback: savePosition });
    const onHidden = (): void => { if (document.hidden) savePosition(); };
    window.addEventListener('pagehide', savePosition);
    document.addEventListener('visibilitychange', onHidden);
    this.events.on('pause', savePosition);
    this.events.once('shutdown', () => {
      savePosition();
      window.removeEventListener('pagehide', savePosition);
      document.removeEventListener('visibilitychange', onHidden);
      this.events.off('pause', savePosition);
    });
  }

  private getStatusMessage(): string {
    return chapterObjective(this.progress.snapshot());
  }

  private speakResident(info: ResidentInfo): void {
    this.progress.markResidentHeard(info.id);
    if (info.id === 'miga' && this.fountain.isActive) this.progress.markDiscovery('house-garden');
    this.storyCard.show(info.name, sideResidentLine(info.name, this.progress.snapshot()) ?? this.returnCircuits.residentLine(info.id) ?? residentLine(info, this.progress.snapshot()));
  }

  private finishChapter(): void {
    if (this.leavingChapter || this.leavingWorld) return;
    this.leavingChapter = true;
    this.leavingWorld = true;
    this.progress.markChapterSeen();
    this.instructionText.setText('¡La fiesta funciona!');
    this.audio.playSuccess();
    if (!EffectsSettings.isReduced()) this.cameras.main.flash(400, 255, 230, 150);
    this.sparkleBurst(this.lanterns.confetti.x, this.lanterns.confetti.y);
    this.time.delayedCall(1100, () => fadeToScene(this, 'EndingScene', [32, 35, 58]));
  }

  private applyChapterConsequences(): void {
    this.plazaFlowers.setVisible(this.fountain.isActive);
    this.radioBanner.setVisible(this.beacon.isFullyActive);
    this.radioBanner.setText(this.radio.channel === 'news' ? 'CUAC FM · ¡Noticias de Miga!' : 'CUAC FM · Fiesta en preparación');
    this.returnCircuits.refresh();
    if (this.returnCircuits.bulletin.isActive) this.progress.markDiscovery('plaza-bulletin');
    if (this.returnCircuits.band.isActive) this.progress.markDiscovery('garden-concert');
  }

  private setupConnections(height: number, vScale: number): void {
    this.connectionSystem = new ConnectionSystem(this, this.audio);
    const midY = height / 2;

    // Zona 1: la plaza (fuente → lámpara → puerta)
    const source = new EnergySource(this, 480, midY - 40 * vScale);
    this.lamp = new Lamp(this, 680, midY - 20 * vScale);
    this.door = new Door(this, 820, midY + 60 * vScale);
    this.plazaFragment = new Fragment(this, 820, midY - 10 * vScale);

    // Zona 2: la fuente restaurada (segunda fuente → fuente de agua)
    const fountainSource = new EnergySource(this, 1300, midY - 40 * vScale, 'fountain-source');
    this.fountain = new Fountain(this, 1460, midY + 40 * vScale);
    this.fountainFragment = new Fragment(this, 1460, midY - 60 * vScale);

    // Zona 3: la antena (dos fuentes → una sola antena)
    const beaconSourceA = new EnergySource(this, 1980, midY - 80 * vScale, 'beacon-source-a');
    const beaconSourceB = new EnergySource(this, 1980, midY + 80 * vScale, 'beacon-source-b');
    this.beacon = new Beacon(this, 2220, midY);
    this.beaconFragment = new Fragment(this, 2220, midY - 90 * vScale);

    // Zona 4: el puente (interruptor → se despeja la grieta)
    const bridgeSource = new EnergySource(this, 2500, midY - 40 * vScale, 'bridge-source');
    this.bridge = new Bridge(this, 2560, midY);
    this.bridgeFragment = new Fragment(this, 2820, midY - 40 * vScale);

    // Zona 5: energía → aspersor → flores, al otro lado del puente.
    const gardenSource = new EnergySource(this, 3150, midY - 40 * vScale, 'garden-source');
    this.sprinkler = new Sprinkler(this, 3310, midY + 10 * vScale);
    this.flowerBed = new FlowerBed(this, 3500, midY + 40 * vScale);
    this.gardenFragment = new Fragment(this, 3500, midY - 85 * vScale);
    this.radio = new RadioStation(this, height, vScale, () => this.beacon.isFullyActive);
    this.returnCircuits = new ReturnCircuits(this, height, vScale, () => this.radio.channel,
      () => this.door.isActive && this.lamp.isActive, () => this.flowerBed.isActive && this.sprinkler.isActive);
    this.workshop = new WorkshopZone(this, height, vScale);
    this.lanterns = new LanternZone(this, height, vScale, () => this.door.isActive && this.fountain.isActive
      && this.beacon.isFullyActive && this.bridge.isActive && this.flowerBed.isActive && this.workshop.parade.isActive);
    for (const [object, label] of [[gardenSource, 'Energía'], [this.sprinkler, 'Aspersor'], [this.flowerBed, 'Flores']] as const) {
      this.add.text(object.x, object.y + 65, label, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#365137',
      }).setOrigin(0.5).setDepth(9);
    }

    this.connectables = [
      source,
      this.lamp,
      this.door,
      fountainSource,
      this.fountain,
      beaconSourceA,
      beaconSourceB,
      this.beacon,
      bridgeSource,
      this.bridge,
      gardenSource,
      this.sprinkler,
      this.flowerBed,
      ...this.returnCircuits.connectables,
      ...this.radio.connectables,
      ...this.workshop.connectables,
      ...this.lanterns.connectables,
    ];

    this.connectables.forEach((obj) => obj.setDepth(11));
    this.plazaFragment.setDepth(12);
    this.fountainFragment.setDepth(12);
    this.beaconFragment.setDepth(12);
    this.bridgeFragment.setDepth(12);
    this.gardenFragment.setDepth(12);

    this.connectables.forEach((obj) => this.connectionSystem.register(obj));

    this.connectionSystem.addRule({ sourceId: source.id, targetId: this.lamp.id, useTunnel: true });
    this.connectionSystem.addRule({ sourceId: this.lamp.id, targetId: this.door.id });
    this.connectionSystem.addRule({ sourceId: fountainSource.id, targetId: this.fountain.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceA.id, targetId: this.beacon.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceB.id, targetId: this.beacon.id });
    this.connectionSystem.addRule({ sourceId: bridgeSource.id, targetId: this.bridge.id });
    this.connectionSystem.addRule({ sourceId: gardenSource.id, targetId: this.sprinkler.id });
    this.connectionSystem.addRule({ sourceId: this.sprinkler.id, targetId: this.flowerBed.id });
    this.radio.rules.forEach(rule => this.connectionSystem.addRule(rule));
    this.workshop.rules.forEach(rule => this.connectionSystem.addRule(rule));
    this.lanterns.rules.forEach(rule => this.connectionSystem.addRule(rule));
    this.returnCircuits.rules.forEach(rule => this.connectionSystem.addRule(rule));

    this.bridgeBlocker = this.add.zone(GAP_X, midY, GAP_WIDTH - 20, height);
    this.physics.add.existing(this.bridgeBlocker, true);
    this.bridgeCollider = this.physics.add.collider(this.nexus, this.bridgeBlocker);

    const onTunnelRequested = (data: { source: ConnectableObject; target: ConnectableObject }): void => {
      // A paused scene still renders. The tunnel is opaque, so skip its hidden backdrop.
      this.scene.setVisible(false);
      this.scene.launch('CableTunnelScene', data);
      this.scene.pause();
    };

    const onResume = (
      _sys: Phaser.Scenes.Systems,
      data?: { tunnelSuccess: boolean; source: ConnectableObject; target: ConnectableObject },
    ): void => {
      this.scene.setVisible(true);
      this.connectionSystem.resetHint();
      if (!data) return;
      this.connectionSystem.finishTunnel(data.source, data.target, data.tunnelSuccess);
    };

    const onConnectionMade = (targetId: string, sourceId: string): void => {
      this.progress.saveConnection(sourceId, targetId, sourceId === RADIO_SOURCE_ID);
      this.progress.savePosition(this.nexus.x, this.nexus.y / this.scale.height);
      if (targetId === this.lamp.id) {
        this.lightHouseWindow(true);
      }

      if (targetId === this.door.id) {
        this.plazaFragment.reveal();
        this.transformWorld(true);
        this.instructionText.setText('¡La puerta se abrió! Acércate al fragmento');
      }

      if (targetId === this.fountain.id) {
        this.fountainFragment.reveal();
        this.instructionText.setText('¡La fuente volvió a fluir! Acércate al fragmento');
      }

      if (targetId === this.beacon.id) {
        if (this.beacon.isFullyActive) {
          this.beaconFragment.reveal();
          this.instructionText.setText('¡La antena transmite! Acércate al fragmento');
        } else {
          this.instructionText.setText('La antena necesita otra conexión más');
        }
      }

      if (targetId === this.bridge.id) {
        this.revealBridgeDeck(true);
        this.removeBridgeBlocker();
        this.bridgeFragment.reveal();
        this.instructionText.setText('¡El puente se abrió! Cruza y busca el fragmento');
      }
      if (targetId === this.sprinkler.id) {
        this.instructionText.setText('¡Hay agua! Conecta el aspersor con las flores');
      }
      if (targetId === this.flowerBed.id) {
        this.gardenGround.setTint(0xd4edb6);
        this.gardenFragment.reveal();
        this.instructionText.setText('¡El jardín floreció! Acércate al fragmento');
      }
      this.instructionText.setText(chapterObjective(this.progress.snapshot()));
      this.applyChapterConsequences();
      this.radio.refresh();
      if (sourceId === RADIO_SOURCE_ID) this.storyCard.show('CUAC FM', this.radio.channel === 'music'
        ? 'El jardín recibe música. Sus flores quieren dar un concierto. Visita a Goteo cuando hayan florecido.'
        : 'La plaza recibe noticias. Miga tiene un anuncio absurdo que quiere publicar. Vuelve a verla.');
      this.workshop.refresh(this.progress.hasFragment('workshop-fragment'));
      this.lanterns.refresh(this.progress.hasFragment('lantern-fragment'));
      if (targetId === 'lantern-last' && sourceId === 'lantern-side-b') {
        this.progress.markDiscovery('shy-lantern');
        this.storyCard.show('El farol tímido', '¿Por qué cruzó el cable el camino? Porque alguien lo conectó. Perdón.');
      }
      if (targetId === 'plaza-bulletin') this.storyCard.show('Miga', 'Publicado: prohibido prohibir tostadas. Nadie sabe quién empezó esta discusión.');
      if (targetId === 'garden-band') this.storyCard.show('Las flores', '¡Primer concierto! Gira mundial: este parterre. El aspersor pide salir en la portada.');
      if (targetId === 'party-confetti') this.finishChapter();
    };

    this.events.on('tunnel-requested', onTunnelRequested);
    this.events.on('resume', onResume);
    this.events.on('connection-made', onConnectionMade);
    this.events.once('shutdown', () => {
      this.events.off('tunnel-requested', onTunnelRequested);
      this.events.off('resume', onResume);
      this.events.off('connection-made', onConnectionMade);
    });

    this.physics.add.overlap(this.nexus, this.plazaFragment, () =>
      this.collectFragment(this.plazaFragment, PLAZA_FRAGMENT_ID),
    );
    this.physics.add.overlap(this.nexus, this.fountainFragment, () =>
      this.collectFragment(this.fountainFragment, FOUNTAIN_FRAGMENT_ID),
    );
    this.physics.add.overlap(this.nexus, this.beaconFragment, () =>
      this.collectFragment(this.beaconFragment, BEACON_FRAGMENT_ID),
    );
    this.physics.add.overlap(this.nexus, this.bridgeFragment, () =>
      this.collectFragment(this.bridgeFragment, BRIDGE_FRAGMENT_ID),
    );
    this.physics.add.overlap(this.nexus, this.gardenFragment, () =>
      this.collectFragment(this.gardenFragment, GARDEN_FRAGMENT_ID),
    );
    this.physics.add.overlap(this.nexus, this.workshop.fragment, () =>
      this.collectFragment(this.workshop.fragment, 'workshop-fragment'),
    );
    this.physics.add.overlap(this.nexus, this.lanterns.fragment, () =>
      this.collectFragment(this.lanterns.fragment, 'lantern-fragment'),
    );
  }

  /** Revela el puente sobre la grieta, con o sin animación. */
  private revealBridgeDeck(animate: boolean): void {
    if (!animate) {
      this.bridgeDeck.setScale(1, 1);
      return;
    }

    this.tweens.add({
      targets: this.bridgeDeck,
      scaleX: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });
  }

  /** Quita la barrera física que impedía cruzar la grieta. */
  private removeBridgeBlocker(): void {
    if (this.bridgeCollider.world) this.bridgeCollider.destroy();
    if (this.bridgeBlocker.scene) this.bridgeBlocker.destroy();
  }

  /** Enciende la ventana de la casa cuando la lámpara se conecta. */
  private lightHouseWindow(animate: boolean): void {
    const litColor = 0xffe066;

    if (!animate) {
      this.houseWindow.setFillStyle(litColor);
      return;
    }

    this.tweens.add({
      targets: this.houseWindow,
      duration: 300,
      onUpdate: () => this.houseWindow.setFillStyle(litColor),
    });
  }

  /** Transformación visual del escenario al abrirse la puerta: árbol con hojas y plaza más cálida. */
  private transformWorld(animate: boolean): void {
    const leafColor = 0x6bbf59;
    const plazaColor = 0xf4e9c9;

    if (!animate) {
      this.treeCrown.setFillStyle(leafColor);
      this.plazaGround.setTint(plazaColor);
      return;
    }

    this.tweens.add({
      targets: this.treeCrown,
      scale: { from: 0.9, to: 1.1 },
      duration: 400,
      yoyo: true,
      onStart: () => this.treeCrown.setFillStyle(leafColor),
    });

    this.tweens.add({
      targets: this.plazaGround,
      duration: 500,
      onUpdate: () => this.plazaGround.setTint(plazaColor),
    });

    this.spawnLeafSparkles();
  }

  /** Pequeñas partículas simples que simulan hojas/color naciendo en el árbol. */
  private spawnLeafSparkles(): void {
    const cx = this.treeCrown.x;
    const cy = this.treeCrown.y;

    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const dot = this.add.circle(cx, cy, 4, 0x9be37a).setDepth(3);

      this.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * 50,
        y: cy + Math.sin(angle) * 50,
        alpha: 0,
        duration: 700,
        ease: 'Sine.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private collectFragment(fragment: Fragment, id: string): void {
    if (this.leavingWorld || !fragment.visible || fragment.isCollected) return;
    this.leavingWorld = true;

    this.progress.savePosition(this.nexus.x, this.nexus.y / this.scale.height);
    fragment.collect();
    this.progress.collectFragment(id);
    this.audio.playCollect();
    this.nexus.celebrate();
    this.fragmentHud.setText(this.fragmentHudLabel());

    const allDone = ALL_FRAGMENT_IDS.every((fid) => this.progress.hasFragment(fid));
    const isFirstCompletion = allDone && !this.progress.hasSeenCompletion(ALL_FRAGMENT_IDS.length);

    if (isFirstCompletion) {
      this.progress.markCompletionSeen(ALL_FRAGMENT_IDS.length);
      this.instructionText.setText('¡Restauraste todo el lugar!');
      this.audio.playSuccess();
      this.spawnWorldCelebration();
      this.time.delayedCall(1800, () => fadeToScene(this, 'MuseumScene', [32, 35, 58]));
      return;
    }

    this.instructionText.setText('¡Fragmento recuperado!');
    this.time.delayedCall(600, () => {
      fadeToScene(this, 'MuseumScene', [32, 35, 58]);
    });
  }

  /** Celebración especial al completar la colección actual por primera vez. */
  private spawnWorldCelebration(): void {
    if (!EffectsSettings.isReduced()) this.cameras.main.flash(500, 255, 230, 150);

    const midY = this.scale.height / 2;
    const vScale = this.scale.height / 540;

    const spots = [
      { x: 280, y: midY - 60 * vScale },
      { x: 1460, y: midY + 40 * vScale },
      { x: 2220, y: midY },
      { x: 2820, y: midY - 40 * vScale },
      { x: 3500, y: midY + 40 * vScale },
      { x: 4490, y: midY + 20 * vScale },
      { x: 5410, y: midY },
    ];

    spots.forEach((spot, index) => {
      this.time.delayedCall(index * 200, () => this.sparkleBurst(spot.x, spot.y));
    });
  }

  private sparkleBurst(cx: number, cy: number): void {
    const colors = [0xffe066, 0x5ee7ff, 0xff9ff3, 0x9be37a];

    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      const color = colors[i % colors.length];
      const dot = this.add.circle(cx, cy, 5, color).setDepth(25);

      this.tweens.add({
        targets: dot,
        x: cx + Math.cos(angle) * 70,
        y: cy + Math.sin(angle) * 70,
        alpha: 0,
        duration: 800,
        ease: 'Sine.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  update(_time: number, delta: number): void {
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

    this.nexus.move(dx, dy, delta);
    this.updateInteractButton();
    this.connectionSystem.updateHint();
    const nearby = this.residents.find(resident => Phaser.Math.Distance.Between(this.nexus.x, this.nexus.y, resident.x, resident.y) < 120);
    if (nearby && !this.progress.hasHeardResident(nearby.id)) nearby.emit('pointerdown');
  }

  /** Busca el objeto conectable más cercano al Nexus, si está a distancia de interacción. */
  private findNearestConnectable(): ConnectableObject | null {
    let nearest: ConnectableObject | null = null;
    let nearestDistance = INTERACT_RADIUS;

    for (const obj of this.connectables) {
      const distance = Phaser.Math.Distance.Between(this.nexus.x, this.nexus.y, obj.x, obj.y);
      if (distance < nearestDistance) {
        nearest = obj;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private updateInteractButton(): void {
    const target = this.findNearestConnectable();

    if (!target) {
      this.interactButton.hide();
      return;
    }

    const label = this.connectionSystem.hasSelection() ? 'Conectar' : 'Tocar';
    this.interactButton.show(label);
  }

  /** Fondo con parallax: cielo + dos capas de colinas que se mueven más lento que la cámara. */
  private fragmentHudLabel(): string {
    return `★ ${this.progress.getCollectedFragments().length}/${ALL_FRAGMENT_IDS.length}`;
  }

  private muteButtonLabel(): string {
    return AudioSystem.isMuted() ? '🔇' : '🔊';
  }

  private buildParallaxBackground(width: number, height: number, _vScale: number): void {
    drawSky(this, width, height);
  }

  /** Detalles ambientales con movimiento propio, para que el mundo no se sienta estático. */
  private buildAmbientLife(_width: number, height: number, vScale: number): void {
    if (EffectsSettings.isReduced()) return;
    // Viento sutil en la copa del árbol.
    this.tweens.add({
      targets: this.treeCrown,
      angle: { from: -4, to: 4 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mariposas cruzando el cielo en distintas zonas del mundo.
    const butterflySpots = [520, 1400, 2100, 2750, 3430];
    butterflySpots.forEach((baseX, index) => {
      const baseY = height / 2 - 160 * vScale - (index % 2) * 30 * vScale;
      this.spawnButterfly(baseX, baseY);
    });
  }

  private spawnButterfly(baseX: number, baseY: number): void {
    const color = Phaser.Math.RND.pick([0xff9ff3, 0xffe066, 0x9be37a]);
    const butterfly = this.add.ellipse(baseX, baseY, 10, 7, color).setDepth(9);
    const wingFlutter = this.tweens.add({
      targets: butterfly,
      scaleX: { from: 1, to: 0.4 },
      duration: 180,
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: butterfly,
      x: baseX + 90,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        butterfly.y = baseY + Math.sin(this.time.now / 260 + baseX) * 14;
      },
      onStop: () => wingFlutter.stop(),
    });
  }

  private buildStaticZone(width: number, height: number, vScale: number): void {
    const midY = height / 2;

    // Leave the sky visible above the grassy horizon.
    this.add.rectangle(width / 2, midY + height / 4 - 48 * vScale, width, height / 2 + 96 * vScale, 0xb6c7a0).setDepth(0);

    // Translucent rounded terrain patches retain the repair colors below the paving.
    ensureRoundedRectTexture(this, 'plaza-ground', 500, 260 * vScale, 36);
    this.plazaGround = this.add.image(650, midY + 60 * vScale, 'plaza-ground')
      .setTint(0xe4dcc3).setAlpha(0.65).setDepth(1);
    ensureRoundedRectTexture(this, 'garden-ground', 650, 300 * vScale, 36);
    this.gardenGround = this.add.image(3370, midY + 30 * vScale, 'garden-ground')
      .setTint(0xe6ddbb).setAlpha(0.65).setDepth(1);
    for (const x of [3100, 3200, 3300, 3400, 3500, 3600]) {
      this.add.rectangle(x, midY + 165 * vScale, 8, 30, 0x9c7851).setDepth(2);
    }
    this.add.rectangle(3350, midY + 155 * vScale, 520, 6, 0x9c7851).setDepth(2);

    // The bank illustration leaves the physical gap visible. The planks animate as one image.
    const bridgeKey = `wooden-bridge-${height}`;
    if (!this.textures.exists(bridgeKey)) {
      const planks = this.make.graphics({ x: 0, y: 0 });
      const deckH = 38 * vScale;
      planks.fillStyle(0x34494e, 0.3).fillRoundedRect(0, 6, GAP_WIDTH, deckH + 8, 4);
      planks.fillStyle(0x9c7252).fillRoundedRect(0, 0, GAP_WIDTH, deckH, 4);
      for (let x = 3; x < GAP_WIDTH; x += 12) {
        planks.fillStyle(0xc49a6b).fillRoundedRect(x, 2, 9, deckH - 4, 2);
        planks.lineStyle(1, 0xe5c79a, 0.8).lineBetween(x + 2, 5, x + 2, deckH - 5);
      }
      planks.lineStyle(4, 0x725941).lineBetween(0, 4, GAP_WIDTH, 4).lineBetween(0, deckH - 3, GAP_WIDTH, deckH - 3);
      planks.generateTexture(bridgeKey, GAP_WIDTH, deckH + 14);
      planks.destroy();
    }
    this.bridgeDeck = this.add.image(GAP_X, midY, bridgeKey).setDepth(3).setScale(0, 1);

    // Flor decorativa en la isla nueva
    this.add.rectangle(2870, midY + 30 * vScale, 4, 20 * vScale, 0x4a7c3a).setDepth(2);
    this.add.circle(2870, midY + 20 * vScale, 10, 0xff9ff3).setDepth(2);

    // Sombras de la decoración estática, para que se sientan apoyadas en el piso.
    this.add.ellipse(280, midY + 32 * vScale, 150, 22, 0x000000, 0.15).setDepth(1);
    this.add.ellipse(940, midY + 22 * vScale, 60, 14, 0x000000, 0.15).setDepth(1);
    this.add.ellipse(2200, midY + 178 * vScale, 40, 12, 0x000000, 0.15).setDepth(1);

    // Ventana apagada
    this.houseWindow = this.add.rectangle(214, midY + 30 * vScale - 56, 22, 28, 0x4b6160).setDepth(3);
    this.radioBanner = this.add.text(280, midY - 165 * vScale, 'CUAC FM · Fiesta en preparación', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#365137',
    }).setOrigin(0.5).setDepth(4).setVisible(false);
    this.plazaFlowers = this.add.graphics({ x: 1050, y: midY + 40 * vScale }).setDepth(3).setVisible(false);
    for (const x of [-24, 0, 24]) {
      this.plazaFlowers.lineStyle(3, 0x4a7c3a).lineBetween(x, 0, x, 18);
      this.plazaFlowers.fillStyle(0xffb86c).fillCircle(x, 0, 8);
      this.plazaFlowers.fillStyle(0xffe066).fillCircle(x, 0, 3);
    }

    // Árbol sin hojas (mundo apagado)
    this.add.rectangle(940, midY - 10 * vScale, 12, 60, 0x6b4a30).setDepth(3);
    this.treeCrown = this.add.circle(940, midY - 60 * vScale, 40, 0x8b8f8a).setDepth(3);

    const foliage = this.add.graphics({ x: 940, y: midY - 60 * vScale }).setDepth(3);
    foliage.fillStyle(0xffefd1, 0.23).fillEllipse(-14, -18, 34, 18).fillCircle(18, -10, 9);
    foliage.lineStyle(2, 0x34494e, 0.2).lineBetween(-14, 20, 0, 30).lineBetween(14, 10, 0, 30);

    // Torre de la estación de la antena (decoración, no interactiva)
    this.add.rectangle(2200, midY + 130 * vScale, 14, 220, 0x5a5f6b).setDepth(2);
    this.add.circle(2200, midY + 20 * vScale, 10, 0x3a3d48).setDepth(2);

    // Bordes visuales del límite del mundo
    const border = this.add.graphics().setDepth(3);
    border.lineStyle(2, 0x34494e, 0.15);
    border.strokeRect(2, 2, width - 4, height - 4);
  }
}
