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
  private restartButton!: Phaser.GameObjects.Sprite;
  private undoButton!: Phaser.GameObjects.Sprite;
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

    this.background = this.add.tileSprite(cam.centerX, cam.centerY, cam.width, cam.height, 'background');
    this.background.setOrigin(0.5);
    this.background.setScrollFactor(0);
    this.background.setDepth(-2);

    this.backgroundPanel = this.add.image(cam.centerX, cam.centerY, 'bg9patch');
    this.backgroundPanel.setScrollFactor(0);
    this.backgroundPanel.setDepth(-1);

    this.updateBackgroundDimensions();
  }

  private createUI(): void {
    const primaryColor = '#333333';
    const mutedColor = '#666666';

    this.titleText = this.add.text(0, 0, 'Jacent', {
      fontSize: '48px',
      color: primaryColor,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.movesLabel = this.add.text(0, 0, 'Moves', {
      fontSize: '24px',
      color: mutedColor,
      fontFamily: 'Arial',
    });

    this.movesText = this.add.text(0, 0, '0', {
      fontSize: '36px',
      color: primaryColor,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    });

    this.parText = this.add.text(0, 0, `Par: ${this.par}`, {
      fontSize: '22px',
      color: '#999999',
      fontFamily: 'Arial',
    });

    this.tilesLabel = this.add.text(0, 0, 'Tiles', {
      fontSize: '24px',
      color: mutedColor,
      fontFamily: 'Arial',
    }).setOrigin(1, 0);

    this.tilesRemainingText = this.add.text(0, 0, '0', {
      fontSize: '36px',
      color: primaryColor,
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.restartButton = this.add.sprite(0, 0, 'restart-idle');
    this.restartButton.setInteractive({ useHandCursor: true });
    this.restartButton.setScale(0.7);

    this.restartButton.on('pointerdown', () => {
      this.restartButton.setTexture('restart-pressed');
      this.sound.play('click01');
    });

    this.restartButton.on('pointerup', () => {
      this.restartButton.setTexture('restart-idle');
      this.sound.play('click02');
      this.restartGame();
    });

    this.restartButton.on('pointerout', () => {
      this.restartButton.setTexture('restart-idle');
    });

    this.undoButton = this.add.sprite(0, 0, 'restart-idle');
    this.undoButton.setInteractive({ useHandCursor: true });
    this.undoButton.setScale(0.7);
    this.undoButton.setAngle(180);

    this.undoButton.on('pointerdown', () => {
      if (this.undoStack.length > 0 && this.gameActive) {
        this.sound.play('click01');
        this.performUndo();
      }
    });

    this.instructionsText = this.add.text(0, 0, 'Drag adjacent tiles that differ by 1', {
      fontSize: '18px',
      color: '#999999',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.goalText = this.add.text(0, 0, 'Goal: Reduce to 1 tile', {
      fontSize: '18px',
      color: '#999999',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

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

    const minDimension = Math.min(width, height);
    const safePadding = Phaser.Math.Clamp(Math.round(minDimension * 0.045), 16, 42);
    const titleSize = Phaser.Math.Clamp(Math.round(width * 0.15), 34, 66);
    const labelSize = Phaser.Math.Clamp(Math.round(width * 0.048), 18, 28);
    const valueSize = Phaser.Math.Clamp(Math.round(width * 0.085), 30, 52);
    const smallSize = Phaser.Math.Clamp(Math.round(width * 0.04), 16, 26);
    const instructionsSize = Phaser.Math.Clamp(Math.round(width * 0.04), 15, 22);
    const buttonScale = Phaser.Math.Clamp(width / 640, 0.48, 0.88);

    this.restartButton.setScale(buttonScale);
    this.undoButton.setScale(buttonScale);

    if (this.backgroundPanel) {
      this.backgroundPanel.setDisplaySize(width - safePadding * 1.2, height - safePadding * 1.2);
    }

    this.titleText.setFontSize(titleSize);
    this.titleText.setPosition(centerX, safePadding + this.titleText.displayHeight / 2);

    this.movesLabel.setFontSize(labelSize);
    this.movesLabel.setOrigin(0, 0);
    this.movesLabel.setPosition(safePadding, this.titleText.y + this.titleText.displayHeight / 2 + safePadding * 0.25);

    this.movesText.setFontSize(valueSize);
    this.movesText.setOrigin(0, 0);
    this.movesText.setPosition(safePadding, this.movesLabel.y + this.movesLabel.displayHeight + safePadding * 0.1);

    this.parText.setFontSize(smallSize);
    this.parText.setOrigin(0, 0);
    this.parText.setPosition(safePadding, this.movesText.y + this.movesText.displayHeight + safePadding * 0.2);

    this.tilesLabel.setFontSize(labelSize);
    this.tilesLabel.setOrigin(1, 0);
    this.tilesLabel.setPosition(width - safePadding, this.movesLabel.y);

    this.tilesRemainingText.setFontSize(valueSize);
    this.tilesRemainingText.setOrigin(1, 0);
    this.tilesRemainingText.setPosition(width - safePadding, this.tilesLabel.y + this.tilesLabel.displayHeight + safePadding * 0.1);

    const buttonY = this.tilesRemainingText.y + this.tilesRemainingText.displayHeight + safePadding * 0.55;
    const buttonX = width - safePadding - this.restartButton.displayWidth / 2;
    this.restartButton.setPosition(buttonX, buttonY);

    const undoTargetX = this.restartButton.x - this.restartButton.displayWidth - safePadding * 0.6;
    const undoMinX = safePadding + this.undoButton.displayWidth / 2;
    this.undoButton.setPosition(Math.max(undoTargetX, undoMinX), buttonY);

    this.instructionsText.setFontSize(instructionsSize);
    this.goalText.setFontSize(instructionsSize);
    this.instructionsText.setWordWrapWidth(width - safePadding * 2);
    this.goalText.setWordWrapWidth(width - safePadding * 2);

    this.instructionsText.setPosition(centerX, height - safePadding - this.instructionsText.displayHeight / 2);
    this.goalText.setPosition(
      centerX,
      this.instructionsText.y - this.instructionsText.displayHeight / 2 - safePadding * 0.5 - this.goalText.displayHeight / 2
    );

    const hudBottom = Math.max(this.parText.y + this.parText.displayHeight, this.undoButton.y + this.undoButton.displayHeight / 2);
    const gridTop = hudBottom + safePadding * 0.8;
    const gridBottom = Math.max(gridTop + 120, this.goalText.y - this.goalText.displayHeight / 2 - safePadding * 0.6);
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
    this.parText.setText(`Par: ${this.par}`);

    if (this.grid) {
      this.grid.clear();
      this.grid = null;
    }

    this.layoutUI();

    const tileSize = this.getTileSizeForGrid(level.gridSize);
    const { x: centerGridX, y: centerGridY } = this.getGridCenter();
    const grid = new Grid(this, level.gridSize, tileSize, { x: centerGridX, y: centerGridY });
    this.grid = grid;

    let index = 0;
    for (let y = 0; y < level.gridSize; y++) {
      for (let x = 0; x < level.gridSize; x++) {
        const digit = level.layout[y]?.[x] ?? null;
        if (digit === null) {
          continue;
        }

        const pos = grid.getWorldPosition(x, y);
        const tile = new Tile(this, pos.x, pos.y, digit, x, y);

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

        // Add entrance animation
        tile.setAlpha(0);
        tile.setScale(0);
        this.tweens.add({
          targets: tile,
          alpha: 1,
          scale: 1,
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

    const width = this.gridBounds.right - this.gridBounds.left;
    const height = this.gridBounds.bottom - this.gridBounds.top;
    const size = Math.floor(Math.min(width, height) / gridSize);
    return Phaser.Math.Clamp(size, 56, 160);
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

    for (const tile of allTiles) {
      if (tile === droppedTile) continue;

      const distance = Phaser.Math.Distance.Between(
        droppedTile.x,
        droppedTile.y,
        tile.x,
        tile.y
      );

      if (distance < 70) {
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

    // Restore tiles from state
    for (const tileData of state.tiles) {
      const pos = grid.getWorldPosition(tileData.gridX, tileData.gridY);
      const tile = new Tile(this, pos.x, pos.y, tileData.digit, tileData.gridX, tileData.gridY);

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
      this.undoButton.setAlpha(1);
    } else {
      this.undoButton.setAlpha(0.3);
    }
  }

  private updateUI(): void {
    this.movesText.setText(this.moves.toString());

    const tilesRemaining = this.grid ? this.grid.getAllTiles().length : 0;
    this.tilesRemainingText.setText(tilesRemaining.toString());

    // Update color based on par
    if (this.moves <= this.par) {
      this.movesText.setColor('#4CAF50'); // Green - under par
    } else if (this.moves <= this.par + 2) {
      this.movesText.setColor('#FFC107'); // Yellow - slightly over
    } else {
      this.movesText.setColor('#F44336'); // Red - well over par
    }
  }

  private checkGameState(): void {
    if (this.grid && this.grid.checkWinCondition()) {
      this.handleWin();
    } else if (this.grid && !this.grid.hasLegalMoves()) {
      this.handleGameOver();
    }
  }

  private handleWin(): void {
    this.gameActive = false;
    this.sound.play('success1');
    this.undoStack = [];
    this.updateUndoButton();

    const grade = this.moves <= this.par ? 'PERFECT!' : this.moves <= this.par + 2 ? 'GREAT!' : 'COMPLETE!';
    const gradeColor = this.moves <= this.par ? '#4CAF50' : this.moves <= this.par + 2 ? '#FFC107' : '#2196F3';

    const currentStage = this.stages[this.currentStageIndex];
    const isFinalLevelInStage = this.currentLevelIndex >= currentStage.levels.length - 1;
    const isFinalStage = this.currentStageIndex >= this.stages.length - 1;
    const gameComplete = isFinalLevelInStage && isFinalStage;

    let nextLevelText: string;
    if (gameComplete) {
      nextLevelText = `${currentStage.name} complete!`;
    } else if (isFinalLevelInStage) {
      nextLevelText = `${currentStage.name} complete!`;
    } else {
      nextLevelText = `Level ${this.currentLevelIndex + 2} incoming…`;
    }

    const cam = this.cameras.main;
    const winFontSize = Phaser.Math.Clamp(Math.round(cam.width * 0.08), 28, 56);
    const winText = this.add.text(
      cam.centerX,
      cam.centerY,
      `${grade}\n\nMoves: ${this.moves} / Par: ${this.par}\n\n${nextLevelText}`,
      {
        fontSize: `${winFontSize}px`,
        color: gradeColor,
        fontFamily: 'Arial',
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 6,
        align: 'center',
      }
    );
    winText.setOrigin(0.5);
    winText.setAlpha(0);

    this.tweens.add({
      targets: winText,
      alpha: 1,
      scale: 1.2,
      duration: 500,
      ease: 'Back.easeOut',
    });

    const delay = isFinalLevelInStage ? 2000 : 1200;

    this.time.delayedCall(delay, () => {
      winText.destroy();

      if (gameComplete) {
        this.showCompletionBanner(currentStage.name);
        return;
      }

      if (isFinalLevelInStage) {
        this.currentStageIndex++;
        this.startLevel(0);
        return;
      }

      this.startLevel(this.currentLevelIndex + 1);
    });
  }

  private handleGameOver(): void {
    this.gameActive = false;
    this.sound.play('wrong');

    const cam = this.cameras.main;
    const gameOverFont = Phaser.Math.Clamp(Math.round(cam.width * 0.07), 24, 48);
    const gameOverText = this.add.text(cam.centerX, cam.centerY, 'No More Moves!\n\nClick restart to try again', {
      fontSize: `${gameOverFont}px`,
      color: '#F44336',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6,
      align: 'center',
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setAlpha(0);

    this.tweens.add({
      targets: gameOverText,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });
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
    const cam = this.cameras.main;
    const bannerFontSize = Phaser.Math.Clamp(Math.round(cam.width * 0.08), 28, 52);
    const completeText = this.add.text(cam.centerX, cam.centerY, `${stageName} complete!\n\nPress restart to play again`, {
      fontSize: `${bannerFontSize}px`,
      color: '#4CAF50',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6,
      align: 'center',
    });
    completeText.setOrigin(0.5);
    completeText.setAlpha(0);

    this.tweens.add({
      targets: completeText,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });
  }
}
