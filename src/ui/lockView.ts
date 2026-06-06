import type { AppState } from '../store';
import type { Store } from '../store';
import { MAX_POS, TARGET_POS } from '../solver';

/**
 * Renders the lock cross-section: stacked metal plates (plate 1 at the bottom),
 * 7 holes each, one pin per plate, plus an SVG overlay for linkage arcs.
 */
export class LockView {
  private root: HTMLElement;
  private platesEl!: HTMLElement;
  private svg!: SVGSVGElement;
  private builtCount = 0;

  constructor(root: HTMLElement, private store: Store) {
    this.root = root;
    this.root.classList.add('lock-frame');
    store.subscribe((s) => this.update(s));
  }

  private build(count: number): void {
    this.builtCount = count;
    this.root.innerHTML = `
      <i class="bracket tl"></i><i class="bracket tr"></i>
      <i class="bracket bl"></i><i class="bracket br"></i>
      <div class="bolt-channel"></div>
      <div class="plates"></div>
      <svg class="links" aria-hidden="true">
        <defs>
          <marker id="arrow-same" viewBox="0 0 8 8" refX="6" refY="4"
                  markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--bronze)"></path>
          </marker>
          <marker id="arrow-opp" viewBox="0 0 8 8" refX="6" refY="4"
                  markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="var(--steel)"></path>
          </marker>
        </defs>
        <g class="link-paths"></g>
      </svg>`;
    this.platesEl = this.root.querySelector('.plates')!;
    this.svg = this.root.querySelector('svg.links')!;

    // Plate N rendered first (top), plate 1 last (bottom) — matches the game.
    for (let i = count - 1; i >= 0; i--) {
      const plate = document.createElement('div');
      plate.className = 'plate';
      plate.dataset.plate = String(i);
      const holes = Array.from({ length: MAX_POS }, (_, h) => {
        const pos = h + 1;
        const center = pos === TARGET_POS ? ' center' : '';
        return `<button class="hole${center}" data-pos="${pos}" aria-label="Plate ${i + 1}, position ${pos}"></button>`;
      }).join('');
      plate.innerHTML = `
        <div class="plaque">${i + 1}</div>
        <div class="bar">
          ${holes}
          <div class="pin"></div>
          <div class="push-arrow"></div>
        </div>
        <div class="link-taps">
          <button class="tap" data-tap="left" title="Moves left when the selected plate is pushed right">&#x276E;</button>
          <button class="tap" data-tap="right" title="Moves right when the selected plate is pushed right">&#x276F;</button>
        </div>`;
      this.platesEl.appendChild(plate);
    }

    this.platesEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const plateEl = target.closest<HTMLElement>('.plate');
      if (!plateEl) return;
      const plate = Number(plateEl.dataset.plate);
      const tap = target.closest<HTMLElement>('.tap');
      if (tap) {
        // Reference push is RIGHT: tapping › = same direction, ‹ = opposite.
        const { selected, linkages } = this.store.state;
        if (selected === null || selected === plate) return;
        const rel = tap.dataset.tap === 'right' ? 1 : -1;
        const existing = linkages[selected].find((l) => l.target === plate);
        this.store.setLinkage(selected, plate, existing?.relation === rel ? null : rel);
        return;
      }
      const hole = target.closest<HTMLElement>('.hole');
      if (hole) this.store.setPosition(plate, Number(hole.dataset.pos));
      else this.store.selectPlate(plate);
    });
  }

  private update(s: AppState): void {
    if (s.plateCount !== this.builtCount) this.build(s.plateCount);

    const positions = s.mode === 'solve' ? s.solvePositions : s.positions;
    const activeMove =
      s.mode === 'solve' && s.solution && s.step < s.solution.length
        ? s.solution[s.step]
        : null;
    const opened =
      s.mode === 'solve' && s.solution !== null && s.step === s.solution.length;

    this.root.classList.toggle('solving', s.mode === 'solve');
    this.root.classList.toggle('opened', opened);

    for (const plateEl of this.platesEl.querySelectorAll<HTMLElement>('.plate')) {
      const i = Number(plateEl.dataset.plate);
      const pos = positions[i];
      plateEl.classList.toggle('selected', s.mode === 'edit' && s.selected === i);
      plateEl.classList.toggle('active-move', activeMove?.plate === i);
      plateEl.classList.toggle('centered', pos === TARGET_POS);

      const pin = plateEl.querySelector<HTMLElement>('.pin')!;
      pin.style.setProperty('--pos', String(pos));

      const arrow = plateEl.querySelector<HTMLElement>('.push-arrow')!;
      const isRef = s.mode === 'edit' && s.selected === i;
      arrow.classList.toggle('ref', isRef);
      if (activeMove?.plate === i) {
        arrow.dataset.dir = activeMove.direction === 1 ? 'right' : 'left';
      } else if (isRef) {
        arrow.dataset.dir = 'right'; // reference push direction for linkage taps
      } else {
        delete arrow.dataset.dir;
      }

      // Linkage tap arrows on every other plate while one is selected
      const taps = plateEl.querySelector<HTMLElement>('.link-taps')!;
      const tapsVisible = s.mode === 'edit' && s.selected !== null && s.selected !== i;
      taps.classList.toggle('show', tapsVisible);
      if (tapsVisible) {
        const link = s.linkages[s.selected!].find((l) => l.target === i);
        taps.querySelector('[data-tap="right"]')!.classList.toggle('on-same', link?.relation === 1);
        taps.querySelector('[data-tap="left"]')!.classList.toggle('on-opp', link?.relation === -1);
      }
    }

    requestAnimationFrame(() => this.drawLinks(s));
  }

  /** Draw linkage arcs in the right-hand gutter of the lock frame. */
  private drawLinks(s: AppState): void {
    const g = this.svg.querySelector('.link-paths')!;
    g.innerHTML = '';
    const frame = this.root.getBoundingClientRect();
    this.svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);

    const yOf = (plate: number): number => {
      const el = this.platesEl.querySelector<HTMLElement>(`.plate[data-plate="${plate}"]`)!;
      const r = el.querySelector('.bar')!.getBoundingClientRect();
      return r.top - frame.top + r.height / 2;
    };
    const barRight =
      this.platesEl.querySelector('.bar')!.getBoundingClientRect().right - frame.left;

    let lane = 0;
    for (let source = 0; source < s.plateCount; source++) {
      for (const link of s.linkages[source]) {
        const y0 = yOf(source);
        const y1 = yOf(link.target);
        const bulge = 20 + (lane % 3) * 13;
        lane++;
        const x = barRight + 74;
        const cls = link.relation === 1 ? 'same' : 'opp';
        const dim =
          s.mode === 'edit' && s.selected !== null && s.selected !== source;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute(
          'd',
          `M ${x} ${y0} C ${x + bulge} ${y0}, ${x + bulge} ${y1}, ${x + 2} ${y1}`,
        );
        path.setAttribute('class', `link ${cls}${dim ? ' dim' : ''}`);
        path.setAttribute('marker-end', `url(#arrow-${cls})`);
        g.appendChild(path);
      }
    }
  }
}
