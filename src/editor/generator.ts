import { GridState, cloneGrid, countTiles, isSolvable } from './solver';

type CellValue = number | null;

interface GenerateOptions {
  gridSize: number;
  tileCount: number;
  minValue?: number;
  maxValue?: number;
  maxAttempts?: number;
}

export function createEmptyGrid(size: number): GridState {
  return Array.from({ length: size }, () => Array<CellValue>(size).fill(null));
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placeRandomTiles(grid: GridState, tileCount: number, minValue: number, maxValue: number): GridState {
  const size = grid.length;
  const availablePositions = [] as Array<{ x: number; y: number }>;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      availablePositions.push({ x, y });
    }
  }

  const next = cloneGrid(grid);
  for (let i = 0; i < tileCount && availablePositions.length > 0; i++) {
    const index = getRandomInt(0, availablePositions.length - 1);
    const { x, y } = availablePositions.splice(index, 1)[0];
    next[y][x] = getRandomInt(minValue, maxValue);
  }

  return next;
}

function ensureAtLeastOneMergeablePair(grid: GridState): boolean {
  const size = grid.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = grid[y][x];
      if (value === null) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (ny < 0 || ny >= size || nx < 0 || nx >= size) continue;
          const neighbor = grid[ny][nx];
          if (neighbor === null) continue;
          if (Math.abs(value - neighbor) === 1) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function generateLevel(options: GenerateOptions): GridState | null {
  const { gridSize, tileCount, minValue = 1, maxValue = 6, maxAttempts = 300 } = options;
  if (tileCount <= 0 || tileCount > gridSize * gridSize) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const base = createEmptyGrid(gridSize);
    const seeded = placeRandomTiles(base, tileCount, minValue, maxValue);

    if (!ensureAtLeastOneMergeablePair(seeded)) {
      continue;
    }

    if (countTiles(seeded) !== tileCount) {
      continue;
    }

    if (isSolvable(seeded)) {
      return seeded;
    }
  }

  return null;
}

export function serializeGrid(grid: GridState): string {
  return grid
    .map((row) => row.map((cell) => (cell === null ? '.' : cell.toString())).join(' '))
    .join('\n');
}

export function deserializeGrid(input: string): GridState {
  const rows = input
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .map((token) => {
          if (token === '.' || token === 'null' || token === '-') {
            return null;
          }
          const value = Number(token);
          return Number.isFinite(value) ? value : null;
        })
    );

  const size = rows.length;
  const normalized = rows.map((row) => {
    if (row.length !== size) {
      throw new Error('Grid must be square when importing');
    }
    return row;
  });

  return normalized;
}
