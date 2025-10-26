import './styles/editor.css';
import { createEmptyGrid, deserializeGrid, generateLevel, normalizeTileValues } from './generator';
import { GridState, isSolvable, getMinMoves } from './solver';
import { stages } from '../config/StageConfig';

const MIN_GRID_SIZE = 2;
const MAX_GRID_SIZE = 5;
const MAX_TILE_VALUE = 7; // Updated to match new pixel art tiles (1-7)

let currentGrid: GridState = createEmptyGrid(3);
let selectedCell: { x: number; y: number } | null = null;
let tileSlider: HTMLInputElement | null = null;
let tileSliderValueLabel: HTMLSpanElement | null = null;
let wildcardSlider: HTMLInputElement | null = null;
let wildcardSliderValueLabel: HTMLSpanElement | null = null;
let stageSelect: HTMLSelectElement | null = null;
let levelSelect: HTMLSelectElement | null = null;

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
  } else if (current === 'W') {
    currentGrid[y][x] = null;
  } else if (current >= MAX_TILE_VALUE) {
    currentGrid[y][x] = 'W'; // After 7, cycle to wildcard
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
  const minMoves = solvable ? getMinMoves(currentGrid) : null;
  statusContainer.innerHTML = '';

  const info = document.createElement('div');
  const movesText = minMoves !== null ? ` • Par/Min Moves: <strong>${minMoves}</strong>` : '';
  info.innerHTML = `Tiles: <strong>${tiles}</strong> • Solvable: <strong class="${solvable ? 'yes' : 'no'}">${solvable ? 'Yes' : 'No'}</strong>${movesText}`;
  statusContainer.appendChild(info);

  const jsonTextarea = document.createElement('textarea');
  jsonTextarea.value = toJsonLevel(currentGrid, minMoves ?? 0);
  jsonTextarea.readOnly = true;
  jsonTextarea.rows = Math.max(6, currentGrid.length + 4);
  statusContainer.appendChild(jsonTextarea);

  const messageEl = document.createElement('div');
  messageEl.className = 'status-message';
  messageEl.textContent = message ?? '';
  statusContainer.appendChild(messageEl);
}

function validateStage(stageIndex: number): string {
  if (stageIndex < 0 || stageIndex >= stages.length) return 'Invalid stage index';

  const stage = stages[stageIndex];
  const results: string[] = [];
  results.push(`=== ${stage.name} Validation ===\n`);

  stage.levels.forEach((level, index) => {
    const solvable = isSolvable(level.layout);
    const minMoves = solvable ? getMinMoves(level.layout) : null;
    const tiles = level.layout.flat().filter(v => v !== null).length;
    const status = solvable ? '✓' : '✗';
    const parMatch = solvable && minMoves === level.par ? '✓' : (solvable ? `⚠ (actual: ${minMoves})` : '✗');

    results.push(`Level ${index + 1}: ${status} Solvable | Par: ${level.par} ${parMatch} | Tiles: ${tiles} | Grid: ${level.gridSize}x${level.gridSize}`);
  });

  const allSolvable = stage.levels.every(level => isSolvable(level.layout));
  results.push(`\nOverall: ${allSolvable ? '✓ All levels solvable' : '✗ Some levels unsolvable'}`);

  return results.join('\n');
}

function exportStageToFile(stageIndex: number): void {
  if (stageIndex < 0 || stageIndex >= stages.length) return;

  const stage = stages[stageIndex];
  const stageData = {
    name: stage.name,
    levels: stage.levels.map(level => ({
      gridSize: level.gridSize,
      par: level.par,
      layout: level.layout,
    })),
  };

  const json = JSON.stringify(stageData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stage${stageIndex + 1}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
  const maxTiles = size * size;
  if (tileSlider) {
    tileSlider.max = maxTiles.toString();
    if (Number(tileSlider.value) > maxTiles) {
      tileSlider.value = String(maxTiles);
    }
    if (tileSliderValueLabel) {
      tileSliderValueLabel.textContent = tileSlider.value;
    }
  }
  if (wildcardSlider) {
    const currentTileCount = tileSlider ? Number(tileSlider.value) : maxTiles;
    wildcardSlider.max = currentTileCount.toString();
    if (Number(wildcardSlider.value) > currentTileCount) {
      wildcardSlider.value = currentTileCount.toString();
    }
    if (wildcardSliderValueLabel) {
      wildcardSliderValueLabel.textContent = wildcardSlider.value;
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

function toJsonLevel(grid: GridState, par: number): string {
  // Format layout with each row on a single line
  const layoutLines = grid.map((row) => {
    return `    ${JSON.stringify(row)}`;
  });

  const lines = [
    '{',
    `  "gridSize": ${grid.length},`,
    `  "par": ${par},`,
    '  "layout": [',
    layoutLines.join(',\n'),
    '  ]',
    '}',
  ];

  return lines.join('\n');
}

function loadStageLevel(stageIndex: number, levelIndex: number): void {
  if (stageIndex < 0 || stageIndex >= stages.length) return;
  const stage = stages[stageIndex];
  if (levelIndex < 0 || levelIndex >= stage.levels.length) return;

  const level = stage.levels[levelIndex];
  currentGrid = level.layout.map(row => [...row]);

  // Update grid size selector
  const sizeSelect = document.querySelector('.control select') as HTMLSelectElement | null;
  if (sizeSelect) {
    sizeSelect.value = level.gridSize.toString();
  }

  renderGrid();
  updateStatus(`Loaded ${stage.name} - Level ${levelIndex + 1}`);
}

function updateLevelSelect(): void {
  if (!stageSelect || !levelSelect) return;

  const stageIndex = Number(stageSelect.value);
  levelSelect.innerHTML = '';

  if (stageIndex >= 0 && stageIndex < stages.length) {
    const stage = stages[stageIndex];
    stage.levels.forEach((_, index) => {
      const option = document.createElement('option');
      option.value = index.toString();
      option.textContent = `Level ${index + 1}`;
      levelSelect!.appendChild(option);
    });
  }
}

function createSidebarControls(): void {
  const header = document.createElement('h2');
  header.textContent = 'Level Editor';
  sidebar.appendChild(header);

  // Stage selector
  const stageWrapper = document.createElement('div');
  stageWrapper.className = 'control';
  const stageLabel = document.createElement('label');
  stageLabel.textContent = 'Stage';
  stageSelect = document.createElement('select');
  stages.forEach((stage, index) => {
    const option = document.createElement('option');
    option.value = index.toString();
    option.textContent = stage.name;
    stageSelect!.appendChild(option);
  });
  stageSelect.addEventListener('change', () => {
    updateLevelSelect();
    if (levelSelect) {
      levelSelect.value = '0';
    }
  });
  stageWrapper.appendChild(stageLabel);
  stageWrapper.appendChild(stageSelect);
  sidebar.appendChild(stageWrapper);

  // Level selector
  const levelWrapper = document.createElement('div');
  levelWrapper.className = 'control';
  const levelLabel = document.createElement('label');
  levelLabel.textContent = 'Level';
  levelSelect = document.createElement('select');
  levelWrapper.appendChild(levelLabel);
  levelWrapper.appendChild(levelSelect);
  sidebar.appendChild(levelWrapper);

  // Initialize level select
  updateLevelSelect();

  // Load level button
  const loadButton = createButton('Load Selected Level', () => {
    if (stageSelect && levelSelect) {
      loadStageLevel(Number(stageSelect.value), Number(levelSelect.value));
    }
  }, 'primary');
  sidebar.appendChild(loadButton);

  // Separator
  const separator = document.createElement('hr');
  separator.style.margin = '20px 0';
  separator.style.border = 'none';
  separator.style.borderTop = '1px solid #ddd';
  sidebar.appendChild(separator);

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
    // Update wildcard slider max
    if (wildcardSlider && tileSlider) {
      const maxWildcards = Number(tileSlider.value);
      wildcardSlider.max = maxWildcards.toString();
      if (Number(wildcardSlider.value) > maxWildcards) {
        wildcardSlider.value = maxWildcards.toString();
        if (wildcardSliderValueLabel) {
          wildcardSliderValueLabel.textContent = wildcardSlider.value;
        }
      }
    }
  });

  tileSliderWrapper.appendChild(tileLabel);
  tileSliderWrapper.appendChild(tileSlider);
  tileSliderWrapper.appendChild(tileSliderValueLabel);
  sidebar.appendChild(tileSliderWrapper);

  // Wildcard count slider
  const wildcardSliderWrapper = document.createElement('div');
  wildcardSliderWrapper.className = 'control';
  const wildcardLabel = document.createElement('label');
  wildcardLabel.textContent = 'Wildcard Count (in generated tiles)';
  wildcardSlider = document.createElement('input');
  wildcardSlider.type = 'range';
  wildcardSlider.min = '0';
  wildcardSlider.max = tileSlider.value;
  wildcardSlider.value = '0';
  wildcardSliderValueLabel = document.createElement('span');
  wildcardSliderValueLabel.textContent = wildcardSlider.value;

  wildcardSlider.addEventListener('input', () => {
    if (wildcardSliderValueLabel) {
      wildcardSliderValueLabel.textContent = wildcardSlider!.value;
    }
  });

  wildcardSliderWrapper.appendChild(wildcardLabel);
  wildcardSliderWrapper.appendChild(wildcardSlider);
  wildcardSliderWrapper.appendChild(wildcardSliderValueLabel);
  sidebar.appendChild(wildcardSliderWrapper);

  const generateButton = createButton('Auto Generate', () => {
    const desiredTiles = tileSlider ? Number(tileSlider.value) : currentGrid.length;
    const wildcardCount = wildcardSlider ? Number(wildcardSlider.value) : 0;
    const gridSize = currentGrid.length;

    // Adjust max attempts based on grid size to prevent hanging
    const maxAttempts = gridSize >= 5 ? 50 : (gridSize >= 4 ? 200 : 800);

    updateStatus('Generating puzzle...');

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const startTime = Date.now();
      const generated = generateLevel({
        gridSize: gridSize,
        tileCount: desiredTiles,
        minValue: 1,
        maxValue: 7,
        maxAttempts: maxAttempts,
        wildcardCount: wildcardCount,
      });
      const elapsed = Date.now() - startTime;

      if (generated) {
        currentGrid = generated;
        renderGrid();
        updateStatus(`Generated solvable puzzle in ${(elapsed / 1000).toFixed(2)}s` + (wildcardCount > 0 ? ` with ${wildcardCount} wildcard(s)` : ''));
      } else {
        updateStatus(`Could not generate a solvable puzzle after ${maxAttempts} attempts (${(elapsed / 1000).toFixed(2)}s). Try fewer tiles or different settings.`);
      }
    }, 10);
  });
  sidebar.appendChild(generateButton);

  const checkButton = createButton('Check Solvable', () => {
    const solvable = isSolvable(currentGrid);
    updateStatus(solvable ? 'Puzzle is solvable' : 'No solution found');
  }, 'secondary');
  sidebar.appendChild(checkButton);

  const normalizeButton = createButton('Normalize Tiles', () => {
    currentGrid = normalizeTileValues(currentGrid);
    renderGrid();
    updateStatus('Tiles normalized to consecutive values starting from 1');
  }, 'secondary');
  sidebar.appendChild(normalizeButton);

  const clearButton = createButton('Clear Grid', clearGrid, 'secondary');
  sidebar.appendChild(clearButton);

  const importWrapper = document.createElement('div');
  importWrapper.className = 'control';
  const importLabel = document.createElement('label');
  importLabel.textContent = 'Import Level';
  const importTextarea = document.createElement('textarea');
  importTextarea.rows = 8;
  importTextarea.placeholder = 'Paste level definition:\n{\n  "gridSize": 3,\n  "par": 5,\n  "layout": [...]\n}';
  const importButton = createButton('Load Level', () => {
    try {
      const parsed = deserializeGrid(importTextarea.value);
      const size = parsed.length;
      if (size < MIN_GRID_SIZE || size > MAX_GRID_SIZE) {
        throw new Error('Grid size out of range');
      }
      currentGrid = normalizeTileValues(parsed);
      (sizeControl.querySelector('select') as HTMLSelectElement).value = size.toString();
      renderGrid();
      updateStatus('Level imported and normalized');
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

  const exportJsonButton = createButton('Copy Level to Clipboard', () => {
    const minMoves = getMinMoves(currentGrid);
    copyToClipboard(toJsonLevel(currentGrid, minMoves ?? 0));
    updateStatus('Level definition copied to clipboard');
  }, 'secondary');
  sidebar.appendChild(exportJsonButton);

  // Separator
  const separator2 = document.createElement('hr');
  separator2.style.margin = '20px 0';
  separator2.style.border = 'none';
  separator2.style.borderTop = '1px solid #ddd';
  sidebar.appendChild(separator2);

  // Validate current stage button
  const validateButton = createButton('Validate Current Stage', () => {
    if (stageSelect) {
      const stageIndex = Number(stageSelect.value);
      const validation = validateStage(stageIndex);

      // Show validation in a modal/alert
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.background = 'white';
      modal.style.padding = '30px';
      modal.style.borderRadius = '10px';
      modal.style.boxShadow = '0 10px 50px rgba(0,0,0,0.3)';
      modal.style.zIndex = '1000';
      modal.style.maxWidth = '600px';
      modal.style.maxHeight = '80vh';
      modal.style.overflow = 'auto';

      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.fontFamily = 'monospace';
      pre.style.fontSize = '14px';
      pre.style.margin = '0 0 20px 0';
      pre.textContent = validation;

      const closeBtn = createButton('Close', () => {
        document.body.removeChild(overlay);
      }, 'secondary');

      const copyBtn = createButton('Copy to Clipboard', () => {
        copyToClipboard(validation);
      }, 'primary');
      copyBtn.style.marginRight = '10px';

      const btnContainer = document.createElement('div');
      btnContainer.appendChild(copyBtn);
      btnContainer.appendChild(closeBtn);

      modal.appendChild(pre);
      modal.appendChild(btnContainer);

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '999';
      overlay.appendChild(modal);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });

      document.body.appendChild(overlay);
    }
  }, 'primary');
  sidebar.appendChild(validateButton);

  // Export stage to file button
  const exportStageButton = createButton('Export Current Stage to File', () => {
    if (stageSelect) {
      const stageIndex = Number(stageSelect.value);
      exportStageToFile(stageIndex);
      updateStatus(`Exported ${stages[stageIndex].name} to file`);
    }
  }, 'secondary');
  sidebar.appendChild(exportStageButton);
}

createSidebarControls();
renderGrid();
updateStatus();
