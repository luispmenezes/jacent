export const AssetConfig = {
  sprites: {
    tiles: {
      key: 'tiles',
      frames: Array.from({ length: 18 }, (_, i) => ({
        key: `tile-${i}`,
        path: `assets/sprites/${String(i).padStart(3, '0')}.png`,
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

export type TileFrame = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;
