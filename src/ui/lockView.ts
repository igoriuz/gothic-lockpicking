import type { AppState } from '../store';
import { gameDir, type Store } from '../store';
import { applyMove, MAX_POS, TARGET_POS } from '../solver';

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
      <div class="lockpick"></div>
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
      // The slab is 13 columns wide (7 holes + 3 solid columns each side) and
      // slides inside the bar slot; pin and holes travel with it.
      const slabHoles = Array.from(
        { length: MAX_POS },
        (_, h) => `<div class="hole" style="grid-column:${h + 4}"></div>`,
      ).join('');
      const zones = Array.from({ length: MAX_POS }, (_, h) => {
        const pos = h + 1;
        const center = pos === TARGET_POS ? ' center' : '';
        return `<button class="zone${center}" data-pos="${pos}" aria-label="Plate ${i + 1}, position ${pos}"></button>`;
      }).join('');
      plate.innerHTML = `
        <div class="plaque">${i + 1}</div>
        <div class="bar">
          <div class="slab">${slabHoles}<div class="peg"></div></div>
          <div class="pin ghost"></div>
          <div class="zones">${zones}</div>
          <div class="push-arrow"></div>
        </div>
        <div class="link-taps">
          <button class="tap" data-rel="same" title="Moves the same way as the selected plate">&#x21C9;</button>
          <button class="tap" data-rel="opp" title="Moves opposite to the selected plate">&#x21C4;</button>
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
        const { selected, linkages } = this.store.state;
        if (selected === null || selected === plate) return;
        const rel = tap.dataset.rel === 'same' ? 1 : -1;
        const existing = linkages[selected].find((l) => l.target === plate);
        this.store.setLinkage(selected, plate, existing?.relation === rel ? null : rel);
        return;
      }
      const zone = target.closest<HTMLElement>('.zone');
      if (zone) this.store.setPosition(plate, Number(zone.dataset.pos));
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
    // Where every pin will sit after the current step — shown as ghost targets.
    const ghostPositions = activeMove
      ? applyMove(positions, s.linkages, activeMove)
      : null;

    this.root.classList.toggle('solving', s.mode === 'solve');
    this.root.classList.toggle('opened', opened);

    for (const plateEl of this.platesEl.querySelectorAll<HTMLElement>('.plate')) {
      const i = Number(plateEl.dataset.plate);
      const pos = positions[i];
      plateEl.classList.toggle('selected', s.mode === 'edit' && s.selected === i);
      plateEl.classList.toggle('active-move', activeMove?.plate === i);
      plateEl.classList.toggle('centered', pos === TARGET_POS);

      // The whole slab slides so that its pin hole sits at window column `pos`
      plateEl.querySelector<HTMLElement>('.slab')!.style.setProperty('--pos', String(pos));

      // Ghost target: where this pin will sit after the current step
      const ghost = plateEl.querySelector<HTMLElement>('.pin.ghost')!;
      const ghostPos = ghostPositions?.[i];
      const showGhost = ghostPos !== undefined && ghostPos !== pos;
      ghost.classList.toggle('show', showGhost);
      if (showGhost) ghost.style.setProperty('--pos', String(ghostPos));

      // The arrow shows the key you press in game (may be inverted vs. the pin)
      const arrow = plateEl.querySelector<HTMLElement>('.push-arrow')!;
      if (activeMove?.plate === i) {
        const input = gameDir(activeMove.direction, s.invertControls);
        arrow.dataset.dir = input === 1 ? 'right' : 'left';
      } else {
        delete arrow.dataset.dir;
      }

      // Linkage tap buttons on every other plate while one is selected
      const taps = plateEl.querySelector<HTMLElement>('.link-taps')!;
      const tapsVisible = s.mode === 'edit' && s.selected !== null && s.selected !== i;
      taps.classList.toggle('show', tapsVisible);
      if (tapsVisible) {
        const link = s.linkages[s.selected!].find((l) => l.target === i);
        taps.querySelector('[data-rel="same"]')!.classList.toggle('on-same', link?.relation === 1);
        taps.querySelector('[data-rel="opp"]')!.classList.toggle('on-opp', link?.relation === -1);
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
