# Changelog

All notable changes to the project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.26] — 2026-10-06

Onboarding and wide-platform hardening. The owner asked for a better
onboarding page and better support for the other platforms people
actually use — Shahid, Spotify, Apple Music, Anghami, Deezer, Netflix
and the rest — on top of the standing production-clean rule.

### Added — the onboarding page is now a 3-step wizard

- **Step 1 — Welcome:** what Tcalm does (times & notifications, media
  pause, private/offline) plus an honest platform palette (YouTube,
  Netflix, Spotify, Apple Music, Anghami, Deezer, Shahid, SoundCloud,
  "+ more") with the "any site that plays audio or video in a Firefox
  tab" line — the media feature's reach is finally visible where the
  permission is being decided.
- **Step 2 — Location:** country/city quick-setup from the same 194-
  country preset database the options page uses (per-locale
  `Intl.Collator` sorting, bilingual names). Continuing saves through
  the same `normalizeSettings` validation gate and applies the
  country-suggested calculation method + the city's timezone (the
  original Tcalm's behavior) — prayer times are right from the first
  minute without ever opening settings. Identical selections are not
  re-saved (no pointless reschedule).
- **Step 3 — Permissions:** the unchanged one-gesture grant (scripting
  + `<all_urls>` + ipwho.is), now as the step's primary action.
- Wizard mechanics: labeled progress dots (`aria-current="step"`),
  Back/Continue navigation, focus moved to each step's heading (never
  stranded in a hidden section), all bilingual EN/AR with RTL. The
  v1.1.22 contracts are preserved verbatim (boot-warning, one-prompt
  grant, live permission events, i18n parity).

### Fixed — stubborn players stay paused (the Shahid/streaming case)

- **Anti-auto-resume watch (page world):** streaming platforms with
  "keep playing" state machines call `play()` again milliseconds after
  an external pause. The initial restorable pause now re-checks the
  playing set at +200 ms and +500 ms and re-pauses whatever restarted,
  folding the counts into the same result — the status line reflects
  media that actually stayed quiet. The watch only runs for the
  initial event; hold sweeps repeat often enough on their own. The
  user-wins rule is intact: no human can press a site's play button
  inside a 0.5 s window.
- **Burst hold sweeps (background):** a hold (pause duration > 0) now
  arms damped one-shot sweep alarms at +5 s, +10 s, +20 s and +35 s
  (the original Tcalm daemon re-paused every 5 s) before the 1-minute
  periodic sweep takes over — a player that keeps restarting during
  the prayer window goes quiet in seconds, not up to a minute. Entries
  beyond the hold's resume time are never created; `clearHoldAlarms`
  removes them with the rest.
- Options → Media pause gained the platforms line spelling out the
  coverage (onboarding + options, EN + AR).

### Verification

- 285 unit tests (9 new: burst cadence/skip/clear, burst-alarm
  dispatch through the scheduler, wizard step contracts, platform
  palette, i18n parity for every new key, location-save gate). tsc,
  eslint, audit and deadcode clean; web-ext lint 0 errors.
- E2E on real Firefox ESR 140 headless: the media fixture gained a
  sixth case — a STUBBORN player that retries play() twice after every
  external pause (realistic keep-playing logic: the budget re-arms only
  after stable playback, because an infinite loop would ignore the
  site's own pause button). The suite proves the watch drains its
  retry budget inside the same pause call, plus every prior case
  (in-DOM, detached, shadow-DOM, iframe, Web Audio, targeting,
  last-pause-only resume) on the shipped XPI.

## [1.1.25] — 2026-10-05

Diagnostics hygiene. The owner reported: the Diagnostics log showed
"notifications ready (required permission granted)" repeating every
minute, burying every real event under noise — "we want it to show the
events that actually matter, not every little thing; this much unclear
data distracts the user."

### Fixed — readiness logging is change-driven, not per-wake

- **Root cause:** Firefox suspends the MV3 background event page when
  idle; the 1-minute badge-tick alarm wakes it, and every wake re-runs
  `init()` → `verifyNotificationReadiness()` → one Diagnostics entry
  per minute. At the 120-entry buffer cap, ~2 hours of identical lines
  was all the Diagnostics card showed.
- The verdict is now recorded **only when it changes**, tracked in
  `browser.storage.session` (survives event-page suspensions, cleared
  on browser restart — "once per browser session" semantics):
  - READY is announced once per session (first success or recovery
    after a failure), then silent on every later wake;
  - NOT READY is **never deduped** — a broken notification channel
    always lands in Diagnostics;
  - the permission probe still runs on every wake (one cheap
    `permissions.contains` call), so a permission revoked mid-session
    is caught within a minute and the recovery is announced.
- Engines without `storage.session`: success degrades to console-only
  (an unde-dupable Diagnostics line per wake is the bug being fixed);
  failures keep their guaranteed entry.
- Net effect — the Diagnostics card now shows real events only:
  install/update markers, one readiness confirmation per browser
  session, prayer/pre notifications, banner display confirmations,
  media pause summaries, toast-window failures and errors.

### Verification

- 276 unit tests (3 new: repeated wakes record readiness once,
  mid-session failure + recovery announcements, browser-restart
  re-announcement); the browser mock now implements
  `browser.storage.session` (persisting across simulated event-page
  suspensions, cleared on reset like a browser restart). tsc, eslint,
  audit and deadcode clean.
- E2E unchanged suites pass on the shipped XPI: media E2E (34/34) and
  the v1.1.22 regression suite (45/45), which now also asserts the
  dedup live: after 80 s of badge-tick wakes the buffer still holds
  exactly one "notifications ready" line.

## [1.1.24] — 2026-10-05

Speed and resume semantics. The owner reported: (a) "Test media pause is
slow — it takes a while before the playing tab goes quiet" (the sweep
visited every open tab sequentially, two awaited script injections each,
so 140-tab sessions took seconds); (b) "Resume paused media restarts
EVERY tab that ever had sound, together — I want it to resume only the
last tab the sound was paused from." Both are fixed, production-ready,
with the semantics documented in the options page and README.

### Changed — targeted, parallel pause sweep

- **Target selection replaces the full-tab scan.** The sweep now visits
  only tabs that can plausibly be making noise:
  1. `tabs.query({ audible: true })` — tabs producing sound right now
     (Firefox's tab speaker indicator; no extra permission required);
  2. a **recently-audible cache** (`src/shared/media/audibleTabs.ts`,
     in-memory, 3-minute TTL, fed by `tabs.onUpdated`, pruned by
     `tabs.onRemoved`) — covers track gaps and buffering stalls where a
     still-"playing" tab is briefly not audible (SoundCloud between
     tracks); deliberately never touches storage;
  3. the **active tab of every window** — the user is often watching
     the thing they want paused, and a just-started video is not yet
     audible during its first silent seconds.
- **Targets run concurrently** (bounded `mapLimit`, 8 at a time) instead
  of one-after-another; results stay deterministic (sorted by tab id).
- Outcome field `scanned` renamed `candidates` (it now counts pause
  targets, not every open tab); the options status line and both i18n
  catalogs follow. New hint under the buttons explains the semantics.
- Trade-off (documented in README + options): a tab *playing silently*
  (site-muted, volume 0) is no longer force-paused. It makes no sound
  during prayer either way; if it becomes audible, hold sweeps re-pause.

### Changed — resume undoes the LAST pause event only

- New storage key `lastPause` (`LastPauseRecord { at, tabIds }`),
  written by every restorable pause event (prayer or manual test) that
  actually paused something — newest event wins. Hold sweep re-pauses
  (non-restorable) never touch it.
- `resumeAllTracked()` (all-tabs broadcast) is **deleted**; replaced by
  `resumeLastPause()`: an active hold ends first (it IS the newest event);
  otherwise exactly the recorded tabs are restored, and the record is
  consumed. `endHold()` also clears the record and now returns what it
  restored.
- Net effect: one pause event = one undo. Older paused tabs stay paused
  until the user plays them manually (the page-world "user wins" rule
  already dropped anything the user restarted).

### Verification

- 273 unit tests (17 new: targeting contracts, parallel sweep, cache
  tracker, lastPause record lifecycle, sweep-never-steals-record,
  closed-tab no-ops); tsc, eslint, audit and deadcode clean.
- E2E (`scripts/e2e-media-check.py`) on real Firefox ESR headless grew
  from 22 to 34 checks, now in three phases; the options page runs in
  its own window so the fixture tab stays an active-tab target in the
  audio-less headless environment. New phase C proves: the sweep's own
  target list contains exactly the on-screen tabs (read back through
  the real message handler), and after two pause events the resume
  restores the newest event's window ONLY while the older event's
  window stays paused — the owner's exact scenario. While building it,
  a Firefox scripting quirk was documented (executeScript calls that
  carry `args` may execute in other same-site tabs; results are
  dropped, counts stay correct — see the script docstring).

## [1.1.23] — 2026-10-05

The SoundCloud fix, and the largest media-pause coverage a Firefox
WebExtension can honestly deliver. The owner reported: "Test media pause
finds no playing media while SoundCloud is playing, and the Asr prayer
pause never fired." Root cause: SoundCloud (like many modern players)
keeps its `<audio>` element **detached from the DOM** — invisible to
`document.querySelectorAll`, which was the v1.0.x agent's only
observation point. The media layer was rebuilt around the page world.

### Changed — media architecture

- **New page-world hook (`src/content/mediaHook.ts`, replaces
  `src/content/mediaAgent.ts`).** Registered statically in the manifest
  (`content_scripts`, `world: "MAIN"`, `document_start`, `all_frames`,
  `match_about_blank`) and re-injected on demand by the background at
  pause time (idempotent), so tabs opened before an extension update are
  covered too. In the page world it can do what no DOM scan can:
  - interposes `HTMLMediaElement.prototype.play/pause` — every playing
    element passes through, **detached or not** (the SoundCloud case);
  - a **getter trap** (currentTime/paused/duration/ended/volume, ~500 ms,
    descriptors restored afterwards) catches players that were already
    playing when the hook arrived late — an actively playing player keeps
    reading those properties even in background tabs (media events are
    not throttled);
  - tracks every `AudioContext`/`webkitAudioContext` the page constructs
    (Proxy) — pure Web Audio sites are paused via `suspend()` and
    restored via `resume()`;
  - a shadow-DOM-aware deep scan as defense in depth;
  - a `mediaSession.playbackState === 'playing'` "resistant" report when
    nothing could be paused — the options page turns it into a
    "reload that tab once" hint naming the site.
- **Controller rewritten (`src/shared/media/pauseController.ts`).** No
  runtime messaging anymore: two `scripting.executeScript` calls per tab
  (`world: "MAIN"` — one installs the hook, one runs a self-contained
  trampoline in every frame), with **per-frame results aggregated** — the
  v1.0.x design resolved only the first responding frame, so media inside
  a cross-origin iframe could be paused yet never counted or tracked for
  resume. `tabs.sendMessage` is gone entirely; the old
  "receiving end does not exist" failure class no longer exists.
- **Semantics preserved from v1.0.8:** pause only what is actually
  playing; duration 0 = single pause, nothing auto-resumed; duration > 0
  = hold with once-a-minute sweeps, resuming only what Tcalm paused; the
  user always wins (a page/user restart drops the element from the
  restore set). SoundCloud's detached element resumes correctly too —
  `isConnected` is deliberately not required (the live player IS the
  detached element).
- **Skipped/unreachable tabs are now separated:** discarded/frozen tabs
  are skipped without an injection attempt; injection failures (no host
  permission, privileged pages) count as unreachable and surface in the
  test result ("N tab(s) scanned, M not reachable") instead of a bare
  "no playing media".
- `strict_min_version` 115 → **135** (desktop & Android):
  `scripting.executeScript({ world: "MAIN" })` requires Firefox 135+
  — the whole fix rests on it. Firefox 115 ESR has been end-of-life for
  two years; every supported Firefox satisfies this.
- Prayer notification count and scheduler logs now include suspended Web
  Audio contexts, not just media elements.

### Removed — dead code

- `src/content/mediaAgent.ts` (the DOM-scanning, message-listening agent)
  and its messaging path in the controller, the `tabs.sendMessage` mock
  surface, and the old first-frame-only aggregation. The build, audit and
  package scripts now reference `content/media-hook.js`.

### Added

- Test result diagnostics in the options page: web-audio suffix
  (`+N web audio`), scanned/unreachable tab counts, and the
  resistant-player hint (`options_testResistant`), EN + AR.
- `test/media.test.ts` + `test/mediatest.test.ts` rewritten around the
  new contracts (world MAIN injections, per-frame aggregation, hostile
  frames, discarded-tab skipping, resistant hosts, trampoline
  self-containment, manifest MAIN-world registration, i18n parity);
  the browser mock now simulates page worlds so the REAL trampolines are
  exercised end-to-end in Node.
- `scripts/e2e-media-check.py`: real-Firefox E2E (ESR 140 headless) with
  a fixture page hosting every hard case — in-DOM, detached,
  shadow-DOM and cross-origin-iframe audio plus a running Web Audio
  context — proving pause and resume through the actual options-page
  buttons on the actual built extension.

## [1.1.22] — 2026-09-29

The permission experience the owner ordered: a first-install landing page
that enables everything in one prompt, a real warning when media pause
cannot work, and a faster, better-feeling alert-window control.

### Added

- **First-install onboarding page (`onboarding/`).** A landing page opens
  automatically on the very first install (background `onInstalled`,
  reason `install` only — upgrades and restarts never re-open it) and
  walks the user through what Tcalm needs: the required core (granted
  automatically), and the optional extras. One button requests ALL
  optional permissions in a single native Firefox prompt (`scripting` +
  `<all_urls>` + `https://ipwho.is/*`), so media pause and IP location
  work out of the box when enabled. The page renders the live permission
  state (including grants/revokes made from about:addons while it is
  open, via `permissions.onAdded`/`onRemoved`), hands off to the settings
  page, and closes itself politely. Fully bilingual (EN/AR), themed
  (light/dark/system), standalone lean CSS (~300 lines, no options.css
  import), boot-warning + diagnostics contracts identical to the other
  extension pages, and bundled/verified by `scripts/build.mjs` +
  `scripts/audit.mjs` (no new manifest permissions — AMO policy clean).
- **"Permission setup" entry in Settings.** The media section's
  permission card gains a button that reopens the onboarding page
  anytime, so the guided permission flow is never a first-run-only dead
  end.
- **Permission warning states.** The flat "Site access permission" row
  became a status card: amber warning (themed `--warn` tokens, AA
  contrast) when the permission is off — naming the consequence and
  leading with the grant action — and a green confirmation when on, at
  which point the grant button retires. One `data-state` attribute
  drives both looks; `denied` is the pre-JS default so the warning
  paints immediately.
- **Test-media permission gate.** "Test media pause" now checks the
  permission first and answers with a localized warning ("enable the
  site access permission first") instead of the misleading "no playing
  media" — and the background handler short-circuits with
  `permissionMissing: true` before touching any tab (no `tabs.query`, no
  `executeScript` attempts, no messages when the feature is dormant).

### Changed

- **Alert-window mode control: select → 3-way iOS segment.** The mode
  picker is now a native-feeling segmented control (Always / Fallback /
  Never) with the sliding thumb generalized to thirds, logical RTL
  offsets, and a pressed-state label squash (transform/opacity only —
  compositor-only, no layout). One tap switches the mode; no dropdown.
- **Short alert-window hint.** The paragraph under the control was cut
  from a five-line wall of text to one concise sentence in both
  languages, with the mode labels shortened to match the segment.
- `DiagContext` extended with `'onboarding'` so the landing page feeds
  the same self-cleaning Diagnostics buffer as every other page.

### Fixed

- *(Hardening)* The boot-warning `[hidden]` rule and all shared contracts
  were re-verified across the new page; unique-id and CSP (no inline
  script/handler) checks are pinned by the new `test/onboarding.test.ts`
  (15 new tests, 240 total).

## [1.1.21] — 2026-09-28

World location database, one-week self-cleaning diagnostics, and the
alert-window default the owner ordered. The settings page can now place
the user in any of 194 countries; the diagnostics log keeps exactly one
week of events and deletes itself afterwards.

### Added

- **World location database (194 countries, 593 cities).** The bundled
  presets grew from 16 countries / 80 cities to essentially every country
  on Earth — each with bilingual (English/Arabic) names, coordinates,
  a country-suggested calculation method, and an IANA timezone. Cities in
  multi-timezone countries (United States, Russia, Brazil, Indonesia,
  Australia, Kazakhstan, …) carry their own zone, so selecting Los Angeles
  or Novosibirsk now yields correct display times instead of the capital's
  zone. The original 16-country Tcalm data survives verbatim (Egypt kept
  its extra cities). Data lives in `scripts/world-data/*.mjs`, is
  validated by `scripts/gen-world-presets.mjs` (unique names, coordinate
  bounds, tz syntax, known methods), and ships as a compact tuple-encoded
  `presets.ts` (~half the object-literal bundle size) that decodes into
  the unchanged `CountryPreset[]` API.
- **Locale-aware country list.** With 194 entries the country `<select>`
  is now alphabetized per display language (Arabic sort ≠ English sort)
  via `Intl.Collator`; a "194 countries · 593 cities" hint sits under the
  row in both languages.
- **Diagnostics retention summary.** The Diagnostics card opens with a
  status line ("showing X of Y events — auto-deleted after 7 days") and
  renders up to 60 entries instead of 12; the full week remains
  copy-to-supportable.

### Changed

- **On-screen alert window defaults to Never.** Fresh installs now rely
  on the system notification channel only, per the owner's decision. The
  guaranteed-visible window remains fully available — 'always' and 'auto'
  are explicit opt-ins, and the option list labels the default clearly in
  both languages. Saved settings are never migrated: users who chose a
  mode keep it.
- **Diagnostics keep one week, then self-clean.** Entries older than
  7 days are dropped on write, on read, and by a background sweep (boot +
  the 6-hourly integrity alarm; writes back only when something actually
  expired). The ring cap rose 30 → 120 so a full week of real events
  stays visible, while storage stays bounded at ~45 KB worst case — the
  log can no longer affect database size or add-on performance.
- **Country method hints derive from the world database.** IP-locate and
  country selection now suggest a calculation method for all 194 countries
  (English or Arabic names, plus USA/UK/UAE/KSA aliases) instead of the
  old six-row hand-written list, which was removed as dead code.
- **Arabic polish.** Clearer save toast ("تم حفظ الإعدادات."), a more
  natural about-author line, and the new world-database and retention
  texts written natively for Arabic grammar (dual-locale numerals).

### Fixed

- **GPS locate now returns the city's own timezone** (via the nearest-city
  lookup), fixing wrong display times near zone boundaries in
  multi-timezone countries.
- Removed the now-dead `.diag-empty` CSS rule (the empty state renders
  through the new summary line).

## [1.1.20] — 2026-09-28

Performance, memory, and polish pass ordered by the owner: faster and
lighter, a real tab-bar icon for the settings page, a second Arabic
typography iteration, dark-mode depth, and an AMO/security/production
audit. Presentation and runtime behavior contracts preserved — zero
markup id, settings-model, or save-flow changes.

### Fixed

- **Dark mode had no elevation**: the dark theme silently inherited the
  LIGHT card-shadow token (a near-invisible 6% black), so dark cards
  floated flat. Dark mode now defines a real deep shadow
  (45% black) and near-solid elevated card surfaces, matching iOS 18's
  flat-but-layered dark material. Themed `scrollbar-color` per theme
  replaces default OS-blue scrollbar thumbs.
- **Helper text contrast (WCAG)**: hints/statuses/notes used the muted
  icon gray (3.9:1 at 12.5–13px — below AA). New dedicated `--hint`
  token (4.9:1 light, 7:1 dark) with a size bump to 13px.
- **Bidi numbers**: coordinate and number inputs are forced `direction:
  ltr`, so signed values and decimals never scramble inside the RTL
  Arabic document.

### Changed

- **Performance — background wake cost halved.** The 1-minute badge tick
  previously read settings + schedule from `storage.local` TWICE per
  fire (once in the scheduler handler, once inside the badge update):
  4 reads/minute. The scheduler now preloads what it already read and
  passes it to the badge (`BadgePreload`), so a normal tick costs 2
  reads — and 0 when the extension is disabled.
- **Performance — no-op badge writes skipped.** The next prayer changes
  ~5×/day, yet every tick re-sent the same three `browser.action`
  values. The badge module now remembers what it last wrote and skips
  identical round-trips; the three calls also run in `Promise.all`
  instead of serially.
- **Performance — rendering.** `backdrop-filter: blur(28px)` was applied
  to ~30 settings cards, forcing the compositor to blur behind every
  card while scrolling. Blur now lives only on the two true Liquid Glass
  surfaces (sticky topbar + sidebar); the cards are visually identical
  on the flat background and dramatically cheaper to scroll.
- **Tab-bar identity (favicon).** The settings tab now shows the
  extension's golden-mosque logo in the Firefox tab bar (and window/
  taskbar identity for the alert window) — `rel="icon"` 48px PNG on all
  three extension pages.
- **Arabic typography, second iteration.** Arabic documents use a
  dedicated Arabic-first font stack (system Arabic UI font on macOS,
  Segoe UI on Windows, Noto Sans Arabic on Linux) instead of falling
  through 4 Latin fonts; role-by-role optical size bumps (row labels
  15.5px, values 14.5px, hints 13.5px — Arabic script renders optically
  smaller at equal px) and more generous leading (labels 1.6, hints 1.8,
  body 1.7).
- **Comfortable row typography for both languages.** Row labels 14→15px
  (line-height 1.45), value selects and steppers 13.5→14px, segmented
  options 13→13.5px, nav items 13.5→14px, buttons and chips +0.5px;
  text inputs gain a themed caret color.

## [1.1.19] — 2026-09-28

Refinement pass over the v1.1.18 iOS 18 settings design, driven by the
owner's review of the Location-source row: long segmented-control labels
were being clipped, Arabic typography needed real script treatment, and a
few details were still short of iOS 18. Presentation-only again — zero
markup, logic, or settings-model changes (every control id untouched).

### Fixed

- **Segmented controls no longer clip long labels.** "Automatic (browser
  geolocation)" / "تلقائي (تحديد الموقع عبر المتصفح)" (Location source)
  and "All Firefox tabs" / "المواقع المسموح بها فقط" (Media scope) used
  to truncate with an ellipsis (`white-space: nowrap`). They now wrap onto
  a balanced second line and the short sibling label centers vertically —
  the way `UISegmentedControl` grows with long titles. Active segment is
  semibold, inactive regular, matching iOS emphasis.
- **RTL chevron collision (real bug):** the select's physical
  `padding: 6px 24px 6px 10px` reserved chevron space only on the right
  side, so in Arabic the value text overlapped the left-pointing chevron.
  Replaced with logical padding (`padding-inline-end: 24px`) so the
  clearance follows the reading direction in both LTR and RTL. The same
  physical-padding hazard was fixed for allowed-site chips.
- **Arabic typography**: Arabic script joins its letters, and any
  letter-spacing breaks those joins — the negative tracking on titles
  and the positive tracking on uppercase captions are now reset to zero
  for Arabic documents, and Arabic text roles (labels, hints, statuses,
  segments, nav) get taller line-heights (1.4–1.7 vs the Latin 1.25–1.5).

### Changed

- **iOS inset list separators**: hairlines between rows now start at the
  leading edge of the row *text* (56px in: 16px padding + 29px icon +
  11px gap) instead of spanning the full group width, and flip correctly
  with RTL logical offsets — the signature Settings-app detail.
- **Font stack** extended for real-world rendering: SF Pro on Apple,
  Segoe UI Variable Text / Segoe UI on Windows (including its Arabic
  glyphs), Noto Sans + Noto Sans Arabic on Linux, Tahoma as a last
  Arabic-capable fallback.
- **Switches** resized to true UISwitch proportions (50×30 track, 26px
  thumb) and the knob now widens elastically while held, growing away
  from its resting edge, then settles back on release.
- **Numerals are tabular** (`font-variant-numeric: tabular-nums`) in
  steppers, coordinates, selects, and site chips so columns of digits
  align like SF Pro monospaced figures.
- **Toast** pops in with the standard iOS spring (`scale 0.92 → 1`,
  `cubic-bezier(0.2,0.9,0.4,1.1)`) instead of appearing flat.
- `color-scheme: light/dark` declared per theme so native select
  dropdowns, scrollbars, and form widgets follow the app theme.
- Section titles 22px with balanced wrapping; value selects gain
  ellipsis overflow; `::selection` tinted with the brand accent; empty
  i18n hints collapse instead of holding the row gap open; divider
  contrast tuned (0.07 black / 0.1 white) for the inset separators.

### Compatibility & review

- Still Firefox 115+ desktop / 128+ Android, Manifest V3, no new
  permissions, no external resources (40+ inline SVGs only).
- `npm run lint` clean, **217/217 tests pass**, `web-ext lint` 0 errors,
  and the shipped XPI re-verified in real Firefox (ESR 140): segmented
  wrap measured, RTL Arabic letter-spacing/line-height computed, save
  flow re-proven, dark mode + mobile re-screenshotted.

## [1.1.18] — 2026-09-27

The iOS 18 settings redesign, built on the 1.0.8 lineage the owner named
as the stable base (the working tree is exactly that lineage: 1.0.8 plus
every 1.1.x hardening, including the v1.1.17 guaranteed alert window).

### Changed

- **Options page fully restyled in the Apple iOS 18 design language**
  (per the owner's master prompt). Same files (`options.html` / `options.css`
  / `options.js`), same control ids, same settings model, same save flow —
  only the presentation changed:
  - **Liquid Glass surfaces**: `backdrop-filter: blur(28px) saturate(190%)`
    on the top bar, sidebar, and grouped cards; soft ambient brand-tinted
    background glows; `0 8px 32px rgba(0,0,0,0.06)` card shadows.
  - **Inset Grouped Lists** (Apple Settings pattern): hairline
    `rgba(0,0,0,0.05)` dividers between rows, 16px group radii, 12px
    rounded form fields, 999px pills, uppercase category captions.
  - **Native iOS toggle switches** (48×28 track, 24px spring thumb) for
    prayer notifications, chime, and media pause — still real
    `<input type=checkbox>` underneath, so the controller reads them
    exactly as before.
  - **Segmented controls with a floating sliding indicator** for the
    location source and media scope radios (pure CSS `:has()` — no logic
    changes; radios remain keyboard-navigable).
  - **iOS 18 spring press effect** (`scale(0.96)` + `opacity 0.88` with
    `cubic-bezier(0.2,0.9,0.4,1.1)`) on every button and chip.
  - **SF-styled inline SVG icons** (stroke-based, zero external images):
    sidebar section glyphs + tinted squircle plates on key rows.
  - **iOS-style sidebar navigation** (sticky glass panel on desktop,
    horizontal pill scroller under ~920px) with a purely additive
    presentation-only controller at the end of `options.ts`; hidden
    sections keep live DOM state, so every control id stays reachable.
  - **Strict RTL**: all logical CSS properties (`inset-inline-start`,
    `margin-inline-end`, …), chevron mirroring, and segmented indicators
    that flip with `dir=rtl` automatically.
  - Apple system palette for surfaces (#F2F2F7 light / #09090B dark,
    rgba(28,28,30,0.78) dark cards) and system status colors, while the
    Tcalm indigo brand accent (#4F46E5 / #8B93FF) is fully preserved.
- Typography switched to the SF Pro stack (`-apple-system,
  BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue"`)
  with Noto Sans Arabic fallback for Arabic glyph quality.

### Fixed

- CSS validity: the initial draft used `font: <weight> <size> inherit`
  shorthands (invalid CSS — the whole declaration is dropped by
  browsers); replaced with longhand properties so weights really apply.
- `[hidden]` is now enforced with `display:none !important` — author
  `display` rules on live-status elements can no longer defeat the
  controller's hidden toggles.

### Compatibility & review

- Zero functional changes: 217-test suite unchanged and passing; the
  notification/badge/toast logic of 1.1.17 untouched; popup page
  untouched.
- AMO posture unchanged: required permissions still exactly
  `alarms, notifications, storage`; optional `scripting` + hosts; CSP
  `script-src 'self'; object-src 'self'`; no remote code, no eval, no
  external images (inline SVG only); audit + deadcode scanners clean.
- Note: the CSS relies on `:has()` (already used since v1.0.8 for the
  prayer chips) — requires Firefox 121+.

## [1.1.17] — 2026-09-26

The radical notification fix, direct owner feedback on the whole 1.1.x
line: "the notification plays a sound but the browser never shows it",
repeated across v1.1.4 / v1.1.5 and again in v1.1.6. Built on the 1.1.x
lineage (the 1.1.6 tree contains everything that ever shipped in
1.1.4/1.1.5 — the literal 1.1.5 source was never saved to the workspace).

### Added

- **The guaranteed on-screen alert window (`notify/toast.html`).** Root
  cause analysis: `browser.notifications.create()` resolving is NOT proof
  the banner appeared — the OS (Focus Assist / Do-Not-Disturb / per-app
  notification blocks) or Firefox's own notification permission UI can
  suppress the banner while the extension's chime still plays. No
  extension code can force a suppressed OS banner to appear, so Tcalm
  stops depending on it as its only visible channel: at every notified
  prayer (and advance notice) it opens a small Tcalm-owned popup window
  inside the user's active browser window — bottom-right, non
  focus-stealing, auto-closing, click/Esc dismissible, RTL- and
  theme-aware, with a countdown bar. `browser.windows` cannot be blocked
  by any OS notification setting, so the visible outcome is now a
  property of the extension itself.
- **Alert-window modes + duration settings.** "Always show at prayer
  time" (the new default — the guarantee), "Only when the system banner
  fails" (auto: waits up to 6 s for the onShown confirmation before
  escalating), and "Never" (v1.1.6 banner-only behavior). Duration is
  10–60 s (default 25 s).
- **Layered test-notification verdict.** The options-page test button
  now reports BOTH channels: the system banner verdict (onShown proof,
  as in v1.1.6) AND the alert-window verdict — including a real toast
  window you can see the moment you click, even when the banner channel
  is dead on your machine.

### Fixed

- **The notification storm class is dead at two levels.** The scheduler's
  persisted firedEvents ledger (v1.1.6) is now backed by an in-memory
  notifier-level guard (12 h TTL, bounded): the same event hitting the
  notifier twice is dropped and logged — the v1.1.4 "11 maghrib banners
  in 7 minutes" incident cannot recur even if the scheduler dedupe ever
  regresses. One toast window per event key, enforced by the window
  registry.
- **A failed banner no longer silences the alert.** When
  `notifications.create()` throws (permission weirdness, API failure),
  the toast window still opens and the chime still plays — the alert
  survives every single-channel failure. Previously the chime was tied
  to create() resolving; it now follows any successful visible channel.
- **Toast lifecycle is suspend-proof.** Auto-close is owned by a
  one-shot `toast-close` alarm (the event page suspends — only an alarm
  reliably wakes it to close the window), with the page's own timer as
  a second path and `allowScriptsToClose` for immediate dismissal.
  `windows.onRemoved` cancels pending close alarms for windows the user
  closed; pausing the extension closes open toasts.

### Changed

- Version 1.1.17 (jumped past the interim numbers so the fixed build is
  unmistakable in the Downloads folder).

## [1.1.6] — 2026-09-26

Notification-delivery and toolbar-badge correctness release, direct owner
feedback on the v1.1.x builds: "the notification plays a sound but the
browser never shows it", "the popup icon shows Maghrib at almost any time",
and "make sure the notifications permission is granted, works, and is
required — not optional".

### Fixed

- **The toolbar badge now shows the NEXT prayer and can never stick.** The
  v1.1.x badge could sit on "مغرب / Maghrib" all day because its value was
  not re-derived from the current clock. The badge (new
  `src/background/badge.ts`) is now a pure function of the stored schedule
  plus the current time: green prayer name (فجر/ظهر/عصر/مغرب/عشاء or
  Fajr/Dhuhr/Asr/Maghrib/Isha), gray `OFF` when paused, and a tooltip
  carrying the prayer's own time in your 12/24-hour format. It refreshes on
  boot, on settings changes, after every prayer/advance alarm, and on a
  one-minute badge-tick alarm that also self-heals the schedule after a
  missed midnight rollover.
- **"Sound but no banner" is now diagnosable instead of invisible.** A
  notification that `notifications.create()` accepts is not proof the OS
  painted the banner — the OS can suppress banners while the extension's
  chime still plays, which was exactly the reported symptom. The notifier
  now listens to Firefox's `notifications.onShown` (feature-detected) and
  records real display proof to Diagnostics as
  `system banner displayed (maghrib)`; every creation failure is recorded
  with its raw error. The chime only plays after a successful creation, so
  sound-without-banner always leaves a trace explaining it.

### Added

- **Verified test notification.** The options-page "Send a test
  notification" button now reports the REAL outcome: PASS when onShown
  confirms the banner appeared, an actionable warning when the notification
  was created but the OS suppressed the banner (with instructions: allow
  Firefox in OS notification settings, disable Focus Assist / Do Not
  Disturb), and the raw error when creation failed. The notification card
  also states that the notification permission is REQUIRED — granted
  automatically at install, never optional.
- **Startup notification-readiness verification.** On every background
  boot the extension checks that the `notifications` API exists and the
  required permission is actually granted, and records the result in the
  Diagnostics card — so permission problems surface on day one instead of
  as silent no-shows.

### Verified

- Manifest contract: `notifications` stays in required `permissions`
  (granted at install) and is absent from `optional_permissions`.
- New test suites for the badge (next-prayer text in ar/en, OFF when
  paused, minute-tick alarm creation, refresh after prayer events) and the
  notification chain (onShown confirmation, failure diagnostics, verified
  test result); full gates green (tsc, eslint, audit, deadcode) and
  real-Firefox E2E on the shipped XPI.

## [1.0.8] — 2026-09-23

Media-pause correctness release, direct owner feedback on v1.0.7: the
options-page "Test media pause" button ignored the configured pause
duration and auto-resumed after ~8 seconds no matter what.

### Fixed

- **Test media pause now honors "Pause duration (minutes)" exactly, like a
  real prayer event.** The v1.0.7 handler hardcoded an 8-second
  auto-resume, so with the default duration `0` the test paused media for
  a few seconds and then resumed it on its own — the opposite of the
  documented single-pause semantics. The test now runs through the same
  pause core as prayer events (`executeManualPause` in
  `src/shared/media/pauseController.ts`):
  - duration `0` → single pause, **never auto-resumed** — media stays
    paused until you press play again yourself;
  - duration `> 0` → a real hold (periodic re-pause + auto-resume) at the
    configured time, which the new "Resume paused media" button can end
    early.
  As before, the real prayer-time flow was already correct; only the
  test path diverged.
- **Prayer holds keep working when nothing was playing at prayer time** —
  the shared pause core preserves the Tcalm daemon behavior (a hold
  started at prayer time keeps media quiet during the whole window even
  if it started later), while a *manual test* with nothing playing no
  longer creates a phantom hold.

### Added

- **The media test status now names the tabs it paused.** The content
  agent reports the document title (hostname as fallback), clamped to
  80 characters so a hostile page cannot flood the status line; the
  options page shows up to three, with a tooltip listing them all.
  The status also says which mode ran: "stays paused until you press
  play" or "auto-resumes at 17:45" (formatted per the 12/24-hour
  setting).
- **"Resume paused media" button** in the options media card — the manual
  escape hatch that works in BOTH modes: it ends an active hold (duration
  > 0), and it broadcasts a resume for the single-pause mode (duration 0)
  so a test can be undone without hunting for the tab. Safe by
  construction: only elements Tcalm itself paused and that are still
  paused are resumed; nothing that was never playing is started.
- **Clearer "no media found" feedback.** Testing with nothing playing now
  explains what to do (open a tab with audio/video and retry) instead of
  a bare "0 / 0".
- New i18n keys in both English and Arabic for all of the above, plus a
  rewritten duration hint that states the `0` behavior in plain words.

## [1.0.7] — 2026-09-23

Branding fix release, direct owner feedback on v1.0.6: the new official
logo must be the ONLY logo — no old blue base showing behind it.

### Fixed

- **Old blue logo removed from the icon set.** The v1.0.6 icons composited
  the golden mosque onto a night-indigo rounded-square base (with a golden
  halo), which read as the retired blue crescent icon still peeking out
  from behind the new logo. The icons are now the extracted mosque artwork
  ALONE on full transparency — no gradient, no rounded plate, no halo.
  `scripts/make-icons.py` was rewritten around that contract and now
  self-verifies every generated icon (transparent border rows, corners,
  opaque-fraction ceiling) so a background base can never ship again.
- **Cutout de-haloed.** The v1.0.6 extraction left a cream fringe that
  glowed on dark toolbars. The cut now erodes 2px and un-premultiplies
  partial-alpha edge pixels against the measured cream color, so edges
  anti-alias correctly on light AND dark backgrounds (verified by
  pixel-level measurement: <0.5% bright edge pixels remain).
- **Toolbar legibility at 16/32px.** The full logo is wide (310:218); at
  16px the flanking flourishes turned to noise. Toolbar sizes now use a
  central mosque crop (dome + minaret), while 48px+ show the complete
  official logo.

### Changed

- **Popup and options headers show the official logo at its natural
  aspect** (34×24 popup, 40×28 options, 84×59 in the About card) instead
  of a square icon tile, with a soft drop shadow for definition. The
  About card, notification icon and every manifest icon likewise carry
  only the official artwork.

## [1.0.6] — 2026-09-23

Branding, permissions and ergonomics release driven by the owner's review:
the project gets its official golden-mosque logo, the clock defaults to
12-hour with a settings toggle, notifications carry the prayer's own time,
and the permission set is now strictly "required for core, optional for
extras".

### Fixed

- **Settings gear still read as a dense, lopsided blob** at 18px even after
  the v1.0.5 centering fix. Replaced with the canonical Lucide stroke cog
  (explicit hub circle on (12,12), stroke-based, rotationally symmetric),
  pinned by new contract tests that also ban the old fill paths.
- **IP-locate permission could never be granted**: the manifest declared
  the origin `https://ipwo.is/*` (typo) while the code requests
  `https://ipwho.is/*`. Firefox refuses runtime permission requests for
  origins not declared in the manifest, so the "Approximate location via
  IP" button silently failed. Manifest fixed and regression-pinned.

### Changed

- **New official logo.** The golden mosque (dome, minaret, crescent and
  stars) supplied by the project owner is now the extension's icon set:
  the cream background is flood-fill removed, and the artwork sits on a
  rounded night-indigo gradient tile (matching the popup's Fajr/Isha
  family) so it reads on both light and dark toolbars. Sizes 16-512
  generated by `scripts/make-icons.py`; the source artwork lives in
  `assets/logo/`.
- **12-hour clock is the default**, switchable to 24-hour in Settings →
  General → Time format. Applies to the timetable rows, the next-prayer
  card, the live clock, and notification bodies (12-hour renders AM/PM in
  English, ص/م in Arabic; Latin digits everywhere, matching Tcalm parity).
  Existing v1.0.5 users keep working — the stored settings revive with the
  12h default through the merge-onto-defaults normalizer.
- **Notifications now carry the prayer's own time** (rendered in the
  user's format) instead of a generic tagline, for both the at-time and
  the advance-notice variants.
- **Removed the popup hold banner and the version footer** (owner request:
  unnecessary boxes). The build version moved into the new About card on
  the settings page; the media hold itself still works and is visible via
  the options-page test/diagnostics.
- **Permissions split into "required to run" vs "optional feature":**
  `alarms`, `notifications` and `storage` remain required (granted at
  install); `scripting` moved from required to `optional_permissions` and
  is requested together with the host origins from the settings page's
  grant button. `pauseAllTabs` now fails fast when `scripting` is not
  granted instead of throwing per tab.
- **New About card** on the settings page: project logo, runtime-stamped
  version, credit to the original Tcalm project
  (https://github.com/abod8639/Tcalm) with thanks to its author, and the
  browser port attribution (Mohamed Naseem), with a link to the upstream
  repository.

### Removed

- Popup `hold-banner` markup/styles/controller polling and the
  `popup_mediaHold` i18n keys (both languages).
- Popup version footer + version stamping code (moved to the About card).
- Dead `tcalm:get-state` runtime message and `scheduler.getState()`
  snapshot export — their only production consumer was the removed banner.

## [1.0.5] — 2026-09-23

The popup now opens correctly (v1.0.4), so this release is a full UI
overhaul driven by the user's element-by-element review: every prayer gets
its own theme and animation, and several concrete visual defects are fixed.

### Fixed

- **Settings gear icon rendered crooked.** The old SVG path placed the hub
  circle at x=12 while the toothed outline was centered at x≈14.2, so the
  hole sat visibly off-center inside the gear. Replaced with the canonical
  centered Material gear (`fill-rule="evenodd"` guarantees the center
  hole). Regression-pinned in `test/popupui.test.ts`.
- **Toggle switch overflowed its own button.** The 40px track sat inside a
  34px `.icon-button`, spilling 6px and misaligning the header actions.
  New geometry: 46px pill button, 38px track, 16px thumb with a travel that
  lands exactly at the far inset; contract test asserts
  `track ≤ button − 2 × border`.
- **Sunrise (secondary) row rendered in a different face.** It was forced
  to 12.5px/500 while every sibling used 14px/600, reading as a different
  font in the same list. All rows now share size and weight; only the
  muted color and tighter padding distinguish the secondary row.
- **Paused state had no red capsule.** The status chip now shows a green
  capsule with a live dot when running and a red capsule when paused
  (`--ok-*` / `--danger-*` tokens per theme).

### Added

- **Per-prayer visual themes.** Each prayer owns a gradient, accent color,
  decorative glyph and animation on the next-prayer card: Fajr = pre-dawn
  indigo→rose with fading stars and a horizon glow; Dhuhr = midday azure
  with an overhead sun halo; Asr = afternoon gold with a slow light sweep;
  Maghrib = dusk purple→orange with an ember glow at the horizon; Isha =
  deep night with a star field. Timetable rows carry a per-prayer colored
  icon (dawn arrow, risen sun, high sun, slanted rays, setting sun, moon
  + star). All animations are transform/opacity-only and stop entirely
  under `prefers-reduced-motion`.
- **Live progress bar on the next-prayer card**, filling from the previous
  prayer (or local midnight) to the next prayer, updated every second via
  a compositor-only `scaleX` transform; direction mirrors under RTL
  (pixel-verified). The card theme follows the next prayer, keeping the
  card in sync with the actual prayer time.
- **Redesigned meta card** (date + live clock on one row, Hijri date,
  location with pin glyph) and micro-interactions (popup entrance, button
  press, chip dot pulse).

### Changed

- **Popup tick loop split by cost.** Per-second work is limited to the
  countdown, progress bar and theme sync; clock/dates/row statuses refresh
  once per minute; the media-hold banner polls the background every ~20 s
  instead of every second. `Intl.DateTimeFormat` instances for date and
  Hijri labels are now cached per locale/timeZone, eliminating per-minute
  formatter allocation churn.
- **Icons injected via `createElementNS`** (XSS-safe DOM construction, no
  `innerHTML`), consistent with the project's DOM discipline.

### Verified

- 142/142 tests (10 new popup-UI contracts), tsc clean, eslint clean,
  audit clean, dead-code scanner clean, `web-ext lint` 0 errors.
- Real-Firefox panel E2E on the shipped XPI: real X-click opens a full
  359×602 panel, stays open, renders content, closes with Escape;
  Alt+Shift+P works; VLM screenshot review confirms the gear is symmetric,
  the switch is proportioned, the chip is green with a dot, all six rows
  share one typographic face, and no layout defects.
- Arabic RTL run in real Firefox: `dir=rtl`, Arabic names, themed card,
  advancing progress bar, zero console/diagnostic errors.

## [1.0.4] — 2026-09-22

The "popup does not open" root-cause fix. Every prior release rendered the
popup page correctly, but the TOOLBAR PANEL collapsed to a ~32px hairline,
which users reasonably report as "it does not open".

### Fixed

- **Popup panel width trap (root cause).** `popup.css` clamped the body
  with `max-width: 100vw`. In an action popup, viewport units resolve
  against the panel's own current size: Firefox measures the document
  mid-load (before CSS applies), clamps the panel to ~32px, and `100vw`
  then locks the body to that value — every re-measure returns the same
  tiny width, so the panel can never grow back. The fix is fixed pixel
  dimensions only (`width: 372px; min-height: 480px`). Verified by a
  pixel-diff end-to-end test that opens the REAL panel via a real X-level
  toolbar click and a real keystroke: before the fix the panel rendered
  32×634 px; after it, 374×620 px with full content. (The user-visible
  console warning "Layout was forced before the page was fully loaded" —
  `ext-browser-content.js` — is Firefox measuring during load and is
  exactly the seed of this trap; it is benign by itself.)
- **Removed the mobile `<meta name="viewport">`** from popup.html and
  options.html. Extension pages are desktop documents; the meta can only
  interfere with panel content sizing (kept out defensively).

### Added

- **Persistent diagnostics.** A capped (30-entry) ring buffer in
  `storage.local` records uncaught errors, unhandled rejections, failed
  resource loads, popup-bootstrap failures and a boot watchdog timeout
  from every context (popup / options / background), plus one install
  marker. The options page gains a **Diagnostics** card that renders the
  log with a one-click "copy for support" action (clipboard with a
  download fallback) and a clear button. Never throws by contract.
  Future failures now explain themselves instead of requiring a support
  round-trip.
- **Keyboard shortcut to open the popup.** `Alt+Shift+P` (a
  `commands._execute_action` binding) opens the popup without depending
  on toolbar placement — useful whenever the toolbar button lives behind
  the unified-extensions (puzzle) button.
- 12 new tests: panel-width-trap CSS contracts, viewport-meta ban,
  command wiring, diagnostics wiring, and a functional ring-buffer suite
  (cap, truncation, corrupt-data tolerance, never-throw).
- True panel-level E2E harness (`webdriver-panel-e2e.py`): real Firefox
  window on Xvfb, temporary add-on install, real XTEST click on the
  action entry, full-screen pixel-diff assertions, plus the popup DOM
  check in both en-US and ar locales.

## [1.0.3] — 2026-09-22

Production-hardening release: dead-code sweep, a live toolbar status
badge, and a versioned-literal desync guard in CI.

### Added

- **Toolbar status badge.** The background event page now stamps a badge
  on the toolbar icon: green **OK** = running and enabled, gray **OFF** =
  paused. This makes "the extension is alive" verifiable at a glance,
  without opening anything — direct follow-up to the support report
  "the GUI from the toolbar does not open", where a dead add-on and a
  broken popup were indistinguishable.
- **`scripts/deadcode.mjs`** — a zero-dependency static cross-reference
  audit wired into `npm run lint` and the release packaging: dead
  exports, unreferenced i18n catalog keys, unused CSS classes,
  manifest permissions without API usage, direct `console.*` calls,
  `debugger` statements, TODO markers, and version-literal desync
  (`tcalm-vX.Y.Z` mentions in shipped docs/UI must equal the manifest
  version). Exit 1 on any finding.
- Contract test pinning the badge wiring (init + settings-change
  listener) in `test/bootsafety.test.ts`.

### Fixed

- **Stale version constant.** `constants.ts EXTENSION_VERSION` was
  still `'1.0.0'` while the manifest had moved on — the background log
  claimed the wrong build. The constant is now removed entirely; the
  background reads `browser.runtime.getManifest().version` at runtime,
  making the manifest the single source of version truth.

### Removed (dead code, verified by the new scanner)

- Functions: `arccot`, `sunDeclination`, `asrDepression` (duplicate of
  the engine's own asr formula), `solarNoonLocalHours`, `minutesUntil`,
  `clearAllData`, `isValidLatitude`, `isValidLongitude`,
  `safeJsonParse`, `catalogKeys`, `isPrayerNotificationId`,
  `distanceKm`/`AGENT_FILE`/`asrAngle`/`deactivate`/`playChime`/
  `arcsin`/`arccos`/`fixAngle`/`CATALOGS`/`DEFAULT_METHOD_ID` unexported
  (kept as module-private where internally used).
- Constants: `EXTENSION_VERSION`, `EXTENSION_ID`, `NOTIFIER_VERSION`,
  `PRESET_COUNT` (removed from both the module and its generator).
- i18n keys never referenced anywhere: `popup_calculating`,
  `popup_hijriUnavailable`, `status_error`, `error_unknownPrayer`,
  `error_invalidTimezone` (both en and ar catalogs).
- Unused re-export `export { resumeTabs }` and its import in the
  background entry point.

## [1.0.2] — 2026-09-22

Makes the running build **visibly identifiable**, ending the "which file did
I actually load?" confusion reported during v1.0.1 support.

### Added

- **Version badge in the popup and options page footers.** The badge is
  stamped at runtime from the real `browser.runtime.getManifest().version`,
  so it always shows the version Firefox actually loaded — open the popup
  and read "v1.0.2" at the bottom to confirm you are on the fixed build.
  A static fallback text covers the no-JavaScript case (which the boot
  warning already diagnoses separately).
- **Versioned artifact filenames.** The packages are now
  `tcalm-v1.0.2.xpi` and `tcalm-v1.0.2-source.zip` instead of the
  previously identical `tcalm-firefox-extension.*` names, so the newest
  download is unmistakable in any Downloads folder. Filenames are derived
  from the manifest version automatically by `scripts/package.mjs`.
- Three new boot-safety contract tests pin the badge, the runtime stamping
  and the versioned filenames.

## [1.0.1] — 2026-09-22

Fixes a real-world report: popup opened as a blank, tall window and the
extension appeared completely dead.

### Fixed

- **Source archive was not loadable.** The v1.0.0 source zip had
  `manifest.json` at its root but no built files, so loading it through
  `about:debugging` produced a dead background page and an unresolvable
  popup URL (a blank window). The source archive is now assembled with the
  complete built extension at its root plus `src/`, `test/`, `scripts/`
  and docs alongside it — loading either the XPI **or** the extracted
  source archive via `about:debugging` now works identically.
- `browser.action.openPopup()` is now feature-detected (Firefox 127+;
  `strict_min_version` is 115) instead of being called unconditionally,
  which could throw a `TypeError` on notification click in older Firefox.

### Added

- Popup and options pages now carry a bilingual (English/العربية) static
  boot warning that is visible until the JavaScript bundle executes. If
  the code ever fails to load or crashes during startup, the user sees an
  actionable message with install instructions instead of a blank window;
  startup errors are surfaced in the box itself.

## [1.0.0] — 2026-09-21

First release: the Firefox-native re-imagining of
[Tcalm v1.1.0](https://github.com/abod8639/Tcalm).

### Added

- Offline astronomical prayer-time engine (Fajr, Sunrise, Dhuhr, Asr,
  Maghrib, Sunset, Isha) — no remote API, verified against an independent
  NOAA implementation and Tcalm's published reference times.
- 14 calculation methods with Tcalm/Aladhan ids (default: Egyptian General
  Authority of Survey), Standard/Hanafi Asr, four high-latitude rules.
- Event-driven scheduler on `browser.alarms`: per-prayer alarms, local
  midnight rollover, 6-hour integrity self-healing, missed-alarm skipping,
  persistent fired-events dedupe ledger, restart recovery.
- Prayer notifications (English/Arabic), optional advance notice, optional
  soft chime, per-prayer toggles.
- Media pause in Firefox tabs: on-demand content-script injection, per-frame
  pause of playing HTML5 media, hold mode with 1-minute sweeps and
  restore-only-what-we-paused resume, single-pause mode matching Tcalm,
  all-tabs or allowlist scope.
- Popup UI: live countdown, today's timetable with states, Hijri date,
  light/dark/system themes, full RTL Arabic.
- Options page: location (presets from Tcalm's 16-country/80-city database,
  geolocation, opt-in IP lookup), calculation, notifications, media,
  appearance, language, advanced tools (recalculate, clear cache,
  export/import — including Tcalm `config.json` import — reset, tests).
- Typed, validated settings/storage layer; i18n catalogs as the single
  source for runtime strings and generated `_locales`.
- Security tooling: strict CSP, no eval/innerHTML/remote code, least
  privilege (4 permissions; optional origins only), build-time audit script.
- 109 unit tests, Python oracle fixtures, full build/package pipeline
  producing an unsigned XPI + source archive.

### Deliberately not ported from the original

- Aladhan API dependency (replaced by the local engine).
- OS-level media control via MPRIS/playerctl/AppleScript — impossible for a
  WebExtension; documented instead of faked.
- Silent first-run IP geolocation (replaced by an explicit, permission-gated
  button).
- systemd service / PID file management (Firefox owns the lifecycle).

[1.0.0]: https://github.com/abod8639/Tcalm
