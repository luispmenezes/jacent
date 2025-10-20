import Phaser from 'phaser';
import { stages, StageDefinition } from '../config/StageConfig';

interface LevelButton {
  container: Phaser.GameObjects.Container;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  stageIndex: number;
  levelIndex: number;
}

export class LevelSelectScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundPanel!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private stageHeader!: Phaser.GameObjects.Text;
  private backButton!: Phaser.GameObjects.Container;
  private levelButtons: LevelButton[] = [];

  constructor() {
    super({ key: 'LevelSelectScene' });
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
  }

  private createUI(): void {
    const cam = this.cameras.main;

    this.titleText = this.add.text(cam.centerX, cam.height * 0.18, 'Select Level', {
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fontSize: '60px',
      color: '#333333',
    }).setOrigin(0.5);

    this.stageHeader = this.add.text(cam.centerX, cam.height * 0.26, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#666666',
    }).setOrigin(0.5);

    this.backButton = this.createButton('Back', () => {
      this.sound.play('click02');
      this.scene.start('MenuScene');
    });

    this.createLevelButtons();
    this.layoutUI();
  }

  private createLevelButtons(): void {
    this.levelButtons.forEach((btn) => btn.container.destroy());
    this.levelButtons = [];

    stages.forEach((stage, stageIndex) => {
      stage.levels.forEach((_level, levelIndex) => {
        const button = this.buildLevelButton(stage, stageIndex, levelIndex);
        this.levelButtons.push(button);
      });
    });
  }

  private buildLevelButton(stage: StageDefinition, stageIndex: number, levelIndex: number): LevelButton {
    const container = this.add.container(0, 0);

    const rect = this.add.rectangle(0, 0, 220, 70, 0xffffff, 1);
    rect.setStrokeStyle(4, 0x1e88e5);
    rect.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, `${stage.name} - Level ${levelIndex + 1}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#1e88e5',
      align: 'center',
      wordWrap: { width: 180 },
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0xe3f2fd, 1);
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0xffffff, 1);
    });

    rect.on('pointerdown', () => {
      rect.setFillStyle(0xbbdefb, 1);
      this.sound.play('click01');
    });

    rect.on('pointerup', () => {
      rect.setFillStyle(0xe3f2fd, 1);
      this.sound.play('click02');
      this.scene.start('GameScene', { stageIndex, levelIndex });
    });

    container.add([rect, label]);

    return { container, rect, label, stageIndex, levelIndex };
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const rect = this.add.rectangle(0, 0, 200, 60, 0x1e88e5, 1);
    rect.setStrokeStyle(4, 0x1565c0, 1);
    rect.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    rect.on('pointerover', () => rect.setFillStyle(0x2196f3));
    rect.on('pointerout', () => rect.setFillStyle(0x1e88e5));
    rect.on('pointerdown', () => {
      rect.setFillStyle(0x0d47a1);
      this.sound.play('click01');
    });
    rect.on('pointerup', () => {
      rect.setFillStyle(0x2196f3);
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
      this.backgroundPanel.setDisplaySize(width * 0.94, height * 0.94);
      this.backgroundPanel.setPosition(cam.centerX, cam.centerY);
    }

    const titleSize = Phaser.Math.Clamp(Math.round(width * 0.13), 42, 82);
    const stageSize = Phaser.Math.Clamp(Math.round(width * 0.05), 18, 30);

    this.titleText.setFontSize(titleSize);
    this.stageHeader.setFontSize(stageSize);

    this.titleText.setPosition(cam.centerX, height * 0.18);
    this.stageHeader.setPosition(cam.centerX, this.titleText.y + this.titleText.displayHeight * 0.6);

    const buttonScale = Phaser.Math.Clamp(width / 720, 0.55, 0.95);
    this.backButton.setScale(buttonScale);
    this.backButton.setPosition(cam.centerX, height - this.backButton.getBounds().height * buttonScale - height * 0.08);

    const availableHeight = this.backButton.y - this.stageHeader.y - this.stageHeader.displayHeight - height * 0.12;
    const columns = width > 600 ? 2 : 1;
    const buttonWidth = 240 * buttonScale;
    const buttonHeight = 80 * buttonScale;
    const columnSpacing = Math.max(40, width * 0.08);
    const rowSpacing = Math.max(24, availableHeight * 0.1);

    const startX = cam.centerX - ((columns - 1) * (buttonWidth + columnSpacing)) / 2;
    let currentColumn = 0;
    let currentRow = 0;

    this.levelButtons.forEach((button) => {
      button.container.setScale(buttonScale);
      const x = startX + currentColumn * (buttonWidth + columnSpacing);
      const y = this.stageHeader.y + this.stageHeader.displayHeight + height * 0.08 + currentRow * (buttonHeight + rowSpacing);
      button.container.setPosition(x, y);

      currentColumn++;
      if (currentColumn >= columns) {
        currentColumn = 0;
        currentRow++;
      }
    });

    const totalLevels = stages.reduce((sum, stage) => sum + stage.levels.length, 0);
    const stageLabel = stages.length === 1 ? stages[0].name : `${stages.length} Stages`;
    const levelLabel = `${totalLevels} level${totalLevels === 1 ? '' : 's'}`;
    this.stageHeader.setText(`${stageLabel} • ${levelLabel}`);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);
    this.layoutUI();
  }
}
