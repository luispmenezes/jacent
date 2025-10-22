import Phaser from 'phaser';
import { Grid } from '../objects/Grid';
import { Tile } from '../objects/Tile';
import { stages, StageDefinition } from '../config/StageConfig';

interface GameState {
  tiles: { digit: number; gridX: number; gridY: number }[];
  moves: number;
}
export class GameScene extends Phaser.Scene {
  private grid: Grid | null = null;
  private moves: number = 0;
  private par: number = 0; // Target moves for current level
  private movesText!: Phaser.GameObjects.Text;
  private parText!: Phaser.GameObjects.Text;
  private tilesRemainingText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private movesLabel!: Phaser.GameObjects.Text;
  private tilesLabel!: Phaser.GameObjects.Text;
  private gameActive: boolean = true;
  private restartButton!: Phaser.GameObjects.Text;
  private undoButton!: Phaser.GameObjects.Text;
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundPanel!: Phaser.GameObjects.Image;
  private undoStack: GameState[] = [];
  private maxUndos: number = 3;
  private legalTargets: Tile[] = [];
  private currentStageIndex: number = 0;
  private currentLevelIndex: number = 0;
  private readonly stages: StageDefinition[] = stages;
  private gridBounds: { top: number; bottom: number; left: number; right: number } | null = null;
  private initialStageIndex: number = 0;
  private initialLevelIndex: number = 0;
  private emptyTiles: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { stageIndex?: number; levelIndex?: number }): void {
    const requestedStage = data?.stageIndex ?? 0;
    const clampedStage = Phaser.Math.Clamp(requestedStage, 0, this.stages.length - 1);
    const stage = this.stages[clampedStage];
    const requestedLevel = data?.levelIndex ?? 0;
    const clampedLevel = Phaser.Math.Clamp(requestedLevel, 0, stage.levels.length - 1);

    this.initialStageIndex = clampedStage;
    this.initialLevelIndex = clampedLevel;
  }

  create(): void {
    this.moves = 0;
    this.gameActive = true;
    this.undoStack = [];
    this.currentStageIndex = this.initialStageIndex;
    this.currentLevelIndex = this.initialLevelIndex;
    this.grid = null;
    this.emptyTiles = [];

    this.createBackground();
    this.createUI();
    this.createGrid();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private createBackground(): void {
    const cam = this.cameras.main;

    // Solid minimalist background
    this.background = this.add.tileSprite(cam.centerX, cam.centerY, cam.width, cam.height, 'background');
    this.background.setOrigin(0.5);
    this.background.setScrollFactor(0);
    this.background.setDepth(-2);
    this.background.setTint(0xfafafa); // Light gray background

    // Remove 9-patch panel for clean look
    this.backgroundPanel = this.add.image(cam.centerX, cam.centerY, 'bg9patch');
    this.backgroundPanel.setScrollFactor(0);
    this.backgroundPanel.setDepth(-1);
    this.backgroundPanel.setAlpha(0); // Hide the panel completely

    this.updateBackgroundDimensions();
  }

  private createUI(): void {
    const primaryColor = '#222222';
    const mutedColor = '#999999';

    // Will be updated to show current stage and level
    this.titleText = this.add.text(0, 0, '', {
      fontSize: '48px',
      color: primaryColor,
      fontFamily: 'Arial',
      fontStyle: 'normal',
    }).setOrigin(0.5);

    // Hidden label (not used)
    this.movesLabel = this.add.text(0, 0, '', {
      fontSize: '1px',
      color: mutedColor,
      fontFamily: 'Arial',
    });
    this.movesLabel.setVisible(false);

    this.movesText = this.add.text(0, 0, '0', {
      fontSize: '36px',
      color: primaryColor,
      fontFamily: 'Arial',
      fontStyle: 'normal',
    });

    // Simplified par display as subscript
    this.parText = this.add.text(0, 0, `/${this.par}`, {
      fontSize: '18px',
      color: mutedColor,
      fontFamily: 'Arial',
      fontStyle: 'normal',
    });

    // Hidden tiles counter (not needed during gameplay)
    this.tilesLabel = this.add.text(0, 0, '', {
      fontSize: '1px',
      color: mutedColor,
      fontFamily: 'Arial',
    });
    this.tilesLabel.setVisible(false);

    this.tilesRemainingText = this.add.text(0, 0, '', {
      fontSize: '1px',
      color: primaryColor,
      fontFamily: 'Arial',
    });
    this.tilesRemainingText.setVisible(false);

    // Text-based restart button
    this.restartButton = this.add.text(0, 0, 'Restart', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'normal',
      color: '#666666',
    });
    this.restartButton.setInteractive({ useHandCursor: true });
    this.restartButton.setAlpha(0.7);

    this.restartButton.on('pointerover', () => {
      this.restartButton.setColor('#222222');
      this.restartButton.setAlpha(1);
    });

    this.restartButton.on('pointerout', () => {
      this.restartButton.setColor('#666666');
      this.restartButton.setAlpha(0.7);
    });

    this.restartButton.on('pointerdown', () => {
      this.sound.play('click01');
    });

    this.restartButton.on('pointerup', () => {
      this.sound.play('click02');
      this.restartGame();
    });

    // Text-based undo button
    this.undoButton = this.add.text(0, 0, 'Undo', {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'normal',
      color: '#666666',
    });
    this.undoButton.setInteractive({ useHandCursor: true });
    this.undoButton.setAlpha(0.7);

    this.undoButton.on('pointerover', () => {
      if (this.undoStack.length > 0 && this.gameActive) {
        this.undoButton.setColor('#222222');
        this.undoButton.setAlpha(1);
      }
    });

    this.undoButton.on('pointerout', () => {
      this.undoButton.setColor('#666666');
      const alpha = this.undoStack.length > 0 ? 0.7 : 0.3;
      this.undoButton.setAlpha(alpha);
    });

    this.undoButton.on('pointerdown', () => {
      if (this.undoStack.length > 0 && this.gameActive) {
        this.sound.play('click01');
        this.performUndo();
      }
    });

    // Hidden instruction text (not used in minimalist design)
    this.instructionsText = this.add.text(0, 0, '', {
      fontSize: '1px',
      color: '#999999',
      fontFamily: 'Arial',
    });
    this.instructionsText.setVisible(false);

    this.goalText = this.add.text(0, 0, '', {
      fontSize: '1px',
      color: '#999999',
      fontFamily: 'Arial',
    });
    this.goalText.setVisible(false);

    this.updateUndoButton();
    this.layoutUI();
  }

  private createGrid(): void {
    this.startLevel(this.currentLevelIndex);
  }

  private layoutUI(): void {
    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;
    const centerX = cam.centerX;

    this.updateBackgroundDimensions();

    // Better mobile-friendly sizing
    const safePadding = Phaser.Math.Clamp(width * 0.04, 12, 24);
    const titleSize = Phaser.Math.Clamp(width * 0.04, 16, 24);
    const valueSize = Phaser.Math.Clamp(width * 0.07, 24, 40);
    const smallSize = Phaser.Math.Clamp(width * 0.035, 14, 20);
    const buttonTextSize = Phaser.Math.Clamp(width * 0.032, 14, 18);

    this.restartButton.setFontSize(buttonTextSize);
    this.undoButton.setFontSize(buttonTextSize);

    if (this.backgroundPanel) {
      this.backgroundPanel.setDisplaySize(width - safePadding * 1.2, height - safePadding * 1.2);
    }

    // Title at top center
    this.titleText.setFontSize(titleSize);
    this.titleText.setPosition(centerX, safePadding + titleSize / 2);

    // Moves counter on left
    this.movesText.setFontSize(valueSize);
    this.movesText.setOrigin(0, 0);
    this.movesText.setPosition(safePadding, this.titleText.y + titleSize / 2 + safePadding * 0.8);

    // Par text right next to moves
    this.parText.setFontSize(smallSize);
    this.parText.setOrigin(0, 1);
    this.parText.setPosition(
      this.movesText.x + this.movesText.displayWidth + 2,
      this.movesText.y + this.movesText.displayHeight
    );

    // Buttons on the right side
    this.undoButton.setOrigin(1, 0);
    this.undoButton.setPosition(width - safePadding, this.movesText.y);

    this.restartButton.setOrigin(1, 0);
    this.restartButton.setPosition(
      this.undoButton.x - this.undoButton.displayWidth - safePadding * 1.2,
      this.movesText.y
    );

    // Calculate grid bounds
    const hudBottom = Math.max(
      this.movesText.y + this.movesText.displayHeight,
      this.undoButton.y + this.undoButton.displayHeight
    );
    const gridTop = hudBottom + safePadding * 1.5;
    const gridBottom = height - safePadding;
    const gridLeft = safePadding;
    const gridRight = width - safePadding;

    this.gridBounds = {
      top: gridTop,
      bottom: gridBottom,
      left: gridLeft,
      right: gridRight,
    };

    if (this.grid) {
      const grid = this.grid;
      const gridSize = grid.getGridSize();
      const tileSize = this.getTileSizeForGrid(gridSize);
      const { x: centerGridX, y: centerGridY } = this.getGridCenter();
      grid.updateLayout({ tileSize, centerX: centerGridX, centerY: centerGridY });

      // Update empty tile positions and scale
      let emptyIndex = 0;
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (emptyIndex < this.emptyTiles.length) {
            const pos = grid.getWorldPosition(x, y);
            const emptyTile = this.emptyTiles[emptyIndex];
            emptyTile.setPosition(pos.x, pos.y);
            const targetScale = tileSize / 24; // 24 is the source sprite size
            emptyTile.setScale(targetScale);
            emptyIndex++;
          }
        }
      }
    }
  }

  private startLevel(levelIndex: number): void {
    const stage = this.stages[this.currentStageIndex];
    const nextLevelIndex = Phaser.Math.Clamp(levelIndex, 0, stage.levels.length - 1);

    this.currentLevelIndex = nextLevelIndex;
    const level = stage.levels[nextLevelIndex];

    this.par = level.par;
    this.moves = 0;
    this.gameActive = true;
    this.undoStack = [];
    this.legalTargets = [];
    this.parText.setText(`/${this.par}`);

    // Update title to show current stage and level
    this.titleText.setText(`${stage.name} - Level ${nextLevelIndex + 1}`);

    if (this.grid) {
      this.grid.clear();
      this.grid = null;
    }

    // Clear old empty tile sprites
    this.emptyTiles.forEach((sprite) => sprite.destroy());
    this.emptyTiles = [];

    this.layoutUI();

    const tileSize = this.getTileSizeForGrid(level.gridSize);
    const { x: centerGridX, y: centerGridY } = this.getGridCenter();
    const grid = new Grid(this, level.gridSize, tileSize, { x: centerGridX, y: centerGridY });
    this.grid = grid;

    // Add empty tile backgrounds for all grid positions
    for (let y = 0; y < level.gridSize; y++) {
      for (let x = 0; x < level.gridSize; x++) {
        const pos = grid.getWorldPosition(x, y);
        const emptyTile = this.add.sprite(pos.x, pos.y, 'tile-empty');
        const targetScale = tileSize / emptyTile.width;
        emptyTile.setScale(targetScale);
        emptyTile.setDepth(-1); // Behind numbered tiles
        this.emptyTiles.push(emptyTile);
      }
    }

    let index = 0;
    for (let y = 0; y < level.gridSize; y++) {
      for (let x = 0; x < level.gridSize; x++) {
        const digit = level.layout[y]?.[x] ?? null;
        if (digit === null) {
          continue;
        }

        const pos = grid.getWorldPosition(x, y);
        const tile = new Tile(this, pos.x, pos.y, digit, x, y);

        // Scale tile to match grid tile size
        const targetScale = tileSize / tile.width;

        tile.on('dragstart', () => {
          this.handleTileDragStart(tile);
        });

        tile.on('drag', () => {
          this.handleTileDrag(tile);
        });

        tile.on('drop', (droppedTile: Tile) => {
          this.handleTileDrop(droppedTile);
        });

        grid.addTile(tile, x, y);

        // Add entrance animation with proper scaling
        tile.setAlpha(0);
        tile.setScale(0);
        this.tweens.add({
          targets: tile,
          alpha: 1,
          scale: targetScale,
          duration: 300,
          delay: index * 20,
          ease: 'Back.easeOut',
        });

        index++;
      }
    }

    this.input.setDraggable(grid.getAllTiles());
    this.updateUndoButton();
    this.updateUI();
  }

  private getTileSizeForGrid(gridSize: number): number {
    if (!this.gridBounds) {
      const cam = this.cameras.main;
      return Math.floor(Math.min(cam.width, cam.height) / (gridSize + 1));
    }

    const availableWidth = this.gridBounds.right - this.gridBounds.left;
    const availableHeight = this.gridBounds.bottom - this.gridBounds.top;

    // Calculate tile size (no gaps - sprites have built-in borders)
    const widthSize = availableWidth / gridSize;
    const heightSize = availableHeight / gridSize;

    const size = Math.floor(Math.min(widthSize, heightSize));

    // Adjust min/max for mobile - smaller minimum, larger maximum
    return Phaser.Math.Clamp(size, 40, 140);
  }

  private getGridCenter(): { x: number; y: number } {
    if (!this.gridBounds) {
      const cam = this.cameras.main;
      return { x: cam.centerX, y: cam.centerY };
    }

    const centerX = this.gridBounds.left + (this.gridBounds.right - this.gridBounds.left) / 2;
    const centerY = this.gridBounds.top + (this.gridBounds.bottom - this.gridBounds.top) / 2;
    return { x: centerX, y: centerY };
  }

  private handleTileDragStart(tile: Tile): void {
    if (!this.gameActive) return;

    if (!this.grid) {
      return;
    }

    this.legalTargets = this.grid.getLegalTargets(tile);

    // Highlight legal targets
    for (const target of this.legalTargets) {
      target.highlightAsLegalTarget();
    }

    // Save game state for undo
    this.saveGameState();
  }

  private handleTileDrag(_tile: Tile): void {
    // Optional: Could add visual feedback here
  }

  private handleTileDrop(droppedTile: Tile): void {
    // Clear all highlights
    for (const target of this.legalTargets) {
      target.clearHighlight();
    }

    if (!this.gameActive) {
      droppedTile.returnToStart();
      return;
    }

    // Find which tile we dropped onto
    let targetTile: Tile | null = null;
    const grid = this.grid;
    if (!grid) {
      droppedTile.returnToStart();
      return;
    }

    const allTiles = grid.getAllTiles();

    // Calculate merge range based on current grid size and tile spacing
    const gridSize = grid.getGridSize();
    const tileSize = this.getTileSizeForGrid(gridSize);
    const mergeRange = tileSize * 0.6; // 60% of tile size

    for (const tile of allTiles) {
      if (tile === droppedTile) continue;

      const distance = Phaser.Math.Distance.Between(
        droppedTile.x,
        droppedTile.y,
        tile.x,
        tile.y
      );

      if (distance < mergeRange) {
        // Within merge range
        targetTile = tile;
        break;
      }
    }

    if (targetTile && grid.canMerge(droppedTile, targetTile)) {
      // Legal merge!
      grid.mergeTiles(droppedTile, targetTile);
      this.moves++;
      this.sound.play('right');

      // Check win/lose conditions after a short delay
      this.time.delayedCall(250, () => {
        this.updateUI();
        this.checkGameState();
      });
    } else {
      // Illegal merge or no target
      droppedTile.returnToStart();
      if (targetTile) {
        this.sound.play('wrong');
        this.shakeCamera();
      }

      // Remove last saved state since move wasn't made
      if (this.undoStack.length > 0) {
        this.undoStack.pop();
      }
    }

    this.legalTargets = [];
  }

  private saveGameState(): void {
    const grid = this.grid;
    if (!grid) {
      return;
    }

    const tiles = grid.getAllTiles();
    const state: GameState = {
      tiles: tiles.map((t) => ({ digit: t.digit, gridX: t.gridX, gridY: t.gridY })),
      moves: this.moves,
    };

    this.undoStack.push(state);

    // Limit undo stack size
    if (this.undoStack.length > this.maxUndos) {
      this.undoStack.shift();
    }

    this.updateUndoButton();
  }

  private performUndo(): void {
    if (this.undoStack.length === 0) return;

    const state = this.undoStack.pop()!;

    // Clear current grid
    const grid = this.grid;
    if (!grid) {
      return;
    }

    grid.clear();

    // Get current tile size for scaling
    const gridSize = grid.getGridSize();
    const tileSize = this.getTileSizeForGrid(gridSize);

    // Restore tiles from state
    for (const tileData of state.tiles) {
      const pos = grid.getWorldPosition(tileData.gridX, tileData.gridY);
      const tile = new Tile(this, pos.x, pos.y, tileData.digit, tileData.gridX, tileData.gridY);

      // Scale tile to match grid tile size
      const targetScale = tileSize / tile.width;
      tile.setScale(targetScale);

      tile.on('dragstart', () => {
        this.handleTileDragStart(tile);
      });

      tile.on('drag', () => {
        this.handleTileDrag(tile);
      });

      tile.on('drop', (droppedTile: Tile) => {
        this.handleTileDrop(droppedTile);
      });

      grid.addTile(tile, tileData.gridX, tileData.gridY);
    }

    this.input.setDraggable(grid.getAllTiles());

    // Restore moves count
    this.moves = state.moves;

    this.updateUI();
    this.updateUndoButton();
  }

  private updateUndoButton(): void {
    if (this.undoStack.length > 0) {
      this.undoButton.setAlpha(0.7);
    } else {
      this.undoButton.setAlpha(0.3);
    }
  }

  private updateUI(): void {
    this.movesText.setText(this.moves.toString());

    // Subtle color feedback based on par (very minimal)
    if (this.moves <= this.par) {
      this.movesText.setColor('#222222'); // Dark gray - on or under par
    } else if (this.moves <= this.par + 2) {
      this.movesText.setColor('#666666'); // Medium gray - slightly over
    } else {
      this.movesText.setColor('#888888'); // Light gray - well over par
    }
  }

  private checkGameState(): void {
    if (this.grid && this.grid.checkWinCondition()) {
      this.handleWin();
    } else if (this.grid && !this.grid.hasLegalMoves()) {
      this.handleGameOver();
    }
  }

  private showModal(
    message: string,
    buttons?: Array<{ text: string; callback: () => void; primary?: boolean }>,
    autoDismiss?: { delay: number; callback?: () => void }
  ): void {
    const cam = this.cameras.main;
    const modalElements: Phaser.GameObjects.GameObject[] = [];

    // Create semi-transparent overlay
    const overlay = this.add.rectangle(cam.centerX, cam.centerY, cam.width, cam.height, 0x000000, 0.6);
    overlay.setDepth(1000);
    overlay.setScrollFactor(0);
    overlay.setAlpha(0);
    modalElements.push(overlay);

    // Create modal panel with rounded appearance
    const panelWidth = Math.min(cam.width * 0.85, 450);
    const panelHeight = buttons ? Math.min(cam.height * 0.5, 400) : Math.min(cam.height * 0.35, 280);
    const panel = this.add.rectangle(cam.centerX, cam.centerY, panelWidth, panelHeight, 0xffffff);
    panel.setDepth(1001);
    panel.setScrollFactor(0);
    panel.setStrokeStyle(3, 0xdddddd);
    panel.setAlpha(0);
    modalElements.push(panel);

    // Add subtle shadow effect with multiple layers
    const shadow1 = this.add.rectangle(cam.centerX + 2, cam.centerY + 2, panelWidth, panelHeight, 0x000000, 0.1);
    shadow1.setDepth(1000.5);
    shadow1.setScrollFactor(0);
    shadow1.setAlpha(0);
    modalElements.push(shadow1);

    // Create message text with better spacing
    const fontSize = Phaser.Math.Clamp(Math.round(cam.width * 0.07), 24, 48);
    const textY = buttons ? cam.centerY - panelHeight * 0.15 : cam.centerY;
    const text = this.add.text(cam.centerX, textY, message, {
      fontSize: `${fontSize}px`,
      color: '#222222',
      fontFamily: 'Arial',
      fontStyle: 'normal',
      align: 'center',
      lineSpacing: 8,
    });
    text.setOrigin(0.5);
    text.setDepth(1002);
    text.setScrollFactor(0);
    text.setAlpha(0);
    modalElements.push(text);

    // Create buttons if provided
    if (buttons && buttons.length > 0) {
      const buttonWidth = Math.min(panelWidth * 0.7, 280);
      const buttonHeight = 50;
      const buttonSpacing = 16;
      const buttonFontSize = Phaser.Math.Clamp(Math.round(cam.width * 0.04), 16, 22);
      const startY = cam.centerY + panelHeight * 0.15;

      buttons.forEach((buttonConfig, index) => {
        const buttonY = startY + index * (buttonHeight + buttonSpacing);
        const isPrimary = buttonConfig.primary ?? false;

        // Button background
        const buttonBg = this.add.rectangle(
          cam.centerX,
          buttonY,
          buttonWidth,
          buttonHeight,
          isPrimary ? 0x222222 : 0xf5f5f5
        );
        buttonBg.setDepth(1002);
        buttonBg.setScrollFactor(0);
        buttonBg.setStrokeStyle(2, isPrimary ? 0x222222 : 0xcccccc);
        buttonBg.setAlpha(0);
        buttonBg.setInteractive({ useHandCursor: true });
        modalElements.push(buttonBg);

        // Button text
        const buttonText = this.add.text(cam.centerX, buttonY, buttonConfig.text, {
          fontSize: `${buttonFontSize}px`,
          color: isPrimary ? '#ffffff' : '#222222',
          fontFamily: 'Arial',
          fontStyle: 'normal',
        });
        buttonText.setOrigin(0.5);
        buttonText.setDepth(1003);
        buttonText.setScrollFactor(0);
        buttonText.setAlpha(0);
        modalElements.push(buttonText);

        // Button hover effects
        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(isPrimary ? 0x333333 : 0xe8e8e8);
          buttonBg.setScale(1.02);
        });

        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(isPrimary ? 0x222222 : 0xf5f5f5);
          buttonBg.setScale(1);
        });

        buttonBg.on('pointerdown', () => {
          buttonBg.setScale(0.98);
          this.sound.play('click01');
        });

        buttonBg.on('pointerup', () => {
          buttonBg.setScale(1);
          this.sound.play('click02');

          // Dismiss modal and execute callback
          this.tweens.add({
            targets: modalElements,
            alpha: 0,
            scale: 0.95,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
              modalElements.forEach((el) => el.destroy());
              buttonConfig.callback();
            },
          });
        });
      });
    }

    // Fade in animation
    this.tweens.add({
      targets: overlay,
      alpha: 0.6,
      duration: 300,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: modalElements.filter((el) => el !== overlay),
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Auto-dismiss if configured and no buttons
    if (autoDismiss && !buttons) {
      this.time.delayedCall(autoDismiss.delay, () => {
        this.tweens.add({
          targets: modalElements,
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            modalElements.forEach((el) => el.destroy());
            if (autoDismiss.callback) {
              autoDismiss.callback();
            }
          },
        });
      });
    }
  }

  private handleWin(): void {
    this.gameActive = false;
    this.sound.play('success1');
    this.undoStack = [];
    this.updateUndoButton();

    const grade = this.moves <= this.par ? 'Perfect!' : this.moves <= this.par + 2 ? 'Great!' : 'Complete!';

    const currentStage = this.stages[this.currentStageIndex];
    const isFinalLevelInStage = this.currentLevelIndex >= currentStage.levels.length - 1;
    const isFinalStage = this.currentStageIndex >= this.stages.length - 1;
    const gameComplete = isFinalLevelInStage && isFinalStage;

    const message = `${grade}\n\n${this.moves}/${this.par} moves`;

    const buttons = [];

    if (gameComplete) {
      // Game fully complete - only show play again
      buttons.push({
        text: 'Play Again',
        callback: () => this.restartGame(),
        primary: true,
      });
    } else {
      // Show continue button (primary) and play again button
      buttons.push({
        text: isFinalLevelInStage ? 'Next Stage' : 'Continue',
        callback: () => {
          if (isFinalLevelInStage) {
            this.currentStageIndex++;
            this.startLevel(0);
          } else {
            this.startLevel(this.currentLevelIndex + 1);
          }
        },
        primary: true,
      });

      buttons.push({
        text: 'Play Again',
        callback: () => this.restartGame(),
        primary: false,
      });
    }

    this.showModal(message, buttons);
  }

  private handleGameOver(): void {
    this.gameActive = false;
    this.sound.play('wrong');

    this.showModal('No moves left!', [
      {
        text: 'Try Again',
        callback: () => this.restartGame(),
        primary: true,
      },
    ]);
  }

  private restartGame(): void {
    this.scene.restart({ stageIndex: this.currentStageIndex, levelIndex: this.currentLevelIndex });
  }

  private shakeCamera(): void {
    this.cameras.main.shake(100, 0.005);
  }

  private updateBackgroundDimensions(): void {
    const cam = this.cameras.main;

    if (this.background) {
      this.background.setPosition(cam.centerX, cam.centerY);
      this.background.setDisplaySize(cam.width, cam.height);
    }

    if (this.backgroundPanel) {
      this.backgroundPanel.setPosition(cam.centerX, cam.centerY);
      this.backgroundPanel.setDisplaySize(cam.width * 0.94, cam.height * 0.94);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize?.width ?? this.scale.width;
    const height = gameSize?.height ?? this.scale.height;
    this.cameras.resize(width, height);
    this.layoutUI();
  }

  private showCompletionBanner(stageName: string): void {
    this.showModal(`${stageName} complete`, undefined, { delay: 3000 });
  }
}
