/**
 * PixelGradientBuilder - lays out the hero's pixel wipe as pure data.
 *
 * The wipe is a grid of square cells that light up as the hero's scroll
 * progress passes each cell's threshold. Cells near the swept edge light
 * first; the whole covered share is an opaque wash the pitch text sits on,
 * sprinkled with solid colour tints that thicken toward the frontier; just
 * beyond it a narrow frontier band is dithered (seeded, so stable per page
 * load) and stepped through accent tones - the pixel gradient. Everything
 * past the frontier never lights, so the rest of the logo stays visible.
 *
 * Tones (the view maps them to classes):
 *   3 - solid wash (text sits here)
 *   5, 6, 7 - solid teal / hard-hat / dock-blue tints of the wash
 *   2 - soft wash
 *   1 - teal accent
 *   4 - dock-blue accent
 *   0 - hard-hat accent (the outermost sparks)
 */
const WIPE_END = 0.6;
const NEVER = 2;
const FRONTIER_WIDTH = 5;
const JITTER = 0.05;
// Per frontier step (0 = innermost): how likely the cell lights at all.
const FRONTIER_FILL = Object.freeze([0.95, 0.8, 0.6, 0.4, 0.2]);
// Per frontier step: the tone it most likely takes, and the alternative.
const FRONTIER_TONES = Object.freeze([
  Object.freeze({ odds: 0.7, likely: 2, other: 1 }),
  Object.freeze({ odds: 0.6, likely: 1, other: 4 }),
  Object.freeze({ odds: 0.6, likely: 1, other: 4 }),
  Object.freeze({ odds: 0.5, likely: 4, other: 0 }),
  Object.freeze({ odds: 0.6, likely: 0, other: 1 })
]);
const WASH = 3;
const TINT_TONES = Object.freeze([5, 6, 7]);
// Odds of a tint by which way it is drawn: teal most, then dock blue.
const TINT_WEIGHTS = Object.freeze([
  Object.freeze({ tone: 5, upTo: 0.45 }),
  Object.freeze({ tone: 7, upTo: 0.75 }),
  Object.freeze({ tone: 6, upTo: 1 })
]);
// Tint density inside the covered share: sparse at the swept edge, about
// a third of the cells next to the frontier.
const TINT_MIN = 0.04;
const TINT_RISE = 0.3;
const DIRECTIONS = Object.freeze(['right', 'bottom']);

export class PixelGradientBuilder {
  /**
   * @param {object} randomSource - SeededRandomSource (next(), chance()).
   */
  constructor(randomSource) {
    if (!randomSource || typeof randomSource.next !== 'function') {
      throw new Error('PixelGradientBuilder requires a random source via constructor injection');
    }
    this._random = randomSource;
  }

  /**
   * @param {object} options
   * @param {number} options.columns - grid columns (positive integer).
   * @param {number} options.rows - grid rows (positive integer).
   * @param {number} [options.coverage=0.5] - share of the swept axis the
   *   solid wash covers; the dithered frontier lies just beyond it.
   * @param {'right'|'bottom'} [options.direction='right'] - the edge the
   *   wipe grows in from.
   * @returns {Array<{id: string, col: number, row: number, threshold: number, tone: number}>}
   *   row-major; threshold > 1 means the cell never lights.
   */
  build({ columns, rows, coverage = 0.5, direction = 'right' }) {
    if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns <= 0 || rows <= 0) {
      throw new Error('PixelGradientBuilder requires positive integer columns and rows');
    }
    if (!DIRECTIONS.includes(direction)) {
      throw new Error(`PixelGradientBuilder received an unknown direction: ${direction}`);
    }

    const axisLength = direction === 'right' ? columns : rows;
    const frontierStart = Math.round(axisLength * coverage);
    const reach = frontierStart + FRONTIER_WIDTH;

    const cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const distance = direction === 'right' ? columns - 1 - col : rows - 1 - row;
        cells.push({ id: `px-${row}-${col}`, col, row, ...this._light(distance, frontierStart, reach) });
      }
    }
    return cells;
  }

  _light(distance, frontierStart, reach) {
    if (distance >= reach) {
      return { threshold: NEVER, tone: 0 };
    }
    // Always draw the jitter so the sequence stays aligned per cell.
    const jitter = this._random.next() * JITTER;
    const threshold = Math.min(WIPE_END, (distance / reach) * (WIPE_END - JITTER) + jitter);
    if (distance < frontierStart) {
      return { threshold, tone: this._coverTone(distance / Math.max(1, frontierStart - 1)) };
    }
    const step = distance - frontierStart;
    if (!this._random.chance(FRONTIER_FILL[step])) {
      return { threshold: NEVER, tone: 0 };
    }
    return { threshold, tone: this._frontierTone(step) };
  }

  /**
   * @param {number} closeness - 0 at the swept edge, 1 next to the frontier.
   */
  _coverTone(closeness) {
    const draw = this._random.next();
    if (!this._random.chance(TINT_MIN + TINT_RISE * closeness * closeness)) {
      return WASH;
    }
    return TINT_WEIGHTS.find((weight) => draw < weight.upTo).tone;
  }

  _frontierTone(step) {
    const { odds, likely, other } = FRONTIER_TONES[step];
    return this._random.chance(odds) ? likely : other;
  }
}

PixelGradientBuilder.WIPE_END = WIPE_END;
PixelGradientBuilder.TINT_TONES = TINT_TONES;
PixelGradientBuilder.COVER_TONES = Object.freeze([WASH, ...TINT_TONES]);
