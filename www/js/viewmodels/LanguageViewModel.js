/**
 * LanguageViewModel - which language the legal pages show.
 *
 * Both languages are in the markup; this VM only decides which one is
 * visible. It starts in the reader's first preferred language the page
 * supports (else the first supported one), and keeps <html lang> in step
 * through the injected env. Nothing is stored: the choice lasts the visit.
 */
export class LanguageViewModel {
  /**
   * @param {{preferredLanguages: function(): string[], applyLanguage: function(string): void}} env
   * @param {string[]} supported - language codes, the fallback first.
   */
  constructor(env, supported) {
    if (!env || typeof env.preferredLanguages !== 'function' || typeof env.applyLanguage !== 'function') {
      throw new Error('LanguageViewModel requires a language env via constructor injection');
    }
    if (!Array.isArray(supported) || supported.length === 0) {
      throw new Error('LanguageViewModel requires supported languages via constructor injection');
    }
    this._env = env;
    this._supported = [...supported];
    this._state = { current: this._initial() };
    this._reactiveBound = false;
    this._env.applyLanguage(this._state.current);
  }

  get current() {
    return this._state.current;
  }

  get languages() {
    return [...this._supported];
  }

  is(language) {
    return this._state.current === language;
  }

  select(language) {
    if (!this._supported.includes(language)) return;
    this._state.current = language;
    this._env.applyLanguage(language);
  }

  _initial() {
    const preferred = (this._env.preferredLanguages() || [])
      .map((tag) => String(tag).toLowerCase().split('-')[0])
      .find((code) => this._supported.includes(code));
    return preferred || this._supported[0];
  }

  /**
   * Bridges the current language into an external reactivity system
   * (Alpine.reactive). Idempotent.
   * @param {function(object): object} reactiveFn
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._state = reactiveFn(this._state);
  }
}
