import Phaser from 'phaser';
import { EnergySource } from '../objects/EnergySource';
import { RadioReceiver } from '../objects/RadioReceiver';
import type { ConnectionRule } from '../systems/ConnectionSystem';
import { RADIO_SOURCE_ID, RADIO_TARGETS, type RadioChannel } from '../data/radio';

/** One signal, two destinations. Changing the cable changes the emission. */
export class RadioStation {
  readonly music: RadioReceiver;
  readonly news: RadioReceiver;
  readonly connectables;
  readonly rules: ConnectionRule[];
  private status: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, height: number, v: number, available: () => boolean) {
    const y = height / 2;
    const source = new EnergySource(scene, 1680, y - 10 * v, RADIO_SOURCE_ID);
    this.music = new RadioReceiver(scene, 1840, y - 90 * v, RADIO_TARGETS.music, 'Música al jardín', 0xff9ff3);
    this.news = new RadioReceiver(scene, 1840, y + 75 * v, RADIO_TARGETS.news, 'Noticias a la plaza', 0xffe066);
    this.connectables = [source, this.music, this.news];
    scene.add.text(1760, y - 170 * v, 'CUAC FM · una señal', { fontFamily: 'sans-serif', fontSize: '18px', color: '#4a3c63' }).setOrigin(0.5).setDepth(2);
    this.status = scene.add.text(1770, y + 155 * v, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#20233a', align: 'center', wordWrap: { width: 260 } }).setOrigin(0.5).setDepth(9);
    this.rules = [this.music, this.news].map(receiver => ({
      sourceId: source.id, targetId: receiver.id, exclusiveGroup: 'radio-emission', available,
      blockedMessage: 'La antena necesita sus dos señales antes de emitir.',
      showHint: () => !this.channel,
      onActivate: () => { this.music.setPowered(false); this.news.setPowered(false); },
    }));
    this.refresh();
  }

  get channel(): RadioChannel | null { return this.music.isActive ? 'music' : this.news.isActive ? 'news' : null; }

  refresh(): void {
    this.status.setText(this.channel === 'music' ? 'Emisión: música al jardín. Puedes cambiar el destino.'
      : this.channel === 'news' ? 'Emisión: noticias a la plaza. Puedes cambiar el destino.'
      : 'Elige un destino. Puedes cambiarlo con otro cable.');
  }
}
