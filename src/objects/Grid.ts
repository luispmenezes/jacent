import type Phaser from 'phaser';
import { Tile } from './Tile';

export class Grid {
  private readonly scene: Phaser.Scene;
  private gridSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private tileSize: number;
  private startX: number = 0;
  private startY: number = 0;
  private tiles: (Tile | null)[][];
  private centerX: number;
  private centerY: number;
  private readonly gapFactor: number = 0; // No gap - sprites have built-in borders

  constructor(
    scene: Phaser.Scene,
    gridSize: number = 3,
    tileSize: number = 100,
    center?: { x: number; y: number },
    gridHeight?: number
  ) {
    this.scene = scene;
    this.gridSize = gridSize;
    this.gridWidth = gridSize;
    this.gridHeight = gridHeight ?? gridSize;
    this.tileSize = tileSize;

    // Calculate center position
    this.centerX = center?.x ?? scene.cameras.main.width / 2;
    this.centerY = center?.y ?? scene.cameras.main.height / 2;

    this.recalculateStartPosition();

    // Initialize empty grid
    this.tiles = Array(this.gridHeight)
      .fill(null)
      .map(() => Array(this.gridWidth).fill(null));
  }

  public getWorldPosition(gridX: number, gridY: number): { x: number; y: number } {
    const gap = this.tileSize * this.gapFactor;
    return {
      x: this.startX + gridX * (this.tileSize + gap),
      y: this.startY + gridY * (this.tileSize + gap),
    };
  }

  public getGridPosition(worldX: number, worldY: number): { gridX: number; gridY: number } | null {
    const gap = this.tileSize * this.gapFactor;
    const spacing = this.tileSize + gap;
    const gridX = Math.floor((worldX - this.startX + spacing / 2) / spacing);
    const gridY = Math.floor((worldY - this.startY + spacing / 2) / spacing);

    if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
      return { gridX, gridY };
    }

    return null;
  }

  public addTile(tile: Tile, gridX: number, gridY: number): void {
    if (this.isValidPosition(gridX, gridY)) {
      this.tiles[gridY][gridX] = tile;
      const pos = this.getWorldPosition(gridX, gridY);
      tile.moveTo(pos.x, pos.y, gridX, gridY);
    }
  }

  public removeTile(gridX: number, gridY: number): Tile | null {
    if (this.isValidPosition(gridX, gridY)) {
      const tile = this.tiles[gridY][gridX];
      this.tiles[gridY][gridX] = null;
      return tile;
    }
    return null;
  }

  public getTile(gridX: number, gridY: number): Tile | null {
    if (this.isValidPosition(gridX, gridY)) {
      return this.tiles[gridY][gridX];
    }
    return null;
  }

  public isValidPosition(gridX: number, gridY: number): boolean {
    return gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight;
  }

  public isOccupied(gridX: number, gridY: number): boolean {
    return this.isValidPosition(gridX, gridY) && this.tiles[gridY][gridX] !== null;
  }

  public canMerge(tileA: Tile, tileB: Tile): boolean {
    // Check adjacency first
    if (!this.areTilesAdjacent(tileA, tileB)) {
      return false;
    }

    // Plus/Minus merge rules:
    // - Plus and Minus tiles can be dragged TO number tiles (not wildcards)
    // - They transform the number: plus increases, minus decreases (with wrapping)
    // - Plus/Minus cannot merge with wildcards or each other
    if ((tileA.isPlus() || tileA.isMinus()) && tileB.isNumberTile()) {
      return true; // Plus or minus merges into number tile
    }

    // Wildcard merge rules:
    // - Wildcards cannot be moved (checked in Tile.ts)
    // - Numbers can merge INTO wildcards
    // - Wildcards cannot merge with other wildcards or special tiles
    if (tileB.isWildcard() && tileA.isNumberTile()) {
      return true; // Number merges into wildcard
    }

    // Standard Jacent rule: tiles can merge if they differ by exactly 1
    if (tileA.isNumberTile() && tileB.isNumberTile()) {
      return Math.abs((tileA.digit as number) - (tileB.digit as number)) === 1;
    }

    return false;
  }

  public mergeTiles(draggedTile: Tile, targetTile: Tile): void {
    // Remove dragged tile from its old position
    this.tiles[draggedTile.gridY][draggedTile.gridX] = null;

    // Destroy the target tile (it gets consumed in the merge)
    const targetGridX = targetTile.gridX;
    const targetGridY = targetTile.gridY;
    targetTile.destroy();

    // Move dragged tile to target position (keeping dragged tile's value)
    this.tiles[targetGridY][targetGridX] = draggedTile;
    const pos = this.getWorldPosition(targetGridX, targetGridY);
    draggedTile.moveTo(pos.x, pos.y, targetGridX, targetGridY);
  }

  public checkWinCondition(): boolean {
    // Win condition: exactly 1 tile remains on the board
    const remainingTiles = this.getAllTiles();
    return remainingTiles.length === 1;
  }

  public hasLegalMoves(): boolean {
    // Check if any legal merges are available
    const allTiles = this.getAllTiles();
    for (let i = 0; i < allTiles.length; i++) {
      for (let j = 0; j < allTiles.length; j++) {
        if (i !== j && this.canMerge(allTiles[i], allTiles[j])) {
          return true;
        }
      }
    }
    return false;
  }

  public getLegalTargets(tile: Tile): Tile[] {
    // Get all tiles that this tile can merge with
    const legalTargets: Tile[] = [];
    const allTiles = this.getAllTiles();
    for (const targetTile of allTiles) {
      if (targetTile !== tile && this.canMerge(tile, targetTile)) {
        legalTargets.push(targetTile);
      }
    }
    return legalTargets;
  }

  public getAllTiles(): Tile[] {
    const allTiles: Tile[] = [];
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const tile = this.tiles[y][x];
        if (tile) {
          allTiles.push(tile);
        }
      }
    }
    return allTiles;
  }

  public clear(): void {
    const allTiles = this.getAllTiles();
    allTiles.forEach((tile) => tile.destroy());
    this.tiles = Array(this.gridHeight)
      .fill(null)
      .map(() => Array(this.gridWidth).fill(null));
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getGridWidth(): number {
    return this.gridWidth;
  }

  public getGridHeight(): number {
    return this.gridHeight;
  }

  public updateLayout(params: { tileSize?: number; centerX?: number; centerY?: number }): void {
    const { tileSize, centerX, centerY } = params;

    if (tileSize !== undefined) {
      this.tileSize = tileSize;
    }

    if (centerX !== undefined) {
      this.centerX = centerX;
    } else {
      this.centerX = this.scene.cameras.main.width / 2;
    }

    if (centerY !== undefined) {
      this.centerY = centerY;
    } else {
      this.centerY = this.scene.cameras.main.height / 2;
    }

    this.recalculateStartPosition();

    const tiles = this.getAllTiles();
    for (const tile of tiles) {
      if (!tile.scene) {
        continue;
      }
      const pos = this.getWorldPosition(tile.gridX, tile.gridY);
      tile.moveTo(pos.x, pos.y, tile.gridX, tile.gridY);
    }
  }

  private areTilesAdjacent(tileA: Tile, tileB: Tile): boolean {
    const deltaX = Math.abs(tileA.gridX - tileB.gridX);
    const deltaY = Math.abs(tileA.gridY - tileB.gridY);

    if (deltaX === 0 && deltaY === 0) {
      return false;
    }

    return deltaX <= 1 && deltaY <= 1;
  }

  private recalculateStartPosition(): void {
    const gap = this.tileSize * this.gapFactor;
    const totalGridWidth = this.gridWidth * this.tileSize + (this.gridWidth - 1) * gap;
    const totalGridHeight = this.gridHeight * this.tileSize + (this.gridHeight - 1) * gap;
    this.startX = this.centerX - totalGridWidth / 2 + this.tileSize / 2;
    this.startY = this.centerY - totalGridHeight / 2 + this.tileSize / 2;
  }
}
