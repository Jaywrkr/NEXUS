import Phaser from 'phaser';
import { Nexus } from '../entities/Nexus';
import { EnergySource } from '../objects/EnergySource';
import { Lamp } from '../objects/Lamp';
import { Door } from '../objects/Door';
import { Fragment } from '../objects/Fragment';
import { ConnectionSystem } from '../systems/ConnectionSystem';
import { ProgressSystem } from '../systems/ProgressSystem';

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

  constructor() {
    super('WorldScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.progress = new ProgressSystem();

    this.physics.world.setBounds(0, 0, width, height);

    this.buildStaticZone(width, height);

    this.nexus = new Nexus(this, width / 2, height / 2 + 100);
    this.nexus.setDepth(10);

    this.setupConnections(width, height);

    this.cameras.main.setBackgroundColor('#cfe8d8');

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;

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
      this.instructionText.setText('Ya restauraste esta plaza');
    }
  }

  private setupConnections(width: number, height: number): void {
    this.connectionSystem = new ConnectionSystem(this);

    const source = new EnergySource(this, width / 2, height / 2 - 40);
    const lamp = new Lamp(this, width - 200, height / 2 - 20);
    this.door = new Door(this, width - 60, height / 2 + 60);
    this.fragment = new Fragment(this, width - 60, height / 2 - 10);

    source.setDepth(11);
    lamp.setDepth(11);
    this.door.setDepth(11);
    this.fragment.setDepth(12);

    this.connectionSystem.register(source);
    this.connectionSystem.register(lamp);
    this.connectionSystem.register(this.door);
    this.connectionSystem.addRule({ sourceId: source.id, targetId: lamp.id });
    this.connectionSystem.addRule({ sourceId: lamp.id, targetId: this.door.id });

    this.events.on('connection-made', (targetId: string) => {
      if (targetId === this.door.id) {
        this.fragment.reveal();
        this.instructionText.setText('¡La puerta se abrió! Acércate al fragmento');
      }
    });

    this.physics.add.overlap(this.nexus, this.fragment, () => this.collectFragment());
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

    this.nexus.move(dx, dy, delta);
  }

  private buildStaticZone(width: number, height: number): void {
    // Suelo
    this.add.rectangle(width / 2, height / 2, width, height, 0xcfe8d8).setDepth(0);

    // Plaza (zona más clara)
    this.add.rectangle(width / 2, height / 2 + 60, 500, 260, 0xe4dcc3).setDepth(1);

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
    this.add.rectangle(160, height / 2 - 60, 30, 30, 0x2a2d36).setDepth(3);

    // Árbol sin hojas (mundo apagado)
    this.add.rectangle(width - 160, height / 2 - 10, 12, 60, 0x6b4a30).setDepth(2);
    this.add.circle(width - 160, height / 2 - 60, 40, 0x8b8f8a).setDepth(2);

    // Bordes visuales del límite de pantalla
    const border = this.add.graphics().setDepth(30);
    border.lineStyle(4, 0x1b1f3b, 0.3);
    border.strokeRect(2, 2, width - 4, height - 4);
  }
}
