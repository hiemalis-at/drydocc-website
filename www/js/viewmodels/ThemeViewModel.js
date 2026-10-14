/**
 * ThemeViewModel - resolves, applies, and persists the light/dark theme.
 *
 * Precedence: a stored 'light' | 'dark' choice wins; anything else
 * (nothing stored, or a garbage value) falls back to the system
 * preference. All side effects (localStorage, matchMedia, the <html>
 * class) live behind the injected themeEnv so this class is pure logic
 * and fully testable. The pre-paint inline script in the view performs
 * the same resolution before Alpine boots; this VM is the authority the
 * toggle runs through afterwards.
 */
const THEMES = Object.freeze(['light', 'dark']);

export class ThemeViewModel {
  /**
   * @param {object} themeEnv - Scoped interface to the theme's browser
   *   dependencies; never the raw globals.
   * @param {function(): (string|null)} themeEnv.readStoredTheme
   * @param {function(string): void} themeEnv.writeStoredTheme
   * @param {function(): boolean} themeEnv.prefersDarkTheme
   * @param {function(boolean): void} themeEnv.applyThemeClass
   */
  constructor(themeEnv) {
    if (!themeEnv || typeof themeEnv.readStoredTheme !== 'function'
      || typeof themeEnv.writeStoredTheme !== 'function'
      || typeof themeEnv.prefersDarkTheme !== 'function'
      || typeof themeEnv.applyThemeClass !== 'function') {
      throw new Error('ThemeViewModel requires a themeEnv instance via constructor injection');
    }
    this._themeEnv = themeEnv;
    this._theme = null;
  }

  /**
   * Resolves the theme the page should start in and applies it.
   * @returns {'light'|'dark'}
   */
  resolveInitialTheme() {
    const stored = this._themeEnv.readStoredTheme();
    if (THEMES.includes(stored)) {
      this._theme = stored;
    } else {
      this._theme = this._themeEnv.prefersDarkTheme() ? 'dark' : 'light';
    }
    this._apply();
    return this._theme;
  }

  /**
   * Flips to the other theme, applies it, and persists the choice.
   * @returns {'light'|'dark'} the new theme.
   */
  toggle() {
    if (!this._theme) {
      this.resolveInitialTheme();
    }
    this._theme = this._theme === 'dark' ? 'light' : 'dark';
    this._apply();
    this._themeEnv.writeStoredTheme(this._theme);
    return this._theme;
  }

  get theme() {
    return this._theme;
  }

  get isDark() {
    return this._theme === 'dark';
  }

  _apply() {
    this._themeEnv.applyThemeClass(this.isDark);
  }
}
