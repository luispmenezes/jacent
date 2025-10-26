export type CellValue = number | 'W' | null;
export type GridState = CellValue[][];

// Compact state representation for efficient memoization
interface TileState {
  value: number | 'W';
  row: number;
  col: number;
}

export function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => row.slice());
}

// Convert grid to compact tile array (only occupied cells)
function gridToTileArray(grid: GridState): TileState[] {
  const tiles: TileState[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const value = grid[row][col];
      if (value !== null) {
        tiles.push({ value, row, col });
      }
    }
  }
  return tiles;
}

// Create canonical string key from tile array for memoization
function stateToKey(tiles: TileState[]): string {
  // Sort for canonical representation
  const sorted = [...tiles].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.col !== b.col) return a.col - b.col;
    return String(a.value).localeCompare(String(b.value));
  });
  return JSON.stringify(sorted);
}

// Check if two tiles are adjacent (8-directional)
function areTilesAdjacent(a: TileState, b: TileState): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && (dr + dc) > 0;
}

// Check if tiles can merge based on game rules
function canTilesMerge(from: TileState, to: TileState): boolean {
  if (!areTilesAdjacent(from, to)) return false;

  // Wildcard rules
  if (to.value === 'W' && typeof from.value === 'number') {
    return true; // Number can merge into wildcard
  }

  // Number-to-number merge
  if (typeof from.value === 'number' && typeof to.value === 'number') {
    return Math.abs(from.value - to.value) === 1;
  }

  return false;
}

export function countTiles(grid: GridState): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) {
        count += 1;
      }
    }
  }
  return count;
}

// Calculate dynamic move limit based on grid complexity
function calculateMoveLimit(tileCount: number): number {
  // Base limit: roughly 2x the tile count
  return Math.min(tileCount * 2, 50);
}

// DFS with memoization for optimal solvability checking
export function isSolvable(grid: GridState, moveLimit?: number): boolean {
  const initialTiles = gridToTileArray(grid);

  // Base case: 0 or 1 tile
  if (initialTiles.length <= 1) {
    return true;
  }

  const limit = moveLimit ?? calculateMoveLimit(initialTiles.length);
  const memo = new Map<string, boolean>();

  function dfs(tiles: TileState[], depth: number): boolean {
    // Base case: one tile left = solved
    if (tiles.length === 1) {
      return true;
    }

    // Depth limit check
    if (depth >= limit) {
      return false;
    }

    // Check memoization
    const key = stateToKey(tiles);
    if (memo.has(key)) {
      return memo.get(key)!;
    }

    // Try all valid merges
    for (let i = 0; i < tiles.length; i++) {
      const from = tiles[i];

      // Wildcards cannot be moved (only merged into)
      if (from.value === 'W') continue;

      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        const to = tiles[j];

        // Check if this merge is valid
        if (!canTilesMerge(from, to)) continue;

        // Create next state: remove both tiles, add merged tile at 'to' position
        const nextTiles: TileState[] = [];
        for (let k = 0; k < tiles.length; k++) {
          if (k !== i && k !== j) {
            nextTiles.push(tiles[k]);
          }
        }
        nextTiles.push({ value: from.value, row: to.row, col: to.col });

        // Recursive call
        if (dfs(nextTiles, depth + 1)) {
          memo.set(key, true);
          return true;
        }
      }
    }

    // No valid path found
    memo.set(key, false);
    return false;
  }

  return dfs(initialTiles, 0);
}

// BFS with compact state representation - naturally finds shortest path
export function getMinMoves(grid: GridState, moveLimit?: number): number | null {
  const initialTiles = gridToTileArray(grid);

  if (initialTiles.length <= 1) {
    return 0;
  }

  const limit = moveLimit ?? calculateMoveLimit(initialTiles.length);
  const visited = new Set<string>();
  const queue: Array<{ tiles: TileState[]; depth: number }> = [{ tiles: initialTiles, depth: 0 }];

  visited.add(stateToKey(initialTiles));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { tiles, depth } = current;

    if (depth >= limit) {
      continue;
    }

    // Try all valid merges
    for (let i = 0; i < tiles.length; i++) {
      const from = tiles[i];

      // Wildcards cannot be moved
      if (from.value === 'W') continue;

      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        const to = tiles[j];

        // Check if this merge is valid
        if (!canTilesMerge(from, to)) continue;

        // Create next state
        const nextTiles: TileState[] = [];
        for (let k = 0; k < tiles.length; k++) {
          if (k !== i && k !== j) {
            nextTiles.push(tiles[k]);
          }
        }
        nextTiles.push({ value: from.value, row: to.row, col: to.col });

        // Check if solved
        if (nextTiles.length === 1) {
          return depth + 1; // BFS guarantees this is minimal
        }

        // Add to queue if not visited
        const key = stateToKey(nextTiles);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ tiles: nextTiles, depth: depth + 1 });
        }
      }
    }
  }

  return null;
}
