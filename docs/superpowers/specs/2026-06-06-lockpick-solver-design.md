# Gothic 1 Remake — Lockpick Solver (Design)

## Purpose

Web app that solves the lockpicking minigame in the Gothic 1 Remake: a linked-slider
puzzle of 3–7 horizontal plates, each with 7 holes and one pin (position 1–7).
Goal: every pin on position 4 (center). Moving a plate may drag other plates along
(same or opposite direction). Pushing a plate past an edge costs lockpick durability.

## Scope & constraints

- Static single-page app, no backend. Vite + TypeScript, vanilla DOM (no framework).
- English UI. Dark medieval look styled after the in-game lock cross-section.
- Solver runs entirely in the browser.

## Puzzle model

- `plateCount` ∈ [3, 7]; plates numbered **bottom-up** starting at 1 (matches the game).
- `positions[i]` ∈ [1, 7]; target is all `4`.
- **Linkages are directed**, per plate: pushing plate *i* one step also moves each
  linked plate by ±1 (`same` = +, `opposite` = −). A plate may link to multiple others.
  Right-pushes mirror left-pushes.
- A move is **invalid** if any affected plate would leave [1, 7] (in-game: rattle /
  durability loss). The solver never emits such moves → solutions are strain-free.

## Solver

- Pure TypeScript module, no DOM access.
- BFS over the state space (≤ 7⁷ ≈ 823k states, states encoded base-7 as integers).
- Output: shortest ordered move list `{ plate, direction }[]`, or `null` if unsolvable
  (almost always a linkage entry error → message tells the user to re-check in-game).

## UI (single screen, two modes)

### Edit mode
- Lock cross-section: vertical stack of metal plates, plate 1 at the bottom, 7 holes
  each, bronze pin per plate. Click a hole to set that plate's pin position.
- Click a plate to select it (blue highlight, like in-game). A side panel shows its
  linkage row: for every other plate a tri-state toggle (— / same / opposite).
- Linkages are visualized on the lock itself via an SVG overlay (bronze = same,
  blue = opposite, arrows show direction).
- Live preview: nudge the selected plate left/right in the app to verify the entered
  linkages against in-game behavior. Plate count stepper (3–7), Reset, Solve.

### Solve mode (step-through)
- Current step shown big ("Plate 3 → RIGHT") with an arrow on the plate itself.
- Next / Back buttons (+ arrow keys). Pins glide via CSS transitions to the expected
  state after each move. Progress (`Step 4 / 11`) plus full move list, current step
  highlighted.
- Mismatch safety net: the app always shows the expected state, so a wrong linkage
  entry is spotted immediately; Edit returns to edit mode keeping all inputs.
- Final step: all pins glow bronze, "Lock opened".

### Feedback colors (matching the game)
- Pin yellow-ish when off-center, glowing bronze/orange on position 4.
- Selected plate highlighted blue.

## Error handling
- Inputs are constrained by the UI itself (only valid positions/counts clickable).
- Unsolvable puzzle → "No solution found — double-check your linkages in-game."

## Testing
- Vitest unit tests for the solver core: move application, edge constraints,
  same/opposite linkage propagation, shortest-path solutions, already-solved,
  unsolvable detection (invariant-based case).
