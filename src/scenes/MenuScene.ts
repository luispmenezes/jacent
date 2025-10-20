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

    this.backgroundPanel = this.add.image(cam.centerX, cam.centerY, 'bg9patch');
    this.backgroundPanel.setScrollFactor(0);
    this.backgroundPanel.setDepth(-1);
    this.backgroundPanel.setDisplaySize(cam.width * 0.92, cam.height * 0.92);
  }

  private createUI(): void {
    const cam = this.cameras.main;

    this.titleText = this.add.text(cam.centerX, cam.height * 0.23, 'Jacent', {
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fontSize: '72px',
      color: '#333333',
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(cam.centerX, cam.height * 0.32, 'A +1 merge puzzle', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#666666',
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
    const rect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x1e88e5, 1);
    rect.setStrokeStyle(4, 0x1565c0, 1);
    rect.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0x2196f3, 1);
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0x1e88e5, 1);
    });

    rect.on('pointerdown', () => {
      rect.setFillStyle(0x0d47a1, 1);
      this.sound.play('click01');
    });

    rect.on('pointerup', () => {
      rect.setFillStyle(0x2196f3, 1);
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
      this.backgroundPanel.setDisplaySize(width * 0.92, height * 0.92);
      this.backgroundPanel.setPosition(cam.centerX, cam.centerY);
    }

    const titleSize = Phaser.Math.Clamp(Math.round(width * 0.15), 48, 96);
    const subtitleSize = Phaser.Math.Clamp(Math.round(width * 0.045), 18, 32);

    this.titleText.setFontSize(titleSize);
    this.subtitleText.setFontSize(subtitleSize);

    const topOffset = height * 0.22;
    this.titleText.setPosition(cam.centerX, topOffset);
    this.subtitleText.setPosition(cam.centerX, topOffset + this.titleText.displayHeight * 0.65);

    const buttonScale = Phaser.Math.Clamp(width / 640, 0.6, 1.1);
    const buttonSpacing = Math.max(30, height * 0.04);

    this.playButton.setScale(buttonScale);
    this.levelSelectButton.setScale(buttonScale);

    const buttonsYStart = this.subtitleText.y + this.subtitleText.displayHeight + height * 0.12;
    this.playButton.setPosition(cam.centerX, buttonsYStart);
    this.levelSelectButton.setPosition(cam.centerX, buttonsYStart + buttonSpacing * buttonScale);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);
    this.layoutUI();
  }
}
