/**
 * ScrollRevealViewModel - the page's reversible scroll-reveal polish, as
 * pure data.
 *
 * Descriptors name WHAT reveals and HOW (animation name, stagger); the
 * ScrollTriggerFactory decides how that reaches the browser. The dock
 * background's fade is deliberately NOT here - ScrollTriggerFactory
 * owns it as a scrubbed trigger over the page's own scroll range.
 *
 * Targets use the data-reveal-* attribute hooks the view provides
 * (data-reveal-badge / -card) scoped to their section, so adding an
 * element to a section never requires a descriptor change.
 */
const ALLOWED_ANIMATIONS = Object.freeze(['fade-rise', 'slide-left', 'scale-y-scrub', 'pop', 'pixel-in']);

export class ScrollRevealViewModel {
  /**
   * @param {Array<{id: string}>} storyActs - the six acts and the lab beat; each
   *   act beat pixels in as it enters the viewport.
   */
  constructor(storyActs = []) {
    if (!Array.isArray(storyActs)) {
      throw new Error('ScrollRevealViewModel requires a story acts array via constructor injection');
    }
    this._storyActs = storyActs;
  }

  /**
   * @returns {Array<{trigger: string, targets: Array<string>, animation: string, stagger: number}>}
   */
  buildDescriptors() {
    // The hero is NOT here: its pinned pixel-wipe scene owns it.

    // The band: its labels and Tux's callout below it pixel in with the
    // scroll, tightly staggered. The stacking badges carry their own hook
    // (data-dock-badge), never this one. The band lives in the pinned
    // harbor, so it is measured against it - otherwise the reveal would run
    // during the hero pin, while the band is still below the screen.
    const dockLabels = {
      trigger: '#dock',
      targets: ['#dock [data-reveal-badge]'],
      animation: 'pixel-in',
      stagger: 0.06,
      pinnedContainer: '#harbor'
    };
    // The story's boxes pixel in on the way down and out on the way up.
    const storyIntro = {
      trigger: '#story-intro',
      targets: ['#story-intro [data-reveal-card]'],
      animation: 'pixel-in',
      stagger: 0.08
    };
    // The dashed spine connecting the act beats draws down with the scroll.
    const storySpine = {
      trigger: '#story-acts',
      targets: ['#story-spine'],
      animation: 'scale-y-scrub',
      stagger: 0
    };
    // Each act beat pixels in as its own row enters the viewport - the
    // crate first, then Tux beside it.
    const actBeats = this._storyActs.map((act) => ({
      trigger: `#${act.id}`,
      targets: [`#${act.id} [data-reveal-card]`],
      animation: 'pixel-in',
      stagger: 0.12
    }));
    const storyClose = {
      trigger: '#story-close',
      targets: ['#story-close [data-reveal-card]'],
      animation: 'pixel-in',
      stagger: 0.08
    };

    return [dockLabels, storyIntro, storySpine, ...actBeats, storyClose];
  }
}

ScrollRevealViewModel.ALLOWED_ANIMATIONS = ALLOWED_ANIMATIONS;
