import { gameDir, type AppState, type Store } from '../store';

/** Solve-mode side panel: current move, step navigation, full move list. */
export class SolvePanel {
  constructor(private root: HTMLElement, private store: Store) {
    root.classList.add('panel-card');
    store.subscribe((s) => this.update(s));

    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!btn) return;
      if (btn.dataset.action === 'next') this.store.stepForward();
      if (btn.dataset.action === 'back') this.store.stepBack();
      if (btn.dataset.action === 'edit') this.store.backToEdit();
      if (btn.dataset.action === 'new') this.store.resetLock();
    });
  }

  private update(s: AppState): void {
    this.root.hidden = s.mode !== 'solve' || s.solution === null;
    if (this.root.hidden) return;

    const solution = s.solution!;
    const opened = s.step === solution.length;

    if (opened) {
      this.root.innerHTML = `
        <h2 class="panel-title">Solution</h2>
        <div class="opened-banner">
          <div class="opened-icon">&#128275;</div>
          <div class="opened-text">Lock opened</div>
          ${solution.length === 0 ? '<p class="hint small">All pins were already centered.</p>' : ''}
        </div>
        <div class="step-nav">
          ${solution.length > 0 ? '<button class="seg" data-action="back">&#9664; back</button>' : ''}
          <button class="btn-forge" data-action="new">New lock</button>
        </div>`;
      return;
    }

    const move = solution[s.step];
    // Lead with the VISIBLE slide direction (matches the animation); the key
    // to press is a secondary hint, since game controls may be inverted.
    const slide = move.direction === 1 ? 'right' : 'left';
    const key = gameDir(move.direction, s.invertControls) === 1 ? 'right' : 'left';
    const keyArrow = key === 'right' ? '&#9654;' : '&#9664;';
    const chips = solution
      .map((m, idx) => {
        const d = m.direction === 1 ? '&#9654;' : '&#9664;';
        const cls = idx < s.step ? 'done' : idx === s.step ? 'now' : '';
        return `<span class="chip ${cls}">${m.plate + 1}${d}</span>`;
      })
      .join('');

    this.root.innerHTML = `
      <h2 class="panel-title">Solution <span class="title-sub">— step ${s.step + 1} / ${solution.length}</span></h2>
      <div class="step-card ${slide}">
        <span class="step-dir">${move.direction === -1 ? '&#9664;' : ''}</span>
        <span class="step-plate">Plate ${move.plate + 1}</span>
        <span class="step-dir">${move.direction === 1 ? '&#9654;' : ''}</span>
      </div>
      <p class="step-say">Plate ${move.plate + 1} slides <b>${slide}</b>
        <span class="pin-note">press ${keyArrow} ${key} on your keyboard</span>
      </p>
      <div class="step-nav">
        <button class="seg" data-action="back" ${s.step === 0 ? 'disabled' : ''}>&#9664; back</button>
        <button class="btn-forge" data-action="next">next &#9654;</button>
      </div>
      <div class="chip-list">${chips}</div>
      <p class="hint small">The lock view shows the expected state after each step.
        If the game disagrees, a linkage was entered wrong &mdash;</p>
      <button class="seg" data-action="edit">&#8617; back to editing</button>`;
  }
}
