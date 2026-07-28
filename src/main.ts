import Phaser from 'phaser';
import './styles/main.css';
import { gameConfig } from './config/gameConfig';

new Phaser.Game(gameConfig);

// Si el jugador gira el teléfono a mitad de partida, recargamos para
// que el juego se reconstruya con la resolución adecuada a la nueva
// orientación (el progreso queda intacto, se guarda en localStorage).
window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
  window.location.reload();
});
