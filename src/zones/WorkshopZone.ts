import Phaser from 'phaser';
import { EnergySource } from '../objects/EnergySource';
import { WorkshopPiece } from '../objects/WorkshopPiece';
import { Fragment } from '../objects/Fragment';

export class WorkshopZone {
  readonly fragment: Fragment;
  readonly motor: WorkshopPiece;
  readonly duck: WorkshopPiece;
  readonly bell: WorkshopPiece;
  readonly parade: WorkshopPiece;
  readonly connectables;
  readonly rules = [
    { sourceId: 'toy-source', targetId: 'toy-motor' },
    { sourceId: 'toy-motor', targetId: 'toy-duck' },
    { sourceId: 'toy-motor', targetId: 'toy-bell' },
    { sourceId: 'toy-duck', targetId: 'toy-parade' },
    { sourceId: 'toy-bell', targetId: 'toy-parade' },
  ];
  private ground: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, height: number, v: number) {
    const y = height / 2;
    this.ground = scene.add.rectangle(4250, y + 30 * v, 700, 320 * v, 0xdedbe7).setDepth(1);
    scene.add.text(4250, y - 165 * v, 'Taller de Pipa', { fontFamily: 'sans-serif', fontSize: '24px', color: '#4a3c63' }).setOrigin(0.5).setDepth(2);
    const source = new EnergySource(scene, 3950, y - 40 * v, 'toy-source');
    this.motor = new WorkshopPiece(scene, 4110, y, 'motor', 'Motor');
    this.duck = new WorkshopPiece(scene, 4290, y - 75 * v, 'duck', 'Pato supervisor');
    this.bell = new WorkshopPiece(scene, 4290, y + 80 * v, 'bell', 'Campana');
    this.parade = new WorkshopPiece(scene, 4490, y + 20 * v, 'parade', 'Desfile');
    this.fragment = new Fragment(scene, 4490, y - 100 * v);
    this.fragment.setDepth(12);
    this.connectables = [source, this.motor, this.duck, this.bell, this.parade];
  }

  restoreCollected(): void {
    [this.motor, this.duck, this.bell, this.parade].forEach(piece => piece.forceActive());
  }

  refresh(collected: boolean): void {
    if (!this.parade.isActive) return;
    this.ground.setFillStyle(0xe9d4f5);
    if (!collected && !this.fragment.visible) this.fragment.reveal();
  }
}
