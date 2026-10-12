# Security — Tcalm Firefox Extension

This extension follows the
[Mozilla WebExtension security best practices](https://extensionworkshop.com/documentation/develop/build-a-secure-extension/)
and treats browser-extension security as a product requirement, not a
checkbox.

## Threat model

The extension handles: user settings (including approximate location
coordinates the user chose to store), a cached daily schedule, and the
ability to pause/resume HTML5 media in tabs the user allowed. It does not
handle credentials, browsing history, page content, or any secret.

## Security properties

### No remote code, ever

- CSP for extension pages is declared explicitly and minimal:
  `script-src 'self'; object-src 'self'` (the MV3 enforced baseline; we do
  not widen it).
- All JavaScript ships inside the XPI. There is no remotely-hosted script,
  style, or JSONP anywhere.
- `scripts/audit.mjs` fails the build if any `dist/` or `src/` code file
  matches remote-script-loading patterns.

### No dynamic code execution

- No `eval()`, no `new Function()`, no `setTimeout("string")`, no
  `javascript:` URLs, no `document.write`, no `srcdoc`.
- Enforced twice: ESLint rules (`no-eval`, `no-implied-eval`, `no-new-func`,
  `no-script-url`) and the build-time audit scanner.

### No HTML injection

- The UI never uses `innerHTML`/`insertAdjacentHTML`. All DOM updates go
  through `textContent`, `createElement`, and typed attributes — user values
  (city names, allowlist entries, imported settings) cannot inject markup.
  The audit scanner forbids `innerHTML` assignments outright.
- i18n substitution replaces `{placeholders}` into plain strings that are
  assigned via `textContent`.

### Input validation at every trust boundary

- Storage reads pass through `normalizeSettings()` / `isDaySchedule()` —
  hand-edited or corrupted `storage.local` cannot inject invalid state
  (coordinates clamped to ranges, enums whitelisted, hostnames sanitized,
  numbers coerced).
- Imported settings files are JSON-parsed defensively and validated
  (`parseImportedSettings`); hostile inputs (`javascript:` URIs, wildcard
  patterns, ports, oversized strings) are rejected by `sanitizeHostname`.
- Runtime messages are dispatched through a typed handler map; unknown
  types are ignored.
- Timezone strings are validated through `Intl` before use.

### Least privilege

- API permissions: `alarms`, `notifications`, `storage`, `scripting` —
  nothing else. The audit asserts the manifest permission list against an
  allowlist.
- No `tabs` permission: the extension never reads tab URLs or titles. The
  content agent checks its own `location.hostname` against the user's
  allowlist.
- Host permissions are **optional**: `<all_urls>` (media pause) and
  `https://ipwho.is/*` (opt-in IP location) are requested only from explicit
  button presses, and users can revoke them at any time in Firefox's
  add-ons settings.
- Media injection happens on demand at prayer time via
  `browser.scripting.executeScript` — there is no static content script
  running on every page.

### No secrets, no telemetry

- The extension contains no keys, tokens, or accounts.
- No analytics, no error reporting, no update pings beyond Firefox's own
  extension update mechanism.
- The log is a console-namespaced in-memory ring (max 50 lines), never
  persisted, never transmitted.

## Media-control safety properties

- Pauses only elements that are **currently playing** (never starts
  anything, never touches paused media).
- Tracks exactly which elements it paused; resumes only those.
- User restarts during single-pause mode remove elements from the restore
  set (the user wins).
- Sweep (hold-mode re-pause) pauses are marked non-restorable — media the
  user started during the prayer window is not auto-resumed later.
- Disabling the extension while media is held restores it.

## Verification

The following gates run on every `npm run lint` / `npm run package`:

1. `tsc --noEmit` — strict TypeScript (no `any` by policy).
2. `eslint` — security-oriented ruleset.
3. `scripts/audit.mjs`:
   - forbidden pattern scan of all shipped code,
   - manifest permission allowlist,
   - CSP must not contain `unsafe-inline`/`unsafe-eval`/remote origins,
   - dist contents allowlist (no dev files in the package),
   - `_locales` parity for every shipped locale,
   - gecko id and version format checks.

## Reporting

Security issues are welcome via GitHub issues on the project repository, or
privately to the maintainer listed in LICENSE.
