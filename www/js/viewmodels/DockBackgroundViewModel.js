/**
 * DockBackgroundViewModel - the endless dock background.
 *
 * The original image fades into the page color at its end. When the page is
 * longer than that, the background goes on: a gap of plain page color, then
 * the image again - mirrored, fading in and out - then a gap, then the
 * original again, and so on. This VM owns how many repeats it takes to cover
 * the page and which of them are mirrored; the view lays them out.
 */

/**
 * How many repeat tiles (each a gap plus one image) it takes, below the
 * original tile, to cover `coverHeight`.
 *
 * @param {object} geometry
 * @param {number} geometry.coverHeight - height to cover, in px.
 * @param {number} geometry.tileHeight - one image's rendered height, in px.
 * @param {number} geometry.gapHeight - the page-color gap between images, in px.
 * @returns {number} zero for unmeasured or degenerate geometry.
 */
export function repeatTileCount({ coverHeight, tileHeight, gapHeight }) {
  if (![coverHeight, tileHeight, gapHeight].every(Number.isFinite) || tileHeight <= 0 || gapHeight < 0) {
    return 0;
  }
  return Math.max(0, Math.ceil((coverHeight - tileHeight) / (tileHeight + gapHeight)));
}

export class DockBackgroundViewModel {
  /**
   * @param {object} options
   * @param {number} options.aspect - the image's height over its width; it
   *   renders at the viewport's full width.
   * @param {number} options.gapFraction - the gap between images, as a
   *   fraction of the viewport height.
   */
  constructor({ aspect, gapFraction } = {}) {
    if (!(aspect > 0) || !(gapFraction >= 0)) {
      throw new Error('DockBackgroundViewModel requires a positive image aspect and a gap fraction via constructor injection');
    }
    this._aspect = aspect;
    this._gapFraction = gapFraction;
    this._state = { repeats: [] };
    this._reactiveBound = false;
  }

  /**
   * The repeat tiles below the original, top to bottom: the first one is
   * mirrored, then they alternate.
   * @returns {Array<{key: number, mirrored: boolean}>}
   */
  get repeats() {
    return this._state.repeats;
  }

  get gapClass() {
    return `mt-[${this._gapFraction * 100}vh]`;
  }

  /**
   * @param {object} viewport
   * @param {number} viewport.viewportWidth
   * @param {number} viewport.viewportHeight
   * @param {number} viewport.coverHeight - how far down the background has
   *   to reach, in px.
   */
  fit({ viewportWidth, viewportHeight, coverHeight }) {
    const count = repeatTileCount({
      coverHeight,
      tileHeight: viewportWidth * this._aspect,
      gapHeight: viewportHeight * this._gapFraction
    });
    if (count === this._state.repeats.length) return;
    this._state.repeats = Array.from({ length: count }, (_, index) => ({
      key: index + 1,
      mirrored: index % 2 === 0
    }));
  }

  /**
   * @param {function(object): object} reactiveFn - e.g. Alpine.reactive.
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._state = reactiveFn(this._state);
  }
}
