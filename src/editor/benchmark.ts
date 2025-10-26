import { GridState, isSolvable, getMinMoves, countTiles } from './solver';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BenchmarkResult {
  level: string;
  gridSize: number;
  tileCount: number;
  solvableTime: number;
  minMovesTime: number;
  minMoves: number | null;
  expectedPar: number;
}

function loadStages(): { name: string; levels: any[] }[] {
  const stagesDir = path.join(__dirname, '../config/levels');
  const stageFiles = fs.readdirSync(stagesDir).filter((f) => f.endsWith('.json'));

  return stageFiles.map((file) => {
    const content = fs.readFileSync(path.join(stagesDir, file), 'utf-8');
    return JSON.parse(content);
  });
}

function benchmark(): void {
  console.log('=== Solver Performance Benchmark ===\n');
  console.log('Testing real levels from stage files...\n');

  const stages = loadStages();
  const results: BenchmarkResult[] = [];

  stages.forEach((stage) => {
    console.log(`📁 ${stage.name}`);
    console.log('─'.repeat(60));

    stage.levels.forEach((level: any, index: number) => {
      const grid = level.layout as GridState;
      const gridSize = level.gridSize;
      const tileCount = countTiles(grid);
      const expectedPar = level.par;

      // Benchmark isSolvable
      const solvableStart = performance.now();
      const solvable = isSolvable(grid);
      const solvableTime = performance.now() - solvableStart;

      // Benchmark getMinMoves
      const minMovesStart = performance.now();
      const minMoves = getMinMoves(grid);
      const minMovesTime = performance.now() - minMovesStart;

      const levelName = `${stage.name} Level ${index + 1}`;
      const parMatch = minMoves === expectedPar ? '✓' : '✗';

      console.log(`  ${levelName} (${gridSize}×${gridSize}, ${tileCount} tiles)`);
      console.log(`    Solvable: ${solvable} (${solvableTime.toFixed(2)}ms)`);
      console.log(`    Min moves: ${minMoves} | Expected: ${expectedPar} ${parMatch} (${minMovesTime.toFixed(2)}ms)`);

      results.push({
        level: levelName,
        gridSize,
        tileCount,
        solvableTime,
        minMovesTime,
        minMoves,
        expectedPar,
      });
    });

    console.log('');
  });

  // Print summary
  console.log('=== Performance Summary ===');
  const avgSolvableTime = results.reduce((sum, r) => sum + r.solvableTime, 0) / results.length;
  const avgMinMovesTime = results.reduce((sum, r) => sum + r.minMovesTime, 0) / results.length;
  const correctPars = results.filter((r) => r.minMoves === r.expectedPar).length;

  console.log(`Total levels tested: ${results.length}`);
  console.log(`Correct par values: ${correctPars}/${results.length}`);
  console.log(`Average isSolvable time: ${avgSolvableTime.toFixed(2)}ms`);
  console.log(`Average getMinMoves time: ${avgMinMovesTime.toFixed(2)}ms`);

  // Find slowest levels
  const slowest = [...results].sort((a, b) => b.minMovesTime - a.minMovesTime).slice(0, 5);
  console.log('\n=== Slowest Levels ===');
  slowest.forEach((r) => {
    console.log(`  ${r.level}: ${r.minMovesTime.toFixed(2)}ms (${r.gridSize}×${r.gridSize}, ${r.tileCount} tiles)`);
  });
}

// Run benchmark
benchmark();
