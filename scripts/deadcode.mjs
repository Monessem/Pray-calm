#!/usr/bin/env node
/**
 * Dead-code & production-readiness scanner — Tcalm Firefox Extension.
 *
 * Static cross-reference audit (no deps, regex-based):
 *   1. Runtime exports (function/const/class):
 *      - dead          — used nowhere (not even inside own module)
 *      - unexport cand — used only inside its own module
 *      - test-only     — exercised only by tests (accepted seam)
 *   2. i18n catalog keys never referenced by HTML or TS (dynamic
 *      `prayer_*` / `method_*` / `status_*` template prefixes handled).
 *   3. CSS class selectors with no HTML/TS usage (incl. dynamic ones
 *      passed as string literals, e.g. setStatus(node, msg, 'ok')).
 *   4. Manifest permissions with no matching browser.<api> usage.
 *   5. Production hygiene: direct console.* calls, debugger statements,
 *      TODO/FIXME/XXX markers, and version-literal desync — every
 *      `tcalm-vX.Y.Z` mention in shipped docs/UI must equal the manifest
 *      version, and no hardcoded EXTENSION_VERSION constant may exist.
 *
 * Exit code 1 when a PROBLEM is found (CI-able).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'src');
const TEST_DIR = join(ROOT, 'test');

function collect(dir, ext, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, ext, out);
    else if (entry.endsWith(ext)) out.push(full);
  }
  return out;
}

const srcTs = collect(SRC_DIR, '.ts');
const srcHtml = collect(SRC_DIR, '.html');
const srcCss = collect(SRC_DIR, '.css');
const testTs = collect(TEST_DIR, '.test.ts').concat(collect(join(TEST_DIR, 'helpers'), '.ts'));

const read = (p) => readFileSync(p, 'utf-8');
const rel = (p) => p.slice(ROOT.length + 1);

const problems = [];
const notes = [];

/* ---------------------------------------------------------------- 1. exports */
const exportRe = /^export (?:async )?(?:function|const|class) ([A-Za-z0-9_]+)/gm;
const exportsByFile = new Map();
for (const file of srcTs) {
  const text = read(file);
  for (const m of text.matchAll(exportRe)) {
    exportsByFile.set(m[1], { file, internalUses: 0, usedInSrc: new Set(), usedInTest: new Set() });
  }
}
for (const file of srcTs) {
  const text = read(file);
  for (const [sym, info] of exportsByFile) {
    const mentions = (text.match(new RegExp(`\\b${sym}\\b`, 'g')) ?? []).length;
    if (info.file === file) {
      info.internalUses = Math.max(0, mentions - 1); // beyond the definition itself
    } else if (mentions > 0) {
      info.usedInSrc.add(rel(file));
    }
  }
}
for (const file of testTs) {
  const text = read(file);
  for (const [sym, info] of exportsByFile) {
    if (new RegExp(`\\b${sym}\\b`).test(text)) info.usedInTest.add(rel(file));
  }
}
for (const [sym, info] of exportsByFile) {
  if (info.usedInSrc.size === 0 && info.usedInTest.size === 0) {
    if (info.internalUses > 0) {
      notes.push(`unexport candidate: "${sym}" in ${rel(info.file)} — used only inside its own module`);
    } else {
      problems.push(`dead export: "${sym}" in ${rel(info.file)} — used nowhere`);
    }
  } else if (info.usedInSrc.size === 0) {
    notes.push(`test-only export: "${sym}" in ${rel(info.file)} — exercised only by tests`);
  }
}

/* ------------------------------------------------------------------ 2. i18n */
const enText = read(join(SRC_DIR, 'shared/i18n/messages.en.ts'));
const arText = read(join(SRC_DIR, 'shared/i18n/messages.ar.ts'));
const keyRe = /^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s/gm;
const enKeys = [...enText.matchAll(keyRe)].map((m) => m[1]);
const arKeys = [...arText.matchAll(keyRe)].map((m) => m[1]);

for (const k of enKeys) if (!arKeys.includes(k)) problems.push(`i18n parity: "${k}" missing in ar catalog`);
for (const k of arKeys) if (!enKeys.includes(k)) problems.push(`i18n parity: "${k}" missing in en catalog`);

const allSrcContent = [...srcTs, ...srcHtml].map((f) => ({ f, text: read(f) }));
// prayer_* and method_* are used through template literals (t(lang, `prayer_${name}`)).
const DYNAMIC_PREFIXES = ['prayer_', 'method_'];
for (const key of enKeys) {
  if (['name', 'description', 'actionTitle'].includes(key)) continue; // manifest _locales strings
  const dyn = DYNAMIC_PREFIXES.find((p) => key.startsWith(p));
  // Plain substring covers quoted t('key') calls, data-i18n="key" and
  // data-i18n-attr="title:key" attributes alike.
  const used = allSrcContent.some(({ text }) =>
    dyn ? text.includes('`' + dyn) || text.includes(key) : text.includes(key),
  );
  if (!used) problems.push(`i18n dead key: "${key}" — not referenced by any HTML/TS`);
}

/* ------------------------------------------------------------------- 3. CSS */
const classRe = /\.([A-Za-z][A-Za-z0-9_-]*)/g;
const cssClasses = new Map();
for (const file of srcCss) {
  const text = read(file);
  for (const m of text.matchAll(classRe)) {
    const cls = m[1];
    if (cls === 'root') continue;
    if (!cssClasses.has(cls)) cssClasses.set(cls, []);
    cssClasses.get(cls).push(rel(file));
  }
}
const htmlAndTsText = [...srcHtml, ...srcTs].map((f) => read(f)).join('\n');
for (const [cls, files] of cssClasses) {
  // Word-boundary match covers static class="…", className assignments,
  // template literals, classList.add('…') and dynamically applied status
  // classes (e.g. setStatus(node, msg, 'ok')). Findings are NOTES, not
  // PROBLEMS, so a rare coincidental word is acceptable.
  const used = new RegExp('\\b' + cls.replace(/[-]/g, '\\-') + '\\b').test(htmlAndTsText);
  if (!used) notes.push(`css class ".${cls}" (${files.join(', ')}) — no HTML/TS usage found (verify manually)`);
}

/* ------------------------------------------- 4. manifest permissions vs APIs */
const manifest = JSON.parse(read(join(ROOT, 'manifest.json')));
const allCode = srcTs.map((f) => read(f)).join('\n');
for (const perm of manifest.permissions ?? []) {
  if (!new RegExp(`browser\\.${perm}\\b`).test(allCode)) {
    problems.push(`manifest permission "${perm}" — no browser.${perm} usage in src`);
  }
}

/* ------------------------------------------------------- 5. hygiene checks */
for (const file of [...srcTs, ...srcHtml, ...srcCss]) {
  const text = read(file);
  const relPath = rel(file);
  if (/console\.(log|debug|info)\(/.test(text) && !file.includes('utils/log.ts')) {
    problems.push(`hygiene: direct console.* call in ${relPath}`);
  }
  if (/\bdebugger\b/.test(text)) problems.push(`hygiene: debugger statement in ${relPath}`);
  for (const m of text.matchAll(/\b(TODO|FIXME|XXX)\b/g)) {
    notes.push(`hygiene: ${m[1]} marker in ${relPath}`);
  }
}

// No hardcoded version constant may exist: the manifest is the single truth.
const constantsText = read(join(SRC_DIR, 'shared/constants.ts'));
if (/EXTENSION_VERSION\s*=/.test(constantsText)) {
  problems.push('hygiene: hardcoded EXTENSION_VERSION in constants.ts — use browser.runtime.getManifest()');
}

// Versioned artifact literals in shipped docs/UI must match the manifest.
const versionFiles = [
  ...srcHtml,
  join(ROOT, 'INSTALL.md'),
  join(ROOT, 'README.md'),
  join(ROOT, 'UNSIGNED-NOTICE.txt'),
];
const verRe = /tcalm-v(\d+\.\d+\.\d+)/g;
for (const vf of versionFiles) {
  let text;
  try {
    text = read(vf);
  } catch {
    continue;
  }
  for (const m of text.matchAll(verRe)) {
    if (m[1] !== manifest.version) {
      problems.push(`version desync: ${rel(vf)} references tcalm-v${m[1]} but manifest is v${manifest.version}`);
    }
  }
}

/* ------------------------------------------------------------------- report */
console.log(
  `[deadcode] scanned ${srcTs.length} ts + ${srcHtml.length} html + ${srcCss.length} css files`,
);
console.log(
  `[deadcode] exports: ${exportsByFile.size}, i18n keys: ${enKeys.length}, css classes: ${cssClasses.size}`,
);
if (notes.length) {
  console.log('\n--- NOTES (verify manually) ---');
  for (const n of notes) console.log(`  • ${n}`);
}
if (problems.length) {
  console.log('\n--- PROBLEMS (must fix) ---');
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(1);
}
console.log('\n[deadcode] no blocking findings');
