export type CellValue = number | null;
export type GridState = CellValue[][];

interface TilePosition {
  x: number;
  y: number;
  value: number;
}

const ADJACENT_STEPS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function cloneGrid(grid: GridState): GridState {
  return grid.map((row) => row.slice());
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

function getTilePositions(grid: GridState): TilePosition[] {
  const tiles: TilePosition[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const value = grid[y][x];
      if (value !== null) {
        tiles.push({ x, y, value });
      }
    }
  }
  return tiles;
}

function getHash(grid: GridState): string {
  return grid
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null) return '.';
          // encode numbers up to at least two digits
          return cell.toString();
        })
        .join(',')
    )
    .join('|');
}

function inBounds(grid: GridState, x: number, y: number): boolean {
  return y >= 0 && y < grid.length && x >= 0 && x < grid[y].length;
}

function applyMerge(
  grid: GridState,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): GridState {
  const next = cloneGrid(grid);
  const value = next[fromY][fromX];
  if (value === null) {
    return next;
  }
  next[fromY][fromX] = null;
  next[toY][toX] = value;
  return next;
}

function getLegalMoves(grid: GridState): Array<{ from: TilePosition; to: TilePosition }> {
  const tiles = getTilePositions(grid);
  const moves: Array<{ from: TilePosition; to: TilePosition }> = [];

  for (const from of tiles) {
    for (const step of ADJACENT_STEPS) {
      const toX = from.x + step[0];
      const toY = from.y + step[1];
      if (!inBounds(grid, toX, toY)) continue;
      const value = grid[toY][toX];
      if (value === null) continue;
      if (Math.abs(from.value - value) === 1) {
        moves.push({
          from,
          to: { x: toX, y: toY, value },
        });
      }
    }
  }

  return moves;
}

export function isSolvable(grid: GridState, moveLimit = 25): boolean {
  const totalTiles = countTiles(grid);
  if (totalTiles <= 1) {
    return true;
  }

  const visited = new Set<string>();

  const dfs = (state: GridState, depth: number): boolean => {
    const tilesRemaining = countTiles(state);
    if (tilesRemaining <= 1) {
      return true;
    }

    if (depth >= moveLimit) {
      return false;
    }

    const hash = getHash(state);
    if (visited.has(hash)) {
      return false;
    }
    visited.add(hash);

    const moves = getLegalMoves(state);
    if (moves.length === 0) {
      return false;
    }

    for (const move of moves) {
      const { from, to } = move;
      // dragging `from` onto `to`
      const forward = applyMerge(state, from.x, from.y, to.x, to.y);
      if (dfs(forward, depth + 1)) {
        return true;
      }

      // dragging `to` onto `from`
      const backward = applyMerge(state, to.x, to.y, from.x, from.y);
      if (dfs(backward, depth + 1)) {
        return true;
      }
    }

    return false;
  };

  return dfs(grid, 0);
}
