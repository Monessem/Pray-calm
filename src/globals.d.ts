/* eslint-disable @typescript-eslint/consistent-type-imports --
   `typeof import()` is the correct pattern for ambient module type access. */
/**
 * Ambient browser API typing — Tcalm Firefox Extension.
 *
 * Types come from @types/webextension-polyfill (the promise-based
 * `browser.*` WebExtension API as implemented by Firefox). We declare the
 * global `browser` only — no runtime polyfill is imported or bundled,
 * Firefox provides the global natively.
 */
declare const browser: typeof import('webextension-polyfill');
