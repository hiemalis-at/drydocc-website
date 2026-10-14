/**
 * HeroViewModel - the full-viewport logo hero's state.
 *
 * Holds the pixel-wipe cells (built by PixelGradientBuilder) and one
 * progress number the hero's pinned scroll trigger pushes in. Alpine reads
 * everything else - which cells are lit, their stepped tone classes, the
 * mask that reveals the pitch text cell by cell, whether the pitch takes
 * clicks and whether the scroll hint shows - from here, so GSAP never
 * touches the DOM for the wipe.
 */
// The wash tints mix a brand colour into the wash itself, so they stay
// opaque (the logo never shows through under the pitch) and follow the
// theme tokens in light and dark.
const TONE_CLASSES = Object.freeze({
  3: 'bg-wash',
  5: 'bg-[color:color-mix(in_srgb,rgb(var(--c-teal))_28%,rgb(var(--c-wash)))]',
  6: 'bg-[color:color-mix(in_srgb,rgb(var(--c-hardhat))_32%,rgb(var(--c-wash)))]',
  7: 'bg-[color:color-mix(in_srgb,rgb(var(--c-dockblue))_28%,rgb(var(--c-wash)))]',
  2: 'bg-wash/80',
  1: 'bg-teal/80',
  4: 'bg-dockblue/80',
  0: 'bg-hardhat/90'
});

// The covered share the pitch text sits on, per wipe direction (main.js
// covers 50% from the right, 60% from the bottom on phones).
const PITCH_PLACEMENT = Object.freeze({
  right: 'inset-y-0 right-0 w-1/2',
  bottom: 'inset-x-0 bottom-0 h-3/5'
});

const PITCH_SHOWS_AT = 0.55;
const INDICATOR_HIDES_AT = 0.05;

export class HeroViewModel {
  /**
   * @param {object} wipe
   * @param {Array<{id: string, threshold: number, tone: number}>} wipe.cells
   * @param {number} wipe.columns
   * @param {number} wipe.rows
   * @param {'right'|'bottom'} [wipe.direction='right']
   */
  constructor({ cells, columns, rows, direction = 'right' } = {}) {
    if (!Array.isArray(cells)) {
      throw new Error('HeroViewModel requires the pixel wipe cells via constructor injection');
    }
    this._cells = cells;
    this._columns = columns;
    this._rows = rows;
    this._direction = direction;
    this._state = { progress: 0 };
    this._reactiveBound = false;
    // The lit set only ever grows along the thresholds, so its size names it.
    this._litOrder = cells.filter((cell) => cell.threshold <= 1)
      .sort((a, b) => a.threshold - b.threshold);
    this._mask = { litCount: -1, value: '' };
  }

  get cells() {
    return this._cells;
  }

  get progress() {
    return this._state.progress;
  }

  get gridClass() {
    return `grid-cols-[repeat(${this._columns},minmax(0,1fr))] grid-rows-[repeat(${this._rows},minmax(0,1fr))]`;
  }

  get pitchPlacementClass() {
    return PITCH_PLACEMENT[this._direction] || PITCH_PLACEMENT.right;
  }

  get pitchVisible() {
    return this._state.progress >= PITCH_SHOWS_AT;
  }

  /**
   * The pitch's mask: a CSS image of the lit cells only, on the wipe's own
   * grid, so the text shows through exactly where the wipe has pixeled in.
   * Rebuilt only when a cell lights or goes dark.
   *
   * @returns {string} a CSS url() of an SVG data URI
   */
  get pitchMask() {
    const progress = this._state.progress;
    let litCount = 0;
    while (litCount < this._litOrder.length && this._litOrder[litCount].threshold <= progress) {
      litCount += 1;
    }
    if (litCount !== this._mask.litCount) {
      this._mask = { litCount, value: this._maskFor(this._litOrder.slice(0, litCount)) };
    }
    return this._mask.value;
  }

  get indicatorVisible() {
    return this._state.progress < INDICATOR_HIDES_AT;
  }

  /**
   * @param {number} progress - the hero pin's scroll progress.
   */
  applyWipeProgress(progress) {
    const value = Number.isFinite(progress) ? progress : 0;
    this._state.progress = Math.min(1, Math.max(0, value));
  }

  isCellLit(cell) {
    return this._state.progress >= cell.threshold;
  }

  cellClass(cell) {
    return this.isCellLit(cell) ? TONE_CLASSES[cell.tone] : 'opacity-0';
  }

  _maskFor(lit) {
    const litIds = new Set(lit.map((cell) => cell.id));
    const rows = new Map();
    this._cells.filter((cell) => litIds.has(cell.id)).forEach((cell) => {
      if (!rows.has(cell.row)) rows.set(cell.row, []);
      rows.get(cell.row).push(cell.col);
    });
    // One rectangle per horizontal run of lit cells.
    let path = '';
    [...rows.keys()].sort((a, b) => a - b).forEach((row) => {
      const cols = rows.get(row).sort((a, b) => a - b);
      let start = 0;
      for (let i = 1; i <= cols.length; i += 1) {
        if (i === cols.length || cols[i] !== cols[i - 1] + 1) {
          const width = cols[i - 1] - cols[start] + 1;
          path += `M${cols[start]} ${row}h${width}v1h-${width}z`;
          start = i;
        }
      }
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this._columns} ${this._rows}" `
      + `preserveAspectRatio="none" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  /**
   * Reduced motion or no animation library: show the finished hero.
   */
  revealAllStatic() {
    this.applyWipeProgress(1);
  }

  /**
   * Wraps the progress state with an external reactivity system
   * (Alpine.reactive) - the scroll trigger writes outside Alpine's
   * tracking. Idempotent.
   *
   * @param {function(object): object} reactiveFn
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._state = reactiveFn(this._state);
  }
}

HeroViewModel.TONE_CLASSES = TONE_CLASSES;
