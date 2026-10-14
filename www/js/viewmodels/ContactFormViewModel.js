/**
 * ContactFormViewModel - the Impressum's contact form, sent to Formspree.
 *
 * The form posts its fields as JSON to the endpoint it is handed as a
 * HATEOAS link, through an injected client - no form library, no page
 * reload, no reCAPTCHA. `_gotcha` is Formspree's honeypot: hidden from
 * people, filled by bots, silently dropped by Formspree.
 *
 * Status: 'idle' → 'sending' → 'sent' | 'error', or 'invalid' when a
 * required field is empty and nothing is sent.
 */
const REQUIRED = Object.freeze(['email', 'message']);
const MISSING = 'Please fill this in.';
const FAILED = 'Sending failed. Please try again later, or write an email instead.';

const emptyFields = () => ({ email: '', message: '', _gotcha: '' });

export class ContactFormViewModel {
  /**
   * @param {{postJson: function(string, object): Promise<{ok: boolean, data?: object}>}} client
   * @param {{rel: string, href: string}} contactLink - where the form posts.
   */
  constructor(client, contactLink) {
    if (!client || typeof client.postJson !== 'function') {
      throw new Error('ContactFormViewModel requires a client via constructor injection');
    }
    if (!contactLink || !contactLink.href) {
      throw new Error('ContactFormViewModel requires the contact link via constructor injection');
    }
    this._client = client;
    this._link = { ...contactLink };
    this._state = { status: 'idle', fields: emptyFields(), errors: {}, formError: '' };
    this._reactiveBound = false;
  }

  /** The form's fields; the view binds its inputs to these. */
  get fields() {
    return this._state.fields;
  }

  get status() {
    return this._state.status;
  }

  get isSending() {
    return this._state.status === 'sending';
  }

  get formError() {
    return this._state.formError;
  }

  /** @returns {string} the field's error message, or '' */
  errorFor(field) {
    return this._state.errors[field] || '';
  }

  getLink() {
    return { ...this._link };
  }

  async submit() {
    if (this.isSending) return;
    const missing = REQUIRED.filter((field) => !String(this._state.fields[field]).trim());
    if (missing.length > 0) {
      this._state.errors = Object.fromEntries(missing.map((field) => [field, MISSING]));
      this._state.formError = '';
      this._state.status = 'invalid';
      return;
    }

    this._state.status = 'sending';
    this._state.errors = {};
    this._state.formError = '';
    try {
      const response = await this._client.postJson(this._link.href, { ...this._state.fields });
      if (response && response.ok) {
        this._state.fields = emptyFields();
        this._state.status = 'sent';
        return;
      }
      this._applyErrors((response && response.data && response.data.errors) || []);
    } catch (error) {
      this._applyErrors([]);
    }
  }

  // Field errors go next to their field; the rest (or a generic note) to
  // the form as a whole.
  _applyErrors(errors) {
    const fieldErrors = {};
    const general = [];
    errors.forEach((error) => {
      if (error && error.field) {
        fieldErrors[error.field] = error.message;
      } else if (error && error.message) {
        general.push(error.message);
      }
    });
    this._state.errors = fieldErrors;
    this._state.formError = general.join(' ') || (Object.keys(fieldErrors).length > 0 ? '' : FAILED);
    this._state.status = 'error';
  }

  /**
   * Bridges the form state into an external reactivity system
   * (Alpine.reactive), so x-model and the status text track it.
   * Idempotent.
   * @param {function(object): object} reactiveFn
   */
  bindReactivity(reactiveFn) {
    if (this._reactiveBound || typeof reactiveFn !== 'function') return;
    this._reactiveBound = true;
    this._state = reactiveFn(this._state);
  }
}
