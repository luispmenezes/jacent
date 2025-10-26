export const AssetConfig = {
  sprites: {
    tiles: {
      key: 'number-tiles',
      path: 'assets/sprites/number-tiles.png', // Spritesheet with tiles 1-7
    },
    specialTiles: {
      key: 'special-tiles',
      path: 'assets/sprites/special-tiles.png', // Spritesheet with special tiles (wildcard at index 2)
    },
    emptyTile: {
      key: 'empty-tile',
      path: 'assets/sprites/empty-tile.png', // Empty tile sprite
    },
    restart: {
      key: 'restart',
      idle: 'assets/ui/000.png',
      pressed: 'assets/ui/001.png',
    },
  },
  ui: {
    background: 'assets/ui/background.png',
    bg9patch: 'assets/ui/9patchBG.png',
    scoreBar: 'assets/ui/scoreLivesBar.png',
    timeLine: 'assets/ui/timeLine.png',
    timeLineBG: 'assets/ui/timeLineBG.png',
    pausedOverlay: 'assets/ui/pausedOverlay.png',
  },
  sounds: {
    click01: 'assets/sounds/Sound_Click_01.wav',
    click02: 'assets/sounds/Sound_Click_02.wav',
    right: 'assets/sounds/Sound_Right.wav',
    wrong: 'assets/sounds/Sound_Wrong.wav',
    success1: 'assets/sounds/Succes1.wav',
    success2: 'assets/sounds/Succes2.wav',
  },
};

export type TileFrame = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'W';
