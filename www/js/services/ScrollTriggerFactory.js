/**
 * ScrollTriggerFactory - binds the page's reversible scroll-reveal polish
 * to the page's scroll. Every method guards on library availability first;
 * a missing library means no triggers, never a crash.
 */
import { pixelDissolveClipPath } from './PixelDissolveBuilder.js';

const REVEAL_START = 'top 85%';
// The story boxes' pixel-in: ~32px cells shown in 12 chunky steps, scrubbed
// from when a row's top passes 90% of the viewport to when it reaches 40%.
// The end is shared: an act's command starts typing right where it lands.
export const PIXEL_IN_END = 'top 40%';
const PIXEL_IN = Object.freeze({ cellSize: 32, steps: 12, duration: 0.6, start: 'top 90%', end: PIXEL_IN_END });

/**
 * The background's parallax offset at a scroll position, as a pure
 * function. Past `start` the offset grows by `rate` per px scrolled, so the
 * background moves at (1 - rate) of the content's speed. Inside a pause (a
 * pinned section, where the content holds still while the page scrolls)
 * the offset follows the scroll 1:1, so the background holds still on
 * screen too; once the pause is over it lags the content at `rate` again.
 *
 * @param {object} at
 * @param {number} at.scroll - current scroll position.
 * @param {number} at.start - scroll position where the parallax starts.
 * @param {number} at.rate - offset per px of unpaused scroll (0..1).
 * @param {Array<{start: number, end: number}>} [at.pauses] - scroll ranges to
 *   hold still through; unmeasured or empty ranges are ignored.
 * @returns {number} the downward offset in px.
 */
export function parallaxOffset({ scroll, start, rate, pauses = [] }) {
  const at = Math.max(start, scroll);
  const pausedBefore = pauses
    .filter((pause) => Number.isFinite(pause.start) && Number.isFinite(pause.end) && pause.end > pause.start)
    .reduce((sum, pause) => {
      const from = Math.max(start, pause.start);
      return sum + Math.min(Math.max(at - from, 0), Math.max(pause.end - from, 0));
    }, 0);
  return pausedBefore + rate * (at - start - pausedBefore);
}

/**
 * The fixed background layer's vertical shift at a scroll position, as a
 * pure function: how far parallaxOffset lets it lag, minus the content's own
 * travel since `start`. Past `start` it moves up at (1 - rate) of the
 * content's speed; inside a pause the shift holds, so the layer - fixed to
 * the viewport - stays put without any per-frame correction.
 *
 * @param {object} at - same shape as parallaxOffset's.
 * @returns {number} the upward shift in px (zero or negative).
 */
export function backgroundShift({ scroll, start, rate, pauses = [] }) {
  return parallaxOffset({ scroll, start, rate, pauses }) - (Math.max(start, scroll) - start);
}

export class ScrollTriggerFactory {
  /**
   * @param {object} gsapEnv - Interface scoped to exactly what this class
   *   needs from the animation library globals.
   * @param {object} dissolveBuilder - PixelDissolveBuilder; lays out each
   *   pixel-in box's cells.
   */
  constructor(gsapEnv, dissolveBuilder) {
    if (!gsapEnv) {
      throw new Error('ScrollTriggerFactory requires a gsapEnv instance via constructor injection');
    }
    if (!dissolveBuilder || typeof dissolveBuilder.build !== 'function') {
      throw new Error('ScrollTriggerFactory requires a pixel dissolve builder via constructor injection');
    }
    this._gsapEnv = gsapEnv;
    this._dissolve = dissolveBuilder;
  }

  /**
   * One reversible reveal trigger per descriptor. The tween each trigger
   * plays is derived from the descriptor's animation name; scrubbed
   * animations (the timeline spine) get a scrub trigger instead of
   * toggleActions. Pixel-in boxes are scrubbed too: the scroll picks how
   * many cells show, so scrolling back up pixels them out again.
   *
   * @param {Array<{trigger: string, targets: Array<string>, animation: string, stagger: number}>} descriptors
   * @returns {Array<object>}
   */
  createRevealTriggers(descriptors) {
    if (!this._gsapEnv.isAvailable() || !Array.isArray(descriptors)) {
      return [];
    }
    const ScrollTrigger = this._gsapEnv.getScrollTrigger();
    const createTimeline = this._gsapEnv.getTimelineFactory();
    return descriptors.map((descriptor) => {
      const animation = this._buildRevealTween(createTimeline(), descriptor);
      const config = {
        trigger: descriptor.trigger,
        animation,
        start: REVEAL_START,
        ...(descriptor.pinnedContainer ? { pinnedContainer: descriptor.pinnedContainer } : {})
      };
      if (descriptor.animation === 'scale-y-scrub') {
        // The spine draws downward from its top edge and starts while the
        // walkthrough is still entering the viewport - otherwise the line
        // connecting the step circles is missing while cards are on screen.
        config.scrub = 0.5;
        config.start = 'top 80%';
        config.end = 'bottom bottom';
      } else if (descriptor.animation === 'pixel-in') {
        config.scrub = true;
        config.start = PIXEL_IN.start;
        config.end = PIXEL_IN.end;
      } else {
        config.toggleActions = 'play reverse play reverse';
      }
      return new ScrollTrigger(config);
    });
  }

  /**
   * The page background's parallax: one scrubbed ScrollTrigger from `start`
   * to the end of the page. Its onUpdate sets the viewport-fixed layer's
   * shift from backgroundShift, so the background lags the content and
   * holds still through pinned sections - there the shift stops changing,
   * so nothing has to chase the browser's own scrolling.
   *
   * @param {object} options
   * @param {string} options.selector - the background layer(s).
   * @param {number|string} options.start - ScrollTrigger start, e.g. 0.
   * @param {number} options.rate - offset per px of unpaused scroll (0..1).
   * @param {function(): Array<{start: number, end: number}>} [options.pausedRanges]
   *   - the scroll ranges (pinned sections) to hold the background still
   *   through; read on every update, since pins are measured at refresh.
   * @returns {Array<object>} empty when unavailable or the rate is
   *   degenerate.
   */
  createBackgroundParallaxTrigger({ selector, start, rate, pausedRanges = () => [] }) {
    if (!this._gsapEnv.isAvailable() || !Number.isFinite(rate) || rate <= 0) {
      return [];
    }
    const ScrollTrigger = this._gsapEnv.getScrollTrigger();
    const setStyles = this._gsapEnv.getSetter();
    return [
      new ScrollTrigger({
        start,
        end: 'max',
        scrub: true,
        onUpdate: (self) => setStyles(selector, {
          y: backgroundShift({ scroll: self.scroll(), start: self.start, rate, pauses: pausedRanges() })
        })
      })
    ];
  }

  /**
   * Recalculates trigger positions (mid-scroll resize / orientation change).
   */
  refresh() {
    if (this._gsapEnv.isAvailable()) {
      this._gsapEnv.getScrollTrigger().refresh();
    }
  }

  _buildRevealTween(timeline, descriptor) {
    switch (descriptor.animation) {
      case 'fade-rise':
        timeline.from(descriptor.targets, { opacity: 0, y: 40, stagger: descriptor.stagger, duration: 0.7, ease: 'steps(4)' });
        break;
      case 'slide-left':
        timeline.from(descriptor.targets, { opacity: 0, x: -40, stagger: descriptor.stagger, duration: 0.6, ease: 'steps(4)' });
        break;
      case 'pop':
        timeline.from(descriptor.targets, { opacity: 0, scale: 0.5, stagger: descriptor.stagger, duration: 0.45, ease: 'steps(4)' });
        break;
      case 'pixel-in':
        this._buildPixelIn(timeline, descriptor);
        break;
      case 'scale-y-scrub':
        timeline.from(descriptor.targets, { scaleY: 0, ease: 'none', transformOrigin: '50% 0%' });
        break;
      default:
        break;
    }
    return timeline;
  }

  /**
   * One stepped tween per box, staggered by the box's place in the
   * descriptor. Each box gets its own cell grid for its measured size; the
   * tween's progress picks which cells its clip-path shows, written only
   * when the step changes.
   */
  _buildPixelIn(timeline, descriptor) {
    const setStyles = this._gsapEnv.getSetter();
    this._gsapEnv.getElements(descriptor.targets).forEach((element, index) => {
      const grid = this._dissolve.build({ ...this._gsapEnv.measure(element), cellSize: PIXEL_IN.cellSize });
      const state = { progress: 0 };
      let shownAt = null;
      const render = () => {
        if (state.progress === shownAt) return;
        shownAt = state.progress;
        setStyles(element, { clipPath: pixelDissolveClipPath({ ...grid, progress: state.progress }) });
      };
      render();
      timeline.to(state, {
        progress: 1,
        duration: PIXEL_IN.duration,
        ease: `steps(${PIXEL_IN.steps})`,
        onUpdate: render
      }, index * descriptor.stagger);
    });
  }
}
