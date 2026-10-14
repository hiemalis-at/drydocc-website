import { FleetNodeModel } from './models/FleetNodeModel.js';
import { StackBadgeModel } from './models/StackBadgeModel.js';
import { TuxPoseModel } from './models/TuxPoseModel.js';
import { StoryActModel } from './models/StoryActModel.js';
import { PresentationViewModel } from './viewmodels/PresentationViewModel.js';
import { ScrollRevealViewModel } from './viewmodels/ScrollRevealViewModel.js';
import { ThemeViewModel } from './viewmodels/ThemeViewModel.js';
import { ScrollTriggerFactory } from './services/ScrollTriggerFactory.js';
import { SeededRandomSource } from './services/SeededRandomSource.js';
import { TypingScriptBuilder } from './services/TypingScriptBuilder.js';
import { StepSessionViewModel } from './viewmodels/StepSessionViewModel.js';
import { StepAnimationFactory } from './services/StepAnimationFactory.js';
import { PixelGradientBuilder } from './services/PixelGradientBuilder.js';
import { HeroViewModel } from './viewmodels/HeroViewModel.js';
import { BadgeDockViewModel } from './viewmodels/BadgeDockViewModel.js';
import { HeroAnimationFactory } from './services/HeroAnimationFactory.js';
import { PixelEdgeBuilder } from './services/PixelEdgeBuilder.js';
import { PixelEdgeCatalog } from './viewmodels/PixelEdgeCatalog.js';
import { PixelDissolveBuilder } from './services/PixelDissolveBuilder.js';
import { PixelSpinAnimator } from './services/PixelSpinAnimator.js';
import { SceneScrollService } from './services/SceneScrollService.js';
import { DockBackgroundViewModel } from './viewmodels/DockBackgroundViewModel.js';
import { LegalPageViewModel } from './viewmodels/LegalPageViewModel.js';
import { LanguageViewModel } from './viewmodels/LanguageViewModel.js';
import { EmailRevealViewModel } from './viewmodels/EmailRevealViewModel.js';
import { ContactFormViewModel } from './viewmodels/ContactFormViewModel.js';

const REPO_BLOB_BASE = 'https://github.com/hiemalis-at/drydocc/blob/main';
const SKILL_DOCS_BASE = `${REPO_BLOB_BASE}/skills`;

/** HATEOAS docs link of one skill in the drydocc repo. */
const skillDocsLink = (skill) => ({
  href: `${SKILL_DOCS_BASE}/${skill}/SKILL.md`,
  title: `/${skill} in the repo`
});

// Doccap's two sprite strips, shared by every page.
const THINK_FRAMES = Object.freeze(Array.from({ length: 7 }, (_, i) => `img/tux-dock-worker-frames/think-0${i + 1}.png`));
const YELL_FRAMES = Object.freeze(Array.from({ length: 8 }, (_, i) => `img/tux-dock-worker-frames/yell-0${i + 1}.png`));
const thinkPose = (id, { fps = 6, corner, line, frameOffset = 0, pinnedContainer = null } = {}) =>
  new TuxPoseModel({ id, pose: 'think', frames: [...THINK_FRAMES], fps, corner, line, frameOffset, pinnedContainer });
const yellPose = (id, { fps = 8, corner, line, frameOffset = 0 } = {}) =>
  new TuxPoseModel({ id, pose: 'yell', frames: [...YELL_FRAMES], fps, corner, line, frameOffset });

/**
 * The theme env: the windowEnv methods a container may touch, narrowed to
 * exactly what ThemeViewModel needs.
 */
function themeEnvFrom(windowEnv) {
  return {
    readStoredTheme: () => windowEnv.readStoredTheme(),
    writeStoredTheme: (theme) => windowEnv.writeStoredTheme(theme),
    prefersDarkTheme: () => windowEnv.prefersDarkTheme(),
    applyThemeClass: (isDark) => windowEnv.getDocumentElement().classList.toggle('dark', isDark)
  };
}

/**
 * Registers an Alpine component at the right moment: right away (and then
 * initializes the tree itself) when Alpine already runs, else on
 * alpine:init, whose Alpine.start() initializes the tree - doing it here as
 * well would bind every handler twice on older Alpine.
 */
function registerAlpineComponent(windowEnv, register) {
  if (windowEnv.hasAlpine()) {
    register();
    const Alpine = windowEnv.getAlpine();
    if (typeof Alpine.initTree === 'function') {
      Alpine.initTree(windowEnv.getBody());
    }
  } else {
    windowEnv.onAlpineInit(register);
  }
}

// The page background's parallax: from the top of the page it moves up at
// 65% of the content's speed, a lag you can see, except while the hero or
// the badge band is pinned, when it holds still.
const BACKGROUND_PARALLAX_RATE = 0.35;
// The dock background's tiles: the image (1536x2752) at full width, then a
// half-viewport gap of page color before the next, mirrored, tile.
const DOCK_BACKGROUND = Object.freeze({ aspect: 2752 / 1536, gapFraction: 0.5 });

// The hero's pixel wipe grid, laid over the framed logo. Wide screens: the
// frame has the logo's 16:9 aspect and the wipe grows in from the right
// over half of it (square cells). Portrait phones: half the width is too
// narrow for the pitch, so it grows up from the bottom of the taller frame
// instead, over 60% so the pitch clears the dithered edge. Same breakpoint
// as Tailwind's `md`.
const NARROW_VIEWPORT_MAX = 768;
const WIDE_WIPE = Object.freeze({ columns: 32, rows: 18, coverage: 0.5, direction: 'right' });
const NARROW_WIPE = Object.freeze({ columns: 12, rows: 24, coverage: 0.6, direction: 'bottom' });
// Decorrelates the wipe's dither stream from the typing rhythm stream.
const WIPE_SEED_SALT = 0x9E3779B9;

// The boxes' pixel-gradient tone edges (see PixelEdgeBuilder): node cards
// along their left side, badges and closing feature cards along the top.
// Lengths cover the longest box; each box clips the rest.
const EDGE_SEED_SALT = 0x85EBCA6B;
// Decorrelates the story boxes' pixel-in order from the other streams.
const DISSOLVE_SEED_SALT = 0xC2B2AE35;
// Decorrelates the loose pixels' spin rhythm from the other streams.
const SPIN_SEED_SALT = 0x27D4EB2F;
const NODE_EDGE = Object.freeze({ orientation: 'left', length: 40, depth: 4, pixel: 5 });
const BADGE_EDGE = Object.freeze({ orientation: 'top', length: 28, depth: 3, pixel: 4 });
const FEATURE_EDGE = Object.freeze({ orientation: 'top', length: 64, depth: 4, pixel: 5 });
const FEATURE_KEYS = Object.freeze(['declarations', 'skills', 'agents']);
// The install tiles below the closing cards, edged along their bottom; in
// the cards' order, so each tile sits under the card it continues.
const DOOR_EDGE = Object.freeze({ orientation: 'bottom', length: 64, depth: 4, pixel: 5 });
const DOOR_KEYS = Object.freeze(['engineers', 'skills-only', 'works-in']);
// The act crates' edges run down their timeline side; long enough for the
// tallest crate on a phone.
const ACT_EDGE = Object.freeze({ orientation: 'left', length: 200, depth: 4, pixel: 5 });
// The lab's own wide box is edged along its top, across the full content
// width (72rem = 230 pixels of 5px).
const LAB_EDGE = Object.freeze({ orientation: 'top', length: 232, depth: 4, pixel: 5 });
// Each act crate's edge colour, in act order: neighbours always differ.
const ACT_EDGE_TONES = Object.freeze(['teal', 'dockblue', 'hardhat', 'teal', 'dockblue', 'hardhat']);

/**
 * The paste-able agent quickstart door from the drydocc README. Displayed
 * in the hero crate and copied by its button from this one source.
 */
const QUICKSTART_PROMPT = 'Set up drydocc for me. Read AGENTS.md and FORKING.md in https://github.com/hiemalis-at/drydocc, help me create my private fork of it, then walk me through bootstrapping my first node.';

/**
 * IoC Container for the drydocc website.
 * Single source of truth for object graph wiring per AGENTS.md rules.
 */
export class IoCContainer {
  /**
   * @param {object} windowEnv - Interface scoped to exactly what this class
   *   needs from the browser globals (Alpine, document, navigator, storage,
   *   matchMedia). Never pass the raw `window`/`document`/`navigator`
   *   objects themselves.
   * @param {object} gsapEnv - Scoped interface to the animation library
   *   globals; defaults to an env that reports unavailable.
   * @param {number} [seed] - Seed for the per-load animation randomness.
   *   Drawn once at bootstrap when omitted; tests inject a fixed seed.
   */
  constructor(windowEnv, gsapEnv = createUnavailableGsapEnv(), seed = (Math.random() * 2 ** 32) >>> 0) {
    if (!windowEnv) {
      throw new Error('IoCContainer requires a windowEnv instance via constructor injection');
    }
    if (!gsapEnv) {
      throw new Error('IoCContainer requires a gsapEnv instance via constructor injection');
    }
    this.windowEnv = windowEnv;
    this.gsapEnv = gsapEnv;
    this.themeViewModel = new ThemeViewModel(this.buildThemeEnv(windowEnv));
    this.tuxPoses = this.buildTuxPoseCollection();
    this.badges = this.buildStackBadgeCollection();
    this.installChannels = this.buildInstallChannelCollection();
    this.storyActs = this.buildStoryActCollection(this.tuxPoses);
    this.lab = this.buildLab(this.tuxPoses);
    this.fleetNodes = this.buildFleetNodeCollection();
    this.viewModel = new PresentationViewModel({
      themeViewModel: this.themeViewModel,
      storyActs: this.storyActs,
      stackBadges: this.badges,
      tuxPoses: this.tuxPoses,
      fleetNodes: this.fleetNodes,
      lab: this.lab,
      installChannels: this.installChannels
    });
    // The lab is told outside the acts, but its crate behaves like one:
    // it pixels in on its own row and types its command.
    this.beats = [...this.storyActs, this.lab];
    this.revealViewModel = new ScrollRevealViewModel(this.beats);
    this.dissolveRandomSource = new SeededRandomSource((seed ^ DISSOLVE_SEED_SALT) >>> 0);
    this.dissolveBuilder = new PixelDissolveBuilder(this.dissolveRandomSource);
    this.triggerFactory = new ScrollTriggerFactory(gsapEnv, this.dissolveBuilder);
    this.randomSource = new SeededRandomSource(seed);
    this.scriptBuilder = new TypingScriptBuilder(this.randomSource);
    // The acts (and the lab) play the old steps' role: one typed command
    // per crate.
    this.stepSession = new StepSessionViewModel(this.beats, this.scriptBuilder);
    this.stepFactory = new StepAnimationFactory(gsapEnv, this.stepSession, this.viewModel);
    const wipe = windowEnv.getViewportWidth() < NARROW_VIEWPORT_MAX ? NARROW_WIPE : WIDE_WIPE;
    this.wipeRandomSource = new SeededRandomSource((seed ^ WIPE_SEED_SALT) >>> 0);
    this.gradientBuilder = new PixelGradientBuilder(this.wipeRandomSource);
    this.heroViewModel = new HeroViewModel({ ...wipe, cells: this.gradientBuilder.build(wipe) });
    this.badgeDockViewModel = new BadgeDockViewModel(this.badges);
    this.heroFactory = new HeroAnimationFactory(gsapEnv, this.heroViewModel, this.badgeDockViewModel);
    this.edgeRandomSource = new SeededRandomSource((seed ^ EDGE_SEED_SALT) >>> 0);
    this.edgeBuilder = new PixelEdgeBuilder(this.edgeRandomSource);
    this.pixelEdges = new PixelEdgeCatalog(this.buildPixelEdges());
    this.spinRandomSource = new SeededRandomSource((seed ^ SPIN_SEED_SALT) >>> 0);
    this.pixelSpinAnimator = new PixelSpinAnimator(gsapEnv, this.spinRandomSource);
    this.sceneScroll = new SceneScrollService({ scrollToY: (top) => windowEnv.scrollToY(top) });
    this.dockBackgroundViewModel = new DockBackgroundViewModel(DOCK_BACKGROUND);
    // Animations start once the page is fully loaded (fonts/layout settled),
    // so ScrollTrigger measures the real geometry.
    gsapEnv.onReady(() => this.initAnimations());
  }

  /**
   * Binds the page's animations: the pinned hero wipe and badge band, the
   * reveal polish, the background parallax, the per-act command typing,
   * the scroll-scrubbed Tux frame strips, and the loose pixels' endless
   * spin. No-ops entirely when the
   * animation library is unavailable or the user prefers reduced motion -
   * the static page shows every scene's finished state instead.
   */
  initAnimations() {
    const gsapEnv = this.gsapEnv;
    if (!gsapEnv.isAvailable() || gsapEnv.prefersReducedMotion()) {
      this.revealAllStatic();
      return;
    }
    // Pins first: ScrollTrigger measures later triggers against the
    // spacing the pins add.
    [this.heroPinTrigger] = this.heroFactory.createHeroPin();
    [this.badgeStackTrigger] = this.heroFactory.createBadgeStack();
    // In-page links to the pinned scenes: back to top lands where the logo
    // text is revealed, down to the dock where the badges begin to stack.
    this.sceneScroll.setScene('hero', () => this.heroPinTrigger && this.heroPinTrigger.end);
    this.sceneScroll.setScene('dock', () => this.badgeStackTrigger && this.badgeStackTrigger.start);
    this.triggerFactory.createRevealTriggers(this.revealViewModel.buildDescriptors());
    // The background holds still while the hero wipes in and while the
    // badges stack; the pins' scroll ranges are measured at refresh time.
    this.triggerFactory.createBackgroundParallaxTrigger({
      selector: '[data-dock-parallax]',
      start: 0,
      rate: BACKGROUND_PARALLAX_RATE,
      pausedRanges: () => [this.heroPinTrigger, this.badgeStackTrigger]
        .filter(Boolean)
        .map((pin) => ({ start: pin.start, end: pin.end }))
    });
    // The parallax moves the background up by less than the page scrolls,
    // so tiles down to the page's height always cover it; refit whenever
    // the layout is remeasured (resize, pins re-spaced).
    const fitDockBackground = () => this.dockBackgroundViewModel.fit({
      viewportWidth: this.windowEnv.getViewportWidth(),
      viewportHeight: this.windowEnv.getViewportHeight(),
      coverHeight: this.windowEnv.getDocumentHeight()
    });
    fitDockBackground();
    gsapEnv.onRefresh(fitDockBackground);
    this.pixelSpinAnimator.start(this.pixelEdges.spinVariants);
    this.stepFactory.createStepTriggers();
    this.stepFactory.createTuxScrollTriggers();
  }

  revealAllStatic() {
    this.stepSession.revealAllStatic();
    this.heroViewModel.revealAllStatic();
    this.badgeDockViewModel.revealAllStatic();
  }

  /**
   * Registers the drydoccApp Alpine component. All state and actions
   * delegate to the view models; the data object holds no logic of its own.
   */
  initAlpine() {
    const windowEnv = this.windowEnv;
    const viewModel = this.viewModel;
    const stepSession = this.stepSession;
    const hero = this.heroViewModel;
    const dock = this.badgeDockViewModel;
    const pixelEdges = this.pixelEdges;
    const sceneScroll = this.sceneScroll;
    const dockBackground = this.dockBackgroundViewModel;

    const register = () => {
      const Alpine = windowEnv.getAlpine();
      // GSAP writes animation state (typing progress, Tux frames) outside
      // Alpine's tracking; both VMs' state maps must be wrapped reactive
      // before the component renders, or their x-text / :class effects
      // never re-run.
      this.stepSession.bindReactivity(Alpine.reactive);
      this.viewModel.bindReactivity(Alpine.reactive);
      this.heroViewModel.bindReactivity(Alpine.reactive);
      this.badgeDockViewModel.bindReactivity(Alpine.reactive);
      this.dockBackgroundViewModel.bindReactivity(Alpine.reactive);
      Alpine.data('drydoccApp', () => ({
        // Resolving here (at Alpine init) applies the pre-paint script's
        // decision through the ThemeViewModel and gives Alpine its state.
        theme: viewModel.theme.resolveInitialTheme(),

        acts: viewModel.acts,
        badges: viewModel.badges,
        tuxPoses: viewModel.tuxPoses,
        fleetNodes: viewModel.fleetNodes,
        lab: viewModel.lab,
        installChannels: viewModel.installChannels,

        // The repo to fork, found through the badges' HATEOAS links.
        repoHref: viewModel.getBadgeLink('github').href,

        // The hero's pixel wipe: static geometry, scroll-driven lighting.
        heroCells: hero.cells,
        heroGridClass: hero.gridClass,
        heroPitchPlacement: hero.pitchPlacementClass,

        // The badge band: arrival order and the docked counter.
        dockBadges: dock.badges,
        dockTotal: dock.total,

        // The endless dock background: the gap before each repeat tile.
        dockGapClass: dockBackground.gapClass,

        // The paste-able agent quickstart prompt: one string, shown and
        // copied from the same place so the two can never drift.
        quickstartPrompt: QUICKSTART_PROMPT,

        copyNotification: false,

        toggleTheme() {
          this.theme = viewModel.theme.toggle();
        },

        heroCellClass(cell) {
          return hero.cellClass(cell);
        },

        isPitchVisible() {
          return hero.pitchVisible;
        },

        isScrollHintVisible() {
          return hero.indicatorVisible;
        },

        dockedCount() {
          return dock.stackedCount;
        },

        dockRepeats() {
          return dockBackground.repeats;
        },

        // A box's pixel-gradient tone edge, by 'node:<id>' / 'badge:<id>'
        // / 'feature:<key>' / 'door:<key>' / 'act:<id>' / 'lab'.
        pixelEdge(key) {
          return pixelEdges.edgeFor(key);
        },

        getTuxFrame(poseId) {
          return viewModel.getTuxFrame(poseId);
        },

        setTuxFrame(poseId, frame) {
          viewModel.setTuxFrame(poseId, frame);
        },

        // The command bar's visible text: the typed substring while the
        // act's animation plays, the full command in every static mode.
        getTypedCommand(actId) {
          return stepSession.getTypedCommand(actId);
        },

        getResourceLinks(actId) {
          return viewModel.getResourceLinksForAct(actId);
        },

        // Links to the pinned scenes; the plain anchor when not animated.
        goToScene(event, name) {
          if (sceneScroll.scrollTo(name)) {
            event.preventDefault();
          }
        },

        copyCommand(text) {
          if (windowEnv.hasClipboard()) {
            windowEnv.writeToClipboard(text);
            this.copyNotification = true;
            setTimeout(() => { this.copyNotification = false; }, 2000);
          }
        }
      }));
    };

    registerAlpineComponent(windowEnv, register);
  }

  /**
   * One pixel-gradient edge per stroked box, keyed the way the view asks
   * for them.
   */
  buildPixelEdges() {
    const edges = {};
    this.fleetNodes.forEach((node) => { edges[`node:${node.id}`] = this.edgeBuilder.build(NODE_EDGE); });
    this.badges.forEach((badge) => { edges[`badge:${badge.id}`] = this.edgeBuilder.build(BADGE_EDGE); });
    FEATURE_KEYS.forEach((key) => { edges[`feature:${key}`] = this.edgeBuilder.build(FEATURE_EDGE); });
    DOOR_KEYS.forEach((key) => { edges[`door:${key}`] = this.edgeBuilder.build(DOOR_EDGE); });
    this.storyActs.forEach((act) => { edges[`act:${act.id}`] = this.edgeBuilder.build(ACT_EDGE); });
    edges.lab = this.edgeBuilder.build(LAB_EDGE);
    return edges;
  }

  /**
   * The theme env: the windowEnv methods this class may touch, narrowed to
   * exactly what ThemeViewModel needs.
   */
  buildThemeEnv(windowEnv) {
    return themeEnvFrom(windowEnv);
  }

  /**
   * The dock badges: what drydocc pulls into the reader's setup, required
   * first, then what only an optional feature brings - each with its
   * correct link target and what it is for.
   */
  buildStackBadgeCollection() {
    return [
      new StackBadgeModel({ id: 'github', name: 'GitHub', href: 'https://github.com/hiemalis-at/drydocc', mark: 'github', tone: 'dockblue', purpose: 'hosts your private fork' }),
      new StackBadgeModel({ id: 'systemd', name: 'systemd', href: 'https://systemd.io', mark: 'systemd', tone: 'teal', purpose: 'runs every service' }),
      new StackBadgeModel({ id: 'podman', name: 'Podman', href: 'https://podman.io', mark: 'podman', tone: 'dockblue', purpose: 'rootless containers' }),
      new StackBadgeModel({ id: 'tailscale', name: 'Tailscale', href: 'https://tailscale.com', mark: 'tailscale', tone: 'teal', purpose: 'the only way in' }),
      new StackBadgeModel({ id: 'keepassxc', name: 'KeePassXC', href: 'https://keepassxc.org', mark: 'keepassxc', tone: 'hardhat', purpose: 'secrets, kept out of git', optional: true }),
      new StackBadgeModel({ id: 'ntfy', name: 'ntfy', href: 'https://ntfy.sh', mark: 'ntfy', tone: 'teal', purpose: 'push alerts', optional: true }),
      new StackBadgeModel({ id: 'rsync', name: 'rsync / S3', href: 'https://rsync.samba.org', mark: 'rsync', tone: 'dockblue', purpose: 'backup target', optional: true }),
      new StackBadgeModel({ id: 'qemu', name: 'QEMU', href: 'https://www.qemu.org', mark: 'qemu', tone: 'hardhat', purpose: 'lab VMs, aarch64 emulation', optional: true })
    ];
  }

  /**
   * The skill registries: ways to install the skills alone, offered in the
   * closing install row - not dependencies, so never in the band.
   */
  buildInstallChannelCollection() {
    return [
      new StackBadgeModel({ id: 'skillssh', name: 'skills.sh', href: 'https://skills.sh', mark: 'skillssh', tone: 'hardhat' }),
      new StackBadgeModel({ id: 'agentskillsh', name: 'agentskill.sh', href: 'https://agentskill.sh', mark: 'agentskillsh', tone: 'hardhat' })
    ];
  }

  /**
   * The mascot placements: Doccap, the drydocc captain (drawn as a penguin
   * dock worker), in a different pose in a different corner of every
   * crate, with one in-character line each about what happens to the
   * infrastructure there. Corners rotate so the whole page is covered.
   * The sprites are drawn facing right; TuxPoseModel derives the facing from
   * the corner and mirrors a pose exactly when its box (the callout, and
   * behind it the crate) is on its left - the tr/br slots - so every
   * sprite, yell or think, faces the box it talks to.
   */
  buildTuxPoseCollection() {
    const think = thinkPose;
    const yell = yellPose;

    return [
      yell('hero-tux', {
        frameOffset: 0,
        corner: 'tr',
        line: "Ahoy, I'm Doccap - the drydocc captain, and the user your containers run as. No root required. Paste the prompt into your agent and we'll set up your private fork together."
      }),
      think('dock-tux', {
        frameOffset: 2,
        corner: 'bl',
        // Stands below the band, inside the pinned harbor.
        pinnedContainer: '#harbor',
        line: "That's the whole parts list. Podman runs your containers rootless under systemd - no daemon you didn't ask for. Tailscale is the only way in, and your fork keeps the plans."
      }),
      think('story-tux', {
        frameOffset: 4,
        corner: 'tl',
        line: "x86_64, aarch64, armv7l - I don't care what it is. If it boots Linux and runs systemd, it's welcome on my dock."
      }),
      yell('act-1-tux', {
        frameOffset: 1,
        corner: 'br',
        line: 'Fresh box, root password still warm. I lock SSH to keys, join the tailnet and clone your fork. Pull the plug mid-run? I pick up where I left off.'
      }),
      think('act-2-tux', {
        frameOffset: 3,
        corner: 'tl',
        line: 'Tell me what you want in plain words. I write the use-case, render rootless quadlets and commit the declaration with its journal entry. Pinned image tags only - :latest is for the brave.'
      }),
      think('act-3-tux', {
        frameOffset: 5,
        corner: 'tr',
        line: "600 days of uptime? Respect. I write down what this Pi already runs and harden only what you approve. If it ain't broke, I don't reinstall it."
      }),
      think('act-4-tux', {
        frameOffset: 1,
        corner: 'bl',
        line: "Hand-edited a config at 2 a.m.? Been there. I compare the markdown with the live box and tell you which one changed - the box or the repo. Read-only; I don't touch a thing."
      }),
      yell('act-5-tux', {
        frameOffset: 6,
        corner: 'br',
        line: 'RAID is not a backup - and neither is one you never restored. Every night I copy the volumes to the NAS, then restore a test copy to prove it works.'
      }),
      yell('act-6-tux', {
        frameOffset: 3,
        corner: 'tl',
        line: "Have you tried turning it off and on again? ...Okay, it's really dead. Fresh install, one command: I rebuild it from your markdown and restore the data from the NAS."
      }),
      think('lab-tux', {
        frameOffset: 6,
        corner: 'tl',
        line: 'Measure twice, flash once. I try it on a throwaway VM first - even an emulated aarch64 Pi on your x86 laptop. Break it all you like; nothing leaves the lab until the runbook replays clean.'
      })
    ];
  }

  /**
   * The six-act walkthrough across the example setup: one story beat per
   * act (narrative, markdown glimpse, the skill's command, outcome), each
   * linking to its skill doc in the repo (HATEOAS - the view never
   * hardcodes URLs).
   */
  buildStoryActCollection(tuxPoses) {
    const pose = (id) => tuxPoses.find((tux) => tux.id === id);
    const docs = (skill) => skillDocsLink(skill);

    return [
      new StoryActModel({
        id: 'act-1-get-boxes-in',
        actNumber: 'ACT 1',
        title: 'Get the boxes in',
        subtitle: 'A bare rented vServer becomes a hardened tailnet member',
        narrative: 'It starts with the one box that has a public IP. You write a short node profile - what it is, where it lives, what it may expose - and hand your agent one command. SSH is locked to keys on a non-standard port, fail2ban stands guard, and the box joins the tailnet and clones your fork.',
        excerpt: {
          file: 'nodes/matrix-vps.md',
          lines: [
            '# matrix-vps',
            '- hardware: rented vServer · 4 vCPU / 8 GB',
            '- arch: x86_64 · surface: on_node',
            '- public: key-only SSH on a non-standard port',
            '- tailnet: 100.64.0.10'
          ]
        },
        command: '/bootstrap-node matrix-vps',
        outcome: 'hardened · joined the tailnet as 100.64.0.10 · journal entry written',
        nodeSlug: 'matrix-vps',
        nodeTone: 'edge',
        edgeTone: ACT_EDGE_TONES[0],
        pose: pose('act-1-tux'),
        links: { docs: docs('bootstrap-node') }
      }),
      new StoryActModel({
        id: 'act-2-declare',
        actNumber: 'ACT 2',
        title: 'Declare what it runs',
        subtitle: 'A plain-words wish becomes a use-case file and rootless containers',
        narrative: 'Under the desk sits a legacy desktop with room to spare. You tell your agent you want Nextcloud with Postgres, data on the NAS. It writes the use-case markdown, renders it into rootless podman quadlets and commits the declaration together with a journal entry.',
        excerpt: {
          file: 'use-cases/nextcloud.md',
          lines: [
            '# nextcloud',
            '- node: nc-desktop',
            '- containers: nextcloud, postgres (rootless)',
            '- data: nas-jbod over NFS',
            '- reach: tailnet only, no published ports'
          ]
        },
        command: '/create-use-case nc-desktop nextcloud "Nextcloud with Postgres, data on nas-jbod"',
        outcome: '2 quadlets rendered · services up · declaration and journal committed',
        nodeSlug: 'nc-desktop',
        nodeTone: 'managed',
        edgeTone: ACT_EDGE_TONES[1],
        pose: pose('act-2-tux'),
        links: { docs: docs('create-use-case') }
      }),
      new StoryActModel({
        id: 'act-3-adopt',
        actNumber: 'ACT 3',
        title: 'Adopt what already works',
        subtitle: 'An old Pi file server joins without being wiped',
        narrative: "Not every box gets a fresh start. The Raspberry Pi 3 with the disk enclosure has served the household's files for years. Onboarding adopts it as it is: the agent takes stock of what runs there, writes the NFS and Samba services down as use-cases, and lets you approve each hardening step one by one. Nothing gets reinstalled.",
        excerpt: {
          file: 'use-cases/fileserver.md',
          lines: [
            '# fileserver (host-native)',
            '- node: nas-jbod · surface: on_client',
            '- serves: NFS, SMB',
            '- consumers: nc-desktop, kodi-pi'
          ]
        },
        command: '/onboard-node nas-jbod',
        outcome: '2 running services declared · hardening approved item by item · nothing reinstalled',
        nodeSlug: 'nas-jbod',
        nodeTone: 'client',
        edgeTone: ACT_EDGE_TONES[2],
        pose: pose('act-3-tux'),
        links: { docs: docs('onboard-node') }
      }),
      new StoryActModel({
        id: 'act-4-drift',
        actNumber: 'ACT 4',
        title: 'Catch the drift',
        subtitle: 'A read-only check: does the box still match the markdown?',
        narrative: 'Months later, someone edits homeserver.yaml straight on the box (it was you, at 2 a.m.). The audit compares the markdown in your repo with what the box really runs. If the box changed, you write the change down or roll it back; if the markdown changed, you apply it. It also flags settings a rebuild would silently lose - and it never changes anything itself.',
        excerpt: {
          file: 'journal/audit-synapse.md',
          lines: [
            '# audit synapse',
            '- declared: synapse, element (pinned images)',
            '- live: both running · ports match',
            '- drift: homeserver.yaml edited on the box',
            '- rebuild would lose: that edit'
          ]
        },
        command: '/audit-use-case matrix-vps',
        outcome: '1 hand edit found · flagged as lost on rebuild · nothing changed on the box',
        nodeSlug: 'matrix-vps',
        nodeTone: 'edge',
        edgeTone: ACT_EDGE_TONES[3],
        pose: pose('act-4-tux'),
        links: { docs: docs('audit-use-case') }
      }),
      new StoryActModel({
        id: 'act-5-backup',
        actNumber: 'ACT 5',
        title: 'Back up - and prove it',
        subtitle: 'Nightly copies to the NAS, test restores that leave live data alone',
        narrative: 'The Nextcloud data sits on one desktop, one dead disk away from gone. The agent proposes a backup plan for its volumes and turns it on: every night a snapshot goes to the NAS. To know a backup actually works, run a test restore - into scratch space, while the live data stays where it is. When a nightly run fails, ntfy pings your phone.',
        excerpt: {
          file: 'use-cases/nextcloud.md',
          lines: [
            '## backup',
            '- volumes: nextcloud-data, pg-data',
            '- target: nas-jbod:/backup/nextcloud',
            '- schedule: nightly · keep 14',
            '- alerts: ntfy'
          ]
        },
        command: '/backup-use-case nc-desktop nextcloud',
        outcome: 'nightly backup on · 2 volumes on nas-jbod · test restore passed',
        nodeSlug: 'nc-desktop',
        nodeTone: 'managed',
        edgeTone: ACT_EDGE_TONES[4],
        pose: pose('act-5-tux'),
        links: { docs: docs('backup-use-case'), restore: docs('restore-use-case') }
      }),
      new StoryActModel({
        id: 'act-6-rebuild',
        actNumber: 'ACT 6',
        title: 'Bring a dead box back',
        subtitle: 'A failed node returns from its markdown and its last backup',
        narrative: "Eventually the legacy desktop's disk gives out. Put a fresh Linux install on replacement hardware and run one command. The agent rebuilds the box from its node profile and use-cases in your repo, brings every service back in order, and restores the data from the last backup on the NAS. Nervous? Rehearse it in the lab first.",
        excerpt: {
          file: 'journal/rebuild-nc-desktop.md',
          lines: [
            '# rebuild nc-desktop',
            '- hardware: replacement desktop, fresh install',
            '- from: nodes/nc-desktop.md + 1 use-case',
            '- restored: last snapshot from nas-jbod',
            '- result: services back up, audit clean'
          ]
        },
        command: '/rebuild-node nc-desktop',
        outcome: 'rebuilt from markdown · data restored · audit clean',
        nodeSlug: 'nc-desktop',
        nodeTone: 'managed',
        edgeTone: ACT_EDGE_TONES[5],
        pose: pose('act-6-tux'),
        links: { docs: docs('rebuild-node') }
      })
    ];
  }

  /**
   * The lab: drydocc's QEMU test and prototyping environment, told in a
   * wide section of its own after the acts' timeline - it is no box of the
   * example setup.
   */
  buildLab(tuxPoses) {
    return new StoryActModel({
      id: 'lab',
      actNumber: 'THE LAB',
      title: 'Break things on your laptop, not on your boxes',
      subtitle: 'Throwaway QEMU VMs for testing and prototyping - aarch64 included, on an x86 laptop',
      narrative: 'The lab runs drydocc against throwaway QEMU/KVM virtual machines on your laptop - never against your fork, your tailnet or your vault. It emulates an aarch64 board on x86, so a Pi build is tried out before you flash a single SD card.',
      excerpt: {
        file: 'lab/scenarios/whoami.yaml',
        lines: [
          'scenario: whoami-smoke',
          'nodes: { web: fedora 44, commissioned }',
          'steps:',
          '  - agent: /create-use-case web whoami ...',
          '  - assert: its service runs, answers on :8080',
          '  - assert: the apply is journaled'
        ]
      },
      command: '/lab run lab/scenarios/whoami.yaml',
      outcome: 'use-case created and applied on a fresh VM · all assertions passed · nothing left the lab',
      nodeSlug: 'qemu · local',
      nodeTone: 'ephemeral',
      edgeTone: 'teal',
      pose: tuxPoses.find((tux) => tux.id === 'lab-tux'),
      links: {
        docs: skillDocsLink('lab'),
        scenario: { href: `${REPO_BLOB_BASE}/lab/scenarios/whoami.yaml`, title: 'the scenario in the repo' }
      }
    });
  }

  /**
   * The five boxes of the worked example. Deliberately unlike each other:
   * an x86_64 vServer and a legacy desktop, two 1GB Raspberry Pi 3s (one of
   * them 32-bit), and one immutable appliance. The manifest row shows the
   * cast; the six acts tell their story.
   */
  buildFleetNodeCollection() {
    return [
      new FleetNodeModel({
        id: 'node-matrix-vps',
        slug: 'matrix-vps',
        hardware: 'Rented vServer · 4 vCPU / 8 GB',
        arch: 'x86_64',
        role: 'Matrix homeserver (Synapse + Element)',
        tailnetIp: '100.64.0.10',
        tone: 'edge',
        surface: 'on_node',
        consumes: [],
        note: 'The only box with a public IP - and the only thing it exposes on it is key-only SSH on a non-standard port. Off-site and always on, so chat survives a home uplink outage.'
      }),
      new FleetNodeModel({
        id: 'node-nc-desktop',
        slug: 'nc-desktop',
        hardware: 'Legacy desktop · 4 cores / 16 GB',
        arch: 'x86_64',
        role: 'Nextcloud + Postgres',
        tailnetIp: '100.64.0.40',
        tone: 'managed',
        surface: 'on_node',
        consumes: ['nas-jbod'],
        note: 'Enough machine to host the VS Code Remote Server, so the agent runs on the node itself - the preferred surface.'
      }),
      new FleetNodeModel({
        id: 'node-nas-jbod',
        slug: 'nas-jbod',
        hardware: 'Raspberry Pi 3 · 1 GB + JBOD enclosure',
        arch: 'aarch64',
        role: 'File server - NFS + SMB (host-native)',
        tailnetIp: '100.64.0.31',
        tone: 'client',
        surface: 'on_client',
        consumes: [],
        note: 'Has served the household for years. Adopted without being flattened: its daemons stay daemons, its open ports stay open.'
      }),
      new FleetNodeModel({
        id: 'node-kodi-pi',
        slug: 'kodi-pi',
        hardware: 'Raspberry Pi 3 · 1 GB · living room',
        arch: 'armv7l',
        role: 'Kodi media player (host-native)',
        tailnetIp: '100.64.0.32',
        tone: 'client',
        surface: 'on_client',
        consumes: ['nas-jbod'],
        note: '32-bit and 1 GB: the VS Code Remote Server will never run here. Every command against it is SSH-wrapped from the laptop.'
      }),
      new FleetNodeModel({
        id: 'node-ha-pi',
        slug: 'ha-pi',
        hardware: 'Raspberry Pi 4 · 4 GB + Zigbee HAT',
        arch: 'aarch64',
        role: 'Home Assistant on HASS OS · Zigbee coordinator',
        tailnetIp: '100.64.0.20',
        tone: 'appliance',
        surface: 'ssh-only',
        consumes: ['matrix-vps'],
        note: 'An immutable appliance OS: no package manager, no doccap user, no rootless podman. drydocc reaches it, reads it and journals it - and never pretends it is at baseline.'
      })
    ];
  }
}

// The legal pages' crates are edged along their top, across the content
// width, like the lab's box.
const LEGAL_EDGE = Object.freeze({ orientation: 'top', length: 232, depth: 4, pixel: 5 });
// Where the contact form posts (HATEOAS: the form VM gets it as a link).
const CONTACT_LINK = Object.freeze({ rel: 'contact', href: 'https://formspree.io/f/xzedjqba' });
// The Impressum's email address, each part reversed: the page and its
// sources never carry it whole, and it is only put together on demand.
const CONTACT_EMAIL = Object.freeze({ user: 'niwxam', domain: 'ten.idlaviv' });
const LEGAL_LANGUAGES = Object.freeze(['en', 'de']);

/**
 * The legal pages: each one's crates (edged by key 'legal:<section>') and
 * Doccap's lines between them.
 */
export const LEGAL_PAGES = Object.freeze({
  impressum: Object.freeze({
    sections: Object.freeze(['owner', 'contact', 'direction', 'liability', 'copyright', 'form']),
    poses: () => [
      thinkPose('impressum-owner-tux', {
        frameOffset: 2,
        corner: 'tl',
        line: 'RTFM? This is the M: who runs this dock, and how to reach them.'
      }),
      yellPose('impressum-email-tux', {
        frameOffset: 5,
        corner: 'tr',
        line: "Spam bots grep for an @ - I don't hand them one. Click, and I put the address together right in your browser."
      }),
      thinkPose('impressum-links-tux', {
        frameOffset: 4,
        corner: 'bl',
        line: 'Links lead to other docks. Their captains, their rules - I only point the way.'
      }),
      yellPose('impressum-form-tux', {
        frameOffset: 1,
        corner: 'br',
        line: 'Prefer a form? Type away. No captcha, no tracking - just one POST to Formspree, and a human answers.'
      })
    ]
  }),
  privacy: Object.freeze({
    sections: Object.freeze(['summary', 'controller', 'hosting', 'delivery', 'storage', 'contact-form', 'links', 'rights']),
    poses: () => [
      yellPose('privacy-summary-tux', {
        frameOffset: 3,
        corner: 'tr',
        line: "Cookies? Trackers? Analytics? cat /dev/null. There's nothing here to opt out of."
      }),
      thinkPose('privacy-delivery-tux', {
        frameOffset: 5,
        corner: 'tl',
        line: "The fonts live on this dock now. The few CDNs left see your IP like any server would - that's TCP, not tracking."
      }),
      thinkPose('privacy-storage-tux', {
        frameOffset: 1,
        corner: 'br',
        line: 'The one thing I remember is whether you like dark mode - and that stays in your browser. Never sent, never shared.'
      }),
      yellPose('privacy-rights-tux', {
        frameOffset: 6,
        corner: 'bl',
        line: "Your data, your root. Ask what I know about you - it won't take long."
      })
    ]
  })
});

/**
 * IoC container for the legal pages (Impressum, privacy statement): the
 * theme, the language switch, the email that only appears on demand, the
 * Formspree contact form, the crates' pixel edges and Doccap's scrubbed
 * sprite strips. Same rules as IoCContainer: every instance is created
 * here, every dependency is injected.
 */
export class LegalPageContainer {
  /**
   * @param {object} windowEnv - scoped browser interface (see
   *   createBrowserWindowEnv).
   * @param {object} gsapEnv - scoped animation-library interface.
   * @param {string} page - a key of LEGAL_PAGES.
   * @param {number} [seed] - seed for the pixel edges' randomness.
   */
  constructor(windowEnv, gsapEnv, page, seed = (Math.random() * 2 ** 32) >>> 0) {
    if (!windowEnv) {
      throw new Error('LegalPageContainer requires a windowEnv instance via constructor injection');
    }
    if (!gsapEnv) {
      throw new Error('LegalPageContainer requires a gsapEnv instance via constructor injection');
    }
    if (!Object.prototype.hasOwnProperty.call(LEGAL_PAGES, page)) {
      throw new Error(`LegalPageContainer has no page named ${page}`);
    }
    this.windowEnv = windowEnv;
    this.gsapEnv = gsapEnv;
    this.page = LEGAL_PAGES[page];
    this.themeViewModel = new ThemeViewModel(themeEnvFrom(windowEnv));
    this.tuxPoses = this.page.poses();
    this.viewModel = new LegalPageViewModel({ themeViewModel: this.themeViewModel, tuxPoses: this.tuxPoses });
    this.language = new LanguageViewModel({
      preferredLanguages: () => windowEnv.preferredLanguages(),
      applyLanguage: (lang) => windowEnv.setDocumentLanguage(lang)
    }, LEGAL_LANGUAGES);
    this.email = new EmailRevealViewModel(CONTACT_EMAIL);
    this.contact = new ContactFormViewModel({ postJson: (url, payload) => windowEnv.postJson(url, payload) }, CONTACT_LINK);
    this.edgeRandomSource = new SeededRandomSource((seed ^ EDGE_SEED_SALT) >>> 0);
    this.edgeBuilder = new PixelEdgeBuilder(this.edgeRandomSource);
    this.pixelEdges = new PixelEdgeCatalog(this.buildPixelEdges());
    this.spinRandomSource = new SeededRandomSource((seed ^ SPIN_SEED_SALT) >>> 0);
    this.pixelSpinAnimator = new PixelSpinAnimator(gsapEnv, this.spinRandomSource);
    // No crate here types a command: the step session only lends the
    // animation factory its Doccap scrub.
    this.scriptBuilder = new TypingScriptBuilder(new SeededRandomSource(seed));
    this.stepSession = new StepSessionViewModel([], this.scriptBuilder);
    this.stepFactory = new StepAnimationFactory(gsapEnv, this.stepSession, this.viewModel);
    gsapEnv.onReady(() => this.initAnimations());
  }

  /**
   * Doccap's scroll-scrubbed strips and the loose pixels' spin; nothing
   * without the animation library or under reduced motion.
   */
  initAnimations() {
    if (!this.gsapEnv.isAvailable() || this.gsapEnv.prefersReducedMotion()) return;
    this.pixelSpinAnimator.start(this.pixelEdges.spinVariants);
    this.stepFactory.createTuxScrollTriggers();
  }

  buildPixelEdges() {
    const edges = {};
    this.page.sections.forEach((key) => { edges[`legal:${key}`] = this.edgeBuilder.build(LEGAL_EDGE); });
    return edges;
  }

  /**
   * Registers the legalPage Alpine component. All state and actions
   * delegate to the view models.
   */
  initAlpine() {
    const windowEnv = this.windowEnv;
    const viewModel = this.viewModel;
    const language = this.language;
    const email = this.email;
    const contact = this.contact;
    const pixelEdges = this.pixelEdges;

    const register = () => {
      const Alpine = windowEnv.getAlpine();
      viewModel.bindReactivity(Alpine.reactive);
      language.bindReactivity(Alpine.reactive);
      email.bindReactivity(Alpine.reactive);
      contact.bindReactivity(Alpine.reactive);
      Alpine.data('legalPage', () => ({
        theme: viewModel.theme.resolveInitialTheme(),
        tuxPoses: viewModel.tuxPoses,
        languages: language.languages,
        contactEndpoint: contact.getLink().href,

        // The form's inputs bind straight to the VM's reactive fields.
        get contactFields() {
          return contact.fields;
        },

        toggleTheme() {
          this.theme = viewModel.theme.toggle();
        },

        isLanguage(lang) {
          return language.is(lang);
        },

        selectLanguage(lang) {
          language.select(lang);
        },

        pixelEdge(key) {
          return pixelEdges.edgeFor(key);
        },

        getTuxFrame(poseId) {
          return viewModel.getTuxFrame(poseId);
        },

        revealEmail() {
          email.reveal();
        },

        isEmailRevealed() {
          return email.revealed;
        },

        emailAddress() {
          return email.address;
        },

        emailHref() {
          return email.href;
        },

        submitContact() {
          return contact.submit();
        },

        contactStatus() {
          return contact.status;
        },

        isContactSending() {
          return contact.isSending;
        },

        contactError(field) {
          return contact.errorFor(field);
        },

        contactFormError() {
          return contact.formError;
        }
      }));
    };

    registerAlpineComponent(windowEnv, register);
  }
}

/**
 * The only place the real `window`/`document`/`navigator` globals are
 * touched: builds the scoped interface the containers are allowed to
 * depend on.
 */
function createBrowserWindowEnv() {
  return {
    hasAlpine: () => Boolean(window.Alpine),
    getAlpine: () => window.Alpine,
    onAlpineInit: (callback) => window.document.addEventListener('alpine:init', callback),
    getBody: () => window.document.body,
    hasClipboard: () => Boolean(window.navigator && window.navigator.clipboard),
    writeToClipboard: (text) => window.navigator.clipboard.writeText(text),
    readStoredTheme: () => {
      try {
        return window.localStorage.getItem('drydocc-theme');
      } catch (error) {
        return null;
      }
    },
    writeStoredTheme: (theme) => {
      try {
        window.localStorage.setItem('drydocc-theme', theme);
      } catch (error) {
        // Storage can be refused (private mode); the choice just won't persist.
      }
    },
    prefersDarkTheme: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    getDocumentElement: () => window.document.documentElement,
    getViewportWidth: () => window.innerWidth,
    getViewportHeight: () => window.innerHeight,
    getDocumentHeight: () => window.document.documentElement.scrollHeight,
    scrollToY: (top) => window.scrollTo({ top, behavior: 'smooth' }),
    // Which page this is: <body data-page="..."> names the legal pages.
    getPageName: () => (window.document.body && window.document.body.dataset.page) || '',
    preferredLanguages: () => [...(window.navigator.languages || [window.navigator.language || ''])],
    setDocumentLanguage: (lang) => { window.document.documentElement.lang = lang; },
    // Formspree answers JSON when asked for it; a non-JSON body reads as {}.
    postJson: (url, payload) => window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => ({})) }))
  };
}

/**
 * The only place the animation-library globals are touched: builds the
 * scoped interface the animation services are allowed to depend on. A failed
 * CDN load simply reports "unavailable" and everything degrades to the
 * static end-state view.
 */
function createBrowserGsapEnv() {
  return {
    isAvailable: () => Boolean(window.gsap && window.ScrollTrigger),
    getTimelineFactory: () => window.gsap.timeline,
    getSetter: () => window.gsap.set,
    registerPlugin: (plugin) => window.gsap.registerPlugin(plugin),
    getScrollTrigger: () => window.ScrollTrigger,
    getElements: (targets) => window.gsap.utils.toArray(targets),
    measure: (element) => ({ width: element.offsetWidth, height: element.offsetHeight }),
    prefersReducedMotion: () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    onReady: (callback) => {
      if (window.document.readyState === 'complete') {
        callback();
      } else {
        window.addEventListener('load', callback);
      }
    },
    onRefresh: (callback) => window.ScrollTrigger.addEventListener('refresh', callback)
  };
}

/**
 * The default gsapEnv when none is injected: reports unavailable and never
 * fires onReady, so a container built without animation support stays fully
 * static without touching any browser global.
 */
function createUnavailableGsapEnv() {
  return {
    isAvailable: () => false,
    getTimelineFactory: () => { throw new Error('animation library unavailable'); },
    getSetter: () => { throw new Error('animation library unavailable'); },
    registerPlugin: () => {},
    getScrollTrigger: () => null,
    getElements: () => [],
    measure: () => ({ width: 0, height: 0 }),
    prefersReducedMotion: () => false,
    onReady: () => {},
    onRefresh: () => {}
  };
}

// Bootstrap application immediately so Alpine registers before Alpine.start():
// the legal pages get their own container, every other page the dock's.
if (typeof window !== 'undefined') {
  const windowEnv = createBrowserWindowEnv();
  const page = windowEnv.getPageName();
  const container = Object.prototype.hasOwnProperty.call(LEGAL_PAGES, page)
    ? new LegalPageContainer(windowEnv, createBrowserGsapEnv(), page)
    : new IoCContainer(windowEnv, createBrowserGsapEnv());
  container.initAlpine();
}
