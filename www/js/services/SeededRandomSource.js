/**
 * SeededRandomSource - the only place the site draws randomness.
 *
 * A mulberry32 PRNG: ~10 lines, no dependencies, deterministic per seed.
 * One instance per page load (constructed in main.js with a seed drawn once
 * at bootstrap) so every animation value derived from it is stable for the
 * page's whole life-time and identical on every replay.
 */
export class SeededRandomSource {
  /**
   * @param {number} seed - unsigned 32-bit integer seed.
   */
  constructor(seed) {
    if (typeof seed !== 'number' || !Number.isFinite(seed)) {
      throw new Error('SeededRandomSource requires a numeric seed via constructor injection');
    }
    this._seed = seed >>> 0;
    this._state = (this._seed + 0x6D2B79F5) >>> 0;
  }

  /**
   * @returns {number} float in [0, 1)
   */
  next() {
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    this._state = (this._state + 0x6D2B79F5) >>> 0;
    return value;
  }

  /**
   * @param {number} min - inclusive lower bound
   * @param {number} max - inclusive upper bound
   * @returns {number} integer in [min, max]
   */
  int(min, max) {
    if (max < min) {
      throw new Error('SeededRandomSource.int requires max >= min');
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * @param {number} p - probability in [0, 1]
   * @returns {boolean} true with probability p
   */
  chance(p) {
    return this.next() < p;
  }
}
