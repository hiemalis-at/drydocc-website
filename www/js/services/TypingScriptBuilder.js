/**
 * TypingScriptBuilder - turns a slash command into a keystroke "script":
 * pure data describing every keystroke, backspace and delay of a human-like
 * typing run. No DOM, no GSAP - the animation factory only maps this data
 * onto time.
 *
 * Scripts are consumed strictly sequentially from the injected
 * SeededRandomSource, so a script for step N depends only on the page seed
 * and steps 1..N - never on scroll position or interaction. Replays within
 * a page's life-time are therefore bit-identical.
 */

const BASE_DELAY_MIN = 45;
const BASE_DELAY_MAX = 110;
const JITTER_MIN = 0.6;
const JITTER_MAX = 1.5;
const SPACE_PAUSE_MIN = 60;
const SPACE_PAUSE_MAX = 180;
const AFTER_SLASH_PAUSE_MIN = 120;
const AFTER_SLASH_PAUSE_MAX = 300;
const PUNCTUATION_PAUSE_MIN = 40;
const PUNCTUATION_PAUSE_MAX = 90;
const TYPO_PAUSE_MIN = 150;
const TYPO_PAUSE_MAX = 350;
const CORRECTION_DELAY = 70;
const TYPO_SPACING = 4;
// Total typing time budget per step: long commands get their composed
// rhythm scaled down proportionally so typing never gates reading.
const MAX_TOTAL_DURATION_MS = 2400;
const MIN_EVENT_DELAY_MS = 15;

// Adjacent-key/look-alike map for believable typos - never random garbage,
// never structural characters.
const ADJACENT_KEYS = Object.freeze({
  a: 's', b: 'v', c: 'x', d: 's', e: 'r', f: 'g', g: 'f', h: 'j', i: 'o',
  j: 'k', k: 'j', l: 'k', m: 'n', n: 'm', o: 'p', p: 'o', q: 'w', r: 't',
  s: 'd', t: 'y', u: 'i', v: 'b', w: 'e', x: 'z', y: 'u', z: 'x'
});

function isTypoable(char) {
  return /[a-z0-9]/i.test(char);
}

function wrongCharFor(char) {
  const lower = char.toLowerCase();
  if (/[0-9]/.test(lower)) {
    return String((Number(lower) + 1) % 10);
  }
  const adjacent = ADJACENT_KEYS[lower];
  if (!adjacent) return null;
  return char === char.toUpperCase() ? adjacent.toUpperCase() : adjacent;
}

/**
 * Maps elapsed typing time to the number of script events that have become
 * visible - event k is visible once its cumulative delay (prefix sum) has
 * elapsed. This is what lets the animation factory tween TIME linearly
 * while the scripted rhythm (jitter, word pauses, the typo beat) decides
 * WHEN each keystroke lands on screen.
 *
 * @param {{events: Array, totalEvents: number, totalDuration: number}} script
 * @param {number} elapsedMs
 * @returns {number} visible event count in [0, totalEvents]
 */
export function progressAt(script, elapsedMs) {
  if (!script || !Array.isArray(script.events)) return 0;
  const elapsed = Math.max(0, Math.min(elapsedMs, script.totalDuration));
  let count = 0;
  let cumulative = 0;
  for (const event of script.events) {
    cumulative += event.delayMs;
    if (cumulative <= elapsed) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Replays the first `progress` events of a script and returns the visible
 * string. Progress is clamped to [0, totalEvents], so rewind past the first
 * keystroke renders '' and overshoot renders the whole command.
 *
 * @param {{events: Array, totalEvents: number}} script
 * @param {number} progress
 * @returns {string}
 */
export function replayScript(script, progress) {
  if (!script || !Array.isArray(script.events)) return '';
  const clamped = Math.max(0, Math.min(Math.floor(progress), script.totalEvents));
  let visible = '';
  for (let i = 0; i < clamped; i += 1) {
    const event = script.events[i];
    if (event.type === 'char') {
      visible += event.value;
    } else if (event.type === 'backspace') {
      visible = visible.slice(0, -1);
    }
  }
  return visible;
}

export class TypingScriptBuilder {
  /**
   * @param {object} randomSource - SeededRandomSource instance.
   */
  constructor(randomSource) {
    if (!randomSource || typeof randomSource.next !== 'function') {
      throw new Error('TypingScriptBuilder requires a random source via constructor injection');
    }
    this._random = randomSource;
  }

  /**
   * @param {string} command - the full slash command to type.
   * @returns {{events: Array<{type: string, value: string, delayMs: number}>,
   *            totalEvents: number, totalDuration: number}}
   */
  buildScript(command) {
    if (typeof command !== 'string' || command.length === 0) {
      throw new Error('TypingScriptBuilder.buildScript requires a non-empty command string');
    }
    const script = this._composeScript(command);
    if (replayScript(script, script.totalEvents) !== command) {
      // Validation failed: degrade to instant, never to empty. The delay
      // honors the per-event floor so the timeline always gets a real
      // (fast) duration to tween.
      return {
        events: [{ type: 'char', value: command, delayMs: MIN_EVENT_DELAY_MS }],
        totalEvents: 1,
        totalDuration: MIN_EVENT_DELAY_MS
      };
    }
    return script;
  }

  _composeScript(command) {
    const random = this._random;
    const baseDelay = random.int(BASE_DELAY_MIN, BASE_DELAY_MAX);
    const spaceIndex = command.indexOf(' ');
    const skillTokenEnd = spaceIndex === -1 ? command.length : spaceIndex;

    const typoPositions = this._drawTypoPositions(command, skillTokenEnd);

    const events = [];
    const pushEvent = (event) => {
      events.push(event);
    };

    for (let i = 0; i < command.length; i += 1) {
      const char = command[i];
      const delay = Math.round(
        baseDelay * (JITTER_MIN + random.next() * (JITTER_MAX - JITTER_MIN))
      );
      let pause = 0;
      if (char === ' ') {
        pause += random.int(SPACE_PAUSE_MIN, SPACE_PAUSE_MAX);
        if (i === skillTokenEnd) {
          pause += random.int(AFTER_SLASH_PAUSE_MIN, AFTER_SLASH_PAUSE_MAX);
        }
      } else if (char === '-' || char === '"') {
        pause += random.int(PUNCTUATION_PAUSE_MIN, PUNCTUATION_PAUSE_MAX);
      }

      if (typoPositions.includes(i)) {
        const wrongChar = wrongCharFor(char);
        if (wrongChar && wrongChar !== char) {
          pushEvent({ type: 'char', value: wrongChar, delayMs: delay + pause });
          pushEvent({ type: 'backspace', value: '', delayMs: random.int(TYPO_PAUSE_MIN, TYPO_PAUSE_MAX) });
          pushEvent({ type: 'char', value: char, delayMs: CORRECTION_DELAY });
          continue;
        }
      }
      pushEvent({ type: 'char', value: char, delayMs: delay + pause });
    }

    this._capTotalDuration(events);

    return {
      events,
      totalEvents: events.length,
      totalDuration: events.reduce((sum, event) => sum + event.delayMs, 0)
    };
  }

  /**
   * Scales the composed rhythm down proportionally when a command is long
   * enough to blow the per-step time budget. Relative delays (jitter, word
   * pauses, the typo beat) survive the scaling; only the absolute speed
   * increases.
   */
  _capTotalDuration(events) {
    const total = events.reduce((sum, event) => sum + event.delayMs, 0);
    if (total <= MAX_TOTAL_DURATION_MS) return;

    const totalFor = (factor) => events.reduce(
      (sum, event) => sum + Math.max(Math.round(event.delayMs * factor), MIN_EVENT_DELAY_MS),
      0
    );

    if (totalFor(0) > MAX_TOTAL_DURATION_MS) {
      // Even the floor alone blows the budget: clamp everything to it.
      events.forEach((event) => { event.delayMs = MIN_EVENT_DELAY_MS; });
      return;
    }

    // Bisect the largest scale factor that fits the budget. The scaled total
    // is monotone in the factor, so this converges exactly.
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i += 1) {
      const mid = (low + high) / 2;
      if (totalFor(mid) <= MAX_TOTAL_DURATION_MS) {
        low = mid;
      } else {
        high = mid;
      }
    }
    events.forEach((event) => {
      event.delayMs = Math.max(Math.round(event.delayMs * low), MIN_EVENT_DELAY_MS);
    });
  }

  _drawTypoPositions(command, skillTokenEnd) {
    const random = this._random;
    const roll = random.next();
    let typoCount = 0;
    if (roll < 0.55) typoCount = 1;
    else if (roll < 0.70) typoCount = 2;

    // Typoable positions live in the argument part only - a misspelled
    // skill name would read as a bug, not charm.
    const candidates = [];
    for (let i = skillTokenEnd + 1; i < command.length; i += 1) {
      if (isTypoable(command[i])) candidates.push(i);
    }

    const positions = [];
    let attempts = 0;
    while (positions.length < typoCount && attempts < 50 && candidates.length > 0) {
      attempts += 1;
      const candidate = candidates[random.int(0, candidates.length - 1)];
      const farEnough = positions.every((p) => Math.abs(p - candidate) >= TYPO_SPACING);
      if (farEnough) positions.push(candidate);
    }
    return positions;
  }
}
