import Phaser from 'phaser';
import { stages } from '../config/StageConfig';

interface LevelButton {
  container: Phaser.GameObjects.Container;
  rect: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  stageIndex: number;
  levelIndex: number;
}

interface StageGroup {
  stageIndex: number;
  header: Phaser.GameObjects.Text;
  buttons: LevelButton[];
}

export class LevelSelectScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundPanel!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private stageHeader!: Phaser.GameObjects.Text;
  private backButton!: Phaser.GameObjects.Container;
  private stageGroups: StageGroup[] = [];
  private scrollContainer!: Phaser.GameObjects.Container;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartX: number = 0;
  private scrollY: number = 0;
  private minScrollY: number = 0;
  private maxScrollY: number = 0;
  private hasMoved: boolean = false;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.createBackground();
    this.createUI();
    this.setupScrolling();

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

    this.titleText = this.add.text(cam.centerX, cam.height * 0.18, 'Levels', {
      fontFamily: 'Arial',
      fontStyle: 'normal',
      fontSize: '60px',
      color: '#222222',
    }).setOrigin(0.5);

    this.stageHeader = this.add.text(cam.centerX, cam.height * 0.26, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#999999',
    }).setOrigin(0.5);

    // Create scrollable container for level buttons
    this.scrollContainer = this.add.container(0, 0);

    this.backButton = this.createButton('Back', () => {
      this.sound.play('click02');
      this.scene.start('MenuScene');
    });

    this.createLevelButtons();
    this.layoutUI();
  }

  private createLevelButtons(): void {
    // Clear existing groups
    this.stageGroups.forEach((group) => {
      group.header.destroy();
      group.buttons.forEach((btn) => btn.container.destroy());
    });
    this.stageGroups = [];
    this.scrollContainer.removeAll();

    // Create groups for each stage
    stages.forEach((stage, stageIndex) => {
      // Create stage header
      const header = this.add.text(0, 0, stage.name, {
        fontFamily: 'Arial',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#222222',
      }).setOrigin(0, 0.5);

      // Create level buttons for this stage
      const buttons: LevelButton[] = [];
      stage.levels.forEach((_level, levelIndex) => {
        const button = this.buildLevelButton(stageIndex, levelIndex);
        buttons.push(button);
        this.scrollContainer.add(button.container);
      });

      // Add header to scroll container
      this.scrollContainer.add(header);

      this.stageGroups.push({ stageIndex, header, buttons });
    });
  }

  private buildLevelButton(stageIndex: number, levelIndex: number): LevelButton {
    const container = this.add.container(0, 0);

    // Minimal ghost button with subtle border
    const rect = this.add.rectangle(0, 0, 200, 70, 0xfafafa, 0);
    rect.setStrokeStyle(1, 0xcccccc);
    rect.setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, `Level ${levelIndex + 1}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'normal',
      color: '#222222',
      align: 'center',
      wordWrap: { width: 170 },
    }).setOrigin(0.5);

    rect.on('pointerover', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      rect.setStrokeStyle(1, 0x999999);
    });

    rect.on('pointerout', () => {
      rect.setFillStyle(0xfafafa, 0);
      rect.setStrokeStyle(1, 0xcccccc);
    });

    rect.on('pointerdown', () => {
      rect.setFillStyle(0xe0e0e0, 1);
      this.sound.play('click01');
    });

    rect.on('pointerup', () => {
      rect.setFillStyle(0xf0f0f0, 1);
      this.sound.play('click02');
      this.scene.start('GameScene', { stageIndex, levelIndex });
    });

    container.add([rect, label]);

    return { container, rect, label, stageIndex, levelIndex };
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    // Ghost button - transparent with subtle border
    const rect = this.add.rectangle(0, 0, 200, 60, 0xfafafa, 0);
    rect.setStrokeStyle(1, 0xcccccc, 1);
    rect.setInteractive({ useHandCursor: true });

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '22px',
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
    const titleSize = Phaser.Math.Clamp(width * 0.1, 36, 60);
    const stageSize = Phaser.Math.Clamp(width * 0.04, 16, 22);

    this.titleText.setFontSize(titleSize);
    this.stageHeader.setFontSize(stageSize);

    const topPadding = height * 0.12;
    this.titleText.setPosition(cam.centerX, topPadding);
    this.stageHeader.setPosition(cam.centerX, topPadding + titleSize + 10);

    // Back button fixed at bottom
    const buttonScale = Phaser.Math.Clamp(width / 600, 0.7, 1.0);
    this.backButton.setScale(buttonScale);
    const bottomPadding = Math.max(20, height * 0.04);
    this.backButton.setPosition(cam.centerX, height - bottomPadding - 30 * buttonScale);

    // Calculate button dimensions
    const baseButtonWidth = 200;
    const baseButtonHeight = 70;
    const scaledButtonWidth = baseButtonWidth * buttonScale;
    const scaledButtonHeight = baseButtonHeight * buttonScale;
    const horizontalSpacing = 16;
    const verticalSpacing = 16;
    const stageSpacing = 40; // Extra spacing between stages
    const headerHeight = 30;

    // Calculate maximum columns that fit
    const availableWidth = width - 40; // 20px padding on each side
    const columns = Math.max(1, Math.floor((availableWidth + horizontalSpacing) / (scaledButtonWidth + horizontalSpacing)));

    // Calculate total grid width and center it
    const totalGridWidth = (columns * scaledButtonWidth) + ((columns - 1) * horizontalSpacing);
    const startX = (width - totalGridWidth) / 2;

    // Calculate scroll area bounds
    const scrollAreaTop = this.stageHeader.y + stageSize + 20;
    const scrollAreaBottom = this.backButton.y - 30 * buttonScale - 20;
    const availableHeight = scrollAreaBottom - scrollAreaTop;

    // Layout stage groups
    let currentY = 0;

    this.stageGroups.forEach((group) => {
      // Position stage header
      group.header.setPosition(startX, currentY + headerHeight / 2);
      group.header.setFontSize(Math.min(24, 24 * buttonScale));
      currentY += headerHeight + 10;

      // Layout buttons for this stage in grid
      let currentColumn = 0;
      let currentRow = 0;

      group.buttons.forEach((button) => {
        button.container.setScale(buttonScale);
        const x = startX + currentColumn * (scaledButtonWidth + horizontalSpacing) + scaledButtonWidth / 2;
        const y = currentY + currentRow * (scaledButtonHeight + verticalSpacing) + scaledButtonHeight / 2;
        button.container.setPosition(x, y);

        currentColumn++;
        if (currentColumn >= columns) {
          currentColumn = 0;
          currentRow++;
        }
      });

      // Move to next stage
      const stageRows = Math.ceil(group.buttons.length / columns);
      currentY += stageRows * (scaledButtonHeight + verticalSpacing) + stageSpacing;
    });

    // Position scroll container
    this.scrollContainer.setPosition(0, scrollAreaTop);

    // Calculate scroll bounds
    const contentHeight = currentY - stageSpacing; // Remove extra spacing at end

    this.minScrollY = 0;
    this.maxScrollY = Math.max(0, contentHeight - availableHeight);

    // Reset scroll position
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);
    this.scrollContainer.setY(scrollAreaTop - this.scrollY);

    const totalLevels = stages.reduce((sum, stage) => sum + stage.levels.length, 0);
    this.stageHeader.setText(`${totalLevels} level${totalLevels === 1 ? '' : 's'}`);
  }

  private setupScrolling(): void {
    // Enable pointer input for scrolling
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.hasMoved = false;
      this.dragStartY = pointer.y;
      this.dragStartX = pointer.x;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;

      const deltaY = pointer.y - this.dragStartY;
      const deltaX = Math.abs(pointer.x - this.dragStartX);

      // Only start scrolling if moved more than 5 pixels vertically
      if (!this.hasMoved && (Math.abs(deltaY) > 5 || deltaX > 5)) {
        this.hasMoved = true;
      }

      if (this.hasMoved && this.maxScrollY > 0) {
        this.dragStartY = pointer.y;
        this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY, this.minScrollY, this.maxScrollY);

        // Calculate scroll area bounds for container positioning
        const cam = this.cameras.main;
        const height = cam.height;
        const width = cam.width;
        const titleSize = Phaser.Math.Clamp(width * 0.1, 36, 60);
        const stageSize = Phaser.Math.Clamp(width * 0.04, 16, 22);
        const topPadding = height * 0.12;
        const scrollAreaTop = topPadding + titleSize + 10 + stageSize + 20;

        this.scrollContainer.setY(scrollAreaTop - this.scrollY);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.hasMoved = false;
    });

    // Mouse wheel scrolling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, this.minScrollY, this.maxScrollY);

      const cam = this.cameras.main;
      const height = cam.height;
      const width = cam.width;
      const titleSize = Phaser.Math.Clamp(width * 0.1, 36, 60);
      const stageSize = Phaser.Math.Clamp(width * 0.04, 16, 22);
      const topPadding = height * 0.12;
      const scrollAreaTop = topPadding + titleSize + 10 + stageSize + 20;

      this.scrollContainer.setY(scrollAreaTop - this.scrollY);
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);
    this.layoutUI();
  }
}
