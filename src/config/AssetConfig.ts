export const AssetConfig = {
  sprites: {
    tiles: {
      key: 'tiles',
      // Tiles 1-7 loaded from spritesheet assets/sprites/tiles.png
      frames: Array.from({ length: 7 }, (_, i) => ({
        key: `tile-${i + 1}`,
        path: `assets/sprites/tiles.png`, // All tiles come from spritesheet
      })),
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

export type TileFrame = 1 | 2 | 3 | 4 | 5 | 6 | 7;
