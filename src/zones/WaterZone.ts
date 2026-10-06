import Phaser from 'phaser';
import { EnergySource } from '../objects/EnergySource';
import { Fountain } from '../objects/Fountain';
import { Fragment } from '../objects/Fragment';
import { WaterMachine } from '../objects/WaterMachine';
import type { ConnectionRule } from '../systems/ConnectionSystem';
import { LEGACY_WATER, WATER_OUTLETS, waterPressure, type WaterRoute } from '../data/waterCircuit';

/** Electricity powers a pump. Water follows one valve; both routes are reversible. */
export class WaterZone {
  readonly source: EnergySource;
  readonly pump: WaterMachine;
  readonly direct: WaterMachine;
  readonly regulated: WaterMachine;
  readonly fountain: Fountain;
  readonly fragment: Fragment;
  readonly connectables;
  readonly rules: ConnectionRule[];
  private pipes: Phaser.GameObjects.Graphics;
  private status: Phaser.GameObjects.Text;
  private lastState = '';
  constructor(scene: Phaser.Scene, height: number) {
    this.source = new EnergySource(scene, 1230, height * .56, 'fountain-source');
    this.pump = new WaterMachine(scene, 1350, height * .58, 'pump');
    this.direct = new WaterMachine(scene, 1490, height * .48, 'direct');
    this.regulated = new WaterMachine(scene, 1490, height * .72, 'regulated');
    this.fountain = new Fountain(scene, 1630, height * .61);
    this.fragment = new Fragment(scene, 1630, height * .80);
    this.fragment.setDepth(12);
    this.connectables = [this.source, this.pump, this.direct, this.regulated, this.fountain];
    this.pipes = scene.add.graphics().setDepth(9.6);
    this.status = scene.add.text(1460, height * .30, '', { fontFamily: '"Patrick Hand", cursive', fontSize: '15px',
      color: '#34494e', backgroundColor: '#f2ead9', padding: { x: 8, y: 5 }, align: 'center' }).setOrigin(.5).setDepth(12);
    scene.add.text(this.source.x, this.source.groundY + 12, 'Generador · energía', {
      fontFamily: '"Patrick Hand", cursive', fontSize: '13px', color: '#805e24', backgroundColor: '#f2ead9', padding: { x: 4, y: 2 },
    }).setOrigin(.5, 0).setDepth(12);
    const choose = (): void => { this.direct.setPowered(false); this.regulated.setPowered(false); this.fountain.setFlow(0); };
    this.rules = [{ sourceId: this.source.id, targetId: this.pump.id,
      successMessage: 'La bomba transforma energía en agua a 3 bar. Elige una válvula.' },
      ...[this.direct, this.regulated].map(valve => ({ sourceId: this.pump.id, targetId: valve.id,
        exclusiveGroup: 'water-route', invalidates: [...WATER_OUTLETS, LEGACY_WATER], onActivate: choose,
        successMessage: valve === this.direct ? 'Ruta directa: 3 bar para un chorro fuerte.' : 'La reguladora reduce la presión a 2 bar: flujo suave.' })),
      ...[this.direct, this.regulated].map(valve => ({ sourceId: valve.id, targetId: this.fountain.id,
        available: () => valve.isActive, onActivate: () => this.fountain.setFlow(valve === this.direct ? 3 : 2),
        successMessage: valve === this.direct ? 'Fuente restaurada: chorro fuerte a 3 bar.' : 'Fuente restaurada: flujo suave a 2 bar.' }))];
    this.refresh();
  }
  get route(): WaterRoute | null { return this.direct.isActive ? 'direct' : this.regulated.isActive ? 'regulated' : null; }
  refresh(): void {
    const state = `${this.pump.isActive}:${this.route}:${this.fountain.pressure}`;
    if (state === this.lastState) return;
    this.lastState = state;
    this.status.setText(`Bomba: ${this.pump.isActive ? 3 : 0} bar · Fuente: ${this.fountain.pressure} bar\n${this.route ? `Ruta ${this.route === 'direct' ? 'directa' : 'regulada'} · ${waterPressure(this.route)} bar` : 'Elige: chorro fuerte o flujo suave'}`);
    this.pipes.clear();
    const pairs = [[this.source, this.pump], [this.pump, this.direct], [this.pump, this.regulated], [this.direct, this.fountain], [this.regulated, this.fountain]] as const;
    for (const [source, target] of pairs) {
      const a = source.getPlugPoint(), b = target.getInputPoint();
      const active = target === this.pump ? this.pump.isActive : target === this.fountain
        ? source.isActive && this.fountain.isActive : target.isActive;
      const curve = new Phaser.Curves.QuadraticBezier(a, new Phaser.Math.Vector2((a.x + b.x) / 2, Math.max(a.y, b.y) + 20), b);
      this.pipes.lineStyle(active ? 5 : 2, active ? source === this.source ? 0xd8a640 : 0x2b9fb6 : 0x657b79, active ? .9 : .35);
      curve.draw(this.pipes, 16);
    }
  }
}
