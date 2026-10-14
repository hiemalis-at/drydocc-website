/**
 * StepAnimationFactory - builds one GSAP timeline + ScrollTrigger per step
 * card: the command types (a linear tween over a proxy number whose
 * onUpdate pushes progress into the StepSessionViewModel) once the card has
 * pixeled in. The trigger sits exactly where the card's pixel-in ends:
 * scrolling down past it types the command from the start; scrolling back
 * up past it - the card pixeling out - clears it, never typing backwards.
 * The terminal has no animation of its own: it pixels in with its card.
 * GSAP never writes text - Alpine renders the view model state; GSAP only
 * tweens the proxy number.
 *
 * Every method guards on library availability first, mirroring
 * ScrollTriggerFactory: a missing library means no triggers, never a crash.
 */

import { progressAt } from './TypingScriptBuilder.js';
import { PIXEL_IN_END } from './ScrollTriggerFactory.js';

// Down past the pixel-in's end: type from the start. Back up past it: clear.
const TYPING_TOGGLE_ACTIONS = 'restart none none reset';

export class StepAnimationFactory {
  /**
   * @param {object} gsapEnv - scoped interface to the animation library
   *   globals.
   * @param {object} stepSessionViewModel - StepSessionViewModel instance.
   * @param {object} presentationViewModel - PresentationViewModel instance;
   *   supplies the Tux pose collection and receives frame updates.
   */
  constructor(gsapEnv, stepSessionViewModel, presentationViewModel) {
    if (!gsapEnv) {
      throw new Error('StepAnimationFactory requires a gsapEnv instance via constructor injection');
    }
    if (!stepSessionViewModel || typeof stepSessionViewModel.getScript !== 'function') {
      throw new Error('StepAnimationFactory requires a step session view model via constructor injection');
    }
    if (!presentationViewModel || typeof presentationViewModel.setTuxFrame !== 'function') {
      throw new Error('StepAnimationFactory requires a presentation view model via constructor injection');
    }
    this._gsapEnv = gsapEnv;
    this._session = stepSessionViewModel;
    this._presentation = presentationViewModel;
    this._created = false;
    this._tuxCreated = false;
  }

  /**
   * One typing timeline per step card. Idempotent: a second call is a
   * no-op so a double-fired initAnimations can never double-hide content.
   *
   * @returns {Array<object>}
   */
  createStepTriggers() {
    if (!this._gsapEnv.isAvailable() || this._created) {
      return [];
    }

    const ScrollTrigger = this._gsapEnv.getScrollTrigger();
    const createTimeline = this._gsapEnv.getTimelineFactory();

    const triggers = this._session.featureIds.map((featureId) => {
      const script = this._session.getScript(featureId);

      // Animated initial states only ever exist from here on - the page
      // below the fold is static until the animation system is confirmed.
      this._session.beginAnimation(featureId);

      const typingTimeline = createTimeline();
      // The tween maps TIME linearly; the script's per-event delays decide
      // when each keystroke lands, so the human rhythm reaches the screen.
      const proxy = { elapsedMs: 0 };
      typingTimeline.to(proxy, {
        elapsedMs: script.totalDuration,
        duration: script.totalDuration / 1000,
        ease: 'none',
        onUpdate: () => this._session.applyProgress(featureId, progressAt(script, proxy.elapsedMs))
      });

      return new ScrollTrigger({
        trigger: `#${featureId}`,
        animation: typingTimeline,
        start: PIXEL_IN_END,
        toggleActions: TYPING_TOGGLE_ACTIONS,
        // 'reset' rewinds the proxy silently (no onUpdate), so clear the
        // text here as the card starts pixeling out.
        onLeaveBack: () => this._session.applyProgress(featureId, 0)
      });
    });

    // Only mark creation done once the whole loop has succeeded - a
    // mid-loop throw must not permanently disable the factory.
    this._created = true;
    return triggers;
  }

  /**
   * One scrubbed ScrollTrigger per Tux pose: scroll progress across the
   * pose's container walks its frame strip, starting from the pose's own
   * frame offset so two crates in view together never show the same state.
   * The frame index lands whole (floor), so Tux reads as a sprite strip,
   * and scrubbing makes it fully reversible with the scroll direction.
   *
   * Skipped entirely under reduced motion or a missing library: the view
   * model's seeded offset frame is the whole fallback (static, varied).
   *
   * Idempotent: a second call is a no-op.
   *
   * @returns {Array<object>}
   */
  createTuxScrollTriggers() {
    if (!this._gsapEnv.isAvailable() || this._gsapEnv.prefersReducedMotion() || this._tuxCreated) {
      return [];
    }
    const ScrollTrigger = this._gsapEnv.getScrollTrigger();

    const triggers = this._presentation.tuxPoses.map((pose) => {
      const config = new ScrollTrigger({
        trigger: `#tux-${pose.id}`,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        // A strip inside a pinned container (the harbor) is measured against
        // it, or its frames would run while the container is still pinned.
        ...(pose.pinnedContainer ? { pinnedContainer: pose.pinnedContainer } : {}),
        onUpdate: (self) => this._presentation.setTuxFrame(
          pose.id,
          (pose.frameOffset + Math.floor(self.progress * pose.frameCount)) % pose.frameCount
        )
      });
      // The recorded-mock in tests returns { config }; a throw from the
      // constructor must propagate before _tuxCreated is set.
      return config;
    });

    // Only mark creation done once the whole loop has succeeded - a
    // mid-loop throw must not permanently disable the factory.
    this._tuxCreated = true;
    return triggers;
  }

  /**
   * Recalculates trigger positions (mid-scroll resize / orientation change).
   */
  refresh() {
    if (this._gsapEnv.isAvailable()) {
      this._gsapEnv.getScrollTrigger().refresh();
    }
  }
}
