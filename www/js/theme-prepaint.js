/*
 * Pre-paint theme resolution: the stored choice wins, then the system
 * preference. A classic, blocking script in <head>, so the first paint is
 * already in the right mode - no flash of the wrong theme. Mirrors the
 * ThemeViewModel's precedence rule.
 */
(function () {
  try {
    var stored = window.localStorage.getItem('drydocc-theme');
    var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (error) {
    /* storage refused - fall through to light */
  }
})();
