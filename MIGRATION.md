# Migration matrix — Tcalm (Python daemon) → Tcalm for Firefox

This document maps every component of the original
[Tcalm](https://github.com/abod8639/Tcalm) (v1.1.0, MIT) to its Firefox
WebExtension equivalent, records the implementation decision, and explains
why. Where a capability cannot exist inside a WebExtension, the closest
*technically correct* alternative is stated — nothing is faked.

## Component matrix

| # | Original Tcalm component | Firefox extension equivalent | Implementation decision | Reason |
| --- | --- | --- | --- | --- |
| 1 | `tcalm` CLI entrypoint (`tcalm start/stop/status/list/test`) | Toolbar popup + options page | Port the *features*, not the CLI: status/list live in the popup, configuration in the options page, `tcalm test` became the "test notification / test media pause" buttons | Extensions have no CLI surface; the browser action is the natural entrypoint |
| 2 | `daemon.py` main loop with `time.sleep(15)` chunks | `browser.alarms` event-driven scheduler (`background/scheduler.ts`) | Replace loops with one-shot alarms per prayer + maintenance alarms | MV3 background pages suspend; a sleeping loop is impossible. Alarms persist across restarts and wake the page exactly when needed |
| 3 | `last_handled` dedupe dict | `firedEvents` ledger in `storage.local` (`prayer:DATE#name` → epoch, TTL-pruned) | Port 1:1, hardened with persistence | The original's dedupe key was `{date}_{prayer}` and lived in memory only — a daemon restart could double-fire. Persisting the ledger makes restart-safe dedupe possible |
| 4 | Sleep-until-next-prayer, 60s cap | Alarm `when:` at each prayer epoch | Direct equivalent | — |
| 5 | Midnight rollover (`wait until 00:00:05`) | `daily-refresh` alarm at next local midnight (timezone-aware) | Port with timezone math via `Intl` | The original relied on naive local midnight; the extension computes it for the *configured* zone, which may differ from the OS |
| 6 | `systemd` user unit (`tcalm.service`) | Firefox lifecycle events (`runtime.onInstalled`, `onStartup`, event-page load) | Replace | The browser is the service manager now |
| 7 | PID file handling (`is_pid_running`, `get_daemon_pid`) | Not needed | Drop | Single-instance guarantee comes from Firefox |
| 8 | `prayer.py` primary source: **Aladhan REST API** (city + coordinates endpoints) | **Removed** — local astronomical engine is primary | Replace | Requirement: no remote dependency for daily operation; privacy; offline. The engine follows the same methodology (angle-based times) with the same method ids/angles, so results match published Aladhan values within a minute at mid latitudes |
| 9 | `prayer.py` cache (JSON file keyed `date_city_country_method`) | `storage.local` schedule cache (`{today, tomorrow}` guarded by coordinates/zone/method/date) | Port, simplified | One-day keys plus source-equality guards make the cache self-invalidating; no unbounded growth |
| 10 | `prayer.py` offline fallback (Spencer EoT + approximate declination, clamped hour angles) | `shared/prayer/engine.ts` + `astro.ts` (Meeus-style series) | Port methodology, upgrade precision and edge handling | The fallback was ±minutes accurate and silently clamped `acos` out-of-range results at high latitudes (nonsense times). The engine keeps the exact formula *structure* (`solar noon = 12 − EoT + tz − lng/15`) and fixes both defects. Verified against Tcalm's own published reference times |
| 11 | Fajr/Isha angles per method (3 branches: Egypt 19.5/17.5, "Makkah" 18.5/19°, else 18/17) | Full method table for all 14 Tcalm/Aladhan ids | Port + complete | The original's fallback approximated; the extension implements every method it advertises (including the Makkah-family "isha = 90 min after maghrib" convention, which the fallback got wrong) |
| 12 | Sunrise/Sunset/Maghrib not in fallback output (API only) | Computed locally: 0.833° sunrise/sunset, method maghrib (Tehran 4.5°) | Complete | The extension computes all seven times offline |
| 13 | Asr: standard shadow factor 1 only | Standard **and** Hanafi (factor 2) selectable | Port + extend | User-facing requirement; default remains standard (Tcalm behavior) |
| 14 | No high-latitude handling | night-middle / angle-based / one-seventh / unresolved rules | Extend | Requirement: handle polar edge cases; unresolvable times display `—` instead of wrong values |
| 15 | `geo.py` silent IP geolocation on first run (ip-api.com over **HTTP**, ipwho.is) | **Explicit opt-in** IP button (ipwho.is over HTTPS only, behind optional origin permission) | Port UX, gate consent | Privacy requirement: nothing silent, nothing unencrypted. Desktop Firefox users often have no GPS, so an opt-in IP path preserves the original's convenience without its silent data flow |
| 16 | `geo.py` country → calculation-method mapping | `COUNTRY_METHOD_HINTS` (same mapping) applied when picking a country | Port 1:1 | Preserves Tcalm's out-of-box experience |
| 17 | `tui.py` country/city preset DB (16 countries, 80 cities, per-country method+timezone) | `shared/geo/presets.ts` (extracted verbatim from `tui.py`) | Port 1:1 | Same data, offline, bilingual labels |
| 18 | Timezone from IP / system | `Intl` system zone (`auto`) or manual IANA picker (~400 zones) | Port + improve | No permission needed for system zone; DST handled by ICU |
| 19 | `media.py` `playerctl -a pause` (Linux) | `scripting.executeScript` + content agent pausing HTML5 media | Replace (reduced capability) | A WebExtension cannot control OS-level media. The extension pauses HTML5 `<audio>`/`<video>` in Firefox tabs only, where host permission was granted — documented limitation, no native messaging |
| 20 | `media.py` D-Bus MPRIS fallback | — | Drop (impossible) | No D-Bus access from WebExtensions; faking it via native messaging was explicitly out of scope |
| 21 | `media.py` AppleScript (Spotify/Music/QuickTime/Safari/Chrome/Brave on macOS) | — | Drop (impossible) | Same reason. Only the *browser-tab* part of that AppleScript (pausing `video, audio` elements in Safari/Chrome/Brave) conceptually maps — and only for Firefox's own tabs here |
| 22 | `execute_adhan_pause` hold loop: re-pause every 5 s for N minutes, **never auto-resume** | Hold mode: 1-minute sweep alarm re-pauses; **resume at expiry only what the extension paused**; single-pause mode (duration 0) never resumes (exact Tcalm behavior) | Port semantics with two deliberate changes | `browser.alarms` minimum period is 1 minute (5 s impossible — documented); auto-resume at expiry was an explicit product requirement ("restore only what you paused"), and the restore set is tracked per-element so nothing the user paused themselves is ever started |
| 23 | `media.py` `notify-send` / `osascript` notifications | `browser.notifications` (+ optional bundled chime) | Replace | Native, cross-platform, localized |
| 24 | Notification strings (`notify_title`, `notify_body`) | Same strings in `messages.en.ts` / `messages.ar.ts` | Port 1:1 | Preserve behavior; body adapts to whether media was actually paused |
| 25 | `config.py` `~/.config/tcalm/config.json` load/merge/save | `storage.local` typed settings layer with validation | Port | Extension storage is the sanctioned persistence; every read re-validates |
| 26 | `DEFAULT_CONFIG` (Cairo/Egypt/30.0444/31.2357/Africa-Cairo/method 5/notifications on/duration 0) | `DEFAULT_SETTINGS` — identical values (+new Firefox-native fields) | Port 1:1 | Same out-of-box experience |
| 27 | `tui.py` TUI dashboard | Options page (sections mirror TUI menu structure) | Port | Web UI replaces terminal UI |
| 28 | `i18n.py` en/ar message tables, `t()`, prayer names, method names | `shared/i18n` catalogs + runtime language switch + generated `_locales` | Port + extend | Firefox localization conventions plus a live switch (browser locale can't change at runtime) |
| 29 | Log file `tcalm.log` | Console-only namespaced logger with in-memory ring | Replace | No filesystem access; nothing persisted |
| 30 | `install.sh` / `uninstall.sh` / `PKGBUILD` / AUR packaging | `npm run package` → unsigned XPI + source zip; AMO for distribution | Replace | Distribution channel is AMO for extensions |
| 31 | Tests: pytest across 9 modules | 109 node tests incl. browser-API mock and an independent NOAA oracle | Port + deepen | Same intent (calculation, config, media, daemon) at WebExtension scale |
| 32 | CI workflow (GitHub Actions) | `npm run lint` = tsc + eslint + security audit; `npm test`; `npm run package` | Port | The audit script automates the security checklist that CI would assert |

## Settings mapping

| Tcalm `config.json` | Extension setting | Notes |
| --- | --- | --- |
| `language` (`en`/`ar`) | `language` (`auto`/`en`/`ar`) | default changed to `auto` (follow Firefox) |
| `auto_detect` | `locationMode` (`auto`/`manual`) | auto = geolocation consent, not silent IP |
| `country` / `city` | `country` / `city` | labels + preset picker |
| `latitude` / `longitude` | `latitude` / `longitude` | drive the calculation |
| `timezone` | `timezone` (IANA or `auto`) | `auto` = system zone via `Intl` |
| `method` (1–15) | `calculationMethod` | same ids, all implemented locally |
| `pause_duration_minutes` | `mediaPauseDuration` | 0 = single pause (identical semantics) |
| `notifications` | `notificationsEnabled` | plus per-prayer toggles + advance notice (new) |
| `prayers` (list) | `prayerNotifications` map | same per-prayer gating |
| — | `asrMethod`, `highLatitudeRule`, `theme`, `hijriOffset`, `mediaPauseEnabled`, `mediaScope`, `mediaAllowedSites`, `notificationSoundEnabled`, `enabled` | Firefox-native additions |

The options page importer accepts a raw Tcalm `config.json` and maps it
through `normalizeTcalmConfig()`.

## Deliberate deviations (summary)

1. **Aladhan API removed.** Offline engine is primary (requirement).
2. **IP geolocation is opt-in and HTTPS-only.** The plain-HTTP ip-api.com
   endpoint was not ported.
3. **Hold sweep cadence 5 s → 1 min.** `browser.alarms` floor.
4. **Hold expiry auto-resumes what the extension paused.** Explicit product
   requirement; the original simply stopped re-pausing.
5. **Media scope narrowed to Firefox tabs.** Physical WebExtension limit.
6. **Default language `auto`.** Firefox-native behavior.
7. **Default `mediaPauseEnabled: false`.** Desktop Tcalm paused OS media it
   could always reach; in a browser the equivalent capability needs a
   permission grant, so it starts off and is enabled in the options page.
