/**
 * SceneScrollService - takes in-page links to the pinned scenes.
 *
 * The hero and the badge band live in one pinned harbor, so their anchors
 * no longer sit where their scenes play: the browser would jump into the
 * middle of a pin, or nowhere. Each scene registers a function returning
 * its scroll position (read on demand, since pins are measured at
 * refresh); a link to a known, measured scene scrolls there smoothly, and
 * anything else is left to the plain anchor.
 */
export class SceneScrollService {
  /**
   * @param {object} scrollEnv - Interface scoped to scrolling the page:
   *   scrollToY(top) scrolls smoothly to a document position.
   */
  constructor(scrollEnv) {
    if (!scrollEnv || typeof scrollEnv.scrollToY !== 'function') {
      throw new Error('SceneScrollService requires a scroll env via constructor injection');
    }
    this._scrollEnv = scrollEnv;
    this._scenes = new Map();
  }

  /**
   * @param {string} name
   * @param {function(): number} positionOf - the scene's scroll position.
   */
  setScene(name, positionOf) {
    this._scenes.set(name, positionOf);
  }

  /**
   * @param {string} name
   * @returns {boolean} true when it scrolled; false leaves it to the anchor.
   */
  scrollTo(name) {
    const positionOf = this._scenes.get(name);
    const top = positionOf ? positionOf() : undefined;
    if (!Number.isFinite(top)) {
      return false;
    }
    this._scrollEnv.scrollToY(top);
    return true;
  }
}
