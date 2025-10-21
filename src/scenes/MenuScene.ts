import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundPanel!: Phaser.GameObjects.Image;
  private playButton!: Phaser.GameObjects.Container;
  private levelSelectButton!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.createBackground();
    this.createUI();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private createBackground(): void {
    const cam = this.cameras.main;

    this.background = this.add.tileSprite(cam.centerX, cam.centerY, cam.width, cam.height, 'background');
    this.background.setOrigin(0.5);
    this.background.setScrollFactor(0);
    this.background.setDepth(-2);
    this.background.setTint(0xfafafa); // Light gray minimalist background

    this.backgroundPanel = this.add.image(cam.centerX, cam.centerY, 'bg9patch');
    this.backgroundPanel.setScrollFactor(0);
    this.backgroundPanel.setDepth(-1);
    this.backgroundPanel.setAlpha(0); // Hide panel for clean look
  }

  private createUI(): void {
    const cam = this.cameras.main;

    this.titleText = this.add.text(cam.centerX, cam.height * 0.35, 'Jacent', {
      fontFamily: 'Arial',
      fontStyle: 'normal',
      fontSize: '72px',
      color: '#222222',
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(cam.centerX, cam.height * 0.44, 'A puzzle game', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#999999',
    }).setOrigin(0.5);

    this.playButton = this.createButton('Play Now', () => {
      this.sound.play('click02');
      this.scene.start('GameScene', { stageIndex: 0, levelIndex: 0 });
    });

    this.levelSelectButton = this.createButton('Level Select', () => {
      this.sound.play('click02');
      this.scene.start('LevelSelectScene');
    });

    this.layoutUI();
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Container {
    const buttonWidth = 280;
    const buttonHeight = 70;

    const container = this.add.container(0, 0);
    // Ghost button - transparent with subtle border
    const rect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xfafafa, 0);
    rect.setStrokeStyle(1, 0xcccccc, 1);
    rect.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'normal',
      color: '#222222',
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      rect.setStrokeStyle(1, 0x999999, 1);
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0xfafafa, 0);
      rect.setStrokeStyle(1, 0xcccccc, 1);
    });

    rect.on('pointerdown', () => {
      rect.setFillStyle(0xe0e0e0, 1);
      this.sound.play('click01');
    });

    rect.on('pointerup', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      onClick();
    });

    container.add([rect, text]);
    return container;
  }

  private layoutUI(): void {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;

    if (this.background) {
      this.background.setDisplaySize(width, height);
      this.background.setPosition(cam.centerX, cam.centerY);
    }

    if (this.backgroundPanel) {
      this.backgroundPanel.setAlpha(0); // Keep hidden
      this.backgroundPanel.setPosition(cam.centerX, cam.centerY);
    }

    // Mobile-friendly sizing
    const titleSize = Phaser.Math.Clamp(width * 0.12, 40, 72);
    const subtitleSize = Phaser.Math.Clamp(width * 0.04, 16, 24);

    this.titleText.setFontSize(titleSize);
    this.subtitleText.setFontSize(subtitleSize);

    const topOffset = height * 0.3;
    this.titleText.setPosition(cam.centerX, topOffset);
    this.subtitleText.setPosition(cam.centerX, topOffset + titleSize * 0.8);

    const buttonScale = Phaser.Math.Clamp(width / 600, 0.7, 1.0);
    const buttonSpacing = height * 0.025;

    this.playButton.setScale(buttonScale);
    this.levelSelectButton.setScale(buttonScale);

    const buttonsYStart = this.subtitleText.y + subtitleSize + height * 0.08;
    this.playButton.setPosition(cam.centerX, buttonsYStart);
    this.levelSelectButton.setPosition(cam.centerX, buttonsYStart + 80 * buttonScale);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);
    this.layoutUI();
  }
}
