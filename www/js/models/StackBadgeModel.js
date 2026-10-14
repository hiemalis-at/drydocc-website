/**
 * StackBadgeModel - one external tool as a linked chip: a dependency
 * drydocc pulls into the reader's setup (the dock badge row), or a channel
 * it is installed through.
 *
 * Pure data: the badge's identity, where it points, which inline SVG mark
 * the view renders for it, its accent tone, what it is for, and whether
 * the reader only gets it with an optional feature. The HATEOAS getLink() lets
 * the view loop over badges generically instead of hardcoding URLs.
 */
// The colour of the badge's pixel-gradient top edge, per accent tone.
const PIXEL_CLASSES = Object.freeze({
  teal: 'bg-teal',
  dockblue: 'bg-dockblue',
  hardhat: 'bg-hardhat'
});

export class StackBadgeModel {
  /**
   * @param {object} badge
   * @param {string} badge.id - Stable identifier (e.g. 'podman').
   * @param {string} badge.name - Display name.
   * @param {string} badge.href - External link target (required, non-empty).
   * @param {string} badge.mark - Inline-SVG mark key the view understands.
   * @param {string} badge.tone - Accent tone ('teal' | 'dockblue' | 'hardhat').
   * @param {string} [badge.purpose] - What drydocc uses it for, in a few words.
   * @param {boolean} [badge.optional] - Pulled in only by an optional feature.
   */
  constructor({ id, name, href, mark, tone, purpose = '', optional = false }) {
    if (!href) {
      throw new Error('StackBadgeModel requires a non-empty href');
    }
    this.id = id;
    this.name = name;
    this.href = href;
    this.mark = mark;
    this.tone = tone;
    this.purpose = purpose;
    this.optional = optional;
  }

  /**
   * HATEOAS link for this badge: an external resource relation.
   * @returns {{rel: string, href: string}}
   */
  getLink() {
    return { rel: 'external', href: this.href };
  }

  /** Unknown tones fall back to teal. */
  get pixelClass() {
    return PIXEL_CLASSES[this.tone] || PIXEL_CLASSES.teal;
  }
}
