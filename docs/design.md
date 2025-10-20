# Jacent — Design Document

**Version:** 0.2 (Working Draft)  
**Owner:** <your name>  
**Platforms:** Web (desktop/mobile); roadmap: iOS, Android  
**Elevator Pitch:** Jacent is a clean, cerebral “+1” merge puzzler. Drag a number tile onto a neighbour that differs by exactly 1. The moved tile keeps its value. Reduce every board to a single tile as the layouts scale from cozy 2×2 starts to spacious 5×5 puzzles.

---

## 1) Vision & Design Pillars

* **Clarity first:** Rules teach themselves; the depth lives in planning and foresight.
* **Low-friction depth:** No timers by default; optional pressure modes and move caps for variety.
* **One-more-try loop:** Fast restarts, forgiving (but limited) undo, subtle hint hooks.
* **Elegant difficulty:** Hand-crafted layouts validated by solver tooling + curated progression.

**Audience:** Fans of Threes/2048-style minimal puzzlers and logic-grid players; age 10+.

---

## 2) Core Rules (Classic Mode)

* **Board:** Square grid of numbered tiles (current Stage 1 ranges 2×2 → 5×5; engine supports 3×3–8×8).
* **Move:** Drag tile **A** onto tile **B** if `|A − B| = 1` **and** the tiles are within one-square proximity (orthogonal or diagonal).
* **Result:** After a legal merge, the destination keeps the value of **A** (the tile you dragged).
* **Win:** Exactly **one** tile remains.
* **Fail:** More than one tile remains and no legal merges are available.

**Optional toggles (per level/rule-set):**

* **Adjacency:** Any-to-any / Orthogonal / Orthogonal+Diagonal (current default).
* **Move Budget:** Finish within **K** merges.
* **Undo Tokens:** 0–∞ per level; Stage 1 defaults to 3.
* **Goal Value:** Finish with a specific value **G**.
* **Obstacles:** Rocks (impassable), Teleporters (pair cells), Conveyors (auto-shift), Locks/Keys, Trend/Decay tiles (see §5).

---

## 3) Controls & UX

* **Input:** Drag & drop or tap–tap (select A, then tap B).
* **Legality Preview:** On selecting A, highlight legal targets B; optional tooltip “A→B yields **A**”.
* **Feedback:** Merge animation ~200 ms, gentle pop + success chime; illegal moves shake & soft thud.
* **Undo:** Stepwise. Potential long-press to scrub backwards.
* **Restart:** One tap, instant reset.

---

## 4) Game Modes

1. **Classic Progression** — Linear stage packs (12 levels per world) with new wrinkles introduced per world. Stage 1 ships in v0.2.
2. **Daily Jacent** — One solvable seed per day for each size (5×5, 7×7). Leaderboard ranks fewest moves, then time.
3. **Puzzle Packs (Premium)** — Hand-crafted sets with solver-proven unique solutions; themed mechanics (Locks, Parity, Conveyors).
4. **Endless / Survival** — Reduce to one tile → spawn a ring around it; increasing clutter/obstacles.
5. **Time Trial** — Clear as many boards as possible in 3 minutes; shared seed per day.
6. **Challenge Rules** — Parity Gates, Direction Flip (result becomes **B**), Trend/Decay tiles, etc.

---

## 5) Expanding Mechanics (Optional)

* **Locks & Keys:** Tile `n🔒` only accepts merges after the player has produced or preserved `n−1` or `n+1` at least once.
* **Parity Gates:** Legal merges must swap parity (odd↔even).
* **Trend Tiles:** Marked `↑`; they increment by +1 after every other merge, forcing prioritisation.
* **Decay Tiles:** After N merges, value −1 or become rocks.
* **Wild Tile `?`:** Can act as `n−1` or `n+1` once, then freezes to the moved value.
* **Teleporters / Conveyors:** Redirect the resulting tile; expands spatial puzzle surface.

Each mechanic is enabled via rule flags in level JSON and enforced by both the runtime and the solver.

---

## 6) Scoring & Meta

* **Base Score:** `StartingTiles − MovesUsed` (higher is better).
* **Bonuses:**
  * **Perfect:** Match solver’s minimal moves (+3).
  * **Clean Sweep:** No undos (+2).
  * **Streak:** Consecutive wins add +1 ramp.
  * **Combo:** `k` legal merges in `k` consecutive turns that alternate parity (+k/2).
* **Grade:** S/A/B/C based on score percentiles per difficulty band.

---

## 7) Level Design & Generation

### 7.1 Authoring Format

```json
{
  "name": "W2-L05-Bridge",
  "size": [5, 5],
  "tiles": [[1,2,1,2,1],[2,3,2,3,2],[1,2,5,2,1],[2,3,2,3,2],[1,2,1,2,1]],
  "obstacles": [{"r":2,"c":2,"type":"rock"}],
  "rules": {"adjacency":"diag","move_cap":18,"undo":3,"goal":null,"parity_gate":false}
}
```

### 7.2 Constructive Generator (solver-backed)

1. Choose final goal `G` (e.g., 5) and path length `L` (target move count).
2. Build a reverse solution path using ±1 steps: `G ← G±1 ← …` until length `L`.
3. Record drag direction per step (which tile must move).
4. Place path values on the grid respecting adjacency constraints.
5. Sprinkle distractors that remain pairable (within ±1 of adjacent path values).
6. Shuffle within bounds → run solver to confirm (a) solvable, (b) minimal moves ≤ target, (c) branch factor within range.

### 7.3 Backtracking Solver (simplified)

```pseudo
function solve(state):
  if state.tile_count == 1: return Solution(path)
  if !exists_legal_move(state): return DEAD
  best = NONE
  for move in ordered_legal_moves(state):
    next = apply(move, state)
    res = solve(next)
    if res is Solution and (best is NONE or res.moves < best.moves):
      best = res
  return best or DEAD
```

**Ordering heuristic:** reduce isolated extremes, preserve central values (3–6 range), keep parity variety.

### 7.4 Difficulty Model

* **Branch Factor Targets:** Easy 3–5; Medium 2–3; Hard 1–2 (near-forced).
* **Metrics:** solver minimal moves (par), max dead-ends encountered, parity island count, “rescue” wild usage.

---

## 8) Sample Boards

**On-Ramp 3×3 (5 tiles):**

```
. 1 .
2 . 3
. 2 .
```

**Bridge Builder 4×4** (orth adjacency, rock in centre):

```
3 4 5 6
4 X 5 6
3 4 5 6
2 3 4 5
```

**Key & Gate 5×5:** Single `7🔒` at (3,3); requires producing a 6 first.

---

## 9) Progression & Onboarding

* **Stage 1: Fundamentals** — 2×2 → 5×5, diagonal adjacency default, sparse layouts introduce spatial planning.
* **World 2+:** Introduce orth-only corridors, rocks, move caps, and optional goal constraints.
* **World 3+:** Locks/Keys, parity gates, bespoke challenge boards.

**Tutorial beats:**
1. “Tiles merge if they differ by 1.” (auto-highlight targets)
2. “Result keeps the value you dragged.” (callout)
3. “Finish with one tile.” (progress indicator)
4. Undo/Restart introduced after first fail.

---

## 10) UI / Visual Design

* **Theme:** Minimal, calm gradients, rounded tiles.
* **Layout:** Top HUD (moves / par / tiles / undo / restart), centred board, bottom guidance.
* **Color:** Neutral base; value steps mapped to luminance shifts with accessible contrast.
* **Animation:** 150–250 ms merges; 80 ms hover; 40 ms illegal shake.
* **Audio:** Soft click on drag start/stop, gentle merge chime, muted thud on illegal, celebratory sting on win.

---

## 11) Accessibility

* High-contrast & large-number modes.
* Difference helper halo for ±1 matches.
* Full tap-to-merge flow (no drag required).
* Mobile haptics for merge success/illegal feedback.

---

## 12) Monetization (exploratory)

* **Premium unlock:** Remove ads, unlock puzzle packs.
* **Cosmetics:** Tile/background themes (earnable or purchasable).
* **Hints:** Earn via play; optional boost packs with daily cap.

---

## 13) Analytics & Telemetry

* Events: `level_start`, `level_win`, `level_fail`, `moves_used`, `undos_used`, `hint_used`, `abandon`, `time_to_first_move`.
* Compare solver par vs player moves; track branch factor, fail reasons.
* KPIs: retention (D1/D7), average sessions/day, par attainment %, hint conversion.

---

## 14) Tech & Implementation Notes

* **Client:** Phaser 3 + TypeScript + Vite.
* **State:** Deterministic RNG for reproducible seeds.
* **Data:** Level JSON (see §7.1); rule flags for mechanics.
* **Solver:** Node-based CLI (shared with GUI editor) + lightweight in-game checks for hints.
* **Replays:** Record initial seed + move list.
* **Localization:** Minimal text; number-centric UI keeps translation light.

---

## 15) QA Plan

* Unit tests for merge legality, undo integrity, solver parity.
* Property-based checks: generated boards must be solvable or flagged unsolvable.
* UX: Tap-to-merge accessibility, highlight accuracy, tutorial flow.
* Performance: 60 FPS on mid-tier phones at 5×5; monitor GC spikes beyond 8 ms.

---

## 16) Content Roadmap (First 8 Weeks)

* **W1–2:** Core loop, adjacency rules, undo, level JSON loader, solver CLI.
* **W3:** Menu + level select, Stage 1 polish, responsive layout.
* **W4:** Daily mode prototype, analytics hooks.
* **W5:** Locks/Keys + parity gates, Stage 2 authoring tools.
* **W6:** Endless prototype, cosmetic themes.
* **W7:** Trend/Decay/Teleport mechanics, hint flow.
* **W8:** Localization + accessibility settings, soft launch + data review.

---

## 17) Risks & Mitigations

* **Solver perf on larger boards:** Limit daily boards to ≤7×7; use depth-limited search with caching.
* **Analysis paralysis:** Par targets + optional move caps encourage decisiveness; hint nudge after idle ≥ 20 s.
* **Content burn:** Stage packs + daily seeds + endless loop; ship editor so designers/community can author.

---

## 18) Appendices

* **Glossary:** Branch factor, par, seed, wild, lock/key.
* **Tuning Table:** Initial pars — 2×2→2, 3×3→6, 4×4→10, 5×5→16.
* **Audio refs:** Soft marimba, felt piano, muted clicks.

*End of draft.*
