/**
 * HeroAnimationFactory - the two pinned scroll scenes at the top of the
 * page: the logo hero's pixel wipe and the badge band's stacking.
 *
 * The hero scene only pushes progress into the HeroViewModel - Alpine
 * renders the lit cells and the pitch. The band scene tweens each badge's
 * transform on one scrubbed timeline (so it un-stacks on the way back up)
 * and pushes the progress into the BadgeDockViewModel's counter.
 *
 * Every method guards on library availability and reduced motion first,
 * mirroring StepAnimationFactory: no library means no triggers, never a
 * crash, and the view models' static mode shows the finished state.
 */
// Both scenes pin the same element, the harbor (hero and band together):
// ScrollTrigger cannot nest a pinned hero inside a pinned harbor.
const HERO_PIN = Object.freeze({ trigger: '#hero', pin: '#harbor', start: 'top top', end: '+=120%' });
// The band's stacking pins the whole harbor (hero and band together), so the
// logo above the band holds still too instead of scrolling away mid-stack.
// The harbor's pin-spacer is shared with the hero pin and only reserves that
// pin's length, so this pin reserves none itself: the empty spacer after
// the harbor does, and the pin lasts exactly its height.
const DOCK_PIN = Object.freeze({ trigger: '#dock', pin: '#harbor', pinSpacing: false });
const STACK_SPACER = '#harbor-spacer';
const STACK_FALLBACK_LENGTH = '+=80%';
const BADGE_FROM = Object.freeze({ x: '-100vw', opacity: 0 });
const BADGE_TO = Object.freeze({ x: 0, opacity: 1, duration: 1, ease: 'steps(8)' });

export class HeroAnimationFactory {
  /**
   * @param {object} gsapEnv - scoped interface to the animation library.
   * @param {object} heroViewModel - HeroViewModel instance.
   * @param {object} badgeDockViewModel - BadgeDockViewModel instance.
   */
  constructor(gsapEnv, heroViewModel, badgeDockViewModel) {
    if (!gsapEnv) {
      throw new Error('HeroAnimationFactory requires a gsapEnv instance via constructor injection');
    }
    if (!heroViewModel || typeof heroViewModel.applyWipeProgress !== 'function') {
      throw new Error('HeroAnimationFactory requires a hero view model via constructor injection');
    }
    if (!badgeDockViewModel || typeof badgeDockViewModel.applyStackProgress !== 'function') {
      throw new Error('HeroAnimationFactory requires a badge dock view model via constructor injection');
    }
    this._gsapEnv = gsapEnv;
    this._hero = heroViewModel;
    this._dock = badgeDockViewModel;
    this._heroCreated = false;
    this._dockCreated = false;
    this._heroTrigger = null;
  }

  /**
   * Pins the hero for 120% of a viewport while the wipe grows in; once
   * released, the logo and pitch scroll away together.
   * @returns {Array<object>}
   */
  createHeroPin() {
    if (!this._canAnimate() || this._heroCreated) {
      return [];
    }
    const ScrollTrigger = this._gsapEnv.getScrollTrigger();
    const trigger = new ScrollTrigger({
      ...HERO_PIN,
      scrub: true,
      onUpdate: (self) => this._hero.applyWipeProgress(self.progress)
    });
    this._heroCreated = true;
    this._heroTrigger = trigger;
    return [trigger];
  }

  /**
   * Pins the harbor (hero and band) while the badges arrive one after
   * another from the left and stack against the right edge.
   * @returns {Array<object>}
   */
  createBadgeStack() {
    if (!this._canAnimate() || this._dockCreated) {
      return [];
    }
    const ScrollTrigger = this._gsapEnv.getScrollTrigger();
    const timeline = this._gsapEnv.getTimelineFactory()();
    // Fresh vars per tween: GSAP writes its internals into them.
    this._dock.stackSteps.forEach((step) => {
      timeline.fromTo(step.selector, { ...BADGE_FROM }, { ...BADGE_TO }, step.position);
    });
    const trigger = new ScrollTrigger({
      ...DOCK_PIN,
      start: () => this._stackStart(),
      end: () => this._stackEnd(),
      animation: timeline,
      scrub: 0.4,
      onUpdate: (self) => this._dock.applyStackProgress(self.progress)
    });
    this._dockCreated = true;
    return [trigger];
  }

  /**
   * When the band is centered. The hero pin holds the same harbor, and its
   * spacing sits below the whole harbor — so the band reaches the centre
   * later than its measured position, by the hero pin's length. Read at
   * refresh, after the hero pin is measured.
   */
  _stackStart() {
    const hero = this._heroTrigger;
    const heroLength = hero && Number.isFinite(hero.end - hero.start) ? hero.end - hero.start : 0;
    return heroLength > 0 ? `center center-=${heroLength}` : 'center center';
  }

  /** As long as the spacer below the harbor is tall; read at refresh. */
  _stackEnd() {
    const [spacer] = this._gsapEnv.getElements(STACK_SPACER);
    const height = spacer ? this._gsapEnv.measure(spacer).height : 0;
    return height > 0 ? `+=${height}` : STACK_FALLBACK_LENGTH;
  }

  _canAnimate() {
    return this._gsapEnv.isAvailable() && !this._gsapEnv.prefersReducedMotion();
  }
}
