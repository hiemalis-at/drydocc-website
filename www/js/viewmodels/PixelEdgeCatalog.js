/**
 * PixelEdgeCatalog - every box's pixel-gradient edge, by key.
 *
 * Keys name the box the edge belongs to ('node:<id>', 'badge:<id>',
 * 'feature:<key>'); the view asks for its edge by that key and colours the
 * lit pixels with the box's own tone. The catalog also says which way and
 * how quickly each kind of loose pixel keeps turning, for the animator that
 * turns them.
 */
const EMPTY_EDGE = Object.freeze({ gridClass: '', placementClass: '', cells: Object.freeze([]) });

// Direction and typical seconds per turn, per spin key the builder hands out.
const SPIN_VARIANTS = Object.freeze([
  Object.freeze({ selector: '[data-pixel-spin="cw"]', direction: 1, period: 12 }),
  Object.freeze({ selector: '[data-pixel-spin="ccw"]', direction: -1, period: 12 }),
  Object.freeze({ selector: '[data-pixel-spin="fast"]', direction: 1, period: 6 })
]);

export class PixelEdgeCatalog {
  /**
   * @param {Object<string, object>} edges - key → edge from PixelEdgeBuilder.
   */
  constructor(edges) {
    if (!edges || typeof edges !== 'object') {
      throw new Error('PixelEdgeCatalog requires its pixel edges via constructor injection');
    }
    this._edges = new Map(Object.entries(edges));
  }

  get keys() {
    return [...this._edges.keys()];
  }

  /**
   * @param {string} key
   * @returns {object} the edge; an empty edge for an unknown key.
   */
  edgeFor(key) {
    return this._edges.get(key) || EMPTY_EDGE;
  }

  get spinVariants() {
    return SPIN_VARIANTS.map((variant) => ({ ...variant }));
  }
}
