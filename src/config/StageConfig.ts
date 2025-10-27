import stage1 from './levels/stage1.json';
import stage2 from './levels/stage2.json';
import stage3 from './levels/stage3.json';

export type CellValue = number | 'W' | '+' | '-' | null;

export interface LevelDefinition {
  gridSize: number;
  par: number;
  layout: CellValue[][];
}

export interface StageDefinition {
  name: string;
  levels: LevelDefinition[];
}

export const stages: StageDefinition[] = [
  stage1 as StageDefinition,
  stage2 as StageDefinition,
  stage3 as StageDefinition,
];
