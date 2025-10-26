import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig';

window.addEventListener('load', () => {
  const game = new Phaser.Game(GameConfig);
  // Mute all sound effects
  game.sound.volume = 0;
});
