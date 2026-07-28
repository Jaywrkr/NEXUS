import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import { EnergySource } from '../objects/EnergySource';
import { Lamp } from '../objects/Lamp';
import { Door } from '../objects/Door';
import { Fragment } from '../objects/Fragment';
import { ConnectionSystem } from '../systems/ConnectionSystem';
import { ProgressSystem } from '../systems/ProgressSystem';
import { VirtualJoystick } from '../ui/VirtualJoystick';

const FRAGMENT_ID = 'plaza-fragment';

export class WorldScene extends Phaser.Scene {
  private nexus!: Nexus;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private connectionSystem!: ConnectionSystem;
  private progress!: ProgressSystem;
  private door!: Door;
  private fragment!: Fragment;
  private instructionText!: Phaser.GameObjects.Text;
  private houseWindow!: Phaser.GameObjects.Rectangle;
  private treeCrown!: Phaser.GameObjects.Arc;
  private plazaGround!: Phaser.GameObjects.Rectangle;
  private lamp!: Lamp;
  private joystick!: VirtualJoystick;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.progress = new ProgressSystem();

    this.physics.world.setBounds(0, 0, width, height);

    this.buildStaticZone(width, height);

    this.nexus = new Nexus(this, width / 2, height / 2 + 100, this.progress.getAppearance());
    this.nexus.setDepth(10);

    this.setupConnections(width, height);

    this.cameras.main.setBackgroundColor('#cfe8d8');

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.joystick = new VirtualJoystick(this, 90, height - 90);

    this.instructionText = this.add
      .text(width / 2, 24, 'Los Nexus — conecta la fuente con la lámpara', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#1b1f3b',
      })
      .setOrigin(0.5)
      .setDepth(20);

    if (this.progress.hasFragment(FRAGMENT_ID)) {
      this.door.activate();
      this.lamp.activate();
      this.transformWorld(false);
      this.instructionText.setText('Ya restauraste esta plaza');
    }
  }

  private setupConnections(width: number, height: number): void {
    this.connectionSystem = new ConnectionSystem(this);

    const source = new EnergySource(this, width / 2, height / 2 - 40);
    this.lamp = new Lamp(this, width - 200, height / 2 - 20);
    this.door = new Door(this, width - 60, height / 2 + 60);
    this.fragment = new Fragment(this, width - 60, height / 2 - 10);

    source.setDepth(11);
    this.lamp.setDepth(11);
    this.door.setDepth(11);
    this.fragment.setDepth(12);

    this.connectionSystem.register(source);
    this.connectionSystem.register(this.lamp);
    this.connectionSystem.register(this.door);
    this.connectionSystem.addRule({ sourceId: source.id, targetId: this.lamp.id });
    this.connectionSystem.addRule({ sourceId: this.lamp.id, targetId: this.door.id });

    this.events.on('connection-made', (targetId: string) => {
      if (targetId === this.lamp.id) {
        this.lightHouseWindow(true);
      }

      if (targetId === this.door.id) {
        this.fragment.reveal();
        this.transformWorld(true);
        this.instructionText.setText('¡La puerta se abrió! Acércate al fragmento');
      }
    });

    this.physics.add.overlap(this.nexus, this.fragment, () => this.collectFragment());
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

  private collectFragment(): void {
    if (!this.fragment.visible || this.fragment.isCollected) return;

    this.fragment.collect();
    this.progress.collectFragment(FRAGMENT_ID);
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
    this.plazaGround = this.add.rectangle(width / 2, height / 2 + 60, 500, 260, 0xe4dcc3).setDepth(1);

    // Camino
    this.add.rectangle(width / 2, height - 40, width, 80, 0xb9ac8a).setDepth(1);

    // Casa apagada (silueta simple, sin luz encendida todavía)
    this.add.rectangle(160, height / 2 - 40, 160, 140, 0x4a4e5c).setDepth(2);
    this.add.triangle(
      160,
      height / 2 - 130,
      -90,
      20,
      90,
      20,
      0,
      -60,
      0x3a3d48,
    ).setDepth(2);

    // Ventana apagada
    this.houseWindow = this.add.rectangle(160, height / 2 - 60, 30, 30, 0x2a2d36).setDepth(3);

    // Árbol sin hojas (mundo apagado)
    this.add.rectangle(width - 160, height / 2 - 10, 12, 60, 0x6b4a30).setDepth(2);
    this.treeCrown = this.add.circle(width - 160, height / 2 - 60, 40, 0x8b8f8a).setDepth(2);

    // Bordes visuales del límite de pantalla
    const border = this.add.graphics().setDepth(30);
    border.lineStyle(4, 0x1b1f3b, 0.3);
    border.strokeRect(2, 2, width - 4, height - 4);
  }
}
