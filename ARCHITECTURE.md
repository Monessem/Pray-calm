# Architecture — Tcalm Firefox Extension

## Design goals

1. **Offline-first** — prayer times must never depend on a network service.
2. **Event-driven** — no long-running loops; Firefox MV3 background pages
   suspend when idle, so everything is built on `browser.alarms`.
3. **Testable** — business logic lives in pure modules with no browser API
   access at import time; the browser is touched only inside functions, so
   tests inject a mock.
4. **Least privilege** — four API permissions, optional origin grants only.
5. **Honesty** — the extension implements what Firefox actually allows and
   documents the rest (see MIGRATION.md).

## Runtime topology

```
┌─────────────── event page (background.js) ─────────────────┐
│  index.ts        wires listeners, message router            │
│  scheduler.ts    alarm lifecycle  ──► storage.local (cache)  │
│  pauseController ── scripting.executeScript ──┐             │
│  notifier        ── notifications.create      │             │
└───────────────────────────────────────────────│─────────────┘
                                                │ inject
              ┌─────────────────────────────────┴──────────┐
              │ content/mediaAgent.js  (per tab, all frames)│
              │  pauses/resumes HTMLMediaElements it owns   │
              └────────────────────────────────────────────┘
┌─ popup (view only) ─┐   ┌─ options (view only) ────────────┐
│ storage.local read  │   │ storage.local read/write          │
│ runtime.sendMessage │   │ runtime.sendMessage (tests, recalc)│
└─────────────────────┘   └──────────────────────────────────┘
```

Data flows one way into storage; every consumer re-validates what it reads
(`normalizeSettings`, `isDaySchedule`). The popup renders from the cache and
asks the background to refresh when the cache is stale — the background page
wakes, recomputes, and the popup re-reads storage.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `shared/prayer/astro.ts` | Julian day, solar declination, equation of time, hour angles. Pure math. |
| `shared/prayer/engine.ts` | computePrayerTimes(): solar times → clock times, method parameters, high-latitude rules. |
| `shared/time/tz.ts` | IANA offsets via `Intl` (DST-exact), zoned⇄UTC conversion, local dates, midnight math. |
| `shared/time/format.ts` | HH:MM rendering, countdowns, localized date/Hijri labels. |
| `shared/schedule.ts` | DaySchedule construction (engine × timezone), freshness checks, next-prayer search. |
| `shared/storage/settings.ts` | Normalization/validation, import/export, Tcalm config migration. |
| `shared/storage/storage.ts` | Typed wrappers over `browser.storage.local`. |
| `shared/geo/*` | Preset city DB (from Tcalm), nearest-city lookup, opt-in IP location. |
| `shared/media/pauseController.ts` | Tab injection, pause/resume/hold state machine, persistence of the active hold. |
| `shared/notify/notifier.ts` | Localized notifications, chime. |
| `shared/i18n/*` | en/ar catalogs (single source for `_locales` + runtime), DOM i18n, RTL. |
| `background/scheduler.ts` | Alarm names, creation/idempotency, dispatch, dedupe ledger, recovery. |
| `background/index.ts` | Listener wiring + message router (no logic). |
| `content/mediaAgent.ts` | In-page pause agent; tracks only what it paused. |

## Scheduling design

### Alarm naming

Alarm names are deterministic functions of the event:

```
prayer:{name}:{date}:{epochMs}      one per upcoming main prayer
pre:{name}:{date}:{epochMs-minus}   advance notifications
daily-refresh:{next-date}           local-midnight rollover
integrity-check                     periodic (6h) self-healing
media-hold-sweep                    1-minute period during a hold
media-resume:{epoch}                end of a hold
```

Because `browser.alarms.create` with an existing name **overwrites**, the
same name can never produce duplicate alarms. Re-running the scheduler is
therefore idempotent — it clears scheduler-owned alarms and recreates them.

### State (storage.local)

| Key | Shape | Purpose |
| --- | --- | --- |
| `settings` | validated `Settings` | user configuration |
| `schedule` | `{today, tomorrow}` | cached DaySchedules (guards: date + source equality) |
| `firedEvents` | `{"prayer:DATE#name": epoch}` | dedupe ledger, TTL-pruned (3 days) |
| `activePause` | `ActivePause \| null` | surviving media hold (restart recovery) |

### Event flow (prayer time)

1. `browser.alarms.onAlarm` → `scheduler.onAlarm` parses the name.
2. **Missed check**: if `now > epoch + 120s`, record the event in the ledger
   and return — a laptop that slept through Dhuhr does not get a 3pm adhan.
3. **Dedupe check**: the ledger is read-before-write; double delivery of the
   same alarm name cannot notify twice.
4. Ledger write (mark fired).
5. If media pause is enabled: `executePrayerPause` → inject agent into all
   tabs → pause playing elements → (hold mode) persist `activePause` and
   create the sweep/resume alarms.
6. If notifications are enabled for that prayer: create the localized
   notification, play the optional chime.

### Resilience

| Scenario | Recovery |
| --- | --- |
| Firefox restart | Alarms persist; `onStartup` + every event-page load re-runs `ensureSchedule` (cheap, idempotent). |
| Missed while asleep | Epoch + grace check skips stale events; ledger prevents replay. |
| Clock/timezone change | Cache freshness compares the resolved timezone and local date; mismatch forces recompute. The 6-hour integrity alarm also re-verifies. |
| Cleared/corrupted alarms | Integrity alarm rebuilds from the cache. |
| Hold spanning a restart | `recoverActivePause` re-arms alarms, or resumes immediately if the hold expired while closed. |
| Disabled mid-hold | Deactivation resumes held media (never leaves the user paused). |

## Media pause state machine

```
             ┌──────────── prayer event (duration = 0) ────────────┐
             │ single pause; no state; nothing ever resumes        │
             └──────────────────────────────────────────────────────┘
prayer event (duration > 0):
  ACTIVE ── sweep (every 1 min) ──► re-pause playing media (non-restorable)
  ACTIVE ── resumeAt reached ─────► resume ONLY the initial restorable set
  ACTIVE ── extension disabled ───► resume + clear
  ACTIVE ── tab navigates away ───► agent gone; nothing to resume (media
                                    was already stopped by navigation)
```

Inside a tab, the agent maintains `pausedByUs` (a Set) plus a WeakSet marking
its own programmatic `play()` calls. A `play` event that is not marked as
ours means the user restarted the element — it is removed from the restore
set in single-pause mode (in hold mode the next sweep re-pauses it, mirroring
the Tcalm daemon's "keep it quiet" semantics).

## i18n architecture

The catalogs (`messages.en.ts`, `messages.ar.ts`) are TypeScript modules —
the single source of truth. The build script emits Firefox `_locales/*/messages.json`
from them (for manifest-level strings and Firefox-native i18n), while the
runtime `t()` reads the same modules to support instant language switching
and per-context localization (e.g., notifications choose the language by
settings + browser locale). Tests enforce key parity between catalogs and
coverage of every `data-i18n` key used in HTML.

## Build pipeline

esbuild bundles four IIFE entry points (background, popup, options, content
agent) targeting firefox115, minified, no source maps, legal comments
stripped. Static assets (manifest, HTML/CSS, icons, chime, generated
`_locales`) are copied verbatim. The build then verifies every manifest
reference resolves, and `scripts/audit.mjs` enforces the security contract
(no eval/innerHTML/remote code, permission allowlist, dist contents
allowlist, locale parity).

## Testing strategy

- **Pure modules** (astro, engine, tz, format, schedule, settings, i18n) are
  tested directly.
- **Browser-coupled modules** (storage, pauseController, scheduler) run
  against an in-memory `browser` mock (`test/helpers/browserMock.ts`)
  installed on `globalThis` before calls — possible because no module touches
  `browser` at import time.
- **Astronomical truth** is cross-checked twice: against an independent NOAA
  implementation (Python oracle generating fixtures) and against the
  reference times published in the original Tcalm README.
