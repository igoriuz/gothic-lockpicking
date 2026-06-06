import { describe, expect, it } from 'vitest';
import { applyMove, isSolved, solve, type Linkage, type Move, type Puzzle } from './solver';

const noLinks = (n: number): Linkage[][] => Array.from({ length: n }, () => []);

/** Replay a solution and assert every move is legal and the end state is solved. */
function replay(puzzle: Puzzle, solution: Move[]): number[] {
  let positions = puzzle.positions.slice();
  for (const move of solution) {
    const next = applyMove(positions, puzzle.linkages, move);
    expect(next, `move ${JSON.stringify(move)} must be legal`).not.toBeNull();
    positions = next!;
  }
  return positions;
}

describe('applyMove', () => {
  it('moves a single independent plate', () => {
    expect(applyMove([3, 3, 3], noLinks(3), { plate: 0, direction: 1 })).toEqual([4, 3, 3]);
  });

  it('drags same-direction linked plates along', () => {
    const linkages: Linkage[][] = [[{ target: 1, relation: 1 }], [], []];
    expect(applyMove([3, 5, 2], linkages, { plate: 0, direction: 1 })).toEqual([4, 6, 2]);
  });

  it('pushes opposite-direction linked plates the other way', () => {
    const linkages: Linkage[][] = [[{ target: 2, relation: -1 }], [], []];
    expect(applyMove([3, 5, 2], linkages, { plate: 0, direction: 1 })).toEqual([4, 5, 1]);
  });

  it('supports one plate dragging two others at once', () => {
    const linkages: Linkage[][] = [
      [{ target: 1, relation: 1 }, { target: 2, relation: -1 }],
      [],
      [],
    ];
    expect(applyMove([4, 4, 4], linkages, { plate: 0, direction: -1 })).toEqual([3, 3, 5]);
  });

  it('rejects moves that push the source plate past an edge', () => {
    expect(applyMove([7, 4, 4], noLinks(3), { plate: 0, direction: 1 })).toBeNull();
    expect(applyMove([1, 4, 4], noLinks(3), { plate: 0, direction: -1 })).toBeNull();
  });

  it('rejects moves that push a linked plate past an edge', () => {
    const linkages: Linkage[][] = [[{ target: 1, relation: 1 }], [], []];
    expect(applyMove([4, 7, 4], linkages, { plate: 0, direction: 1 })).toBeNull();
  });

  it('linkages are directed: pushing the target does not move the source', () => {
    const linkages: Linkage[][] = [[{ target: 1, relation: 1 }], [], []];
    expect(applyMove([3, 3, 3], linkages, { plate: 1, direction: 1 })).toEqual([3, 4, 3]);
  });
});

describe('solve', () => {
  it('returns [] for an already-solved lock', () => {
    expect(solve({ positions: [4, 4, 4], linkages: noLinks(3) })).toEqual([]);
  });

  it('solves independent plates with the minimal move count', () => {
    const puzzle: Puzzle = { positions: [2, 4, 6], linkages: noLinks(3) };
    const solution = solve(puzzle)!;
    expect(solution).toHaveLength(4); // 2→4 and 6→4, two moves each
    expect(isSolved(replay(puzzle, solution))).toBe(true);
  });

  it('exploits a same-direction link to solve two plates in one move', () => {
    const puzzle: Puzzle = {
      positions: [3, 3, 4],
      linkages: [[{ target: 1, relation: 1 }], [], []],
    };
    const solution = solve(puzzle)!;
    expect(solution).toEqual([{ plate: 0, direction: 1 }]);
  });

  it('solves a lock with opposite links and edge detours', () => {
    const puzzle: Puzzle = {
      positions: [1, 7, 3],
      linkages: [
        [{ target: 1, relation: -1 }],
        [{ target: 2, relation: 1 }],
        [],
      ],
    };
    const solution = solve(puzzle)!;
    expect(isSolved(replay(puzzle, solution))).toBe(true);
  });

  it('solves a dense 5-plate lock', () => {
    const puzzle: Puzzle = {
      positions: [2, 6, 1, 5, 3],
      linkages: [
        [{ target: 2, relation: 1 }],
        [{ target: 0, relation: -1 }, { target: 4, relation: 1 }],
        [],
        [{ target: 1, relation: -1 }],
        [],
      ],
    };
    const solution = solve(puzzle)!;
    expect(isSolved(replay(puzzle, solution))).toBe(true);
  });

  it('detects unsolvable locks (mutual same-direction link keeps the offset)', () => {
    // Both moves shift both plates identically → their difference is invariant.
    const puzzle: Puzzle = {
      positions: [3, 4],
      linkages: [[{ target: 1, relation: 1 }], [{ target: 0, relation: 1 }]],
    };
    expect(solve(puzzle)).toBeNull();
  });

  it('handles the worst case (7 plates) quickly', () => {
    const puzzle: Puzzle = {
      positions: [1, 7, 2, 6, 3, 5, 4],
      linkages: [
        [{ target: 1, relation: 1 }],
        [{ target: 2, relation: -1 }],
        [],
        [{ target: 4, relation: 1 }, { target: 5, relation: -1 }],
        [],
        [{ target: 6, relation: 1 }],
        [],
      ],
    };
    const started = performance.now();
    const solution = solve(puzzle)!;
    expect(performance.now() - started).toBeLessThan(2000);
    expect(isSolved(replay(puzzle, solution))).toBe(true);
  });
});
