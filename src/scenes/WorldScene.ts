import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import { EnergySource } from '../objects/EnergySource';
import { Lamp } from '../objects/Lamp';
import { Door } from '../objects/Door';
import { Fountain } from '../objects/Fountain';
import { Beacon } from '../objects/Beacon';
import { Bridge } from '../objects/Bridge';
import { Fragment } from '../objects/Fragment';
import { ConnectionSystem } from '../systems/ConnectionSystem';
import { ProgressSystem } from '../systems/ProgressSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';
import { InteractButton } from '../ui/InteractButton';
import type { ConnectableObject } from '../objects/ConnectableObject';
import { fadeToScene } from '../utils/sceneTransition';

const INTERACT_RADIUS = 90;

const PLAZA_FRAGMENT_ID = 'plaza-fragment';
const FOUNTAIN_FRAGMENT_ID = 'fountain-fragment';
const BEACON_FRAGMENT_ID = 'beacon-fragment';
const BRIDGE_FRAGMENT_ID = 'bridge-fragment';
const ALL_FRAGMENT_IDS = [PLAZA_FRAGMENT_ID, FOUNTAIN_FRAGMENT_ID, BEACON_FRAGMENT_ID, BRIDGE_FRAGMENT_ID];
const WORLD_WIDTH = 2950;
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
  private bridgeDeck!: Phaser.GameObjects.Rectangle;
  private bridgeBlocker!: Phaser.GameObjects.Zone;
  private bridgeCollider!: Phaser.Physics.Arcade.Collider;
  private instructionText!: Phaser.GameObjects.Text;
  private fragmentHud!: Phaser.GameObjects.Text;
  private muteButton!: Phaser.GameObjects.Text;
  private houseWindow!: Phaser.GameObjects.Rectangle;
  private treeCrown!: Phaser.GameObjects.Arc;
  private plazaGround!: Phaser.GameObjects.Rectangle;
  private lamp!: Lamp;
  private joystick!: VirtualJoystick;
  private audio!: AudioSystem;
  private interactButton!: InteractButton;
  private connectables: ConnectableObject[] = [];

  constructor() {
    super('WorldScene');
  }

  create(): void {
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

    this.nexus = new Nexus(this, 480, height / 2 + 100 * vScale, this.progress.getAppearance());
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

    this.instructionText = this.add
      .text(this.scale.width / 2, 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0);

    this.fragmentHud = this.add
      .text(this.scale.width - 16, 16, this.fragmentHudLabel(), {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(1, 0)
      .setDepth(20)
      .setScrollFactor(0);

    this.muteButton = this.add
      .text(16, 16, this.muteButtonLabel(), {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0, 0)
      .setDepth(20)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    this.muteButton.on('pointerdown', () => {
      AudioSystem.setMuted(!AudioSystem.isMuted());
      this.muteButton.setText(this.muteButtonLabel());
    });

    const plazaDone = this.progress.hasFragment(PLAZA_FRAGMENT_ID);
    const fountainDone = this.progress.hasFragment(FOUNTAIN_FRAGMENT_ID);
    const beaconDone = this.progress.hasFragment(BEACON_FRAGMENT_ID);
    const bridgeDone = this.progress.hasFragment(BRIDGE_FRAGMENT_ID);

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

    this.instructionText.setText(this.getStatusMessage(plazaDone, fountainDone, beaconDone, bridgeDone));
  }

  private getStatusMessage(plazaDone: boolean, fountainDone: boolean, beaconDone: boolean, bridgeDone: boolean): string {
    const doneCount = [plazaDone, fountainDone, beaconDone, bridgeDone].filter(Boolean).length;

    if (doneCount === 4) return 'Ya restauraste toda la zona';
    if (doneCount === 0) return 'Los Nexus — conecta la fuente con la lámpara';
    return `Restauraste ${doneCount} de 4 lugares — sigue explorando`;
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
    ];

    this.connectables.forEach((obj) => obj.setDepth(11));
    this.plazaFragment.setDepth(12);
    this.fountainFragment.setDepth(12);
    this.beaconFragment.setDepth(12);
    this.bridgeFragment.setDepth(12);

    this.connectables.forEach((obj) => this.connectionSystem.register(obj));

    this.connectionSystem.addRule({ sourceId: source.id, targetId: this.lamp.id });
    this.connectionSystem.addRule({ sourceId: this.lamp.id, targetId: this.door.id });
    this.connectionSystem.addRule({ sourceId: fountainSource.id, targetId: this.fountain.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceA.id, targetId: this.beacon.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceB.id, targetId: this.beacon.id });
    this.connectionSystem.addRule({ sourceId: bridgeSource.id, targetId: this.bridge.id });

    this.bridgeBlocker = this.add.zone(GAP_X, midY, GAP_WIDTH - 20, height);
    this.physics.add.existing(this.bridgeBlocker, true);
    this.bridgeCollider = this.physics.add.collider(this.nexus, this.bridgeBlocker);

    this.events.on('connection-made', (targetId: string) => {
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
    this.bridgeCollider.destroy();
    this.bridgeBlocker.destroy();
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
      this.plazaGround.setFillStyle(plazaColor);
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
      onUpdate: () => this.plazaGround.setFillStyle(plazaColor),
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
    if (!fragment.visible || fragment.isCollected) return;

    fragment.collect();
    this.progress.collectFragment(id);
    this.audio.playCollect();
    this.nexus.celebrate();
    this.fragmentHud.setText(this.fragmentHudLabel());

    const allDone = ALL_FRAGMENT_IDS.every((fid) => this.progress.hasFragment(fid));
    const isFirstCompletion = allDone && !this.progress.hasSeenCompletion();

    if (isFirstCompletion) {
      this.progress.markCompletionSeen();
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

  /** Celebración especial al restaurar las cuatro zonas por primera vez. */
  private spawnWorldCelebration(): void {
    this.cameras.main.flash(500, 255, 230, 150);

    const midY = this.scale.height / 2;
    const vScale = this.scale.height / 540;

    const spots = [
      { x: 280, y: midY - 60 * vScale },
      { x: 1460, y: midY + 40 * vScale },
      { x: 2220, y: midY },
      { x: 2820, y: midY - 40 * vScale },
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

  private buildParallaxBackground(width: number, height: number, vScale: number): void {
    const margin = 500;
    const midY = height / 2;

    this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0xe8f4ea)
      .setDepth(-30)
      .setScrollFactor(0);

    // Nubes lejanas
    for (let x = -margin; x < width + margin; x += 340) {
      const y = midY - 200 * vScale + Math.sin(x * 0.01) * 30 * vScale;
      const cloud = this.add.ellipse(x, y, 90, 34, 0xffffff, 0.6).setDepth(-20);
      cloud.setScrollFactor(0.15);
    }

    // Colinas lejanas
    for (let x = -margin; x < width + margin; x += 260) {
      const hill = this.add.circle(x, height + 40 * vScale, 160 * vScale, 0xb7ddc0).setDepth(-11);
      hill.setScrollFactor(0.35);
    }

    // Colinas cercanas, un poco más oscuras y bajas
    for (let x = -margin; x < width + margin; x += 220) {
      const hill = this.add.circle(x + 110, height + 20 * vScale, 130 * vScale, 0x9ecfab).setDepth(-10);
      hill.setScrollFactor(0.55);
    }
  }

  private buildStaticZone(width: number, height: number, vScale: number): void {
    const midY = height / 2;

    // Suelo
    this.add.rectangle(width / 2, midY, width, height, 0xcfe8d8).setDepth(0);

    // Plaza (zona más clara)
    this.plazaGround = this.add
      .rectangle(650, midY + 60 * vScale, 500, 260 * vScale, 0xe4dcc3)
      .setDepth(1);

    // Segunda zona: explanada de la fuente
    this.add.rectangle(1480, midY + 40 * vScale, 460, 260 * vScale, 0xdce7ea).setDepth(1);

    // Tercera zona: explanada de la antena
    this.add.rectangle(2200, midY, 460, 320 * vScale, 0xe2ddf0).setDepth(1);

    // Cuarta zona: la isla al otro lado del puente
    this.add.rectangle(2820, midY, 340, 300 * vScale, 0xdcefd8).setDepth(1);

    // Camino que conecta las zonas
    this.add.rectangle(width / 2, height - 40 * vScale, width, 80 * vScale, 0xb9ac8a).setDepth(1);

    // Grieta que corta el camino, y el puente (oculto hasta conectar el interruptor)
    this.add.rectangle(GAP_X, midY, GAP_WIDTH, height, 0x1b2a3a).setDepth(2);
    this.bridgeDeck = this.add
      .rectangle(GAP_X, midY, GAP_WIDTH - 10, 26 * vScale, 0x8a5a3a)
      .setDepth(3)
      .setScale(0, 1);

    // Flor decorativa en la isla nueva
    this.add.rectangle(2870, midY + 30 * vScale, 4, 20 * vScale, 0x4a7c3a).setDepth(2);
    this.add.circle(2870, midY + 20 * vScale, 10, 0xff9ff3).setDepth(2);

    // Casa apagada (silueta simple, sin luz encendida todavía)
    this.add.rectangle(280, midY - 40 * vScale, 160, 140, 0x4a4e5c).setDepth(2);
    this.add.triangle(280, midY - 130 * vScale, -90, 20, 90, 20, 0, -60, 0x3a3d48).setDepth(2);

    // Ventana apagada
    this.houseWindow = this.add.rectangle(280, midY - 60 * vScale, 30, 30, 0x2a2d36).setDepth(3);

    // Árbol sin hojas (mundo apagado)
    this.add.rectangle(940, midY - 10 * vScale, 12, 60, 0x6b4a30).setDepth(2);
    this.treeCrown = this.add.circle(940, midY - 60 * vScale, 40, 0x8b8f8a).setDepth(2);

    // Torre de la estación de la antena (decoración, no interactiva)
    this.add.rectangle(2200, midY + 130 * vScale, 14, 220, 0x5a5f6b).setDepth(2);
    this.add.circle(2200, midY + 20 * vScale, 10, 0x3a3d48).setDepth(2);

    // Bordes visuales del límite del mundo
    const border = this.add.graphics().setDepth(30);
    border.lineStyle(4, 0x1b1f3b, 0.3);
    border.strokeRect(2, 2, width - 4, height - 4);
  }
}
