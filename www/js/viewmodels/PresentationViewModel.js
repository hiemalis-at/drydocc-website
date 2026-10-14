/**
 * PresentationViewModel - Alpine's composition root for the dock page.
 *
 * Holds the collections the view loops over (acts, badges, Tux poses,
 * fleet nodes, install channels), the lab beat, and the theme VM, plus the Tux frame-index state GSAP's
 * ambient cycles push progress into. GSAP never touches the DOM here -
 * Alpine renders the frame index this VM stores.
 */
export class PresentationViewModel {
  /**
   * @param {object} graph - Fully constructed dependencies (injected by the
   *   IoC container; every key is required).
   * @param {object} graph.themeViewModel - ThemeViewModel instance.
   * @param {Array} graph.storyActs - StoryActModel instances.
   * @param {Array} graph.stackBadges - StackBadgeModel instances.
   * @param {Array} graph.tuxPoses - TuxPoseModel instances.
   * @param {Array} graph.fleetNodes - FleetNodeModel instances.
   * @param {object} graph.lab - StoryActModel of the lab beat, told outside
   *   the acts.
   * @param {Array} graph.installChannels - StackBadgeModel instances of the
   *   skill registries.
   */
  constructor(graph) {
    const missing = ['themeViewModel', 'storyActs', 'stackBadges', 'tuxPoses', 'fleetNodes', 'lab', 'installChannels']
      .filter((key) => !graph || !graph[key]);
    if (missing.length > 0) {
      throw new Error(`PresentationViewModel requires ${missing.join(', ')} via constructor injection`);
    }
    const { themeViewModel, storyActs, stackBadges, tuxPoses, fleetNodes, lab, installChannels } = graph;
    this._themeViewModel = themeViewModel;
    this._acts = [...storyActs];
    this._badges = [...stackBadges];
    this._tuxPoses = [...tuxPoses];
    this._fleetNodes = [...fleetNodes];
    this._lab = lab;
    this._installChannels = [...installChannels];
    // Pose id → currently visible frame index, seeded at each pose's own
    // frame offset so poses in view together never show the same state.
    this._tuxFrameMap = new Map(this._tuxPoses.map((pose) => [pose.id, pose.frameOffset]));
    this._reactiveBound = false;
  }

  get theme() {
    return this._themeViewModel;
  }

  get acts() {
    return [...this._acts];
  }

  get badges() {
    return [...this._badges];
  }

  get tuxPoses() {
    return [...this._tuxPoses];
  }

  get fleetNodes() {
    return [...this._fleetNodes];
  }

  get lab() {
    return this._lab;
  }

  get installChannels() {
    return [...this._installChannels];
  }

  /**
   * @param {string} poseId
   * @returns {number} the visible frame index; 0 for unknown ids.
   */
  getTuxFrame(poseId) {
    return this._tuxFrameMap.get(poseId) || 0;
  }

  /**
   * @param {string} poseId
   * @param {number} frame
   */
  setTuxFrame(poseId, frame) {
    if (this._tuxFrameMap.has(poseId)) {
      this._tuxFrameMap.set(poseId, frame);
    }
  }

  /**
   * Bridges the Tux frame map into an external reactivity system
   * (Alpine.reactive). The animation path (GSAP) writes frame indices
   * outside Alpine's tracking; without this wrap, the stacked-frame
   * :class effects never re-run and Tux stays frozen on frame 0.
   *
   * Idempotent: a second call is a no-op, so a re-registered Alpine never
   * double-wraps the map.
   *
   * @param {function(object): object} reactiveFn - e.g. Alpine.reactive
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._tuxFrameMap = reactiveFn(this._tuxFrameMap);
  }

  /**
   * HATEOAS link of one badge - how the view finds the repo to fork
   * without hardcoding its URL.
   * @returns {{rel: string, href: string}|null}
   */
  getBadgeLink(badgeId) {
    const badge = this._badges.find((b) => b.id === badgeId);
    return badge ? badge.getLink() : null;
  }

  /**
   * HATEOAS resource links for one act or the lab beat; every link it
   * carries (the new IA has no sequential-navigation rels to split out).
   * @returns {object} rel → { href, title }; {} for unknown ids.
   */
  getResourceLinksForAct(actId) {
    const act = [...this._acts, this._lab].find((a) => a.id === actId);
    return act ? act.getLinks() : {};
  }
}
