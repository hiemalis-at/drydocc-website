import { badgeClassForTone, cardClassForTone, pixelClassForTone, labelForTone, isManagedTone } from './NodeTone.js';

/**
 * FleetNodeModel - one physical (or virtual) box in the example fleet.
 *
 * The topology banner and the timeline both describe the same six boxes, so
 * their identity lives here once: slug, hardware, architecture, role, tailnet
 * address, execution surface, and which other nodes it consumes.
 *
 * Carries HATEOAS links like the other models do; the manifest row in the
 * story intro is the fleet's cast list.
 */
export class FleetNodeModel {
  constructor({
    id,
    slug,
    hardware,
    arch,
    role,
    tailnetIp,
    tone,
    surface,
    consumes = [],
    note,
    links = {}
  }) {
    this.id = id;
    this.slug = slug;
    this.hardware = hardware;
    this.arch = arch;
    this.role = role;
    this.tailnetIp = tailnetIp;
    this.tone = tone;
    this.surface = surface;
    this.consumes = consumes;
    this.note = note;
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

  /** Held to the drydocc baseline (doccap + rootless podman + hardened sshd)? */
  get isManaged() {
    return isManagedTone(this.tone);
  }

  get toneLabel() {
    return labelForTone(this.tone);
  }

  get badgeClass() {
    return badgeClassForTone(this.tone);
  }

  get cardClass() {
    return cardClassForTone(this.tone);
  }

  get pixelClass() {
    return pixelClassForTone(this.tone);
  }

  get hasDependencies() {
    return this.consumes.length > 0;
  }
}
