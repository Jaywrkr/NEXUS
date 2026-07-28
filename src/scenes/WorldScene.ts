import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import { EnergySource } from '../objects/EnergySource';
import { Lamp } from '../objects/Lamp';
import { Door } from '../objects/Door';
import { Fountain } from '../objects/Fountain';
import { Beacon } from '../objects/Beacon';
import { Fragment } from '../objects/Fragment';
import { ConnectionSystem } from '../systems/ConnectionSystem';
import { ProgressSystem } from '../systems/ProgressSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';

const PLAZA_FRAGMENT_ID = 'plaza-fragment';
const FOUNTAIN_FRAGMENT_ID = 'fountain-fragment';
const BEACON_FRAGMENT_ID = 'beacon-fragment';
const WORLD_WIDTH = 2450;

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
  private instructionText!: Phaser.GameObjects.Text;
  private houseWindow!: Phaser.GameObjects.Rectangle;
  private treeCrown!: Phaser.GameObjects.Arc;
  private plazaGround!: Phaser.GameObjects.Rectangle;
  private lamp!: Lamp;
  private joystick!: VirtualJoystick;
  private audio!: AudioSystem;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    const { height } = this.scale;
    const width = WORLD_WIDTH;

    this.progress = new ProgressSystem();
    this.audio = new AudioSystem();

    this.physics.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    this.buildStaticZone(width, height);

    this.nexus = new Nexus(this, 480, height / 2 + 100, this.progress.getAppearance());
    this.nexus.setDepth(10);
    this.cameras.main.startFollow(this.nexus, true, 0.12, 0.12);

    this.setupConnections(height);

    this.cameras.main.setBackgroundColor('#cfe8d8');

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.joystick = new VirtualJoystick(this, 90, height - 90);

    this.instructionText = this.add
      .text(this.scale.width / 2, 24, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0);

    const plazaDone = this.progress.hasFragment(PLAZA_FRAGMENT_ID);
    const fountainDone = this.progress.hasFragment(FOUNTAIN_FRAGMENT_ID);
    const beaconDone = this.progress.hasFragment(BEACON_FRAGMENT_ID);

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

    this.instructionText.setText(this.getStatusMessage(plazaDone, fountainDone, beaconDone));
  }

  private getStatusMessage(plazaDone: boolean, fountainDone: boolean, beaconDone: boolean): string {
    const doneCount = [plazaDone, fountainDone, beaconDone].filter(Boolean).length;

    if (doneCount === 3) return 'Ya restauraste toda la zona';
    if (doneCount === 0) return 'Los Nexus — conecta la fuente con la lámpara';
    return `Restauraste ${doneCount} de 3 lugares — sigue explorando`;
  }

  private setupConnections(height: number): void {
    this.connectionSystem = new ConnectionSystem(this, this.audio);

    // Zona 1: la plaza (fuente → lámpara → puerta)
    const source = new EnergySource(this, 480, height / 2 - 40);
    this.lamp = new Lamp(this, 680, height / 2 - 20);
    this.door = new Door(this, 820, height / 2 + 60);
    this.plazaFragment = new Fragment(this, 820, height / 2 - 10);

    // Zona 2: la fuente restaurada (segunda fuente → fuente de agua)
    const fountainSource = new EnergySource(this, 1300, height / 2 - 40, 'fountain-source');
    this.fountain = new Fountain(this, 1460, height / 2 + 40);
    this.fountainFragment = new Fragment(this, 1460, height / 2 - 60);

    // Zona 3: la antena (dos fuentes → una sola antena)
    const beaconSourceA = new EnergySource(this, 1980, height / 2 - 80, 'beacon-source-a');
    const beaconSourceB = new EnergySource(this, 1980, height / 2 + 80, 'beacon-source-b');
    this.beacon = new Beacon(this, 2220, height / 2);
    this.beaconFragment = new Fragment(this, 2220, height / 2 - 90);

    [source, this.lamp, this.door, fountainSource, this.fountain, beaconSourceA, beaconSourceB, this.beacon].forEach(
      (obj) => obj.setDepth(11),
    );
    this.plazaFragment.setDepth(12);
    this.fountainFragment.setDepth(12);
    this.beaconFragment.setDepth(12);

    [source, this.lamp, this.door, fountainSource, this.fountain, beaconSourceA, beaconSourceB, this.beacon].forEach(
      (obj) => this.connectionSystem.register(obj),
    );

    this.connectionSystem.addRule({ sourceId: source.id, targetId: this.lamp.id });
    this.connectionSystem.addRule({ sourceId: this.lamp.id, targetId: this.door.id });
    this.connectionSystem.addRule({ sourceId: fountainSource.id, targetId: this.fountain.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceA.id, targetId: this.beacon.id });
    this.connectionSystem.addRule({ sourceId: beaconSourceB.id, targetId: this.beacon.id });

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
    this.instructionText.setText('¡Fragmento recuperado!');

    this.time.delayedCall(600, () => {
      this.scene.start('MuseumScene');
    });
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
  }

  private buildStaticZone(width: number, height: number): void {
    // Suelo
    this.add.rectangle(width / 2, height / 2, width, height, 0xcfe8d8).setDepth(0);

    // Plaza (zona más clara)
    this.plazaGround = this.add.rectangle(650, height / 2 + 60, 500, 260, 0xe4dcc3).setDepth(1);

    // Segunda zona: explanada de la fuente
    this.add.rectangle(1480, height / 2 + 40, 460, 260, 0xdce7ea).setDepth(1);

    // Tercera zona: explanada de la antena
    this.add.rectangle(2200, height / 2, 460, 320, 0xe2ddf0).setDepth(1);

    // Camino que conecta las tres zonas
    this.add.rectangle(width / 2, height - 40, width, 80, 0xb9ac8a).setDepth(1);

    // Casa apagada (silueta simple, sin luz encendida todavía)
    this.add.rectangle(280, height / 2 - 40, 160, 140, 0x4a4e5c).setDepth(2);
    this.add.triangle(280, height / 2 - 130, -90, 20, 90, 20, 0, -60, 0x3a3d48).setDepth(2);

    // Ventana apagada
    this.houseWindow = this.add.rectangle(280, height / 2 - 60, 30, 30, 0x2a2d36).setDepth(3);

    // Árbol sin hojas (mundo apagado)
    this.add.rectangle(940, height / 2 - 10, 12, 60, 0x6b4a30).setDepth(2);
    this.treeCrown = this.add.circle(940, height / 2 - 60, 40, 0x8b8f8a).setDepth(2);

    // Torre de la estación de la antena (decoración, no interactiva)
    this.add.rectangle(2200, height / 2 + 130, 14, 220, 0x5a5f6b).setDepth(2);
    this.add.circle(2200, height / 2 + 20, 10, 0x3a3d48).setDepth(2);

    // Bordes visuales del límite del mundo
    const border = this.add.graphics().setDepth(30);
    border.lineStyle(4, 0x1b1f3b, 0.3);
    border.strokeRect(2, 2, width - 4, height - 4);
  }
}
