import stage1 from './levels/stage1.json';

export interface LevelDefinition {
  gridSize: number;
  par: number;
  layout: (number | null)[][];
}

export interface StageDefinition {
  name: string;
  levels: LevelDefinition[];
}

export const stages: StageDefinition[] = [stage1 as StageDefinition];
