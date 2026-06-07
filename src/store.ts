import {
  applyMove,
  isSolved,
  solve,
  TARGET_POS,
  MIN_PLATES,
  MAX_PLATES,
  type Direction,
  type Linkage,
  type Move,
} from './solver';

export type Mode = 'edit' | 'solve';

export interface AppState {
  plateCount: number;
  positions: number[]; // edit-mode pin positions (1–7), index 0 = bottom plate
  /** Which hole of each plate the peg sits in (last clicked) — purely visual. */
  baseHoles: number[];
  linkages: Linkage[][];
  selected: number | null; // plate whose linkages are being edited
  mode: Mode;
  solution: Move[] | null;
  step: number; // number of solution moves already applied
  solvePositions: number[]; // positions after `step` moves
  message: string | null; // transient feedback (errors, rattle warnings)
  /** In-game, pressing left slides the pin right (and vice versa). Default on. */
  invertControls: boolean;
}

type Listener = (state: AppState) => void;

/** Map a pin-movement direction to the key you actually press in game. */
export const gameDir = (d: Direction, invert: boolean): Direction =>
  invert ? ((-d) as Direction) : d;

const INVERT_KEY = 'gothic-lockpick-invert';

const loadInvert = (): boolean => {
  try {
    return localStorage.getItem(INVERT_KEY) !== '0';
  } catch {
    return true;
  }
};

const freshState = (plateCount: number, invertControls: boolean): AppState => ({
  plateCount,
  positions: Array(plateCount).fill(TARGET_POS),
  baseHoles: Array(plateCount).fill(TARGET_POS),
  linkages: Array.from({ length: plateCount }, () => []),
  selected: null,
  mode: 'edit',
  solution: null,
  step: 0,
  solvePositions: [],
  message: null,
  invertControls,
});

export class Store {
  state: AppState = freshState(5, loadInvert());
  private listeners: Listener[] = [];

  subscribe(fn: Listener): void {
    this.listeners.push(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  private mutate(fn: (s: AppState) => void): void {
    fn(this.state);
    this.emit();
  }

  setPlateCount(count: number): void {
    const clamped = Math.min(MAX_PLATES, Math.max(MIN_PLATES, count));
    if (clamped === this.state.plateCount) return;
    this.mutate((s) => Object.assign(s, freshState(clamped, s.invertControls)));
  }

  resetLock(): void {
    this.mutate((s) => Object.assign(s, freshState(s.plateCount, s.invertControls)));
  }

  toggleInvert(): void {
    this.mutate((s) => {
      s.invertControls = !s.invertControls;
      try {
        localStorage.setItem(INVERT_KEY, s.invertControls ? '1' : '0');
      } catch {
        /* private mode etc. — keep it session-only */
      }
    });
  }

  setPosition(plate: number, pos: number): void {
    if (this.state.mode !== 'edit') return;
    this.mutate((s) => {
      s.positions[plate] = pos;
      s.baseHoles[plate] = pos; // peg hops into the clicked hole, slab recenters
      s.selected = plate;
      s.message = null;
    });
  }

  selectPlate(plate: number | null): void {
    if (this.state.mode !== 'edit') return;
    this.mutate((s) => {
      s.selected = plate;
      s.message = null;
    });
  }

  /** Set / clear a directed linkage from the selected plate to `target`. */
  setLinkage(source: number, target: number, relation: 1 | -1 | null): void {
    this.mutate((s) => {
      s.linkages[source] = s.linkages[source].filter((l) => l.target !== target);
      if (relation !== null) s.linkages[source].push({ target, relation });
      s.message = null;
    });
  }

  /** Test-push the selected plate (direction = visible slide direction). */
  nudge(direction: Direction): void {
    const { selected, positions, linkages } = this.state;
    if (selected === null) return;
    const next = applyMove(positions, linkages, { plate: selected, direction });
    this.mutate((s) => {
      if (next === null) {
        s.message = 'Rattle! A plate hit the edge — that push is blocked.';
      } else {
        s.positions = next;
        s.message = null;
      }
    });
  }

  solvePuzzle(): void {
    if (isSolved(this.state.positions)) {
      this.mutate((s) => {
        s.message =
          'All pins are already centered — click the holes to set where each pin currently sits.';
      });
      return;
    }
    const solution = solve({
      positions: this.state.positions,
      linkages: this.state.linkages,
    });
    this.mutate((s) => {
      if (solution === null) {
        s.message = 'No solution found — double-check your linkages in-game.';
        return;
      }
      s.solution = solution;
      s.step = 0;
      s.solvePositions = s.positions.slice();
      s.mode = 'solve';
      s.selected = null;
      s.message = null;
    });
  }

  stepForward(): void {
    const { solution, step, solvePositions, linkages } = this.state;
    if (!solution || step >= solution.length) return;
    const next = applyMove(solvePositions, linkages, solution[step]);
    if (next === null) return; // cannot happen for a valid solution
    this.mutate((s) => {
      s.solvePositions = next;
      s.step += 1;
    });
  }

  stepBack(): void {
    const { solution, step, solvePositions, linkages } = this.state;
    if (!solution || step === 0) return;
    const move = solution[step - 1];
    const inverse: Move = { plate: move.plate, direction: -move.direction as Direction };
    const prev = applyMove(solvePositions, linkages, inverse);
    if (prev === null) return;
    this.mutate((s) => {
      s.solvePositions = prev;
      s.step -= 1;
    });
  }

  backToEdit(): void {
    this.mutate((s) => {
      s.mode = 'edit';
      s.solution = null;
      s.step = 0;
      s.message = null;
    });
  }
}
