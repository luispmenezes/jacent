import Phaser from 'phaser';
import { Grid } from '../objects/Grid';
import { Tile } from '../objects/Tile';
import { stages, StageDefinition } from '../config/StageConfig';

interface GameState {
  tiles: { digit: number | 'W'; gridX: number; gridY: number }[];
  moves: number;
}

// ============================================================================
// GAME SCENE - Main gameplay logic for normal levels and endless modes
// ============================================================================
export class GameScene extends Phaser.Scene {
  // ========================================
  // PROPERTIES - Game State
  // ========================================
  // Game state
  private grid: Grid | null = null;
  private moves: number = 0;
  private par: number = 0;
  private score: number = 0;
  private gameActive: boolean = true;
  private undoStack: GameState[] = [];
  private maxUndos: number = 3;
  private legalTargets: Tile[] = [];

  // Level progression (normal mode)
  private currentStageIndex: number = 0;
  private currentLevelIndex: number = 0;
  private initialStageIndex: number = 0;
  private initialLevelIndex: number = 0;
  private readonly stages: StageDefinition[] = stages;

  // Endless mode state
  private isEndless: boolean = false;
  private endlessMode: number = 1; // 1 = random spawn, 2 = Tetris-style

  // Endless Mode 2 (Tetris-style) specific
  private risingBlockTimer?: Phaser.Time.TimerEvent;
  private hasSpawnedFirstRow: boolean = false;
  private initialBottomRowCleared: boolean = false;
  private dangerTimer?: Phaser.Time.TimerEvent;
  private inDangerMode: boolean = false;
  private dangerStartTime: number = 0;

  // ========================================
  // PROPERTIES - UI Elements
  // ========================================
  // Text displays
  private titleText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private parText!: Phaser.GameObjects.Text;
  private tilesRemainingText!: Phaser.GameObjects.Text;
  private movesLabel!: Phaser.GameObjects.Text;
  private tilesLabel!: Phaser.GameObjects.Text;
  private instructionsText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;

  // Buttons
  private restartButton!: Phaser.GameObjects.Text;
  private undoButton!: Phaser.GameObjects.Text;

  // Background elements
  private background!: Phaser.GameObjects.TileSprite;
  private backgroundPanel!: Phaser.GameObjects.Image;
  private emptyTiles: Phaser.GameObjects.Sprite[] = [];

  // Danger warning (Endless Mode 2)
  private dangerBarBackground?: Phaser.GameObjects.Rectangle;
  private dangerBarFill?: Phaser.GameObjects.Rectangle;
  private dangerBarText?: Phaser.GameObjects.Text;

  // Layout
  private gridBounds: { top: number; bottom: number; left: number; right: number } | null = null;

  // ========================================
  // LIFECYCLE METHODS
  // ========================================
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { stageIndex?: number; levelIndex?: number; isEndless?: boolean; endlessMode?: number }): void {
    this.isEndless = data?.isEndless ?? false;
    this.endlessMode = data?.endlessMode ?? 1;

    if (!this.isEndless) {
      const requestedStage = data?.stageIndex ?? 0;
      const clampedStage = Phaser.Math.Clamp(requestedStage, 0, this.stages.length - 1);
      const stage = this.stages[clampedStage];
      const requestedLevel = data?.levelIndex ?? 0;
      const clampedLevel = Phaser.Math.Clamp(requestedLevel, 0, stage.levels.length - 1);

      this.initialStageIndex = clampedStage;
      this.initialLevelIndex = clampedLevel;
    }
  }

  create(): void {
    this.moves = 0;
    this.score = 0;
    this.gameActive = true;
    this.undoStack = [];
    this.inDangerMode = false;
    this.hasSpawnedFirstRow = false;
    this.initialBottomRowCleared = false;

    if (!this.isEndless) {
      this.currentStageIndex = this.initialStageIndex;
      this.currentLevelIndex = this.initialLevelIndex;
    }

    this.grid = null;
    this.emptyTiles = [];

    this.createBackground();
    this.createUI();
    this.createGrid();

    // Add Escape key listener for pause menu
    this.input.keyboard?.on('keydown-ESC', this.showPauseMenu, this);

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.input.keyboard?.off('keydown-ESC', this.showPauseMenu, this);
    });
  }

  update(): void {
    // Update danger bar if in danger mode
    if (this.inDangerMode && this.endlessMode === 2) {
      this.updateDangerBar();
    }
  }

  // ========================================
  // UI CREATION & LAYOUT
  // ========================================
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

  // ========================================
  // GRID & LEVEL SETUP
  // ========================================
  private createGrid(): void {
    if (this.isEndless) {
      this.startEndlessMode();
    } else {
      this.startLevel(this.currentLevelIndex);
    }
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

    // Moves counter on left (hidden in endless mode)
    this.movesText.setFontSize(valueSize);
    this.movesText.setOrigin(0, 0);
    this.movesText.setPosition(safePadding, this.titleText.y + titleSize / 2 + safePadding * 0.8);

    // Par text - shows score in endless mode, par in normal mode
    if (this.isEndless) {
      this.parText.setFontSize(smallSize);
      this.parText.setOrigin(0, 0);
      this.parText.setPosition(safePadding, this.titleText.y + titleSize / 2 + safePadding * 0.8);
    } else {
      this.parText.setFontSize(smallSize);
      this.parText.setOrigin(0, 1);
      this.parText.setPosition(
        this.movesText.x + this.movesText.displayWidth + 2,
        this.movesText.y + this.movesText.displayHeight
      );
    }

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
      const gridWidth = grid.getGridWidth();
      const gridHeight = grid.getGridHeight();
      const tileSize = this.isEndless
        ? this.getTileSizeForEndlessGrid(gridWidth, gridHeight)
        : this.getTileSizeForGrid(grid.getGridSize());
      const { x: centerGridX, y: centerGridY } = this.getGridCenter();
      grid.updateLayout({ tileSize, centerX: centerGridX, centerY: centerGridY });

      // Update empty tile positions and scale
      let emptyIndex = 0;
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
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

  private startEndlessMode(): void {
    this.moves = 0;
    this.score = 0;
    this.gameActive = true;
    this.undoStack = [];
    this.legalTargets = [];

    // Update title for endless mode
    const modeTitle = this.endlessMode === 2 ? 'Endless Mode 2' : 'Endless Mode';
    this.titleText.setText(modeTitle);
    this.parText.setText(`Score: ${this.score}`);

    if (this.grid) {
      this.grid.clear();
      this.grid = null;
    }

    // Clear old empty tile sprites
    this.emptyTiles.forEach((sprite) => sprite.destroy());
    this.emptyTiles = [];

    this.layoutUI();

    const gridWidth = 4;
    const gridHeight = 8;
    const tileSize = this.getTileSizeForEndlessGrid(gridWidth, gridHeight);
    const { x: centerGridX, y: centerGridY } = this.getGridCenter();
    const grid = new Grid(this, gridWidth, tileSize, { x: centerGridX, y: centerGridY }, gridHeight);
    this.grid = grid;

    // Add empty tile backgrounds for all grid positions
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const pos = grid.getWorldPosition(x, y);
        const emptyTile = this.add.sprite(pos.x, pos.y, 'tile-empty');
        const targetScale = tileSize / emptyTile.width;
        emptyTile.setScale(targetScale);
        emptyTile.setDepth(-1);
        this.emptyTiles.push(emptyTile);
      }
    }

    // Generate random initial tiles with guaranteed valid moves
    this.generateInitialEndlessTiles(grid, gridWidth, gridHeight, tileSize);

    this.input.setDraggable(grid.getAllTiles());
    this.updateUndoButton();
    this.updateUI();

    // Start rising block timer for Endless Mode 2
    if (this.endlessMode === 2) {
      this.startRisingBlockTimer();
    }
  }

  private generateInitialEndlessTiles(grid: Grid, gridWidth: number, gridHeight: number, tileSize: number): void {
    let validMoves = 0;
    let attempts = 0;
    const maxAttempts = 100;

    // Keep generating until we have at least 2 valid moves
    while (validMoves < 2 && attempts < maxAttempts) {
      attempts++;
      grid.clear();

      let positions: { x: number; y: number }[] = [];
      let numInitialTiles: number;

      if (this.endlessMode === 2) {
        // For Endless Mode 2, fill the bottom 2 rows completely
        for (let y = gridHeight - 2; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            positions.push({ x, y });
          }
        }
        numInitialTiles = positions.length; // All positions in bottom 2 rows
      } else {
        // For Endless Mode 1, spawn randomly across the grid
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            positions.push({ x, y });
          }
        }
        // Shuffle and take 12-16 random positions
        Phaser.Utils.Array.Shuffle(positions);
        numInitialTiles = Phaser.Math.Between(12, 16);
      }

      // Create tiles at positions
      for (let i = 0; i < numInitialTiles; i++) {
        const pos = positions[i];
        // In Endless Mode 2: 1-7 with 5% wildcards, otherwise 1-5
        let digit: number | 'W';
        if (this.endlessMode === 2) {
          const isWildcard = Math.random() < 0.05; // 5% chance
          digit = isWildcard ? 'W' : Phaser.Math.Between(1, 7);
        } else {
          digit = Phaser.Math.Between(1, 5);
        }
        const worldPos = grid.getWorldPosition(pos.x, pos.y);
        const tile = new Tile(this, worldPos.x, worldPos.y, digit, pos.x, pos.y);

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

        grid.addTile(tile, pos.x, pos.y);

        // Add entrance animation
        tile.setAlpha(0);
        tile.setScale(0);
        this.tweens.add({
          targets: tile,
          alpha: 1,
          scale: targetScale,
          duration: 300,
          delay: i * 20,
          ease: 'Back.easeOut',
        });
      }

      // Count valid moves
      validMoves = this.countValidMoves(grid);
    }
  }

  private countValidMoves(grid: Grid): number {
    const allTiles = grid.getAllTiles();
    let moveCount = 0;

    for (let i = 0; i < allTiles.length; i++) {
      for (let j = i + 1; j < allTiles.length; j++) {
        if (grid.canMerge(allTiles[i], allTiles[j])) {
          moveCount++;
        }
      }
    }

    return moveCount;
  }

  private getTileSizeForEndlessGrid(gridWidth: number, gridHeight: number): number {
    if (!this.gridBounds) {
      const cam = this.cameras.main;
      return Math.floor(Math.min(cam.width / (gridWidth + 1), cam.height / (gridHeight + 1)));
    }

    const availableWidth = this.gridBounds.right - this.gridBounds.left;
    const availableHeight = this.gridBounds.bottom - this.gridBounds.top;

    const widthSize = availableWidth / gridWidth;
    const heightSize = availableHeight / gridHeight;

    const size = Math.floor(Math.min(widthSize, heightSize));

    return Phaser.Math.Clamp(size, 40, 140);
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

  // ========================================
  // TILE INTERACTION - Drag & Drop with Path Merging
  // ========================================
  private handleTileDragStart(tile: Tile): void {
    if (!this.gameActive) return;

    if (!this.grid) {
      return;
    }

    // Get all tiles reachable through valid paths (including multi-step)
    this.legalTargets = this.getAllReachableTiles(tile, this.grid);

    // Highlight legal targets
    for (const target of this.legalTargets) {
      target.highlightAsLegalTarget();
    }

    // Save game state for undo
    this.saveGameState();
  }

  // Get all tiles reachable through valid straight-line paths
  private getAllReachableTiles(startTile: Tile, grid: Grid): Tile[] {
    const reachable: Tile[] = [];
    const allTiles = grid.getAllTiles();

    for (const targetTile of allTiles) {
      if (targetTile === startTile) continue;

      // Check if there's a valid path to this tile
      const path = this.findMergePath(startTile, targetTile, grid);
      if (path && path.length > 0) {
        reachable.push(targetTile);
      }
    }

    return reachable;
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
    const tileSize = this.isEndless && this.endlessMode === 2
      ? this.getTileSizeForEndlessGrid(grid.getGridWidth(), grid.getGridHeight())
      : this.getTileSizeForGrid(gridSize);
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

    if (targetTile) {
      // Try to find a path from droppedTile to targetTile
      const path = this.findMergePath(droppedTile, targetTile, grid);

      if (path && path.length > 0) {
        // Valid path found! Execute all merges along the path
        this.executeMergePath(droppedTile, path, grid);
      } else {
        // No valid path
        droppedTile.returnToStart();
        this.sound.play('wrong');
        this.shakeCamera();

        // Remove last saved state since move wasn't made
        if (this.undoStack.length > 0) {
          this.undoStack.pop();
        }
      }
    } else {
      // No target tile nearby
      droppedTile.returnToStart();

      // Remove last saved state since move wasn't made
      if (this.undoStack.length > 0) {
        this.undoStack.pop();
      }
    }

    this.legalTargets = [];
  }

  // Find a valid path of adjacent tiles that can be merged (straight line only)
  private findMergePath(startTile: Tile, endTile: Tile, grid: Grid): Tile[] | null {
    // If directly adjacent, return single-step path
    if (grid.canMerge(startTile, endTile)) {
      return [endTile];
    }

    // Determine the direction from start to end
    const dx = endTile.gridX - startTile.gridX;
    const dy = endTile.gridY - startTile.gridY;

    // Normalize to get direction (-1, 0, or 1 for each axis)
    const dirX = dx === 0 ? 0 : dx / Math.abs(dx);
    const dirY = dy === 0 ? 0 : dy / Math.abs(dy);

    // Must be a straight line (horizontal, vertical, or diagonal)
    if (dirX !== 0 && dirY !== 0) {
      // Diagonal - must be 45 degrees
      if (Math.abs(dx) !== Math.abs(dy)) {
        return null; // Not a straight diagonal line
      }
    }

    // Walk along the straight line and collect tiles
    const path: Tile[] = [];
    let currentX = startTile.gridX + dirX;
    let currentY = startTile.gridY + dirY;

    while (true) {
      const nextTile = grid.getTile(currentX, currentY);

      if (!nextTile) {
        // Gap in the line - no valid path
        return null;
      }

      // Check if the DRAGGED tile (startTile) value is compatible with this tile
      // The dragged tile keeps its original value throughout the path
      if (!this.canMergeValues(startTile, nextTile)) {
        // Can't merge - no valid path
        return null;
      }

      path.push(nextTile);

      // Check if we reached the end
      if (nextTile === endTile) {
        return path;
      }

      // Move to next position
      currentX += dirX;
      currentY += dirY;

      // Safety check - prevent infinite loop
      if (path.length > 20) {
        return null;
      }
    }
  }

  // Check if two tiles can merge based on their values (ignoring adjacency)
  private canMergeValues(tileA: Tile, tileB: Tile): boolean {
    // Wildcard rules
    if (tileB.isWildcard() && typeof tileA.digit === 'number') {
      return true; // Number merges into wildcard
    }

    // Standard rule: tiles can merge if they differ by exactly 1
    if (typeof tileA.digit === 'number' && typeof tileB.digit === 'number') {
      return Math.abs(tileA.digit - tileB.digit) === 1;
    }

    return false;
  }


  // Execute all merges along the path
  private executeMergePath(startTile: Tile, path: Tile[], grid: Grid): void {
    let currentTile = startTile;
    let mergeCount = 0;

    // Execute each merge in the path with animation delays
    const executeMerge = (index: number) => {
      if (index >= path.length) {
        // All merges complete
        this.moves++;

        // Update score in endless mode with progressive scoring
        if (this.isEndless) {
          const multiplier = Math.floor(this.moves / 10) + 1;
          this.score += multiplier * mergeCount; // Score based on combo length
        }

        this.sound.play('right');

        // In endless mode, spawn a new tile after merge
        if (this.isEndless) {
          this.time.delayedCall(250, () => {
            // Apply gravity in Endless Mode 2
            if (this.endlessMode === 2) {
              this.applyGravity();
              // Check if clearing tiles got us out of danger
              this.checkDangerZone();
              // Check if we need to spawn early due to no moves
              this.checkForEarlySpawn();
            }

            // Only spawn tiles in Endless Mode 1 (original)
            if (this.endlessMode === 1) {
              this.spawnNewTileInEndlessMode();
            }

            this.updateUI();
            this.checkGameState();
          });
        } else {
          // Check win/lose conditions after a short delay
          this.time.delayedCall(250, () => {
            this.updateUI();
            this.checkGameState();
          });
        }
        return;
      }

      const targetTile = path[index];
      grid.mergeTiles(currentTile, targetTile);
      mergeCount++;

      // Continue to next merge after a short delay (250ms for emphasis)
      this.time.delayedCall(250, () => {
        executeMerge(index + 1);
      });
    };

    executeMerge(0);
  }

  // ========================================
  // UNDO SYSTEM
  // ========================================
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
    if (this.isEndless) {
      // Hide moves, only show score
      this.movesText.setVisible(false);
      this.parText.setVisible(true);
      this.parText.setText(`Score: ${this.score}`);
      this.parText.setOrigin(0, 0);
    } else {
      this.movesText.setVisible(true);
      this.parText.setVisible(true);
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
  }

  // ========================================
  // ENDLESS MODE 1 - Random Tile Spawning
  // ========================================
  private spawnNewTileInEndlessMode(): void {
    if (!this.grid) return;

    const gridWidth = this.grid.getGridWidth();
    const gridHeight = this.grid.getGridHeight();

    // Find all empty positions
    const emptyPositions: { x: number; y: number }[] = [];

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (!this.grid.isOccupied(x, y)) {
          emptyPositions.push({ x, y });
        }
      }
    }

    // If no empty positions, grid is full
    if (emptyPositions.length === 0) return;

    // Pick a random empty position
    const spawnPos = Phaser.Utils.Array.GetRandom(emptyPositions);

    // Find neighboring tiles (orthogonally adjacent)
    const neighbors: number[] = [];
    const { x, y } = spawnPos;

    // Collect neighboring tile values (excluding wildcards)
    if (x > 0 && this.grid.isOccupied(x - 1, y)) {
      const tile = this.grid.getTile(x - 1, y)!;
      if (typeof tile.digit === 'number') neighbors.push(tile.digit);
    }
    if (x < gridWidth - 1 && this.grid.isOccupied(x + 1, y)) {
      const tile = this.grid.getTile(x + 1, y)!;
      if (typeof tile.digit === 'number') neighbors.push(tile.digit);
    }
    if (y > 0 && this.grid.isOccupied(x, y - 1)) {
      const tile = this.grid.getTile(x, y - 1)!;
      if (typeof tile.digit === 'number') neighbors.push(tile.digit);
    }
    if (y < gridHeight - 1 && this.grid.isOccupied(x, y + 1)) {
      const tile = this.grid.getTile(x, y + 1)!;
      if (typeof tile.digit === 'number') neighbors.push(tile.digit);
    }

    let digit: number;
    if (neighbors.length > 0) {
      // Pick a random neighbor
      const neighborValue = Phaser.Utils.Array.GetRandom(neighbors);
      // Spawn a tile that differs by 1-3 from that neighbor
      const diff = Phaser.Math.Between(1, 3);
      // Randomly choose to add or subtract
      const direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
      digit = neighborValue + (diff * direction);
      // Clamp to valid range (1-7)
      digit = Phaser.Math.Clamp(digit, 1, 7);
    } else {
      // No neighbors, spawn random low value
      digit = Phaser.Math.Between(1, 3);
    }
    const worldPos = this.grid.getWorldPosition(spawnPos.x, spawnPos.y);

    const tileSize = this.getTileSizeForEndlessGrid(gridWidth, gridHeight);
    const tile = new Tile(this, worldPos.x, worldPos.y, digit, spawnPos.x, spawnPos.y);

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

    this.grid.addTile(tile, spawnPos.x, spawnPos.y);

    // Add entrance animation
    tile.setAlpha(0);
    tile.setScale(0);
    this.tweens.add({
      targets: tile,
      alpha: 1,
      scale: targetScale,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Make it draggable
    this.input.setDraggable(tile);
  }

  // ========================================
  // GAME STATE CHECKING
  // ========================================
  private checkGameState(): void {
    // In endless mode, never trigger win condition (only game over when no moves)
    if (this.isEndless) {
      // In Endless Mode 2, don't end game on no moves - blocks keep rising
      if (this.endlessMode === 1) {
        if (this.grid && !this.grid.hasLegalMoves()) {
          this.handleGameOver();
        }
      }
      // Endless Mode 2 only ends when grid is completely full and no moves left
      // (which should rarely happen since blocks keep spawning)
    } else {
      if (this.grid && this.grid.checkWinCondition()) {
        this.handleWin();
      } else if (this.grid && !this.grid.hasLegalMoves()) {
        this.handleGameOver();
      }
    }
  }

  // ========================================
  // MODAL DIALOGS
  // ========================================
  private showPauseMenu(): void {
    if (!this.gameActive) return; // Don't pause if game is already over

    // Pause the game
    const wasPaused = this.gameActive;
    this.gameActive = false;

    this.showModal('Paused', [
      {
        text: 'Resume',
        callback: () => {
          this.gameActive = wasPaused;
        },
        primary: true,
      },
      {
        text: 'Menu',
        callback: () => {
          this.scene.start('MenuScene');
        },
        primary: false,
      },
    ]);
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

    const message = this.isEndless
      ? `Game Over!\n\nFinal Score: ${this.score}`
      : 'No moves left!';

    const buttons = [
      {
        text: 'Try Again',
        callback: () => this.restartGame(),
        primary: true,
      },
    ];

    // Add menu button for endless mode
    if (this.isEndless) {
      buttons.push({
        text: 'Menu',
        callback: () => this.scene.start('MenuScene'),
        primary: false,
      });
    }

    this.showModal(message, buttons);
  }

  private restartGame(): void {
    // Clean up timers
    if (this.risingBlockTimer) {
      this.risingBlockTimer.destroy();
      this.risingBlockTimer = undefined;
    }
    if (this.dangerTimer) {
      this.dangerTimer.destroy();
      this.dangerTimer = undefined;
    }

    if (this.isEndless) {
      this.scene.restart({ isEndless: true, endlessMode: this.endlessMode });
    } else {
      this.scene.restart({ stageIndex: this.currentStageIndex, levelIndex: this.currentLevelIndex });
    }
  }

  // ========================================
  // ENDLESS MODE 2 - Tetris-Style Rising Blocks
  // ========================================
  // Apply gravity - tiles fall down to fill empty spaces (like Tetris)
  private applyGravity(): void {
    if (!this.grid) return;

    const gridWidth = this.grid.getGridWidth();
    const gridHeight = this.grid.getGridHeight();

    // Process each column from top to bottom
    for (let x = 0; x < gridWidth; x++) {
      // Collect all tiles in this column from top to bottom
      const columnTiles: Tile[] = [];
      for (let y = 0; y < gridHeight; y++) {
        const tile = this.grid.getTile(x, y);
        if (tile) {
          columnTiles.push(tile);
          // Remove from current position
          this.grid.removeTile(x, y);
        }
      }

      // Place tiles back starting from the bottom (normal gravity)
      let targetY = gridHeight - 1;
      for (let i = columnTiles.length - 1; i >= 0; i--) {
        const tile = columnTiles[i];
        this.grid.addTile(tile, x, targetY);
        targetY--;
      }
    }
  }


  // Endless Mode 2: Spawn a new row of tiles at the top
  private spawnTopRow(): void {
    if (!this.grid) return;

    const gridWidth = this.grid.getGridWidth();
    const gridHeight = this.grid.getGridHeight();
    const tileSize = this.getTileSizeForEndlessGrid(gridWidth, gridHeight);
    const topY = 0;

    // Fill the entire top row with tiles
    for (let x = 0; x < gridWidth; x++) {
      // Generate digit: 1-7 with 5% wildcards
      const isWildcard = Math.random() < 0.05; // 5% chance
      const digit: number | 'W' = isWildcard ? 'W' : Phaser.Math.Between(1, 7);
      const worldPos = this.grid.getWorldPosition(x, topY);
      const tile = new Tile(this, worldPos.x, worldPos.y, digit, x, topY);

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

      this.grid.addTile(tile, x, topY);

      // Set initial scale
      tile.setScale(targetScale);

      // Make it draggable
      this.input.setDraggable(tile);
    }

    // After spawning all tiles, apply gravity with animation
    this.time.delayedCall(100, () => {
      this.applyGravity();
    });
  }

  // Endless Mode 2: Calculate spawn interval based on score
  private getRisingBlockInterval(): number {
    // Start at 10000ms (10 seconds), decrease by 50ms every 10 score points
    // Minimum of 3000ms (3 seconds)
    const baseInterval = 10000;
    const speedIncrease = Math.floor(this.score / 10) * 50;
    const interval = Math.max(3000, baseInterval - speedIncrease);
    return interval;
  }

  // Endless Mode 2: Start or restart the rising block timer
  private startRisingBlockTimer(): void {
    // Clean up existing timer
    if (this.risingBlockTimer) {
      this.risingBlockTimer.destroy();
    }

    const interval = this.getRisingBlockInterval();

    this.risingBlockTimer = this.time.addEvent({
      delay: interval,
      callback: () => {
        if (this.gameActive) {
          this.onRisingBlockTick();
        }
      },
      loop: false, // We'll manually restart to update the interval
    });
  }

  // Endless Mode 2: Called when it's time to spawn new row (like Tetris)
  private onRisingBlockTick(): void {
    if (!this.gameActive || !this.grid) return;

    // Just spawn new row at top - it will apply gravity automatically
    this.spawnTopRow();

    // Mark that we've spawned at least one row
    this.hasSpawnedFirstRow = true;

    // Check danger after gravity settles (after the delay in spawnTopRow)
    this.time.delayedCall(200, () => {
      this.checkDangerZone();
      // After checking danger, check if we need to spawn another row immediately
      this.checkForEarlySpawn();
    });

    // Restart timer with potentially faster speed
    this.startRisingBlockTimer();
  }

  // Endless Mode 2: Check if grid is too empty and no moves available
  private checkForEarlySpawn(): void {
    if (!this.grid || this.endlessMode !== 2 || !this.gameActive) return;

    const gridWidth = this.grid.getGridWidth();
    const gridHeight = this.grid.getGridHeight();

    // Find the tallest column
    let maxColumnHeight = 0;
    for (let x = 0; x < gridWidth; x++) {
      let columnHeight = 0;
      for (let y = gridHeight - 1; y >= 0; y--) {
        if (this.grid.isOccupied(x, y)) {
          columnHeight = gridHeight - y;
          break;
        }
      }
      maxColumnHeight = Math.max(maxColumnHeight, columnHeight);
    }

    // If tallest column is 4 or less, check for legal moves
    if (maxColumnHeight <= 4) {
      const hasLegalMoves = this.grid.hasLegalMoves();

      if (!hasLegalMoves) {
        // No legal moves and grid is low - spawn immediately!
        // Cancel current timer and spawn new row
        if (this.risingBlockTimer) {
          this.risingBlockTimer.destroy();
          this.risingBlockTimer = undefined;
        }

        // Spawn immediately
        this.time.delayedCall(500, () => {
          this.onRisingBlockTick();
        });
      }
    }
  }

  // Endless Mode 2: Check if any column is full (danger zone)
  private checkDangerZone(): void {
    if (!this.grid || this.endlessMode !== 2) return;

    const gridWidth = this.grid.getGridWidth();
    const gridHeight = this.grid.getGridHeight();

    // Check if player has made any moves (cleared any tiles)
    if (!this.initialBottomRowCleared && this.moves > 0) {
      this.initialBottomRowCleared = true;
    }

    // Only start danger checking after:
    // 1. At least one new row has spawned, AND
    // 2. Player has made at least one move
    if (!this.hasSpawnedFirstRow || !this.initialBottomRowCleared) {
      return;
    }

    // Check if any column is completely full (all 8 positions occupied)
    let hasFullColumn = false;
    for (let x = 0; x < gridWidth; x++) {
      let columnCount = 0;
      for (let y = 0; y < gridHeight; y++) {
        if (this.grid.isOccupied(x, y)) {
          columnCount++;
        }
      }

      if (columnCount === gridHeight) {
        hasFullColumn = true;
        break;
      }
    }

    if (hasFullColumn && !this.inDangerMode) {
      // Enter danger mode - at least one column is completely full
      this.startDangerMode();
    } else if (!hasFullColumn && this.inDangerMode) {
      // Exit danger mode - player cleared tiles so no column is full anymore
      this.exitDangerMode();
    }
  }

  // Endless Mode 2: Start the 5-second danger countdown
  private startDangerMode(): void {
    this.inDangerMode = true;
    this.dangerStartTime = this.time.now;

    // Create danger bar UI at bottom of screen
    const cam = this.cameras.main;
    const barWidth = cam.width * 0.8;
    const barHeight = 40;
    const barX = cam.centerX;
    const barY = cam.height - 60;

    // Background
    this.dangerBarBackground = this.add.rectangle(barX, barY, barWidth, barHeight, 0x333333);
    this.dangerBarBackground.setDepth(2000);
    this.dangerBarBackground.setScrollFactor(0);

    // Fill (starts full, drains over 5 seconds)
    this.dangerBarFill = this.add.rectangle(barX, barY, barWidth - 4, barHeight - 4, 0xff4444);
    this.dangerBarFill.setDepth(2001);
    this.dangerBarFill.setScrollFactor(0);

    // Text
    this.dangerBarText = this.add.text(barX, barY, 'DANGER! Column is full!', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });
    this.dangerBarText.setOrigin(0.5);
    this.dangerBarText.setDepth(2002);
    this.dangerBarText.setScrollFactor(0);

    // Start timer
    this.dangerTimer = this.time.addEvent({
      delay: 5000,
      callback: () => {
        // Time's up! Game over
        this.handleGameOver();
      },
      loop: false,
    });
  }

  // Endless Mode 2: Exit danger mode (player cleared the top)
  private exitDangerMode(): void {
    this.inDangerMode = false;

    // Clean up danger timer
    if (this.dangerTimer) {
      this.dangerTimer.destroy();
      this.dangerTimer = undefined;
    }

    // Remove danger bar UI
    if (this.dangerBarBackground) {
      this.dangerBarBackground.destroy();
      this.dangerBarBackground = undefined;
    }
    if (this.dangerBarFill) {
      this.dangerBarFill.destroy();
      this.dangerBarFill = undefined;
    }
    if (this.dangerBarText) {
      this.dangerBarText.destroy();
      this.dangerBarText = undefined;
    }
  }

  // Update danger bar fill
  private updateDangerBar(): void {
    if (!this.inDangerMode || !this.dangerBarFill || !this.dangerTimer) return;

    const elapsed = this.time.now - this.dangerStartTime;
    const remaining = Math.max(0, 5000 - elapsed);
    const progress = remaining / 5000;

    const cam = this.cameras.main;
    const maxWidth = cam.width * 0.8 - 4;
    this.dangerBarFill.width = maxWidth * progress;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
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
}
