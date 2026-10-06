import Phaser from 'phaser';
import { ensureRoundedRectTexture } from '../utils/uiTextures';
import { EnergySource } from '../objects/EnergySource';
import { LanternPiece } from '../objects/LanternPiece';
import { Fragment } from '../objects/Fragment';
import type { ConnectionRule } from '../systems/ConnectionSystem';

export class LanternZone {
  readonly first: LanternPiece;
  readonly middle: LanternPiece;
  readonly last: LanternPiece;
  readonly sideA: LanternPiece;
  readonly sideB: LanternPiece;
  readonly stage: LanternPiece;
  readonly confetti: LanternPiece;
  readonly fragment: Fragment;
  readonly connectables;
  readonly rules: ConnectionRule[];
  private ground: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, height: number, v: number, prepared: () => boolean) {
    const y = height / 2;
    ensureRoundedRectTexture(scene, 'lantern-ground', 930, 360 * v, 40);
    this.ground = scene.add.image(5330, y + 30 * v, 'lantern-ground').setTint(0xd7e4e8).setAlpha(0.4).setDepth(1);
    const source = new EnergySource(scene, 4870, y - 40 * v, 'lantern-source');
    this.first = new LanternPiece(scene, 5030, y, 'lantern-first', 'Inicio', 0xffe066);
    this.middle = new LanternPiece(scene, 5210, y - 75 * v, 'lantern-middle', 'Directo', 0x5ee7ff);
    this.last = new LanternPiece(scene, 5410, y, 'lantern-last', 'Salida', 0xff9ff3);
    this.sideA = new LanternPiece(scene, 5150, y + 100 * v, 'lantern-side-a', 'Curioso', 0x9be37a);
    this.sideB = new LanternPiece(scene, 5320, y + 100 * v, 'lantern-side-b', 'Tímido', 0xffb86c);
    this.stage = new LanternPiece(scene, 5600, y - 35 * v, 'party-stage', 'Escenario', 0xc7a0ef, 'stage');
    this.confetti = new LanternPiece(scene, 5780, y + 30 * v, 'party-confetti', 'Confeti', 0xffe066, 'confetti');
    this.fragment = new Fragment(scene, 5410, y - 120 * v); this.fragment.setDepth(12);
    this.connectables = [source, this.first, this.middle, this.last, this.sideA, this.sideB, this.stage, this.confetti];
    const path = [
      ['lantern-source', 'lantern-first'], ['lantern-first', 'lantern-middle'], ['lantern-middle', 'lantern-last'],
      ['lantern-first', 'lantern-side-a'], ['lantern-side-a', 'lantern-side-b'], ['lantern-side-b', 'lantern-last'],
    ];
    this.rules = path.map(([sourceId, targetId]) => ({ sourceId, targetId, showHint: () => !this.last.isActive }));
    this.rules.push(
      { sourceId: 'lantern-last', targetId: 'party-stage', available: prepared, blockedMessage: 'Faltan preparativos: luz, agua, radio, jardín y desfile' },
      { sourceId: 'party-stage', targetId: 'party-confetti', available: prepared },
    );
  }
  restoreCollected(): void { this.first.activate(); this.last.activate(); }
  refresh(collected: boolean): void {
    if (!this.last.isActive) return;
    this.ground.setTint(0xf1e8be);
    if (!collected && !this.fragment.visible) this.fragment.reveal();
  }
}
