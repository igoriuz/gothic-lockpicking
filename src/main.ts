import './styles/base.css';
import './styles/lock.css';
import './styles/panels.css';
import { Store } from './store';
import { LockView } from './ui/lockView';
import { LinkagePanel } from './ui/linkagePanel';
import { SolvePanel } from './ui/solvePanel';
import { MIN_PLATES, MAX_PLATES } from './solver';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `
  <div class="page">
    <header class="masthead">
      <h1>Gothic <span class="accent">Lockpick</span></h1>
      <p class="tagline">&#9884; linked-slider solver &middot; Gothic I Remake &#9884;</p>
    </header>

    <section class="controls">
      <div class="control-group">
        <span class="control-label">Plates</span>
        <div class="stepper">
          <button id="plates-minus" aria-label="Fewer plates">&minus;</button>
          <span id="plates-count">5</span>
          <button id="plates-plus" aria-label="More plates">+</button>
        </div>
      </div>
      <button id="reset" class="seg">reset</button>
      <div class="control-group">
        <span class="control-label">Controls</span>
        <button id="invert" class="seg"
          title="Inverted: pressing left in game slides the pin right. All instructions show the key to press.">inverted</button>
      </div>
      <button id="solve" class="btn-forge">&#128273; Pick the lock</button>
      <p id="message" class="message" hidden></p>
    </section>

    <main class="layout">
      <section class="lock-area"><div id="lock"></div></section>
      <aside class="side">
        <div id="linkage-panel"></div>
        <div id="solve-panel"></div>
      </aside>
    </main>

    <footer class="footnote">
      Set each pin by clicking a hole &middot; click a plate to edit its linkages &middot;
      plate 1 is at the bottom, position 4 is the center
    </footer>
  </div>`;

const store = new Store();
new LockView(document.querySelector('#lock')!, store);
new LinkagePanel(document.querySelector('#linkage-panel')!, store);
new SolvePanel(document.querySelector('#solve-panel')!, store);

const countEl = document.querySelector('#plates-count')!;
const messageEl = document.querySelector<HTMLElement>('#message')!;
const minusBtn = document.querySelector<HTMLButtonElement>('#plates-minus')!;
const plusBtn = document.querySelector<HTMLButtonElement>('#plates-plus')!;
const solveBtn = document.querySelector<HTMLButtonElement>('#solve')!;
const resetBtn = document.querySelector<HTMLButtonElement>('#reset')!;
const invertBtn = document.querySelector<HTMLButtonElement>('#invert')!;

store.subscribe((s) => {
  countEl.textContent = String(s.plateCount);
  minusBtn.disabled = s.plateCount <= MIN_PLATES || s.mode === 'solve';
  plusBtn.disabled = s.plateCount >= MAX_PLATES || s.mode === 'solve';
  solveBtn.hidden = s.mode === 'solve';
  resetBtn.hidden = s.mode === 'solve';
  invertBtn.textContent = s.invertControls ? 'inverted' : 'direct';
  invertBtn.classList.toggle('on', s.invertControls);
  messageEl.hidden = s.message === null;
  messageEl.textContent = s.message ?? '';
});

minusBtn.addEventListener('click', () => store.setPlateCount(store.state.plateCount - 1));
plusBtn.addEventListener('click', () => store.setPlateCount(store.state.plateCount + 1));
resetBtn.addEventListener('click', () => store.resetLock());
invertBtn.addEventListener('click', () => store.toggleInvert());
solveBtn.addEventListener('click', () => store.solvePuzzle());

document.addEventListener('keydown', (e) => {
  if (store.state.mode !== 'solve') return;
  if (e.key === 'ArrowRight') store.stepForward();
  if (e.key === 'ArrowLeft') store.stepBack();
});

// Initial paint.
store.resetLock();
