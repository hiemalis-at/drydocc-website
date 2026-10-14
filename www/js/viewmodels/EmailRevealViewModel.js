/**
 * EmailRevealViewModel - a contact address that is never in the page.
 *
 * The Impressum names an email address to reach the media owner, but a plain
 * one in the HTML is fodder for address harvesters. The address arrives
 * here as two reversed parts and is only assembled - in the reader's
 * browser, on demand - once they ask for it. Until then the view has
 * nothing to show and nothing to link.
 */
const reverse = (text) => [...text].reverse().join('');

export class EmailRevealViewModel {
  /**
   * @param {{user: string, domain: string}} scrambled - the address's local
   *   part and domain, each reversed.
   */
  constructor(scrambled) {
    if (!scrambled || typeof scrambled.user !== 'string' || typeof scrambled.domain !== 'string') {
      throw new Error('EmailRevealViewModel requires the scrambled address parts via constructor injection');
    }
    this._scrambled = { user: scrambled.user, domain: scrambled.domain };
    this._state = { revealed: false };
    this._reactiveBound = false;
  }

  get revealed() {
    return this._state.revealed;
  }

  /** The assembled address; empty until revealed. */
  get address() {
    if (!this._state.revealed) return '';
    return `${reverse(this._scrambled.user)}@${reverse(this._scrambled.domain)}`;
  }

  /** The mailto link; null until revealed. */
  get href() {
    return this._state.revealed ? `mailto:${this.address}` : null;
  }

  reveal() {
    this._state.revealed = true;
  }

  /**
   * Bridges the revealed flag into an external reactivity system
   * (Alpine.reactive). Idempotent.
   * @param {function(object): object} reactiveFn
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._state = reactiveFn(this._state);
  }
}
