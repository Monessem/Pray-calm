/**
 * i18n service — Tcalm Firefox Extension.
 *
 * Runtime localization for the popup, options page, background notifications
 * and the content-script agent. Supports a live language override (en/ar)
 * unlike browser.i18n, which is fixed to the browser UI locale at runtime.
 * Manifest-level strings still use Firefox's _locales (generated at build).
 */
import type { LanguageCode, PrayerName } from '../types.ts';
import { MESSAGES_EN } from './messages.en.ts';
import { MESSAGES_AR } from './messages.ar.ts';

/**
 * The canonical runtime catalogs. Manifest-level strings additionally ship
 * as Firefox _locales, generated at build time from the same modules.
 */
const CATALOGS: Record<LanguageCode, Record<string, string>> = {
  en: MESSAGES_EN,
  ar: MESSAGES_AR,
};

export function resolveLanguage(setting: 'auto' | LanguageCode, uiLocale: string): LanguageCode {
  if (setting === 'en' || setting === 'ar') return setting;
  return uiLocale.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

/** Translate `key` with optional {placeholder} substitution. */
export function t(
  lang: LanguageCode,
  key: string,
  params?: Record<string, string | number>,
): string {
  const catalog = CATALOGS[lang] ?? CATALOGS.en;
  const template = catalog[key] ?? MESSAGES_EN[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function getDirection(lang: LanguageCode): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function prayerName(lang: LanguageCode, prayer: PrayerName): string {
  return t(lang, `prayer_${prayer}`);
}

export function methodName(lang: LanguageCode, methodId: number): string {
  const name = t(lang, `method_${methodId}`);
  // Missing key falls back to the raw key — surface a sane label instead.
  if (name === `method_${methodId}`) return `Method ${methodId}`;
  return name;
}

/** Fill the [data-i18n] / [data-i18n-attr] DOM contract. XSS-safe: textContent only. */
export function applyDomI18n(root: Document | HTMLElement, lang: LanguageCode): void {
  const elements = root.querySelectorAll<HTMLElement>('[data-i18n]');
  for (const el of Array.from(elements)) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(lang, key);
  }
  const attrElements = root.querySelectorAll<HTMLElement>('[data-i18n-attr]');
  for (const el of Array.from(attrElements)) {
    const spec = el.getAttribute('data-i18n-attr') ?? '';
    // Format: "attr1:key1,attr2:key2"
    for (const pair of spec.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s?.trim());
      if (attr && key) el.setAttribute(attr, t(lang, key));
    }
  }
}
