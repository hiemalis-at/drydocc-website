/**
 * PixelEdgeBuilder - lays out a box's tone stroke as a pixel gradient.
 *
 * Instead of a solid 4px border, a box's tone edge is a small grid of
 * fixed-size pixels: the outermost row is nearly solid (the odd pixel cut
 * out), and each row further in crumbles more. A few loose pixels deep in
 * the crumble are marked to spin - they keep turning around their
 * z-axis. Seeded, so every edge is stable for the page's life-time.
 */
// Per depth row (0 = the box's outer edge): how likely a pixel is there.
const FILL_BY_DEPTH = Object.freeze([0.96, 0.7, 0.35, 0.12]);
const DEEPEST_FILL = 0.05;
const SPIN_FROM_DEPTH = 2;
const SPIN_CHANCE = 0.35;
const SPIN_KEYS = Object.freeze(['cw', 'ccw', 'fast']);
const PLACEMENT = Object.freeze({
  left: 'absolute inset-y-0 left-0',
  top: 'absolute inset-x-0 top-0',
  bottom: 'absolute inset-x-0 bottom-0'
});

export class PixelEdgeBuilder {
  /**
   * @param {object} randomSource - SeededRandomSource (next(), chance(), int()).
   */
  constructor(randomSource) {
    if (!randomSource || typeof randomSource.chance !== 'function') {
      throw new Error('PixelEdgeBuilder requires a random source via constructor injection');
    }
    this._random = randomSource;
  }

  /**
   * @param {object} options
   * @param {'left'|'top'|'bottom'} options.orientation - the box side the edge runs along.
   * @param {number} options.length - pixels along the side (the box clips the rest).
   * @param {number} [options.depth=4] - pixel rows from the edge inward.
   * @param {number} [options.pixel=5] - pixel size in CSS px.
   * @returns {{gridClass: string, placementClass: string,
   *   cells: Array<{id: string, depth: number, lit: boolean, spin: string|null}>}}
   *   cells in grid (row-major) order.
   */
  build({ orientation, length, depth = 4, pixel = 5 }) {
    if (!Object.prototype.hasOwnProperty.call(PLACEMENT, orientation)) {
      throw new Error(`PixelEdgeBuilder received an unknown orientation: ${orientation}`);
    }
    if (![length, depth, pixel].every((n) => Number.isInteger(n) && n > 0)) {
      throw new Error('PixelEdgeBuilder requires positive integer length, depth and pixel size');
    }
    const vertical = orientation === 'left';
    const columns = vertical ? depth : length;
    const rows = vertical ? length : depth;

    const cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        cells.push({ id: `px-${row}-${col}`, ...this._pixel(this._depthOf(orientation, row, col, rows)) });
      }
    }
    return {
      gridClass: `grid-cols-[repeat(${columns},${pixel}px)] grid-rows-[repeat(${rows},${pixel}px)]`,
      placementClass: PLACEMENT[orientation],
      cells
    };
  }

  // How far a cell sits in from the box's edge: a bottom edge counts its
  // rows from the last one up.
  _depthOf(orientation, row, col, rows) {
    if (orientation === 'left') return col;
    return orientation === 'bottom' ? rows - 1 - row : row;
  }

  _pixel(depth) {
    const fill = depth < FILL_BY_DEPTH.length ? FILL_BY_DEPTH[depth] : DEEPEST_FILL;
    const lit = this._random.chance(fill);
    const loose = lit && depth >= SPIN_FROM_DEPTH && this._random.chance(SPIN_CHANCE);
    return {
      depth,
      lit,
      spin: loose ? SPIN_KEYS[this._random.int(0, SPIN_KEYS.length - 1)] : null
    };
  }
}

PixelEdgeBuilder.SPIN_KEYS = SPIN_KEYS;
