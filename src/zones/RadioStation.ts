import Phaser from 'phaser';
import { ART } from '../art/interfaceArt';
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

  constructor(scene: Phaser.Scene, height: number, _v: number, available: () => boolean) {
    const source = new EnergySource(scene, 1850, height * .70, RADIO_SOURCE_ID);
    this.music = new RadioReceiver(scene, 2020, height * .87, RADIO_TARGETS.music, 'Música al jardín', 0xff9ff3);
    this.news = new RadioReceiver(scene, 2190, height * .87, RADIO_TARGETS.news, 'Noticias a la plaza', 0xffe066);
    this.connectables = [source, this.music, this.news];
    this.status = scene.add.text(1850, height * .50, '', { fontFamily: ART.body, fontSize: '14px', color: '#34494e',
      backgroundColor: '#f2ead9', padding: { x: 6, y: 3 }, align: 'center', wordWrap: { width: 145 } }).setOrigin(0.5).setDepth(12);
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
    this.status.setText(this.channel === 'music' ? 'Emisión: música.\nCambia con otro cable.'
      : this.channel === 'news' ? 'Emisión: noticias.\nCambia con otro cable.'
      : 'Elige un destino.\nPuedes cambiarlo.');
  }
}
