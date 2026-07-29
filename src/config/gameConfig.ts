import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { CustomizeScene } from '../scenes/CustomizeScene';
import { WorldScene } from '../scenes/WorldScene';
import { MuseumScene } from '../scenes/MuseumScene';
import { CableTunnelScene } from '../scenes/CableTunnelScene';

function isPortraitTouch(): boolean {
  return window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
}

// En celulares sostenidos en vertical usamos una resolución vertical
// para que el juego llene la pantalla en vez de quedar en una franja
// angosta con barras negras arriba y abajo.
const [GAME_WIDTH, GAME_HEIGHT] = isPortraitTouch() ? [540, 960] : [960, 540];

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#f4f1e8',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, CustomizeScene, WorldScene, MuseumScene, CableTunnelScene],
};
