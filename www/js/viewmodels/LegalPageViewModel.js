/**
 * LegalPageViewModel - Alpine's composition root for the Impressum and the
 * privacy page.
 *
 * Holds the theme VM and the page's Doccap poses, plus the frame-index
 * state the scroll-scrubbed sprite strips push progress into - the same
 * contract the animation factory drives on the main page.
 */
export class LegalPageViewModel {
  /**
   * @param {object} graph
   * @param {object} graph.themeViewModel - ThemeViewModel instance.
   * @param {Array} graph.tuxPoses - TuxPoseModel instances.
   */
  constructor(graph) {
    const missing = ['themeViewModel', 'tuxPoses'].filter((key) => !graph || !graph[key]);
    if (missing.length > 0) {
      throw new Error(`LegalPageViewModel requires ${missing.join(', ')} via constructor injection`);
    }
    this._themeViewModel = graph.themeViewModel;
    this._tuxPoses = [...graph.tuxPoses];
    this._tuxFrameMap = new Map(this._tuxPoses.map((pose) => [pose.id, pose.frameOffset]));
    this._reactiveBound = false;
  }

  get theme() {
    return this._themeViewModel;
  }

  get tuxPoses() {
    return [...this._tuxPoses];
  }

  getTuxFrame(poseId) {
    return this._tuxFrameMap.get(poseId) || 0;
  }

  setTuxFrame(poseId, frame) {
    if (this._tuxFrameMap.has(poseId)) {
      this._tuxFrameMap.set(poseId, frame);
    }
  }

  /**
   * Bridges the frame map into an external reactivity system
   * (Alpine.reactive). Idempotent.
   * @param {function(object): object} reactiveFn
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._tuxFrameMap = reactiveFn(this._tuxFrameMap);
  }
}
