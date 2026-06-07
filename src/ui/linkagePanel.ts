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
          In game: push the plate one step, watch which other plates
          move with it &mdash; then tap <b>&#x21C9;</b> (same way) or
          <b>&#x21C4;</b> (mirrored) right on the lock. Direction of the
          push doesn't matter.
        </p>
        ${legend()}`;
      return;
    }

    const i = s.selected;
    const rows = [];
    for (let j = s.plateCount - 1; j >= 0; j--) {
      // The selected plate stays visible but disabled, so the row order
      // always mirrors the lock and you can't mix plates up.
      if (j === i) {
        rows.push(`
          <div class="link-row self">
            <span class="link-label">Plate ${j + 1}</span>
            <span class="self-note">selected &mdash; the plate you push</span>
          </div>`);
        continue;
      }
      const link = s.linkages[i].find((l) => l.target === j);
      const seg = (rel: string, label: string, active: boolean) =>
        `<button class="seg${active ? ' on' : ''}" data-target="${j}" data-rel="${rel}">${label}</button>`;
      rows.push(`
        <div class="link-row">
          <span class="link-label">Plate ${j + 1}</span>
          <div class="seg-group">
            ${seg('none', '&mdash;', !link)}
            ${seg('same', '&#x21C9; same', link?.relation === 1)}
            ${seg('opp', '&#x21C4; mirrored', link?.relation === -1)}
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
          <button class="seg" data-nudge="left">&#9664; slide left</button>
          <button class="seg" data-nudge="right">slide right &#9654;</button>
        </div>
        <p class="hint small">Slides the plate here like in game &mdash; mind that
          the in-game arrow keys are inverted.</p>
      </div>`;
  }
}

const legend = () => `
  <div class="legend">
    <span><i class="swatch same"></i> &#x21C9; moves the same way</span>
    <span><i class="swatch opp"></i> &#x21C4; moves mirrored</span>
  </div>`;
