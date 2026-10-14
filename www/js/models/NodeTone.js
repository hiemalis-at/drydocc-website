/**
 * NodeTone - the single tone→presentation map for every node in the fleet.
 *
 * A node's identity shows up in two places on the page: its card in the
 * fleet manifest, and the node chip on each story act that runs against it.
 * Both read their colours from here, so the two views can never drift into
 * describing the same box with different visual language.
 *
 * A plain module (no `new`, no instance state) so it needs no IoC registration
 * and stays trivially testable as a pure function pair.
 */

/**
 * `managed` answers "is this box held to the drydocc baseline?" - unprivileged
 * doccap identity, rootless podman, hardened sshd, tailnet member. It is NOT
 * "is this box part of the story": ha-pi is very much part of the fleet's
 * infrastructure while being permanently exempt from that baseline, and
 * staging-vm reaches the baseline but is thrown away the same afternoon.
 */
export const NODE_TONES = Object.freeze({
  // The one box with a public IP. Nothing is published on it - it is "edge"
  // in the sense of being off-site and always-on, not in the sense of serving
  // the open internet.
  edge: Object.freeze({
    managed: true,
    label: 'Edge · public IP',
    badge: 'bg-teal/15 text-ink border border-teal/60',
    card: 'relative overflow-hidden bg-panel/90 border border-teal/40',
    pixel: 'bg-teal'
  }),

  // A fully-managed node driven from VS Code Remote-SSH on the node itself.
  managed: Object.freeze({
    managed: true,
    label: 'Managed · on_node',
    badge: 'bg-dockblue/15 text-ink border border-dockblue/60',
    card: 'relative overflow-hidden bg-panel/90 border border-dockblue/40',
    pixel: 'bg-dockblue'
  }),

  // Equally managed, but too small to host the VS Code server - every command
  // against it is SSH-wrapped from the admin's laptop (surface: on_client).
  client: Object.freeze({
    managed: true,
    label: 'Managed · on_client',
    badge: 'bg-dockblue/10 text-ink border border-dashed border-dockblue/60',
    card: 'relative overflow-hidden bg-panel/90 border border-dashed border-dockblue/40',
    pixel: 'bg-dockblue/60'
  }),

  // An immutable appliance OS. drydocc can reach it, probe it and journal it,
  // but the baseline cannot be established on it - and it says so out loud.
  appliance: Object.freeze({
    managed: false,
    label: 'Baseline-exempt appliance',
    badge: 'bg-hardhat/15 text-ink border border-dashed border-hardhat/70',
    card: 'relative overflow-hidden bg-panel/90 border border-dashed border-hardhat/50',
    pixel: 'bg-hardhat'
  }),

  // A rehearsal VM on the laptop. Commissioned exactly like a real node, then
  // destroyed - which is the entire point of it.
  ephemeral: Object.freeze({
    managed: false,
    label: 'Ephemeral rehearsal',
    badge: 'bg-ink-soft/10 text-ink border border-dashed border-ink-soft/60',
    card: 'relative overflow-hidden bg-panel/90 border border-dashed border-ink-soft/40',
    pixel: 'bg-ink-soft'
  })
});

/** An unlabelled node is a managed node, never an appliance - fail safe. */
export const DEFAULT_TONE = 'managed';

function resolveTone(tone) {
  return NODE_TONES[tone] || NODE_TONES[DEFAULT_TONE];
}

export function badgeClassForTone(tone) {
  return resolveTone(tone).badge;
}

export function cardClassForTone(tone) {
  return resolveTone(tone).card;
}

/** The colour of the node card's pixel-gradient edge. */
export function pixelClassForTone(tone) {
  return resolveTone(tone).pixel;
}

export function labelForTone(tone) {
  return resolveTone(tone).label;
}

export function isManagedTone(tone) {
  return resolveTone(tone).managed;
}
