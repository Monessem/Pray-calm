# Privacy — Tcalm Firefox Extension

**Summary: prayer times are computed on your device. The extension sends
nothing anywhere unless you explicitly press the one button that does.**

## Data stored

All data lives in `browser.storage.local` on your device and nowhere else:

| Data | Example | Why |
| --- | --- | --- |
| Settings | coordinates, city/country labels, calculation method, notification preferences, theme | your configuration |
| Cached schedule | today's and tomorrow's prayer times | instant popup, offline operation |
| Fired-events ledger | which prayers already fired (dates only, no content) | prevents duplicate notifications; auto-pruned after 3 days |
| Active media hold | which tabs were paused, until when | restores your media after the prayer window |

Removing the extension from Firefox deletes all of it. "Clear cached data"
in the options page deletes everything except settings; "Reset to defaults"
deletes settings too.

## Data transmitted

| Flow | Destination | When |
| --- | --- | --- |
| Prayer-time calculation | **none** — local astronomy | always |
| Notifications | the Firefox/OS notification daemon | at prayer time, if enabled |
| Geolocation request | Firefox's location provider **if you approve the prompt** | only when you press "Detect my location" |
| IP lookup | `https://ipwho.is/` (single GET, no query string) | only when you press "Approximate location via IP" and grant its optional permission |

That is the complete list. There is no analytics, no telemetry, no crash
reporting, no remote configuration, no accounts, no cookies, and no data
sales — there is no backend to sell to.

### About the geolocation flow

Coordinates obtained from `navigator.geolocation` are stored locally and
used for the calculation. They are never transmitted to any server by this
extension. The nearest-city label is resolved offline against the bundled
preset database. Firefox's own geolocation prompt (and its per-site
permission toggle in about:preferences#permissions) governs the access.

### About the optional IP lookup

Pressing the IP button sends one request to ipwo.is containing your IP
address (inherent to any HTTP request) and returns an approximate city and
timezone. The feature requires a dedicated optional origin permission
(`https://ipwho.is/*`) that you may revoke at any time in Firefox's add-on
settings. If you never press the button, the extension can never make that
request. This is a consent-gated port of the original Tcalm daemon's
automatic IP geolocation, which ran silently on every first start.

## What the extension cannot see

- No browsing history, URLs, or page content — the manifest has no `tabs`
  permission and no history/bookmarks permissions.
- No keystrokes. The content agent injected at prayer time inspects only
  `HTMLMediaElement` playback state, and only in origins you granted.
- No data from other browser profiles or applications.

## Data collection declaration

The extension performs **no data collection** as defined by Mozilla's
add-on policies: nothing is collected, transmitted to the developer, or
shared with third parties. (AMO's data-collection questionnaire for this
extension: "I do not collect data.")
