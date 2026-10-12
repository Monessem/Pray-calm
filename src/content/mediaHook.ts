/**
 * Tcalm MAIN-world media hook — v1.1.26.
 *
 * Runs in the PAGE's own JavaScript world (not the content-script sandbox):
 * registered statically by manifest.json (content_scripts, world: "MAIN",
 * document_start) and re-injected on demand by the background controller
 * via scripting.executeScript({ world: "MAIN" }) so tabs that were already
 * open before an extension update get covered too. The injection is
 * idempotent — the page-world global guard below makes re-runs no-ops.
 *
 * Why the page world at all: modern players (SoundCloud among them) keep
 * their <audio>/<video> element DETACHED from the DOM — created with
 * new Audio()/createElement() and never appended — so
 * document.querySelectorAll('audio, video') can never see them, no matter
 * how often it runs. The only reliable observation point is
 * HTMLMediaElement.prototype itself, which only the page world can patch.
 *
 * Coverage, in order of reliability:
 *  1. play()/pause() interposition on HTMLMediaElement.prototype — every
 *     element that ever starts playing passes through here, detached or
 *     not, in the top document or any same-world frame.
 *  2. A short getter trap (currentTime/paused/duration/ended/volume) for
 *     late injections: an already-playing player keeps reading those
 *     properties (progress bars, MediaSession updates, button state), so
 *     its element reference surfaces even though play() ran before the
 *     hook existed. The trap restores the native descriptors afterwards.
 *  3. A deep DOM scan (including open shadow roots) as defense in depth.
 *  4. AudioContext constructor interposition — pure Web Audio sites (no
 *     media element at all) get their contexts suspended and later
 *     resumed.
 *  5. v1.1.26 anti-auto-resume watch: streaming platforms with a "keep
 *     playing" state machine (live radio, ad pipelines, auto-next
 *     players) call play() again milliseconds after an external pause.
 *     The initial restorable pause re-checks the playing set for ~0.5 s
 *     and re-pauses whatever restarted, folding the counts into the same
 *     result. A human cannot press a site's play button inside that
 *     window, so the "user wins" rule keeps its meaning; later restarts
 *     are the hold sweeps' job (or the user's win in single-pause mode).
 *
 * Security posture: this code runs unprivileged in the page and touches
 * nothing but prototypes it immediately restores or wraps pass-through.
 * A hostile page can see, remove, or fake window.__tcalmMedia — the
 * controller tolerates that (worst case: a site refuses to be paused and
 * the status line says so). Nothing here can escalate privileges.
 *
 * The "user wins" rule from the v1.0.8 agent is preserved: when the page
 * (user) restarts an element we paused, the patched play() removes it
 * from the restore set — Tcalm never re-plays media behind the user's
 * back. Resume restores only elements Tcalm itself paused and that are
 * still paused.
 */

import { hostMatchesAllowed } from '../shared/utils/validate.ts';

interface PauseOptions {
  restorable: boolean;
  allow: string[] | null;
}

export interface MediaHookResult {
  /** Media elements paused by this call. */
  paused: number;
  /** AudioContexts suspended by this call. */
  contexts: number;
  /** Document title / hostname of the responding frame (clamped). */
  title: string;
  host: string;
  /** Allowlist mode: this frame's host is not in the list. */
  skipped?: boolean;
  /**
   * Nothing was paused, but the page reports playing media through the
   * MediaSession API — a player that resisted every reach. The options
   * page turns this into a "reload that tab once" hint.
   */
  resistant?: boolean;
}

interface TcalmMediaApi {
  pause: (options: PauseOptions) => Promise<MediaHookResult>;
  resume: () => { resumed: number; contexts: number };
}

interface TcalmWindow {
  __tcalmMedia?: TcalmMediaApi;
}

/** Clamp a string so a hostile page cannot flood the status line. */
function clampText(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

(() => {
  const w = window as unknown as TcalmWindow;
  if (w.__tcalmMedia) return; // idempotent across static + dynamic injection

  const registry = {
    /** Elements that called play() and have not paused since. */
    playing: new Set<HTMLMediaElement>(),
    /** Elements paused by Tcalm that a future resume() may restart. */
    ours: new Set<HTMLMediaElement>(),
    /** AudioContexts created by the page (constructor interposition). */
    contexts: new Set<AudioContext>(),
    /** Contexts suspended by Tcalm that a future resume() may restart. */
    ourContexts: new Set<AudioContext>(),
  };

  /**
   * True when this hook ran before the page's own scripts (static
   * document_start registration): play() interposition has seen every
   * playback start, so the getter trap is unnecessary. False when the hook
   * was injected late into a live page — then already-playing elements
   * must be caught via the trap.
   */
  const early = document.readyState === 'loading';

  // --- 1) play()/pause() interposition --------------------------------------

  type PlayFn = (this: HTMLMediaElement) => Promise<void>;
  type PauseFn = (this: HTMLMediaElement) => void;
  const proto = HTMLMediaElement.prototype as unknown as { play: PlayFn; pause: PauseFn };
  const originalPlay: PlayFn = proto.play;
  const originalPause: PauseFn = proto.pause;

  proto.play = function play(this: HTMLMediaElement): Promise<void> {
    try {
      registry.playing.add(this);
      // The page (user) restarted this element: it is no longer ours.
      registry.ours.delete(this);
    } catch {
      // exotic host object — ignore
    }
    return originalPlay.call(this);
  };

  proto.pause = function pause(this: HTMLMediaElement): void {
    try {
      registry.playing.delete(this);
    } catch {
      // ignore
    }
    originalPause.call(this);
  };

  // --- 2) AudioContext constructor interposition -----------------------------

  for (const key of ['AudioContext', 'webkitAudioContext'] as const) {
    try {
      const holder = window as unknown as Record<string, unknown>;
      const Ctor = holder[key];
      if (typeof Ctor !== 'function') continue;
      if ((Ctor as { __tcalmPatched?: boolean }).__tcalmPatched === true) continue;
      const Patched = new Proxy(
        Ctor as new (...args: never[]) => AudioContext,
        {
          construct(target, args, newTarget): AudioContext {
            const ctx = Reflect.construct(target, args, newTarget) as AudioContext;
            try {
              registry.contexts.add(ctx);
            } catch {
              // ignore
            }
            return ctx;
          },
        },
      );
      (Patched as unknown as { __tcalmPatched?: boolean }).__tcalmPatched = true;
      holder[key] = Patched;
    } catch {
      // page froze the window or shadowed the constructor — skip
    }
  }

  // --- 3) Getter trap (late-injection catch-up) ------------------------------

  const TRAP_PROPS = ['currentTime', 'paused', 'duration', 'ended', 'volume'] as const;
  const TRAP_MS = 500;

  /**
   * Temporarily wrap the prototype getters of the most-read media
   * properties so that any element the page is actively reading — progress
   * bars, MediaSession position updates, play-button state, even for
   * off-DOM players — hands us its reference. Native descriptors are
   * restored right after the window (unless the page redefined them in
   * between, in which case we leave the page's own version alone).
   */
  function trapPlayingElements(): Promise<void> {
    return new Promise((resolve) => {
      const restores: Array<() => void> = [];
      for (const prop of TRAP_PROPS) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, prop);
        if (!descriptor || typeof descriptor.get !== 'function') continue;
        const nativeGet = descriptor.get;
        const trapGet = function trapGet(this: HTMLMediaElement): unknown {
          try {
            registry.playing.add(this);
          } catch {
            // ignore
          }
          return nativeGet.call(this);
        };
        try {
          Object.defineProperty(HTMLMediaElement.prototype, prop, {
            configurable: true,
            enumerable: descriptor.enumerable,
            get: trapGet,
          });
          restores.push(() => {
            const current = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, prop);
            if (current && current.get === trapGet) {
              Object.defineProperty(HTMLMediaElement.prototype, prop, descriptor);
            }
          });
        } catch {
          // not configurable — skip this property
        }
      }
      window.setTimeout(() => {
        for (const restore of restores) {
          try {
            restore();
          } catch {
            // ignore
          }
        }
        resolve();
      }, TRAP_MS);
    });
  }

  // --- 4) Deep DOM scan (shadow-DOM aware) -----------------------------------

  function* deepMediaElements(root: Document | ShadowRoot): Generator<HTMLMediaElement> {
    for (const el of root.querySelectorAll('audio, video')) {
      if (el instanceof HTMLMediaElement) yield el;
    }
    for (const host of root.querySelectorAll('*')) {
      if (host.shadowRoot) yield* deepMediaElements(host.shadowRoot);
    }
  }

  // --- Controller ------------------------------------------------------------

  /**
   * v1.1.26: delays (ms) after the main pause loop at which the playing
   * set is re-checked for auto-resumed elements. The last delay is the
   * total watch length — short enough that no human interaction is
   * shadowed, long enough to catch the sub-second "keep playing" logic
   * of live streams and ad-driven players. A player that keeps
   * restarting FOREVER is not a media element problem but a hold
   * problem: the background burst sweeps own it from second 5 on.
   */
  const RESUME_WATCH_DELAYS_MS = [200, 500] as const;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * Re-pause elements the page restarted right after the pause (see the
   * module header, item 5). Counted into the same result so the caller's
   * status line reflects reality: a "paused" count of N means N elements
   * ended up actually quiet, not "N were quiet for one tick".
   */
  async function watchForAutoResume(result: MediaHookResult, restorable: boolean): Promise<void> {
    for (const delay of RESUME_WATCH_DELAYS_MS) {
      await sleep(delay);
      // Snapshot: the patched pause() below mutates the set mid-iteration.
      for (const el of Array.from(registry.playing)) {
        try {
          if (el.paused || el.ended) {
            // Ended or was paused and stayed paused — the patched pause()
            // already removed the paused ones; this clears stragglers.
            if (el.paused) registry.playing.delete(el);
            continue;
          }
          el.pause();
          if (restorable) registry.ours.add(el);
          result.paused += 1;
        } catch {
          // cross-origin or detached mid-iteration — skip
        }
      }
    }
  }

  async function pause(options: PauseOptions): Promise<MediaHookResult> {
    const result: MediaHookResult = {
      paused: 0,
      contexts: 0,
      title: clampText(document.title, 80),
      host: clampText(window.location.hostname, 60),
    };

    if (Array.isArray(options.allow) && !hostMatchesAllowed(options.allow, window.location.hostname)) {
      result.skipped = true;
      return result;
    }

    if (!early) {
      // Late-injected into a live page: catch elements that started
      // playing before this hook existed (SoundCloud-style detached
      // players included). Playing media keeps firing timeupdate handlers
      // and progress polls that read the trapped getters — even in
      // background tabs, where media events are not throttled.
      await trapPlayingElements();
    }

    const candidates = new Set<HTMLMediaElement>(registry.playing);
    for (const el of deepMediaElements(document)) candidates.add(el);

    for (const el of candidates) {
      try {
        if (el.paused || el.ended) continue; // never touch stopped media
        el.pause(); // patched pause() drops it from `playing` — we hold a snapshot
        if (options.restorable) registry.ours.add(el);
        result.paused += 1;
      } catch {
        // cross-origin or detached mid-iteration — skip
      }
    }

    for (const ctx of registry.contexts) {
      try {
        if (ctx.state !== 'running') continue;
        const suspended = ctx.suspend();
        if (suspended && typeof suspended.catch === 'function') {
          suspended.catch(() => undefined);
        }
        if (options.restorable) registry.ourContexts.add(ctx);
        result.contexts += 1;
      } catch {
        // ignore
      }
    }

    // v1.1.26: only the initial restorable pause runs the watch — the
    // periodic hold sweeps repeat often enough that a watch would only
    // add latency, and single-pause mode relies on this watch as its ONLY
    // defense against auto-resuming players.
    if (options.restorable) {
      await watchForAutoResume(result, options.restorable);
    }

    if (result.paused === 0 && result.contexts === 0) {
      try {
        if (navigator.mediaSession && navigator.mediaSession.playbackState === 'playing') {
          result.resistant = true;
        }
      } catch {
        // MediaSession unavailable — nothing to report
      }
    }

    return result;
  }

  function resume(): { resumed: number; contexts: number } {
    let resumed = 0;
    for (const el of Array.from(registry.ours)) {
      registry.ours.delete(el);
      // Detached elements can still be the LIVE player (SoundCloud), so
      // connectivity is deliberately not required — only that the element
      // is still paused (the user-wins check: anything the page restarted
      // was already removed from `ours` by the patched play()).
      if (el.paused && !el.ended) {
        try {
          const playback = el.play();
          if (playback && typeof playback.catch === 'function') {
            playback.catch(() => undefined); // autoplay policy — user presses play
          }
          resumed += 1;
        } catch {
          // ignore
        }
      }
    }
    let contexts = 0;
    for (const ctx of Array.from(registry.ourContexts)) {
      registry.ourContexts.delete(ctx);
      if (ctx.state === 'suspended') {
        try {
          const resumedCtx = ctx.resume();
          if (resumedCtx && typeof resumedCtx.catch === 'function') {
            resumedCtx.catch(() => undefined);
          }
          contexts += 1;
        } catch {
          // ignore
        }
      }
    }
    return { resumed, contexts };
  }

  w.__tcalmMedia = { pause, resume };
})();
