// Core puzzle model and BFS solver for the Gothic 1 Remake lockpicking minigame.
// Pure module — no DOM access.

export const MIN_POS = 1;
export const MAX_POS = 7;
export const TARGET_POS = 4;
export const MIN_PLATES = 3;
export const MAX_PLATES = 7;

/** -1 = left, +1 = right */
export type Direction = -1 | 1;

/** Effect of pushing a source plate: `target` moves along (+1) or mirrored (-1). */
export interface Linkage {
  target: number; // plate index (0-based)
  relation: 1 | -1; // 1 = same direction, -1 = opposite
}

export interface Puzzle {
  /** Pin positions per plate, 1–7, index 0 = bottom plate. */
  positions: number[];
  /** Directed linkages: linkages[i] = plates dragged along when plate i is pushed. */
  linkages: Linkage[][];
}

export interface Move {
  plate: number; // 0-based
  direction: Direction;
}

/**
 * Apply a move to a position vector. Returns the new positions, or null if any
 * affected plate would leave [1, 7] (the in-game "rattle" — never allowed here).
 */
export function applyMove(
  positions: readonly number[],
  linkages: readonly Linkage[][],
  move: Move,
): number[] | null {
  const delta = new Array<number>(positions.length).fill(0);
  delta[move.plate] += move.direction;
  for (const link of linkages[move.plate]) {
    delta[link.target] += link.relation * move.direction;
  }
  const next = positions.map((p, i) => p + delta[i]);
  return next.every((p) => p >= MIN_POS && p <= MAX_POS) ? next : null;
}

export function isSolved(positions: readonly number[]): boolean {
  return positions.every((p) => p === TARGET_POS);
}

const encode = (positions: readonly number[]): number =>
  positions.reduce((acc, p) => acc * 7 + (p - 1), 0);

/**
 * Find the shortest move sequence that centers every pin, via BFS over the
 * state space (≤ 7^7 ≈ 823k states). Returns null if unsolvable.
 */
export function solve(puzzle: Puzzle): Move[] | null {
  const { positions: start, linkages } = puzzle;
  if (isSolved(start)) return [];

  const n = start.length;
  const moves: Move[] = [];
  for (let plate = 0; plate < n; plate++) {
    moves.push({ plate, direction: -1 }, { plate, direction: 1 });
  }

  // BFS with parent pointers for path reconstruction.
  const startKey = encode(start);
  const parent = new Map<number, { prevKey: number; move: Move }>();
  parent.set(startKey, { prevKey: -1, move: { plate: -1, direction: 1 } });
  let frontier: number[][] = [start.slice()];

  while (frontier.length > 0) {
    const nextFrontier: number[][] = [];
    for (const state of frontier) {
      for (const move of moves) {
        const next = applyMove(state, linkages, move);
        if (next === null) continue;
        const key = encode(next);
        if (parent.has(key)) continue;
        parent.set(key, { prevKey: encode(state), move });
        if (isSolved(next)) return reconstruct(parent, startKey, key);
        nextFrontier.push(next);
      }
    }
    frontier = nextFrontier;
  }
  return null;
}

function reconstruct(
  parent: Map<number, { prevKey: number; move: Move }>,
  startKey: number,
  goalKey: number,
): Move[] {
  const path: Move[] = [];
  let key = goalKey;
  while (key !== startKey) {
    const entry = parent.get(key)!;
    path.push(entry.move);
    key = entry.prevKey;
  }
  return path.reverse();
}
