# Tcalm for Firefox

Islamic prayer times, notifications, and automatic media pause — as a
self-contained, offline, privacy-respecting Firefox extension.

English | [العربية](#العربية)

> ## ⚡ Install / التثبيت — read this first
>
> **Load `tcalm-v1.1.26.xpi`** via `about:debugging` →
> **Load Temporary Add-on…** — not the source files. Full step-by-step
> instructions (English + العربية): **[INSTALL.md](INSTALL.md)**.
>
> **حمّل ملف `tcalm-v1.1.26.xpi`** من صفحة `about:debugging` ←
> زر **Load Temporary Add-on…** — وليس مجلد المصدر. الخطوات كاملة في
> **[INSTALL.md](INSTALL.md)**.

A Firefox-native re-imagining of [Tcalm](https://github.com/abod8639/Tcalm),
abod8639 lightweight Linux/macOS prayer-time daemon. Where the original
runs as a Python daemon that talks to MPRIS, `playerctl`, and AppleScript to
pause your desktop media, this extension brings the same idea to the browser:
**prayer times computed locally, notifications at prayer time, and supported
HTML5 media in Firefox tabs paused while you pray.**

```
┌──────────────────────────────────────────┐
│ Tcalm            Active          ⚙ [ON]  │
├──────────────────────────────────────────┤
│            NEXT PRAYER                   │
│            Dhuhr                         │
│            12:49 PM      in 2h 17m       │
├──────────────────────────────────────────┤
│ Monday 21 September 2026                 │
│ 10 Rabiʻ I 1448 AH                       │
│ Cairo, Egypt                             │
│ ⏱ 10:32 AM                               │
├──────────────────────────────────────────┤
│ TODAY'S PRAYERS                          │
│ Fajr      5:14 AM            Passed      │
│ Sunrise   6:40 AM                        │
│ Dhuhr     12:49 PM              Next     │
│ Asr       4:19 PM                        │
│ Maghrib   6:57 PM                        │
│ Isha      8:15 PM                        │
└──────────────────────────────────────────┘
```

_Times shown in the default 12-hour format; switch to 24-hour in
Settings → General → Time format._

## Features

- **Offline-first prayer times.** All calculations run locally with an
  astronomical engine (solar declination + equation of time). No network is
  required for normal daily operation — the extension never calls an API to
  know today's times.
- **14 calculation methods** with the same ids Tcalm/Aladhan uses, including
  the Egyptian General Authority of Survey (default, as in Tcalm), MWL, ISNA,
  Umm al-Qura, Karachi, Tehran, Moonsighting, and more. Standard and Hanafi
  Asr, high-latitude rules.
- **Prayer notifications** in English and Arabic — each one carries the
  prayer's own time in your chosen format — with optional advance notice
  (N minutes before) and a soft chime.
- **Media pause in Firefox tabs.** At prayer time the extension pauses
  playing media in tabs it is allowed to touch — including custom players
  that keep their audio element detached from the page DOM (SoundCloud,
  Spotify web and friends), media inside cross-origin iframes, open shadow
  roots, and pure Web Audio sites (their `AudioContext`s are suspended and
  later resumed) — and in "hold" mode resumes exactly what it paused when
  the hold ends. The **Pause duration setting is honored exactly**: `0`
  (default) pauses once and never resumes anything for you — media stays
  silent until you press play again — while `> 0` keeps media quiet for the
  whole window and then restores only what Tcalm paused itself. The options
  page's **Test media pause** button runs the exact same code path, **names
  the tabs it paused** (page title), reports how many tabs were scanned,
  and explains when a page reports playing media that resisted being
  paused; **Resume paused media** undoes a test or ends a hold early. See
  [Media control — the honest limits](#media-control--the-honest-limits).
- **Two location modes.** Manual (with Tcalm's 16-country/80-city preset
  database, or raw coordinates), or automatic via Firefox's geolocation after
  you explicitly grant it. Optional, clearly-labeled IP-based approximation
  (the only feature that ever contacts a third party).
- **Automatic timezone detection** (or a manual IANA zone), DST-aware,
  recalculated daily.
- **Hijri date** in the popup, with a day adjustment setting.
- **12-hour clock by default, 24-hour optional.** Every time you see —
  popup rows, next-prayer card, live clock, notifications — follows the
  Time format setting in General (12-hour with AM/PM or ص/م, or classic
  24-hour).
- **Beautiful, responsive popup** with live countdown, dark/light/system
  themes, full keyboard access, and complete RTL support for Arabic. The
  extension icon is the project's official golden-mosque logo artwork on
  full transparency — no background plate — with a soft drop shadow that
  keeps it legible on light and dark toolbars alike (16/32px toolbar
  sizes use a central mosque crop for crispness).
- **iOS 18–styled settings (v1.1.20):** the options page now speaks the
  Apple iOS 18 design language — Liquid Glass on the sticky navigation
  surfaces, inset grouped lists with text-inset hairline dividers,
  native-style 50×30 toggle switches, segmented controls with a sliding
  indicator (long labels wrap, never clip), pill buttons with spring
  press feedback, SF-styled inline SVG icons,
  and a sidebar (pill scroller on narrow screens) for section
  navigation. v1.1.20 adds: the extension logo in the Firefox **tab bar**
  (favicon), a comfortable **Arabic-first typography scale**
  (Arabic-dedicated font stack, 15.5px row labels, generous Naskh
  leading, LTR-safe number fields), real **dark-mode elevation** (deep
  shadows + themed scrollbars instead of the inherited light shadow),
  AA-compliant helper-text contrast, and a **performance pass** (background
  wake cost halved, no-op badge writes skipped, per-card blur removed so
  scrolling is dramatically cheaper). 100% of the underlying settings
  logic, ids, and save behavior unchanged; fully RTL-aware in Arabic.
- **World location database (v1.1.21):** pick your location from
  **194 countries and 593 cities** worldwide — bilingual English/العربية
  names, coordinates, and timezones included. The list is alphabetized
  per display language, cities in multi-timezone countries (US, Russia,
  Brazil, Indonesia, …) carry their own timezone, and picking a country
  still suggests its conventional calculation method. Fully offline.
- **Self-cleaning diagnostics (v1.1.21):** the support log keeps exactly
  one week of internal events (capped at 120 entries ≈ 45 KB) and
  auto-deletes expired rows, so it can never affect storage size or
  performance. Fresh installs rely on the system notification channel
  only; the guaranteed on-screen alert window is an explicit opt-in.
- **First-install onboarding + permission center (v1.1.22; 3-step wizard
  since v1.1.26):** the landing page opens on the very first install as a
  guided wizard — *Welcome* (what Tcalm does + the platform palette the
  media pause reaches), *Location* (country/city quick-setup from the
  194-country database; continuing applies the country-suggested
  calculation method and the city's timezone, so times are right from the
  first minute), and *Permissions* — the **one prompt** that enables every
  optional permission (media pause site access + IP location), or skip and
  keep the minimal install. It stays reachable anytime from *Settings →
  Media pause → Permission setup*, tracks the live permission state
  (grant/revoked), and hands off to the settings page. The media section
  shows a real **amber warning card** when the permission is off, and
  *Test media pause* refuses to run — with a clear warning — until the
  permission is granted (no misleading "no playing media" answers, no
  wasted tab sweeps).
- **Bilingual**: English and العربية, switchable at runtime.
- **No tracking, no analytics, no remote code, no eval.** See
  [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

## Table of contents

- [Installation](#installation)
- [Media control — the honest limits](#media-control--the-honest-limits)
- [How prayer times are calculated](#how-prayer-times-are-calculated)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Build](#build)
- [Packaging](#packaging)
- [Signing & AMO submission](#signing--amo-submission)
- [Permissions audit](#permissions-audit)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [License & attribution](#license--attribution)

## Installation

### For everyday use (signed release)

Once reviewed and signed on addons.mozilla.org (AMO), install Tcalm from its
AMO listing like any other Firefox extension. Signed extensions update
automatically.

### For testing this build (unsigned XPI)

Regular Firefox does not install unsigned extensions. To test the package
produced by this repository:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Pick `tcalm-v1.1.26.xpi` (or `dist/manifest.json`, or
   `manifest.json` at the root of the **extracted source archive** — since
   v1.0.1 the source archive's root is a complete, loadable copy of the
   built extension).

> ⚠️ Do **not** point Firefox at the repository's `src/` tree or at a source
> archive that lacks the built files: `manifest.json` references
> `background.js`, `popup/popup.js`, etc., which only exist after
> `npm run build`. Loading a manifest without them yields a blank popup and
> a dead background page. Since v1.0.1 the popup shows a bilingual warning
> box explaining exactly this if it ever happens.

See **[INSTALL.md](INSTALL.md)** for the full bilingual walkthrough.

The extension stays loaded until Firefox closes. For persistent unsigned
installation, use [Firefox Developer Edition / ESR with
`xpinstall.signatures.required` set to `false`](https://support.mozilla.org/kb/add-on-signing-in-firefox)
(or self-distribution via `about:config → xpinstall.signatures.required` in
Enterprise policy deployments). **This repository ships an UNSIGNED XPI — see
[Signing & AMO submission](#signing--amo-submission).**

### First run

1. Click the Tcalm toolbar icon (golden mosque; a green **OK** badge means
   the background is running). If you do not see it in the toolbar, look
   behind the **unified-extensions (puzzle 🧩) button** — Firefox places
   extension buttons there on some setups. You can also press
   **Alt+Shift+P** to open the popup from the keyboard.
2. Open settings (cog button) and set your location:
   - pick a **country and city** (Tcalm's preset database, which also
     pre-selects the customary calculation method and timezone), or
   - enter **latitude/longitude** manually, or
   - press **Detect my location** (Firefox will ask for permission), or
   - optionally use **IP-based approximation** (see [Privacy](#privacy)).
3. Optionally enable **media pause** — Firefox will ask you to grant site
   access when you press the grant button. Try it with **Test media pause**.
4. That's it. The popup shows today's timetable and a live countdown to the
   next prayer. The **About** card on the settings page shows the exact
   running version (e.g. `v1.1.18`) so you can always confirm which build you
   loaded.

If anything ever misbehaves, open the settings page → **Diagnostics**:
Tcalm records its own internal errors there, and one click (**Copy for
support**) puts a plain-text log on your clipboard to send with a bug
report — no console or developer tools needed.

## Media control — the honest limits

**What the original Tcalm can do that this extension cannot:** pause
system-wide media — Spotify desktop, VLC, MPV, media keys, anything exposed
over MPRIS/AppleScript. A Firefox WebExtension has **no operating-system-level
media control**. This extension does not pretend otherwise, and does not use
native messaging to fake it.

**What this extension actually does (v1.1.26 and later):**

- Runs a tiny page-world script in Firefox tabs (all frames, every origin
  you granted site access for). It is registered at `document_start` for
  pages loaded after the extension, and re-injected on demand at pause time
  so tabs that were already open stay covered too.
- The script interposes `HTMLMediaElement.prototype.play/pause`, so it sees
  media elements **no DOM query can reach** — including players that keep
  their element detached from the page (SoundCloud does exactly this),
  elements inside open shadow roots, and media inside cross-origin iframes.
  For tabs that were already playing before the script arrived, a short
  getter trap (currentTime/paused/duration/…) harvests the live player's
  element reference while the page reads its own progress.
- Pure **Web Audio sites** are covered too: every `AudioContext` the page
  creates is tracked, suspended at prayer time, and resumed afterwards.
- The same page-world mechanism is what makes the big platforms work —
  **YouTube, Netflix, Spotify, Apple Music, Anghami, Deezer, Shahid,
  SoundCloud and every other player in a tab**: they are all built on
  HTML5 media elements (with or without DRM/MSE), detached or not, plus
  the occasional Web Audio pipeline. No per-site code is needed, and
  new platforms are covered the day they ship.
- **Anti-auto-resume watch (v1.1.26):** streaming players with a "keep
  playing" state machine (live radio, ad pipelines, auto-next queues)
  restart playback milliseconds after an external pause. The initial
  pause now re-checks at +200 ms / +500 ms and re-pauses whatever
  restarted — a pause count of N means N elements actually stayed
  quiet, not "N were quiet for one tick". The 0.5 s window is far below
  human reaction time, so your own play presses still always win.
- It pauses every **media element that is actually playing** at that
  moment — never starts media that was already paused.
- **Fast and targeted (v1.1.24):** the pause only visits tabs that can
  plausibly be making noise — tabs currently producing sound (Firefox's
  audible indicator, i.e. the speaker icon), tabs that produced sound
  moments ago (covers track gaps and buffering stalls — SoundCloud between
  tracks), and the active tab of every window. Targets run **in parallel**,
  so the pause lands in one round trip even with a hundred tabs open;
  the v1.1.23 design iterated every tab one by one and could take seconds.
  Trade-off: a tab that is *playing but silent* (site-muted, volume 0) is
  not force-paused anymore — it makes no sound during prayer either way.
- **Single pause mode (duration 0, the Tcalm default):** one pause;
  the **Resume paused media** button restores exactly the tabs of the
  **most recent pause event** (the test/prayer that actually paused
  something) — older paused tabs stay paused until you play them
  yourself. v1.1.24 fix: the button previously restarted every
  previously paused tab at once.
- **Hold mode (duration > 0 minutes):** media stays quiet for the whole
  window. v1.1.26 arms **damped burst sweeps** at +5 s, +10 s, +20 s and
  +35 s after the hold starts (the original Tcalm daemon re-paused every
  5 s), then the 1-minute periodic sweep takes over — a player that keeps
  restarting during the prayer window goes quiet in seconds, not up to a
  minute. When the hold ends, the extension resumes **only the elements it
  paused itself at the start of the prayer event**. Media that was already
  paused before the prayer, or that you started yourself during the window,
  is never auto-resumed. Manual **Resume** during a hold ends it early and
  restores the same set.
- Scope can be **all tabs** or an **allowlist of sites** you manage.
- Tabs without granted host permissions, privileged pages (`about:*`,
  addons.mozilla.org), and sites outside the allowlist are skipped silently.
- If a page still reports playing media that resisted every reach (an
  exotic player on a tab opened before the extension arrived, say), the
  test button says so and names the site — reloading that tab once makes
  it reachable.

## How prayer times are calculated

The engine implements the classic angle-based methodology — the same family
of algorithms behind PrayTimes.org and Aladhan (which the original Tcalm
queried remotely):

```
solar noon (clock) = 12 − EoT + (tz − lng/15)
time(prayer)       = solar noon ± hourAngle(depression angle)
depression(fajr/isha) = method angle (e.g. Egypt: 19.5° / 17.5°)
depression(sunrise/sunset/maghrib) = 0.833°
asr altitude       = arctan(1 / (shadowFactor + tan(|lat − decl|)))
```

- **Solar position**: Meeus-style truncated series for declination and
  equation of time (sub-minute accuracy — verified against an independent
  NOAA implementation in the test suite and against the reference values
  published in Tcalm's own README).
- **Method parameters**: fajr/isha angles or "N minutes after maghrib"
  (Umm al-Qura family), per-method maghrib angle (Tehran 4.5°).
- **Asr**: shadow factor 1 (Standard/Shafiʿi) or 2 (Hanafi).
- **High latitudes**: night-middle / angle-based / one-seventh rules, or
  "no adjustment" — in which case uncomputable times are shown as `—` rather
  than faked.
- **Timezones**: every time is converted to UTC through the IANA database via
  `Intl`, so DST is handled exactly as Firefox renders it. Schedules roll
  over at local midnight.
- **Midnight crossing**: prayer times past midnight (high-latitude Isha, for
  example) map to the correct next calendar day.

Times are rounded to the minute, as in Tcalm.

**Differences from the original Tcalm calculation pipeline** (documented in
[MIGRATION.md](MIGRATION.md)):

1. Tcalm's primary source was the **Aladhan API** with a local file cache and
   a simplified offline fallback. This extension's local engine is the
   *primary* source — the remote dependency is gone entirely.
2. Tcalm's offline fallback used approximate Spencer formulas and silently
   clamped impossible hour angles (polar regions would produce nonsense
   times). This engine keeps the methodology but fixes both issues.
3. Makkah-family Isha in Tcalm's fallback was approximated as 19°; this
   engine uses the correct "90 minutes after maghrib" convention.

## Configuration

All settings live in `browser.storage.local` and are edited in the options
page:

| Setting | Meaning | Default |
| --- | --- | --- |
| `enabled` | Master switch (like starting/stopping the Tcalm daemon) | on |
| `language` | Follow Firefox / English / العربية | follow Firefox |
| `locationMode` | Manual or automatic (geolocation) | manual |
| `country`, `city` | Display labels + preset picker | Egypt, Cairo |
| `latitude`, `longitude` | Calculation coordinates | 30.0444, 31.2357 |
| `timezone` | IANA zone or `auto` (system) | auto |
| `calculationMethod` | 1–15 (Tcalm/Aladhan ids) | 5 (Egypt) |
| `asrMethod` | Standard or Hanafi | standard |
| `highLatitudeRule` | night-middle / angle-based / one-seventh / none | angle-based |
| `notificationsEnabled` | Prayer notifications | on |
| `notificationMinutesBefore` | 0–30 min advance notice | 0 |
| `notificationSoundEnabled` | Soft chime | on |
| `prayerNotifications` | Per-prayer toggles (Fajr…Isha) | all on |
| `mediaPauseEnabled` | Pause media at prayer time | off |
| `mediaPauseDuration` | Minutes to hold; 0 = single pause | 0 |
| `mediaScope` | All tabs or allowlist | all |
| `mediaAllowedSites` | Allowlist host names | empty |
| `hijriOffset` | Hijri day adjustment (−2..2) | 0 |
| `theme` | Light / dark / system | system |

Settings can be **exported/imported as JSON** (validated on import) and
**reset to defaults**. The importer also understands the original Tcalm
daemon's `config.json`, mapping its keys to this extension's model.

## Architecture

```
tcalm-firefox/
├── manifest.json               # MV3, Firefox-specific settings
├── _locales/ (generated)       # en + ar message catalogs
├── src/
│   ├── background/             # event page: scheduler + message router
│   │   ├── index.ts            # listener wiring only
│   │   └── scheduler.ts        # alarm lifecycle, dedupe, recovery
│   ├── popup/                  # view-only UI (countdown, timetable)
│   ├── options/                # settings UI
│   ├── content/
│   │   └── mediaAgent.ts       # injected media-pause agent
│   └── shared/
│       ├── prayer/             # astro.ts + engine.ts (offline calculation)
│       ├── time/               # tz.ts (IANA/DST) + format.ts
│       ├── schedule.ts         # DaySchedule construction, next-prayer
│       ├── storage/            # typed settings + cache layer
│       ├── geo/                # presets, nearest-city, optional IP
│       ├── media/              # pauseController (background side)
│       ├── notify/             # notifications + chime
│       ├── i18n/               # en/ar catalogs, runtime switch, RTL
│       └── utils/              # validation, logging
├── test/                       # 109 unit tests + fixtures + browser mock
├── scripts/                    # build, audit, package, asset generation
└── assets/                     # icon set + chime audio
```

The background page owns all state and business logic; the popup and options
pages are pure views that communicate through `browser.storage` and
`runtime.sendMessage`. The full design is documented in
[ARCHITECTURE.md](ARCHITECTURE.md), and the component-by-component mapping
from the Python daemon lives in [MIGRATION.md](MIGRATION.md).

## Development

Requirements: Node.js ≥ 22.18 (native TypeScript type-stripping for tests),
npm, Python 3 (icons/audio generation), `zip`.

```bash
git clone <this repository>
cd tcalm-firefox
npm install          # dev toolchain only: typescript, esbuild, eslint
npm run assets       # regenerate icons (Pillow) + chime (ffmpeg) — optional
```

## Testing

```bash
npm test
```

109 tests cover: solar astronomy (Julian days, declination, equation of time
against known extremes), the prayer engine against an **independent NOAA
implementation** and Tcalm's published reference times, method tables, Asr
variants, high-latitude/polar behavior, timezone handling and DST boundaries
(New York, Cairo), midnight crossing, schedule freshness, next-prayer
selection, settings validation/clamping/import (including hostile input),
i18n catalog parity and HTML key coverage, the media pause controller state
machine, and the scheduler (alarm creation, idempotency, dedupe, missed
alarms, restart recovery, midnight rollover, hold recovery).

## Build

```bash
npm run build
```

Bundles the four entry points with esbuild (minified, no source maps),
copies static assets, generates `_locales` from the TypeScript catalogs, and
verifies that every file referenced by `manifest.json` exists. Output is
`dist/` — exactly what ships.

## Packaging

```bash
npm run package
```

Runs build + audit, then produces in `package-out/`:

- `tcalm-v1.1.26.xpi` — the extension package (manifest.json at the
  ZIP root). **UNSIGNED.**
- `tcalm-v1.1.26-source.zip` — the complete buildable source
  (no `node_modules`, `dist`, or git metadata). Since v1.0.1 its **root is
  also a complete, loadable copy of the built extension** (built files at
  the top level, `src/`+`test/`+`scripts/`+docs alongside), so loading it
  via `about:debugging` works out of the box.

## Signing & AMO submission

**This XPI is unsigned.** Regular Firefox releases require a Mozilla
signature; we do not fake one. To get a signed, installable release:

1. **Create the listing.** Go to
   [addons.mozilla.org/developers](https://addons.mozilla.org/developers/),
   sign in, and submit a new extension.
2. **Upload the package.** Submit `tcalm-v1.1.26.xpi`. AMO runs
   automated validation (our manifest, CSP, and permission choices are
   designed to pass it) and then a human review for listing.
3. **Provide the source.** AMO reviewers may ask for buildable source for
   minified code — attach `tcalm-v1.1.26-source.zip`.
4. **Sign via web-ext (CLI path).**
   ```bash
   npx web-ext sign \
     --source-dir dist \
     --api-key AMO_JWT_ISSUER --api-secret AMO_JWT_SECRET
   ```
   `web-ext sign` returns a signed XPI and, for unlisted distribution, a
   update URL. The credentials are AMO API keys generated at
   addons.mozilla.org/developers/addon/api/key/.
5. **Distribute.** Signed builds can be listed publicly on AMO (recommended:
   users get automatic updates) or distributed unlisted (self-hosted XPI with
   update_url in future versions).

See <https://extensionworkshop.com/documentation/publish/> for the full AMO
guide.

## Permissions audit

The permissions the extension NEEDS to run are **required** and granted
automatically at install — nothing core is ever requested later:

| Permission | Why |
| --- | --- |
| `alarms` | Schedule prayer events, the midnight rollover, hold sweeps, and the self-healing integrity check — without a running timer. |
| `notifications` | Show prayer-time notifications (the core Tcalm feature). |
| `storage` | Store settings and the cached schedule locally (`storage.local`; no `storage.sync`). |

The optional media-pause capability adds one optional API permission,
requested **only** via an explicit button press in the options page,
revocable anytime in Firefox's Add-ons settings:

| Permission | Why |
| --- | --- |
| `scripting` (optional) | Inject the media-pause agent into tabs at prayer time. Requested together with the host origins below; the feature stays dormant until granted. |

Optional host permissions (same explicit-button rule):

| Origin | Why |
| --- | --- |
| `<all_urls>` | Pause HTML5 media in all Firefox tabs when you enable "all tabs" scope. The alternative — per-site origins — Firefox cannot prompt dynamically for arbitrary user-entered domains, so one optional grant plus an extension-side allowlist keeps the behavior narrow. |
| `https://ipwho.is/*` | The optional "approximate location via IP" button. One GET request, only when you press it. |

No `tabs` permission (the extension never reads tab URLs — the content agent
checks its own origin), no `webRequest`, no `<all_urls>` at install time, no
remote code. `scripts/audit.mjs` enforces all of this on every build.

## Privacy

- Prayer times are computed **locally**. No prayer data, location, or usage
  leaves your browser.
- Geolocation is requested **only** when you press "Detect my location".
- The only third-party contact is the **optional, opt-in IP lookup**
  (ipwho.is), triggered by an explicit button press, documented in the UI.
- Data stored: your settings and today's cached schedule, in
  `browser.storage.local`, on your device only. Export/import is under your
  control.
- No analytics, no telemetry, no accounts. The manifest declares
  `data_collection_permissions: none` semantics.

Details: [PRIVACY.md](PRIVACY.md).

## Troubleshooting

- **Times look wrong by ~an hour** — your timezone is probably set to
  `auto` and the OS zone is wrong, or you set a manual zone different from
  your location. Check Location → Timezone in settings.
- **Notifications don't appear** — check Firefox's notification permission
  (about:preferences#privacy → Permissions → Notifications) and your OS-level
  do-not-disturb.
- **Media pause does nothing** — it needs the site-access permission: open
  settings → Media pause → "Grant access to all sites", and verify the sites
  are in scope (all tabs, or allowlisted). Desktop apps (Spotify app, VLC)
  cannot be controlled — that's the original Tcalm's job, not a bug.
- **Polar / very high latitude shows `—`** — the sun never reaches the
  Fajr/Isha angles that day. Pick a high-latitude rule (night-middle or
  one-seventh) in settings.
- **After a laptop sleep, no notification fired** — missed events are
  detected and skipped by design (no stale "it's time to pray" at 3am).

## Known limitations

- System-wide media pause is impossible for a WebExtension (see
  [Media control](#media-control--the-honest-limits)).
- Automatic pause needs pre-granted host permissions; Firefox requires the
  grant to happen from a user gesture in the options page.
- Media started *during* a hold window is re-paused (Tcalm daemon parity),
  which some users may find aggressive — reduce the pause duration or use
  single-pause mode.
- Sites with aggressive DRM/anti-tamper (e.g., some embedded players) may
  defeat programmatic pause/resume.
- Notification sound is best-effort: Firefox may block background-page audio
  on some platforms.
- The Hijri date comes from the browser's ICU calendar
  (`islamic-umalqura` with `islamic-civil` fallback); use the day-adjustment
  setting if your local moon-sighting differs.

## License & attribution

MIT — see [LICENSE](LICENSE). This extension is inspired by and derived in
spirit from [Tcalm](https://github.com/abod8639/Tcalm) by Abdelrahman (MIT);
its city preset database, notification strings, method list, and default
configuration are carried over with attribution — with thanks to the author
for the original idea. The browser port is developed by Mohamed Naseem.
The golden-mosque project logo is used with the owner's permission. The
solar-position methodology follows the published PrayTimes.org/NOAA
algorithms (public astronomical formulas). Product names (Firefox, Spotify,
VLC, YouTube) belong to their owners; none are affiliated.

---

## العربية

امتداد فايرفوكس يعرض **مواقيت الصلاة** محسوبة فلكياً على جهازك دون اتصال
بأي خدمة، مع **إشعارات** عند دخول الوقت، و**إيقاف تلقائي للوسائط** في
تبويبات فايرفوكس التي تسمح بها فقط — ثم استئناف ما أوقفه الامتداد نفسه
بعد انتهاء المدة إن اخترت وضع "الإيقاف الممتد".

يحتوي الامتداد على 14 طريقة حساب (الهيئة المصرية العامة للمساحة هي
الافتراضية كما في Tcalm الأصلية)، ويدعم طريقة العصر الحنفية، وقواعد
خطوط العرض العالية، والتاريخ الهجري، والواجهة الكاملة بالعربية مع
دعم الاتجاه من اليمين إلى اليسار.

**ملاحظة مهمة حول الوسائط:** يستطيع امتداد فايرفوكس إيقاف الصوت/الفيديو
(HTML5) داخل تبويبات فايرفوكس فقط، ولا يمكنه إيقاف تطبيقات سطح المكتب
مثل Spotify أو VLC — ذلك من وظائف نسخة Tcalm لسطح المكتب.

الخصوصية: لا يُرسل الامتداد أي بيانات إلا إذا ضغطت أنت زر "الموقع
التقريبي عبر IP" الاختياري. لا تتبع، ولا إحصائيات، ولا أكواد بعيدة.
