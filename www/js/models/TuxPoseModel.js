/**
 * TuxPoseModel - one placement of the dock worker mascot.
 *
 * Pure animation data: which pose's frame strip plays, at what rate, which
 * side of his callout he stands on (and so which way he faces), and the
 * single in-character line Tux says there. GSAP tweens a proxy number and pushes
 * it into the view model; Alpine renders the frame - this model never
 * touches the DOM.
 */

// Both sprite strips (think, yell) are drawn facing right.
const SPRITE_FACES = 'right';

const CORNER_CLASSES = Object.freeze({
  tl: 'top-0 left-0',
  tr: 'top-0 right-0',
  bl: 'bottom-0 left-0',
  br: 'bottom-0 right-0'
});

export class TuxPoseModel {
  /**
   * @param {object} pose
   * @param {string} pose.id - Stable identifier unique on the page.
   * @param {string} pose.pose - Pose family: 'think' | 'yell'.
   * @param {string[]} pose.frames - Ordered frame image paths (non-empty).
   * @param {number} pose.fps - Frames per second (must be > 0).
   * @param {string} pose.corner - Corner slot: 'tl' | 'tr' | 'bl' | 'br'.
   *   Tux stands on that side; his callout sits on the other side.
   * @param {string} pose.line - The speech bubble line.
   * @param {number} [pose.frameOffset] - Which frame the pose starts on;
   *   wrapped into the frame count so poses in view never look uniform.
   * @param {string|null} [pose.pinnedContainer] - The pinned element the
   *   pose's strip sits inside, so its scroll trigger is measured against it.
   */
  constructor({ id, pose, frames, fps, corner, line, frameOffset = 0, pinnedContainer = null }) {
    if (!Array.isArray(frames) || frames.length === 0) {
      throw new Error('TuxPoseModel requires a non-empty frames array');
    }
    if (!Number.isFinite(fps) || fps <= 0) {
      throw new Error('TuxPoseModel requires a positive fps');
    }
    if (!Object.prototype.hasOwnProperty.call(CORNER_CLASSES, corner)) {
      throw new Error(`TuxPoseModel received an unknown corner slot: ${corner}`);
    }
    this.id = id;
    this.pose = pose;
    this.frames = [...frames];
    this.fps = fps;
    this.corner = corner;
    this.line = line;
    this.frameOffset = ((Math.floor(frameOffset) % frames.length) + frames.length) % frames.length;
    this.pinnedContainer = pinnedContainer;
  }

  get frameCount() {
    return this.frames.length;
  }

  get frameDurationMs() {
    return 1000 / this.fps;
  }

  /** The side of Tux his speech callout sits on. */
  get calloutSide() {
    return this.corner === 'tr' || this.corner === 'br' ? 'left' : 'right';
  }

  /** Whether the sprite is drawn mirrored: exactly when it would face away. */
  get mirrored() {
    return this.calloutSide !== SPRITE_FACES;
  }

  /** Tux always faces his callout: flip the sprite when it points away. */
  get flipClass() {
    return this.mirrored ? '-scale-x-100' : '';
  }

  /** Flex order that puts Tux on his corner's side of the callout. */
  get layoutClass() {
    return this.calloutSide === 'left' ? 'flex-row-reverse justify-end' : '';
  }

  get cornerClass() {
    return CORNER_CLASSES[this.corner];
  }
}

TuxPoseModel.SPRITE_FACES = SPRITE_FACES;
