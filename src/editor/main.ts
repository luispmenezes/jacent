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
let gridSizeSelect: HTMLSelectElement | null = null;
let plusInput: HTMLInputElement | null = null;
let minusInput: HTMLInputElement | null = null;

const root = document.getElementById('editor-root');
if (!root) {
  throw new Error('Missing editor root element');
}

const gridContainer = document.createElement('div');
gridContainer.className = 'grid-container';

const sidebar = document.createElement('aside');
sidebar.className = 'sidebar';

const statusContainer = document.createElement('div');
statusContainer.className = 'status';

const mainColumn = document.createElement('div');
mainColumn.className = 'main-column';

const header = document.createElement('div');
header.className = 'main-header';

const title = document.createElement('h1');
title.textContent = 'Level Editor';

const subtitle = document.createElement('span');
subtitle.className = 'main-subtitle';
subtitle.textContent = 'Click tiles to cycle values (1 → 7 → W → + → - → empty).';

header.appendChild(title);
header.appendChild(subtitle);

mainColumn.appendChild(header);
mainColumn.appendChild(statusContainer);
mainColumn.appendChild(gridContainer);

root.appendChild(mainColumn);
root.appendChild(sidebar);

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

function getTileBudget(): number {
  if (tileSlider) {
    return Number(tileSlider.value);
  }
  return currentGrid.length * currentGrid.length;
}

function clampNumberInput(input: HTMLInputElement, min: number, max: number): number {
  const parsed = Math.floor(Number(input.value));
  const clamped = Math.min(Math.max(isNaN(parsed) ? min : parsed, min), max);
  input.value = clamped.toString();
  return clamped;
}

function enforceSpecialTileLimits(): void {
  const max = getTileBudget();
  let wildcard = wildcardSlider ? Number(wildcardSlider.value) : 0;
  let plus = plusInput ? Math.max(0, Math.min(Number(plusInput.value), max)) : 0;
  let minus = minusInput ? Math.max(0, Math.min(Number(minusInput.value), max)) : 0;

  if (plusInput) {
    plusInput.max = max.toString();
    if (Number(plusInput.value) !== plus) {
      plusInput.value = Math.max(0, plus).toString();
    }
  }
  if (minusInput) {
    minusInput.max = max.toString();
    if (Number(minusInput.value) !== minus) {
      minusInput.value = Math.max(0, minus).toString();
    }
  }
  if (wildcardSlider) {
    wildcardSlider.max = max.toString();
    if (Number(wildcardSlider.value) > max) {
      wildcardSlider.value = max.toString();
      if (wildcardSliderValueLabel) {
        wildcardSliderValueLabel.textContent = wildcardSlider.value;
      }
      wildcard = Number(wildcardSlider.value);
    }
  }

  let overflow = wildcard + plus + minus - max;
  if (overflow > 0 && minusInput) {
    const newMinus = Math.max(0, minus - overflow);
    overflow -= minus - newMinus;
    minus = newMinus;
    minusInput.value = newMinus.toString();
  }
  if (overflow > 0 && plusInput) {
    const newPlus = Math.max(0, plus - overflow);
    overflow -= plus - newPlus;
    plus = newPlus;
    plusInput.value = newPlus.toString();
  }
  if (overflow > 0 && wildcardSlider) {
    const newWildcard = Math.max(0, wildcard - overflow);
    wildcardSlider.value = newWildcard.toString();
    if (wildcardSliderValueLabel) {
      wildcardSliderValueLabel.textContent = wildcardSlider.value;
    }
  }

  if (wildcardSliderValueLabel) {
    wildcardSliderValueLabel.textContent = wildcardSlider ? wildcardSlider.value : '0';
  }
}

function cycleCellValue(x: number, y: number): void {
  const current = currentGrid[y][x];
  if (current === null) {
    currentGrid[y][x] = 1;
  } else if (current === 'W') {
    currentGrid[y][x] = '+'; // After wildcard, cycle to plus
  } else if (current === '+') {
    currentGrid[y][x] = '-'; // After plus, cycle to minus
  } else if (current === '-') {
    currentGrid[y][x] = null; // After minus, cycle back to null
  } else if (typeof current === 'number' && current >= MAX_TILE_VALUE) {
    currentGrid[y][x] = 'W'; // After 7, cycle to wildcard
  } else if (typeof current === 'number') {
    currentGrid[y][x] = current + 1;
  }
  renderGrid();
  updateStatus();
}

function renderGrid(): void {
  gridContainer.innerHTML = '';
  gridContainer.style.setProperty('--grid-size', currentGrid.length.toString());
  const cellSize = Math.min(76, Math.floor(360 / currentGrid.length));
  gridContainer.style.setProperty('--cell-size', `${cellSize}px`);

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

  const metrics = document.createElement('div');
  metrics.className = 'status-metrics';

  const tilesMetric = document.createElement('div');
  tilesMetric.className = 'status-metric';
  tilesMetric.innerHTML = `<span class="metric-label">Tiles</span><span class="metric-value">${tiles}</span>`;
  metrics.appendChild(tilesMetric);

  const solvableMetric = document.createElement('div');
  solvableMetric.className = `status-metric ${solvable ? 'metric-positive' : 'metric-negative'}`;
  solvableMetric.innerHTML = `<span class="metric-label">Solvable</span><span class="metric-value">${solvable ? 'Yes' : 'No'}</span>`;
  metrics.appendChild(solvableMetric);

  if (minMoves !== null) {
    const movesMetric = document.createElement('div');
    movesMetric.className = 'status-metric';
    movesMetric.innerHTML = `<span class="metric-label">Min Moves</span><span class="metric-value">${minMoves}</span>`;
    metrics.appendChild(movesMetric);
  }

  statusContainer.appendChild(metrics);

  const jsonGroup = document.createElement('div');
  jsonGroup.className = 'status-json';

  const jsonLabel = document.createElement('label');
  jsonLabel.textContent = 'Level JSON';
  jsonGroup.appendChild(jsonLabel);

  const jsonTextarea = document.createElement('textarea');
  jsonTextarea.value = toJsonLevel(currentGrid, minMoves ?? 0);
  jsonTextarea.readOnly = true;
  const suggestedRows = Math.max(5, currentGrid.length + 2);
  jsonTextarea.rows = Math.min(8, suggestedRows);
  jsonGroup.appendChild(jsonTextarea);

  statusContainer.appendChild(jsonGroup);

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
  if (plusInput) {
    const currentTileCount = tileSlider ? Number(tileSlider.value) : maxTiles;
    plusInput.max = currentTileCount.toString();
    if (Number(plusInput.value) > currentTileCount) {
      plusInput.value = currentTileCount.toString();
    }
  }
  if (minusInput) {
    const currentTileCount = tileSlider ? Number(tileSlider.value) : maxTiles;
    minusInput.max = currentTileCount.toString();
    if (Number(minusInput.value) > currentTileCount) {
      minusInput.value = currentTileCount.toString();
    }
  }
  enforceSpecialTileLimits();
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
  if (gridSizeSelect) {
    gridSizeSelect.value = level.gridSize.toString();
  }

  renderGrid();
  updateStatus(`Loaded ${stage.name} - Level ${levelIndex + 1}`);
  enforceSpecialTileLimits();
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
  const heading = document.createElement('h2');
  heading.textContent = 'Controls';
  sidebar.appendChild(heading);

  const stageSection = document.createElement('section');
  stageSection.className = 'sidebar-section';

  const stageRow = document.createElement('div');
  stageRow.className = 'control-row';

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

  const levelWrapper = document.createElement('div');
  levelWrapper.className = 'control';
  const levelLabel = document.createElement('label');
  levelLabel.textContent = 'Level';
  levelSelect = document.createElement('select');
  levelWrapper.appendChild(levelLabel);
  levelWrapper.appendChild(levelSelect);

  stageRow.appendChild(stageWrapper);
  stageRow.appendChild(levelWrapper);
  stageSection.appendChild(stageRow);

  updateLevelSelect();

  const loadButton = createButton('Load Selected Level', () => {
    if (stageSelect && levelSelect) {
      loadStageLevel(Number(stageSelect.value), Number(levelSelect.value));
    }
  }, 'primary');
  loadButton.classList.add('btn-block');
  stageSection.appendChild(loadButton);

  sidebar.appendChild(stageSection);

  const gridSection = document.createElement('section');
  gridSection.className = 'sidebar-section';
  const gridHeading = document.createElement('h3');
  gridHeading.textContent = 'Grid & Generation';
  gridSection.appendChild(gridHeading);

  const sizeControl = createSelect(
    'Grid Size',
    Array.from({ length: MAX_GRID_SIZE - MIN_GRID_SIZE + 1 }, (_, i) => {
      const value = i + MIN_GRID_SIZE;
      return { label: `${value} × ${value}`, value };
    }),
    (value) => setGridSize(value)
  );
  gridSizeSelect = sizeControl.querySelector('select') as HTMLSelectElement;
  gridSizeSelect.value = currentGrid.length.toString();
  gridSection.appendChild(sizeControl);

  const tileSliderWrapper = document.createElement('div');
  tileSliderWrapper.className = 'range-control';
  const tileLabelRow = document.createElement('div');
  tileLabelRow.className = 'control-label-row';
  const tileLabel = document.createElement('label');
  const tileSliderId = 'tile-slider';
  tileLabel.htmlFor = tileSliderId;
  tileLabel.textContent = 'Tiles';
  tileSliderValueLabel = document.createElement('span');
  tileSliderValueLabel.className = 'range-value';
  tileSliderWrapper.appendChild(tileLabelRow);
  tileLabelRow.appendChild(tileLabel);
  tileLabelRow.appendChild(tileSliderValueLabel);
  tileSlider = document.createElement('input');
  tileSlider.id = tileSliderId;
  tileSlider.type = 'range';
  tileSlider.min = '1';
  tileSlider.max = (currentGrid.length * currentGrid.length).toString();
  tileSlider.value = '6';
  tileSliderValueLabel.textContent = tileSlider.value;
  tileSlider.addEventListener('input', () => {
    const sliderValue = tileSlider!.value;
    if (tileSliderValueLabel) {
      tileSliderValueLabel.textContent = sliderValue;
    }
    if (wildcardSlider) {
      const maxWildcards = Number(sliderValue);
      wildcardSlider.max = maxWildcards.toString();
      if (Number(wildcardSlider.value) > maxWildcards) {
        wildcardSlider.value = maxWildcards.toString();
        if (wildcardSliderValueLabel) {
          wildcardSliderValueLabel.textContent = wildcardSlider.value;
        }
      }
    }
    if (plusInput) {
      plusInput.max = sliderValue;
    }
    if (minusInput) {
      minusInput.max = sliderValue;
    }
    enforceSpecialTileLimits();
  });
  tileSliderWrapper.appendChild(tileSlider);
  gridSection.appendChild(tileSliderWrapper);

  const wildcardSliderWrapper = document.createElement('div');
  wildcardSliderWrapper.className = 'range-control';
  const wildcardLabelRow = document.createElement('div');
  wildcardLabelRow.className = 'control-label-row';
  const wildcardLabel = document.createElement('label');
  const wildcardSliderId = 'wildcard-slider';
  wildcardLabel.htmlFor = wildcardSliderId;
  wildcardLabel.textContent = 'Wildcards';
  wildcardSliderValueLabel = document.createElement('span');
  wildcardSliderValueLabel.className = 'range-value';
  wildcardLabelRow.appendChild(wildcardLabel);
  wildcardLabelRow.appendChild(wildcardSliderValueLabel);
  wildcardSlider = document.createElement('input');
  wildcardSlider.id = wildcardSliderId;
  wildcardSlider.type = 'range';
  wildcardSlider.min = '0';
  wildcardSlider.max = tileSlider.value;
  wildcardSlider.value = '0';
  wildcardSliderValueLabel.textContent = wildcardSlider.value;
  wildcardSlider.addEventListener('input', () => {
    const value = wildcardSlider!.value;
    if (wildcardSliderValueLabel) {
      wildcardSliderValueLabel.textContent = value;
    }
    enforceSpecialTileLimits();
  });
  wildcardSliderWrapper.appendChild(wildcardLabelRow);
  wildcardSliderWrapper.appendChild(wildcardSlider);
  gridSection.appendChild(wildcardSliderWrapper);

  const specialRow = document.createElement('div');
  specialRow.className = 'control-row';

  const plusControl = document.createElement('div');
  plusControl.className = 'control';
  const plusLabel = document.createElement('label');
  plusLabel.textContent = 'Plus Tiles';
  plusInput = document.createElement('input');
  plusInput.type = 'number';
  plusInput.min = '0';
  plusInput.step = '1';
  plusInput.value = '0';
  plusInput.max = tileSlider.value;
  plusInput.addEventListener('input', () => {
    if (!plusInput) return;
    clampNumberInput(plusInput, 0, getTileBudget());
    enforceSpecialTileLimits();
  });
  plusControl.appendChild(plusLabel);
  plusControl.appendChild(plusInput);

  const minusControl = document.createElement('div');
  minusControl.className = 'control';
  const minusLabel = document.createElement('label');
  minusLabel.textContent = 'Minus Tiles';
  minusInput = document.createElement('input');
  minusInput.type = 'number';
  minusInput.min = '0';
  minusInput.step = '1';
  minusInput.value = '0';
  minusInput.max = tileSlider.value;
  minusInput.addEventListener('input', () => {
    if (!minusInput) return;
    clampNumberInput(minusInput, 0, getTileBudget());
    enforceSpecialTileLimits();
  });
  minusControl.appendChild(minusLabel);
  minusControl.appendChild(minusInput);

  specialRow.appendChild(plusControl);
  specialRow.appendChild(minusControl);
  gridSection.appendChild(specialRow);

  const generateButton = createButton('Auto Generate', () => {
    enforceSpecialTileLimits();
    const desiredTiles = tileSlider ? Number(tileSlider.value) : currentGrid.length;
    const wildcardCount = wildcardSlider ? Number(wildcardSlider.value) : 0;
    const plusCount = plusInput ? Number(plusInput.value) : 0;
    const minusCount = minusInput ? Number(minusInput.value) : 0;
    const gridSize = currentGrid.length;

    const maxAttempts = gridSize >= 5 ? 50 : (gridSize >= 4 ? 200 : 800);

    updateStatus('Generating puzzle...');

    setTimeout(() => {
      const startTime = Date.now();
      const generated = generateLevel({
        gridSize: gridSize,
        tileCount: desiredTiles,
        minValue: 1,
        maxValue: 7,
        maxAttempts: maxAttempts,
        wildcardCount: wildcardCount,
        plusCount: plusCount,
        minusCount: minusCount,
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
  generateButton.classList.add('btn-block');
  gridSection.appendChild(generateButton);

  sidebar.appendChild(gridSection);

  const toolsSection = document.createElement('section');
  toolsSection.className = 'sidebar-section';
  const toolsHeading = document.createElement('h3');
  toolsHeading.textContent = 'Board Tools';
  toolsSection.appendChild(toolsHeading);

  const toolsRow = document.createElement('div');
  toolsRow.className = 'button-row';

  const checkButton = createButton('Check', () => {
    const solvable = isSolvable(currentGrid);
    updateStatus(solvable ? 'Puzzle is solvable' : 'No solution found');
  }, 'secondary');

  const normalizeButton = createButton('Normalize', () => {
    currentGrid = normalizeTileValues(currentGrid);
    renderGrid();
    updateStatus('Tiles normalized');
  }, 'secondary');

  const clearButton = createButton('Clear', clearGrid, 'secondary');

  toolsRow.appendChild(checkButton);
  toolsRow.appendChild(normalizeButton);
  toolsRow.appendChild(clearButton);
  toolsSection.appendChild(toolsRow);
  sidebar.appendChild(toolsSection);

  const ioSection = document.createElement('section');
  ioSection.className = 'sidebar-section';
  const ioHeading = document.createElement('h3');
  ioHeading.textContent = 'Import / Export';
  ioSection.appendChild(ioHeading);

  const importTextarea = document.createElement('textarea');
  importTextarea.rows = 6;
  importTextarea.placeholder = 'Paste level JSON...';
  importTextarea.setAttribute('aria-label', 'Level JSON');
  importTextarea.spellcheck = false;

  const ioButtons = document.createElement('div');
  ioButtons.className = 'button-row';

  const importButton = createButton('Load JSON', () => {
    try {
      const parsed = deserializeGrid(importTextarea.value);
      const size = parsed.length;
      if (size < MIN_GRID_SIZE || size > MAX_GRID_SIZE) {
        throw new Error('Grid size out of range');
      }
      currentGrid = normalizeTileValues(parsed);
      if (gridSizeSelect) {
        gridSizeSelect.value = size.toString();
      }
      renderGrid();
      updateStatus('Level imported');
      enforceSpecialTileLimits();
    } catch (error) {
      if (error instanceof Error) {
        updateStatus(`Import failed: ${error.message}`);
      } else {
        updateStatus('Import failed');
      }
    }
  });
  importButton.classList.add('btn-secondary');

  const exportJsonButton = createButton('Copy JSON', () => {
    const minMoves = getMinMoves(currentGrid);
    copyToClipboard(toJsonLevel(currentGrid, minMoves ?? 0));
    updateStatus('Level copied');
  }, 'secondary');

  ioButtons.appendChild(importButton);
  ioButtons.appendChild(exportJsonButton);

  ioSection.appendChild(importTextarea);
  ioSection.appendChild(ioButtons);
  sidebar.appendChild(ioSection);

  const qaSection = document.createElement('section');
  qaSection.className = 'sidebar-section';
  const qaHeading = document.createElement('h3');
  qaHeading.textContent = 'Stage QA';
  qaSection.appendChild(qaHeading);

  const qaButtons = document.createElement('div');
  qaButtons.className = 'button-row';

  const validateButton = createButton('Validate Stage', () => {
    if (stageSelect) {
      const stageIndex = Number(stageSelect.value);
      const validation = validateStage(stageIndex);

      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.background = 'white';
      modal.style.padding = '24px';
      modal.style.borderRadius = '8px';
      modal.style.boxShadow = '0 12px 40px rgba(15,23,42,0.22)';
      modal.style.zIndex = '1000';
      modal.style.maxWidth = '520px';
      modal.style.maxHeight = '70vh';
      modal.style.overflow = 'auto';

      const pre = document.createElement('pre');
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.fontFamily = 'monospace';
      pre.style.fontSize = '13px';
      pre.style.margin = '0 0 16px 0';
      pre.textContent = validation;

      const closeBtn = createButton('Close', () => {
        document.body.removeChild(overlay);
      }, 'secondary');

      const copyBtn = createButton('Copy Text', () => {
        copyToClipboard(validation);
      }, 'primary');
      copyBtn.style.marginRight = '8px';

      const btnContainer = document.createElement('div');
      btnContainer.className = 'button-row';
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
      overlay.style.background = 'rgba(15,23,42,0.55)';
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

  const exportStageButton = createButton('Export Stage', () => {
    if (stageSelect) {
      const stageIndex = Number(stageSelect.value);
      exportStageToFile(stageIndex);
      updateStatus(`Exported ${stages[stageIndex].name}`);
    }
  }, 'secondary');

  qaButtons.appendChild(validateButton);
  qaButtons.appendChild(exportStageButton);
  qaSection.appendChild(qaButtons);
  sidebar.appendChild(qaSection);

  enforceSpecialTileLimits();
}

createSidebarControls();
renderGrid();
updateStatus();
