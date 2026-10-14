import { badgeClassForTone } from './NodeTone.js';

const MAX_EXCERPT_LINES = 6;
// The colour of the crate's pixel-gradient edge on its timeline side.
const EDGE_PIXEL_CLASSES = Object.freeze({
  teal: 'bg-teal',
  dockblue: 'bg-dockblue',
  hardhat: 'bg-hardhat'
});

/**
 * StoryActModel - one act of the six-act dock walkthrough (and the lab
 * beat, told the same way after it).
 *
 * An act is one story beat: a short narrative, a glimpse of the markdown it
 * reads or writes (at most six lines - the old full listings made the story
 * too long), its skill command, the outcome it leaves behind, the
 * node it runs against, its Tux pose (held by reference), and the HATEOAS
 * links into the drydocc repo.
 */
export class StoryActModel {
  /**
   * @param {object} act
   * @param {string} act.id - Anchor id of the act crate.
   * @param {string} act.actNumber - Stamp label, e.g. 'ACT 1'.
   * @param {string} act.title - Silkscreen heading.
   * @param {string} act.subtitle - One-line act summary.
   * @param {string} act.command - The copy&paste-able skill command (required).
   * @param {string} act.nodeSlug - Target node slug for the node badge.
   * @param {string} act.nodeTone - Tone key for the shared NodeTone map.
   * @param {string} [act.edgeTone] - Accent of the crate's timeline-side
   *   pixel edge ('teal' | 'dockblue' | 'hardhat').
   * @param {string} act.narrative - Two or three sentences of story.
   * @param {{file: string, lines: string[]}} act.excerpt - The markdown
   *   glimpse (file name plus at most six lines).
   * @param {string} act.outcome - The one-line result the command leaves.
   * @param {TuxPoseModel} act.pose - The mascot placement for this act (required).
   * @param {object} [act.links] - HATEOAS links ({ rel: { href, title } }).
   */
  constructor({ id, actNumber, title, subtitle, command, nodeSlug, nodeTone, edgeTone = 'teal', narrative, excerpt, outcome, pose, links = {} }) {
    if (!command) {
      throw new Error('StoryActModel requires a non-empty command');
    }
    if (!pose) {
      throw new Error('StoryActModel requires a TuxPoseModel instance via constructor injection');
    }
    if (!excerpt || !excerpt.file || !Array.isArray(excerpt.lines)) {
      throw new Error('StoryActModel excerpts require a file name and a lines array');
    }
    if (excerpt.lines.length > MAX_EXCERPT_LINES) {
      throw new Error(`StoryActModel excerpts are limited to ${MAX_EXCERPT_LINES} lines`);
    }
    this.id = id;
    this.actNumber = actNumber;
    this.title = title;
    this.subtitle = subtitle;
    this.command = command;
    this.nodeSlug = nodeSlug;
    this.nodeTone = nodeTone;
    this.edgeTone = edgeTone;
    this.narrative = narrative;
    this.excerpt = { file: excerpt.file, lines: [...excerpt.lines] };
    this.outcome = outcome;
    this.pose = pose;
    this._links = links;
  }

  getLinks() {
    return { ...this._links };
  }

  getLink(rel) {
    return this._links[rel] || null;
  }

  hasLink(rel) {
    return Boolean(this._links[rel]);
  }

  /**
   * The excerpt's lines with their markdown headings marked, so the view
   * styles them without parsing markdown itself.
   * @returns {Array<{key: number, text: string, isHeading: boolean}>}
   */
  get excerptLines() {
    return this.excerpt.lines.map((text, key) => ({ key, text, isHeading: /^#{1,6}\s/.test(text) }));
  }

  /**
   * Presentation-derived from the shared tone map so the act's node badge
   * and the same node's fleet-manifest chip always agree.
   */
  get nodeBadgeClass() {
    return badgeClassForTone(this.nodeTone);
  }

  /** Unknown tones fall back to teal. */
  get edgePixelClass() {
    return EDGE_PIXEL_CLASSES[this.edgeTone] || EDGE_PIXEL_CLASSES.teal;
  }
}
