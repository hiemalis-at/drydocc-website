/**
 * PixelSpinAnimator - keeps the boxes' loose edge pixels turning on their
 * own, independent of the scroll.
 *
 * Every loose pixel gets one endless loop: a full turn in 22.5 degree
 * steps (pixel art never rotates smoothly), slow, in its variant's
 * direction. Its pace, start delay and the rest between turns are drawn
 * from the seeded random source, so the pixels never turn in unison and
 * the pattern is stable for the page's life-time.
 */
const STEPS_PER_TURN = 16;
// A turn takes between 0.75x and 1.5x its variant's period.
const PACE_MIN = 0.75;
const PACE_SPREAD = 0.75;
// Seconds a pixel may rest between two turns.
const MAX_REST = 3;

export class PixelSpinAnimator {
  /**
   * @param {object} gsapEnv - scoped interface to the animation library.
   * @param {object} randomSource - SeededRandomSource (next()).
   */
  constructor(gsapEnv, randomSource) {
    if (!gsapEnv) {
      throw new Error('PixelSpinAnimator requires a gsapEnv instance via constructor injection');
    }
    if (!randomSource || typeof randomSource.next !== 'function') {
      throw new Error('PixelSpinAnimator requires a random source via constructor injection');
    }
    this._gsapEnv = gsapEnv;
    this._random = randomSource;
  }

  /**
   * @param {Array<{selector: string, direction: number, period: number}>} variants
   *   - per loose-pixel selector: 1 / -1 for clockwise / counter-clockwise,
   *   and the typical seconds per turn.
   * @returns {Array<object>} one looping timeline per loose pixel; empty when
   *   unavailable or without variants.
   */
  start(variants) {
    if (!this._gsapEnv.isAvailable() || !Array.isArray(variants)) {
      return [];
    }
    const createTimeline = this._gsapEnv.getTimelineFactory();
    return variants.flatMap((variant) => this._gsapEnv.getElements(variant.selector).map((element) => {
      const { duration, delay, rest } = this._loopFor(variant);
      const loop = createTimeline({ repeat: -1, delay, repeatDelay: rest });
      loop.to(element, {
        rotation: `${variant.direction < 0 ? '-' : '+'}=360`,
        duration,
        ease: `steps(${STEPS_PER_TURN})`
      });
      return loop;
    }));
  }

  _loopFor({ period }) {
    return {
      duration: period * (PACE_MIN + PACE_SPREAD * this._random.next()),
      delay: period * this._random.next(),
      rest: MAX_REST * this._random.next()
    };
  }
}

PixelSpinAnimator.MAX_REST = MAX_REST;
