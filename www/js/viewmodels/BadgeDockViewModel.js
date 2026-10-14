/**
 * BadgeDockViewModel - the tech badge band's stacking schedule.
 *
 * As the band scrolls through its pin, the badges slide in from the left
 * one after another and stack against the right edge, like containers on
 * a quay. This VM owns the arrival order, each badge's animation hook, and
 * the "docked n/total" counter the band shows; the animation factory turns
 * the schedule into tweens.
 */
const EPSILON = 1e-9;

export class BadgeDockViewModel {
  /**
   * @param {Array<{id: string}>} stackBadges - StackBadgeModel instances in
   *   arrival order (the first one docks against the right edge).
   */
  constructor(stackBadges) {
    if (!Array.isArray(stackBadges)) {
      throw new Error('BadgeDockViewModel requires the stack badges via constructor injection');
    }
    this._badges = [...stackBadges];
    this._state = { stackedCount: 0 };
    this._reactiveBound = false;
  }

  get badges() {
    return [...this._badges];
  }

  get total() {
    return this._badges.length;
  }

  get stackedCount() {
    return this._state.stackedCount;
  }

  /**
   * One arrival per badge, back to back on a shared timeline.
   * @returns {Array<{id: string, selector: string, position: number}>}
   */
  get stackSteps() {
    return this._badges.map((badge, index) => ({
      id: badge.id,
      selector: `[data-dock-badge="${badge.id}"]`,
      position: index
    }));
  }

  /**
   * @param {number} progress - the band pin's scroll progress.
   */
  applyStackProgress(progress) {
    const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
    this._state.stackedCount = Math.floor(value * this.total + EPSILON);
  }

  revealAllStatic() {
    this._state.stackedCount = this.total;
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
