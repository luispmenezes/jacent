# oneHop

A clean, cerebral "+1" merge puzzler built with PhaserJS 3, TypeScript, and Vite.

## Game Overview

**Jacent** is a minimalist merge puzzle game where you reduce a grid of numbered tiles to a single tile by strategically merging tiles that differ by exactly 1.

### Core Rules

- **Merge Rule**: Drag tile **A** onto tile **B** if `|A − B| = 1` (they differ by exactly 1)
- **Result**: The merged tile keeps the value of **A** (the tile you dragged)
- **Win Condition**: Reduce the board to exactly **1 tile**
- **Fail Condition**: No legal merges remain with multiple tiles on board

### Features

- **Strategic puzzle gameplay**: 5×5 grid of numbered tiles
- **Drag and drop mechanics**: Merge tiles that differ by 1
- **Visual feedback**: Legal targets highlight when dragging
- **Move tracking**: Try to match or beat par for each level
- **Undo system**: Up to 3 undos per level
- **No timers**: Think at your own pace

## Installation

```bash
# Navigate to the project directory
cd oneHop

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm run dev

# The game will be available at http://localhost:3000
```

## Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

## Project Structure

```
oneHop/
├── public/
│   └── assets/
│       ├── sprites/    # Tile sprites (18 frames)
│       ├── ui/         # UI elements (buttons, backgrounds)
│       └── sounds/     # Sound effects
├── src/
│   ├── config/         # Game configuration
│   │   ├── GameConfig.ts
│   │   └── AssetConfig.ts
│   ├── objects/        # Game objects
│   │   ├── Tile.ts     # Tile class with drag/drop
│   │   └── Grid.ts     # Grid manager
│   ├── scenes/         # Phaser scenes
│   │   ├── BootScene.ts    # Asset loader
│   │   └── GameScene.ts    # Main game scene
│   └── main.ts         # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Technologies Used

- **Phaser 3**: Game framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **WebGL/Canvas**: Rendering

## How to Play

1. The game starts with a 5×5 grid of numbered tiles
2. Select a tile and legal merge targets will highlight in green
3. Drag a tile onto another tile that differs by exactly 1 (e.g., 3→4, 5→4, 2→3)
4. The merged tile keeps the value of the tile you dragged
5. Continue merging until only 1 tile remains on the board
6. Try to complete the puzzle in par moves or less!

### Example Merges

- Drag tile **3** onto tile **4** → Result: tile **3** remains
- Drag tile **5** onto tile **4** → Result: tile **5** remains
- Drag tile **2** onto tile **3** → Result: tile **2** remains

## Game Controls

- **Mouse/Touch**: Drag tiles to merge (tiles must differ by 1)
- **Restart Button**: Reset the current level
- **Undo Button**: Undo your last move (up to 3 times)

## UI Elements

- **Moves**: Current number of moves made
- **Par**: Target number of moves for optimal solution
- **Tiles**: Number of tiles remaining on the board

## License

Jacent puzzle game implemented from design document. Built for educational purposes.
