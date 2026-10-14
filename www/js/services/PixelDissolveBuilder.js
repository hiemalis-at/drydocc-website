/**
 * PixelDissolveBuilder - lays out a box's pixel-in reveal as pure data.
 *
 * The box is divided into roughly square cells; each cell draws a seeded
 * threshold, and a cell shows once the reveal's progress passes it. The
 * reveal reaches the browser as a clip-path polygon tracing the shown
 * cells (pixelDissolveClipPath), so playing it backwards pixels the box
 * out again in the reverse order.
 */
const MAX_CELLS = 40;
// Outer cells reach this far (%) past the box so its shadow and corner
// pixels reveal with them instead of being cut off.
const OVERHANG = 50;
const HIDDEN = 'polygon(0 0, 0 0, 0 0)';

/**
 * The clip-path that shows exactly the cells whose threshold `progress`
 * has passed. Shown cells are merged into runs per row; each run is traced
 * as a rectangle joined to the anchor at 0 0 by zero-width seams, so the
 * whole set is one polygon. Fully in clears the clip.
 *
 * @param {object} at
 * @param {number} at.columns
 * @param {number} at.rows
 * @param {Array<number>} at.thresholds - row-major, one per cell.
 * @param {number} at.progress - 0..1.
 * @returns {string} a CSS clip-path value.
 */
export function pixelDissolveClipPath({ columns, rows, thresholds, progress }) {
  if (progress >= 1) {
    return 'none';
  }
  const edge = (index, count) => {
    if (index === 0) return -OVERHANG;
    if (index === count) return 100 + OVERHANG;
    return Number(((index / count) * 100).toFixed(3));
  };
  const points = [];
  for (let row = 0; row < rows; row += 1) {
    let col = 0;
    while (col < columns) {
      if (thresholds[row * columns + col] >= progress) {
        col += 1;
        continue;
      }
      const start = col;
      while (col < columns && thresholds[row * columns + col] < progress) {
        col += 1;
      }
      const [x1, x2, y1, y2] = [edge(start, columns), edge(col, columns), edge(row, rows), edge(row + 1, rows)];
      points.push(`${x1}% ${y1}%`, `${x2}% ${y1}%`, `${x2}% ${y2}%`, `${x1}% ${y2}%`, `${x1}% ${y1}%`, '0 0');
    }
  }
  return points.length === 0 ? HIDDEN : `polygon(0 0, ${points.join(', ')})`;
}

export class PixelDissolveBuilder {
  /**
   * @param {object} randomSource - SeededRandomSource (next()).
   */
  constructor(randomSource) {
    if (!randomSource || typeof randomSource.next !== 'function') {
      throw new Error('PixelDissolveBuilder requires a random source via constructor injection');
    }
    this._random = randomSource;
  }

  /**
   * @param {object} box
   * @param {number} box.width - the box's width in px.
   * @param {number} box.height - the box's height in px.
   * @param {number} box.cellSize - the target cell edge in px.
   * @returns {{columns: number, rows: number, thresholds: Array<number>}}
   */
  build({ width, height, cellSize }) {
    const cells = (length) => Math.min(MAX_CELLS, Math.max(1, Math.round(length / cellSize) || 1));
    const columns = cells(width);
    const rows = cells(height);
    const thresholds = Array.from({ length: columns * rows }, () => this._random.next());
    return { columns, rows, thresholds };
  }
}

PixelDissolveBuilder.MAX_CELLS = MAX_CELLS;
