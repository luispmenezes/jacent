# Jacent

A clean, cerebral "+1" merge puzzler built with Phaser 3, TypeScript, and Vite.

## Game Overview

**Jacent** is a minimalist merge puzzle game where you reduce a grid of numbered tiles to a single tile by strategically merging tiles that differ by exactly 1 and sit within one-square proximity.

### Core Rules

- **Merge Rule**: Drag tile **A** onto tile **B** if `|A − B| = 1` (they differ by exactly 1)
- **Result**: The merged tile keeps the value of **A** (the tile you dragged)
- **Win Condition**: Reduce the board to exactly **1 tile**
- **Fail Condition**: No legal merges remain with multiple tiles on board

### Features

- **Strategic puzzle gameplay**: Level progression starts at 2×2 and ramps to 5×5 layouts
- **Adjacency-focused merges**: Tiles must differ by 1 *and* be within one-square proximity
- **Stage progression**: Menu + level selector with JSON-backed stages
- **Built-in editor**: Optional GUI tool for authoring/validating custom boards (see below)
- **Visual feedback**: Legal targets highlight when dragging
- **Move tracking**: Try to match or beat par for each level
- **Undo system**: Up to 3 undos per level
- **No timers**: Think at your own pace

## Installation

```bash
# Navigate to the project directory
cd jacent

# Install dependencies
npm install
```

## Development

```bash
# Start the development server
npm run dev

# The game will be available at http://localhost:3000
# The standalone level editor is served at http://localhost:3000/editor
```

## Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview

# Build the optional editor bundle (kept out of the default prod build)
npm run build:editor
```

## Project Structure

```
Jacent/
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
│   │   ├── BootScene.ts        # Asset loader → menu bootstrap
│   │   ├── MenuScene.ts        # Title screen
│   │   ├── LevelSelectScene.ts # Level picker
│   │   └── GameScene.ts        # Main game scene
│   ├── editor/          # Standalone level editor (not bundled in prod)
│   │   ├── main.ts      # Editor UI logic
│   │   ├── solver.ts    # Backtracking solver
│   │   └── generator.ts # Procedural generation helpers
│   └── main.ts         # Entry point
├── docs/
│   └── design.md       # Updated Jacent design document
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

---

## Additional Resources

- **Design document:** [`docs/design.md`](docs/design.md)
- **Level editor:** Run `npm run dev` and open [http://localhost:3000/editor](http://localhost:3000/editor) or build via `npm run build:editor`
- **Stage data:** JSON layouts live in `src/config/levels/`
