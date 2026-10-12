/**
 * Dump i18n catalogs to Firefox _locales structure.
 * Runs under Node's native TypeScript type-stripping (Node >= 22.18).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { MESSAGES_EN } from '../src/shared/i18n/messages.en.ts';
import { MESSAGES_AR } from '../src/shared/i18n/messages.ar.ts';

const OUT_DIR = 'dist/_locales';

const catalogs = {
  en: MESSAGES_EN,
  ar: MESSAGES_AR,
};

for (const [locale, messages] of Object.entries(catalogs)) {
  const converted: Record<string, { message: string }> = {};
  for (const [key, value] of Object.entries(messages)) {
    converted[key] = { message: value };
  }
  const dir = `${OUT_DIR}/${locale}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/messages.json`, `${JSON.stringify(converted, null, 2)}\n`, 'utf-8');
  console.log(`_locales/${locale}/messages.json: ${Object.keys(converted).length} keys`);
}
