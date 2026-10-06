import Phaser from 'phaser';
import { RadioReceiver } from '../objects/RadioReceiver';
import type { ConnectionRule } from '../systems/ConnectionSystem';
import type { RadioChannel } from '../data/radio';
import type { chapterTask } from '../data/chapter';

type Task = ReturnType<typeof chapterTask>;

/** Optional return visits; solved local projects remain solved when radio changes. */
export class ReturnCircuits {
  readonly bulletin: RadioReceiver;
  readonly band: RadioReceiver;
  readonly connectables;
  readonly rules: ConnectionRule[];
  private channel: () => RadioChannel | null;
  private plazaReady: () => boolean;
  private gardenReady: () => boolean;
  private notes: Phaser.GameObjects.Text;
  private bulletinText: Phaser.GameObjects.Text;
  private bandText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, height: number, v: number, channel: () => RadioChannel | null,
    plazaReady: () => boolean, gardenReady: () => boolean) {
    this.channel = channel;
    this.plazaReady = plazaReady;
    this.gardenReady = gardenReady;
    const y = height / 2;
    this.bulletin = new RadioReceiver(scene, 1060, y - 50 * v, 'plaza-bulletin', 'Cartel de Miga', 0xffe066);
    this.band = new RadioReceiver(scene, 3650, y - 50 * v, 'garden-band', 'Escenario de flores', 0xff9ff3);
    this.connectables = [this.bulletin, this.band];
    this.rules = [
      { sourceId: 'lamp', targetId: this.bulletin.id, available: () => channel() === 'news' && plazaReady(),
        restoreAvailable: plazaReady, blockedMessage: 'Miga espera noticias de CUAC FM y la plaza restaurada.' },
      { sourceId: 'garden-sprinkler', targetId: this.band.id, available: () => channel() === 'music' && gardenReady(),
        restoreAvailable: gardenReady, blockedMessage: 'Las flores necesitan agua y música de CUAC FM.' },
    ];
    this.notes = scene.add.text(3500, y - 135 * v, '♫  ♪  ♫', { fontFamily: 'sans-serif', fontSize: '30px', color: '#9d367c' }).setOrigin(0.5).setDepth(3);
    this.bulletinText = scene.add.text(1060, y - 145 * v, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#4a3c63', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5).setDepth(3);
    this.bandText = scene.add.text(3650, y - 150 * v, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#4a3c63', align: 'center', wordWrap: { width: 190 } }).setOrigin(0.5).setDepth(3);
    this.refresh();
  }

  refresh(): void {
    this.notes.setVisible(this.channel() === 'music' && this.gardenReady());
    this.bulletinText.setText(this.bulletin.isActive ? 'COMUNICADO:\nProhibido prohibir tostadas.' : this.channel() === 'news' ? 'Miga necesita publicar un anuncio' : 'Un cartel esperando noticias');
    this.bandText.setText(this.band.isActive ? 'LAS FLORES EN CONCIERTO\nGira mundial: este parterre.' : this.channel() === 'music' ? 'Las flores quieren dar un concierto' : 'Un escenario esperando música');
  }

  taskNear(x: number): Task | undefined {
    if (this.channel() === 'news' && this.plazaReady() && !this.bulletin.isActive && Math.abs(x - this.bulletin.x) < 450)
      return { id: 'plaza-bulletin', objective: 'Miga necesita publicar las noticias', clues: [
        'La noticia ya llegó al barrio, pero nadie puede leerla.', 'La lámpara encendida puede llevar la señal al cartel.', 'Lámpara → cartel de Miga.',
      ] };
    if (this.channel() === 'music' && this.gardenReady() && !this.band.isActive && Math.abs(x - this.band.x) < 450)
      return { id: 'garden-band', objective: 'Las flores quieren dar un concierto', clues: [
        'La música llegó, pero las flores todavía no tienen escenario.', 'El aspersor encendido puede llevar la señal a su escenario.', 'Aspersor → escenario de flores.',
      ] };
    return undefined;
  }

  residentLine(id: string): string | undefined {
    if (id === 'miga') {
      if (this.bulletin.isActive) return 'Publicado: prohibido prohibir tostadas. He prohibido una prohibición. Necesito vacaciones.';
      if (this.channel() === 'news' && this.plazaReady()) return 'La radio envió un anuncio absurdo. Tengo un cartel apagado y demasiadas tostadas. ¿Lo hacemos legible?';
    }
    if (id === 'goteo') {
      if (this.band.isActive) return 'Las flores dieron su concierto. Exigen camerino. Les ofrecí una maceta; negociamos.';
      if (this.channel() === 'music' && this.gardenReady()) return '¡La radio despertó una banda! Las flores piden escenario. Mi mandato acaba de convertirse en un festival.';
    }
    if (id === 'vera' && this.channel()) return this.channel() === 'music'
      ? 'Música enviada al jardín. Goteo tiene un encargo nuevo si sus flores ya despertaron.'
      : 'Noticias enviadas a la plaza. Miga tiene un cartel que necesita ayuda.';
    return undefined;
  }
}
