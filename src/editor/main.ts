import './editor.css';
import { createEmptyGrid, deserializeGrid, generateLevel, serializeGrid } from './generator';
import { GridState, isSolvable } from './solver';

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 5;
const MAX_TILE_VALUE = 9;

let currentGrid: GridState = createEmptyGrid(3);
let selectedCell: { x: number; y: number } | null = null;
let tileSlider: HTMLInputElement | null = null;
let tileSliderValueLabel: HTMLSpanElement | null = null;

const root = document.getElementById('editor-root');
if (!root) {
  throw new Error('Missing editor root element');
}

const gridContainer = document.createElement('div');
gridContainer.className = 'grid-container';

const sidebar = document.createElement('div');
sidebar.className = 'sidebar';

const statusContainer = document.createElement('div');
statusContainer.className = 'status';

root.appendChild(gridContainer);
root.appendChild(sidebar);
root.appendChild(statusContainer);

function createSelect(label: string, options: Array<{ label: string; value: number }>, onChange: (value: number) => void): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  const select = document.createElement('select');
  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value.toString();
    optionEl.textContent = option.label;
    select.appendChild(optionEl);
  });

  select.addEventListener('change', () => onChange(Number(select.value)));

  wrapper.appendChild(labelEl);
  wrapper.appendChild(select);
  return wrapper;
}

function createButton(label: string, onClick: () => void, variant: 'primary' | 'secondary' = 'primary'): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `btn btn-${variant}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function cycleCellValue(x: number, y: number): void {
  const current = currentGrid[y][x];
  if (current === null) {
    currentGrid[y][x] = 1;
  } else if (current >= MAX_TILE_VALUE) {
    currentGrid[y][x] = null;
  } else {
    currentGrid[y][x] = current + 1;
  }
  renderGrid();
  updateStatus();
}

function renderGrid(): void {
  gridContainer.innerHTML = '';
  gridContainer.style.setProperty('--grid-size', currentGrid.length.toString());

  for (let y = 0; y < currentGrid.length; y++) {
    for (let x = 0; x < currentGrid[y].length; x++) {
      const value = currentGrid[y][x];
      const cell = document.createElement('button');
      cell.className = 'grid-cell';
      cell.textContent = value === null ? '' : value.toString();
      cell.dataset.x = x.toString();
      cell.dataset.y = y.toString();
      if (selectedCell && selectedCell.x === x && selectedCell.y === y) {
        cell.classList.add('selected');
      }
      cell.addEventListener('click', () => {
        selectedCell = { x, y };
        cycleCellValue(x, y);
      });
      gridContainer.appendChild(cell);
    }
  }
}

function updateStatus(message?: string): void {
  const tiles = currentGrid.flat().filter((value) => value !== null).length;
  const solvable = isSolvable(currentGrid);
  statusContainer.innerHTML = '';

  const info = document.createElement('div');
  info.innerHTML = `Tiles: <strong>${tiles}</strong> • Solvable: <strong class="${solvable ? 'yes' : 'no'}">${solvable ? 'Yes' : 'No'}</strong>`;
  statusContainer.appendChild(info);

  const textarea = document.createElement('textarea');
  textarea.value = serializeGrid(currentGrid);
  textarea.readOnly = true;
  textarea.rows = Math.max(4, currentGrid.length + 1);
  statusContainer.appendChild(textarea);

  const jsonTextarea = document.createElement('textarea');
  jsonTextarea.value = toJsonLayout(currentGrid);
  jsonTextarea.readOnly = true;
  jsonTextarea.rows = Math.max(4, currentGrid.length + 1);
  statusContainer.appendChild(jsonTextarea);

  const messageEl = document.createElement('div');
  messageEl.className = 'status-message';
  messageEl.textContent = message ?? '';
  statusContainer.appendChild(messageEl);
}

function setGridSize(size: number): void {
  const newGrid = createEmptyGrid(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (currentGrid[y] && currentGrid[y][x] !== undefined) {
        newGrid[y][x] = currentGrid[y][x];
      }
    }
  }
  currentGrid = newGrid;
  selectedCell = null;
  if (tileSlider) {
    tileSlider.max = (size * size).toString();
    if (Number(tileSlider.value) > size * size) {
      tileSlider.value = String(size * size);
    }
    if (tileSliderValueLabel) {
      tileSliderValueLabel.textContent = tileSlider.value;
    }
  }
  renderGrid();
  updateStatus('Grid resized');
}

function clearGrid(): void {
  currentGrid = createEmptyGrid(currentGrid.length);
  selectedCell = null;
  renderGrid();
  updateStatus('Cleared grid');
}

function copyToClipboard(text: string): void {
  navigator.clipboard?.writeText(text).catch(() => {
    // ignore clipboard errors
  });
}

function toJsonLayout(grid: GridState): string {
  const lines = grid.map((row) => {
    const content = row.map((cell) => (cell === null ? 'null' : cell.toString())).join(', ');
    return `  [${content}]`;
  });

  const formatted = ['[', ...lines.map((line, index) => (index === lines.length - 1 ? line : `${line},`)), ']'];
  return formatted.join('\n');
}

function createSidebarControls(): void {
  const header = document.createElement('h2');
  header.textContent = 'Level Editor';
  sidebar.appendChild(header);

  const sizeControl = createSelect(
    'Grid Size',
    Array.from({ length: MAX_GRID_SIZE - MIN_GRID_SIZE + 1 }, (_, i) => {
      const value = i + MIN_GRID_SIZE;
      return { label: `${value} × ${value}`, value };
    }),
    (value) => setGridSize(value)
  );
  (sizeControl.querySelector('select') as HTMLSelectElement).value = currentGrid.length.toString();
  sidebar.appendChild(sizeControl);

  const tileSliderWrapper = document.createElement('div');
  tileSliderWrapper.className = 'control';
  const tileLabel = document.createElement('label');
  tileLabel.textContent = 'Tile Count (for auto-generate)';
  tileSlider = document.createElement('input');
  tileSlider.type = 'range';
  tileSlider.min = '1';
  tileSlider.max = (currentGrid.length * currentGrid.length).toString();
  tileSlider.value = '6';
  tileSliderValueLabel = document.createElement('span');
  tileSliderValueLabel.textContent = tileSlider.value;

  tileSlider.addEventListener('input', () => {
    if (tileSliderValueLabel) {
      tileSliderValueLabel.textContent = tileSlider!.value;
    }
  });

  tileSliderWrapper.appendChild(tileLabel);
  tileSliderWrapper.appendChild(tileSlider);
  tileSliderWrapper.appendChild(tileSliderValueLabel);
  sidebar.appendChild(tileSliderWrapper);

  const generateButton = createButton('Auto Generate', () => {
    const desiredTiles = tileSlider ? Number(tileSlider.value) : currentGrid.length;
    const generated = generateLevel({
      gridSize: currentGrid.length,
      tileCount: desiredTiles,
      minValue: 1,
      maxValue: 6,
      maxAttempts: 800,
    });
    if (generated) {
      currentGrid = generated;
      renderGrid();
      updateStatus('Generated solvable puzzle');
    } else {
      updateStatus('Could not generate a solvable puzzle with current settings');
    }
  });
  sidebar.appendChild(generateButton);

  const checkButton = createButton('Check Solvable', () => {
    const solvable = isSolvable(currentGrid);
    updateStatus(solvable ? 'Puzzle is solvable' : 'No solution found');
  }, 'secondary');
  sidebar.appendChild(checkButton);

  const clearButton = createButton('Clear Grid', clearGrid, 'secondary');
  sidebar.appendChild(clearButton);

  const importWrapper = document.createElement('div');
  importWrapper.className = 'control';
  const importLabel = document.createElement('label');
  importLabel.textContent = 'Import Layout';
  const importTextarea = document.createElement('textarea');
  importTextarea.rows = 6;
  importTextarea.placeholder = 'Paste grid using numbers and . for empty cells';
  const importButton = createButton('Load Layout', () => {
    try {
      const parsed = deserializeGrid(importTextarea.value);
      const size = parsed.length;
      if (size < MIN_GRID_SIZE || size > MAX_GRID_SIZE) {
        throw new Error('Grid size out of range');
      }
      currentGrid = parsed;
      (sizeControl.querySelector('select') as HTMLSelectElement).value = size.toString();
      renderGrid();
      updateStatus('Layout imported');
    } catch (error) {
      if (error instanceof Error) {
        updateStatus(`Import failed: ${error.message}`);
      } else {
        updateStatus('Import failed: unknown error');
      }
    }
  });

  importWrapper.appendChild(importLabel);
  importWrapper.appendChild(importTextarea);
  importWrapper.appendChild(importButton);
  sidebar.appendChild(importWrapper);

  const exportButton = createButton('Copy Layout to Clipboard', () => {
    copyToClipboard(serializeGrid(currentGrid));
    updateStatus('Layout copied to clipboard');
  }, 'secondary');
  sidebar.appendChild(exportButton);

  const exportJsonButton = createButton('Copy JSON Layout', () => {
    copyToClipboard(toJsonLayout(currentGrid));
    updateStatus('JSON layout copied to clipboard');
  }, 'secondary');
  sidebar.appendChild(exportJsonButton);
}

createSidebarControls();
renderGrid();
updateStatus();
