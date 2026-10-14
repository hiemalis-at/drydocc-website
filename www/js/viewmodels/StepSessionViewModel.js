import { replayScript } from '../services/TypingScriptBuilder.js';

/**
 * StepSessionViewModel - the single source of truth for what each step's
 * command bar shows. GSAP never writes text: the animation factory tweens
 * a plain proxy number and pushes it here as progress; Alpine renders the
 * result through getTypedCommand.
 *
 * Every step starts in `static` mode (full command), so the very first
 * paint - and every fallback path - shows the honest static page. Only
 * beginAnimation(), called once the animation system is confirmed
 * available, flips a step to `animated` mode.
 */
export class StepSessionViewModel {
  /**
   * @param {Array<{id: string, command: string}>} features
   * @param {object} scriptBuilder - TypingScriptBuilder instance.
   */
  constructor(features, scriptBuilder) {
    if (!Array.isArray(features)) {
      throw new Error('StepSessionViewModel requires a features array via constructor injection');
    }
    if (!scriptBuilder || typeof scriptBuilder.buildScript !== 'function') {
      throw new Error('StepSessionViewModel requires a script builder via constructor injection');
    }
    this._scriptBuilder = scriptBuilder;
    this._commands = new Map();
    this._steps = new Map();
    this._featureIds = [];
    this._reactiveBound = false;
    // Scripts are built once, here, in fixed features order - consuming the
    // random stream sequentially so replays are stable for the page's
    // whole life-time.
    features.forEach((feature) => {
      this._commands.set(feature.id, feature.command);
      this._featureIds.push(feature.id);
      this._steps.set(feature.id, {
        mode: 'static',
        progress: 0,
        script: scriptBuilder.buildScript(feature.command)
      });
    });
  }

  /**
   * @returns {Array<string>} feature ids in construction order.
   */
  get featureIds() {
    return [...this._featureIds];
  }

  /**
   * @param {string} featureId
   * @returns {object|null} the immutable script for the step.
   */
  getScript(featureId) {
    const step = this._steps.get(featureId);
    return step ? step.script : null;
  }

  /**
   * @param {string} featureId
   * @returns {string} the currently visible command text ('' for unknown ids).
   */
  getTypedCommand(featureId) {
    const step = this._steps.get(featureId);
    if (!step) return '';
    if (step.mode === 'static') return this._commands.get(featureId);
    return replayScript(step.script, step.progress);
  }

  /**
   * Flips the step to animated mode with progress 0 (empty command bar).
   * Only called by the animation factory once GSAP is confirmed available.
   * Idempotent.
   * @param {string} featureId
   */
  beginAnimation(featureId) {
    const step = this._steps.get(featureId);
    if (!step) return;
    step.mode = 'animated';
    step.progress = 0;
  }

  /**
   * @param {string} featureId
   * @param {number} progress - fractional event index from the typing tween.
   */
  applyProgress(featureId, progress) {
    const step = this._steps.get(featureId);
    if (!step) return;
    step.progress = progress;
  }

  /**
   * Bridges the internal state maps into an external reactivity system
   * (Alpine.reactive). Without this, Alpine's x-text effects cannot see
   * GSAP-driven progress writes: the effect tracks only what it reads, and
   * the animation path mutates the VM directly. Wrapping the maps makes
   * every mode/progress write re-run the effects that render it.
   *
   * Idempotent: a second call is a no-op, so a re-registered Alpine never
   * double-wraps the maps.
   *
   * @param {function(object): object} reactiveFn - e.g. Alpine.reactive
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._steps = reactiveFn(this._steps);
    this._commands = reactiveFn(this._commands);
  }

  /**
   * Restores the fully static view for every step (reduced motion, failed
   * CDN load, or any other no-animation path).
   */
  revealAllStatic() {
    this._steps.forEach((step) => {
      step.mode = 'static';
      step.progress = 0;
    });
  }
}
