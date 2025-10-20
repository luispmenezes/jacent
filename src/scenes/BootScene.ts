import Phaser from 'phaser';
import { AssetConfig } from '../config/AssetConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5, 0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load tile sprites (18 frames)
    for (let i = 0; i < 18; i++) {
      this.load.image(`tile-${i}`, `assets/sprites/${String(i).padStart(3, '0')}.png`);
    }

    // Load UI assets
    this.load.image('background', AssetConfig.ui.background);
    this.load.image('bg9patch', AssetConfig.ui.bg9patch);
    this.load.image('scoreBar', AssetConfig.ui.scoreBar);
    this.load.image('timeLine', AssetConfig.ui.timeLine);
    this.load.image('timeLineBG', AssetConfig.ui.timeLineBG);
    this.load.image('pausedOverlay', AssetConfig.ui.pausedOverlay);

    // Load restart button sprites
    this.load.image('restart-idle', AssetConfig.sprites.restart.idle);
    this.load.image('restart-pressed', AssetConfig.sprites.restart.pressed);

    // Load sounds
    this.load.audio('click01', AssetConfig.sounds.click01);
    this.load.audio('click02', AssetConfig.sounds.click02);
    this.load.audio('right', AssetConfig.sounds.right);
    this.load.audio('wrong', AssetConfig.sounds.wrong);
    this.load.audio('success1', AssetConfig.sounds.success1);
    this.load.audio('success2', AssetConfig.sounds.success2);
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
