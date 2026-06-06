import type { AppState, Store } from '../store';

/** Edit-mode side panel: directed linkages of the selected plate + test push. */
export class LinkagePanel {
  constructor(private root: HTMLElement, private store: Store) {
    root.classList.add('panel-card');
    store.subscribe((s) => this.update(s));

    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('button');
      if (!btn) return;
      const { selected } = this.store.state;
      if (btn.dataset.nudge) {
        this.store.nudge(btn.dataset.nudge === 'right' ? 1 : -1);
      } else if (btn.dataset.target !== undefined && selected !== null) {
        const target = Number(btn.dataset.target);
        const rel = btn.dataset.rel === 'same' ? 1 : btn.dataset.rel === 'opp' ? -1 : null;
        this.store.setLinkage(selected, target, rel);
      }
    });
  }

  private update(s: AppState): void {
    this.root.hidden = s.mode !== 'edit';
    if (this.root.hidden) return;

    if (s.selected === null) {
      this.root.innerHTML = `
        <h2 class="panel-title">Linkages</h2>
        <p class="hint">
          Select a plate on the lock to record what it drags along.
          Test each plate in-game first: push it one step, watch which
          other plates move — and in which direction.
        </p>
        ${legend()}`;
      return;
    }

    const i = s.selected;
    const rows = [];
    for (let j = s.plateCount - 1; j >= 0; j--) {
      if (j === i) continue;
      const link = s.linkages[i].find((l) => l.target === j);
      const seg = (rel: string, label: string, active: boolean) =>
        `<button class="seg${active ? ' on' : ''}" data-target="${j}" data-rel="${rel}">${label}</button>`;
      rows.push(`
        <div class="link-row">
          <span class="link-label">Plate ${j + 1}</span>
          <div class="seg-group">
            ${seg('none', '&mdash;', !link)}
            ${seg('same', '&#8649; same', link?.relation === 1)}
            ${seg('opp', '&#8644; opposite', link?.relation === -1)}
          </div>
        </div>`);
    }

    this.root.innerHTML = `
      <h2 class="panel-title">Plate ${i + 1} <span class="title-sub">— when pushed, also moves…</span></h2>
      <div class="link-rows">${rows.join('')}</div>
      ${legend()}
      <div class="test-push">
        <span class="link-label">Test push</span>
        <div class="seg-group">
          <button class="seg" data-nudge="left">&#9664; left</button>
          <button class="seg" data-nudge="right">right &#9654;</button>
        </div>
        <p class="hint small">Nudge the plate here and compare with the game to verify your entries.</p>
      </div>`;
  }
}

const legend = () => `
  <div class="legend">
    <span><i class="swatch same"></i> same direction</span>
    <span><i class="swatch opp"></i> opposite direction</span>
  </div>`;
