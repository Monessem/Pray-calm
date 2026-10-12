/**
 * Packaging — Tcalm Firefox Extension.
 *
 * 1. Runs a clean build (dist/).
 * 2. Zips dist/ into the extension XPI (manifest.json at the ZIP root).
 * 3. Assembles a source archive whose ROOT IS A COMPLETE, LOADABLE COPY OF
 *    THE EXTENSION: the built files (manifest.json, background.js, popup/,
 *    options/, content/, icons/, audio/, _locales/) sit at the top level,
 *    with src/, test/, scripts/, assets/ and docs alongside them.
 *
 *    Why: users who extract the source archive and load it via
 *    about:debugging → “Load Temporary Add-on… → manifest.json” get a
 *    WORKING extension. The old layout (source-only root) produced a blank
 *    popup and a dead background page, because manifest.json referenced
 *    build outputs that were not present.
 *
 * The XPI is UNSIGNED: Mozilla must sign it for release installation in
 * regular Firefox (see README “Signing & AMO submission”). We never fake
 * a signature.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const OUT_DIR = resolve(ROOT, 'package-out');

/*
 * Artifact filenames carry the manifest version (tcalm-v1.0.2.xpi …).
 * v1.0.2 context: every earlier release shipped under the IDENTICAL name
 * "tcalm-firefox-extension.xpi", so users could not tell the fixed build
 * apart from the buggy one they had already downloaded. Versioned names
 * make the newest file unmistakable in the Downloads folder.
 */
const VERSION = String(JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf-8')).version);
const XPI = resolve(OUT_DIR, `tcalm-v${VERSION}.xpi`);
const SOURCE_ZIP = resolve(OUT_DIR, `tcalm-v${VERSION}-source.zip`);
const STAGE = resolve(OUT_DIR, 'source-stage');

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function copyInto(from, to) {
  cpSync(from, to, { recursive: true, force: true });
}

function main() {
  console.log('[package] building fresh dist/');
  run('node scripts/build.mjs', ROOT);
  run('node scripts/audit.mjs', ROOT);
  run('node scripts/deadcode.mjs', ROOT);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('[package] creating XPI (manifest.json at zip root)');
  // manifest.json first so zip listings show it as the head entry.
  run(`zip -X -q "${XPI}" manifest.json`, DIST);
  run(`zip -X -q -r "${XPI}" . -x manifest.json`, DIST);

  console.log('[package] staging source archive (extension files at zip root)');
  rmSync(STAGE, { recursive: true, force: true });
  mkdirSync(STAGE, { recursive: true });

  // 1) The complete built extension at the archive root — this is what
  //    makes the source archive directly loadable via about:debugging.
  for (const entry of readdirSync(DIST)) {
    copyInto(join(DIST, entry), join(STAGE, entry));
  }

  // 2) Full source, tests, tooling and docs alongside the build outputs.
  for (const entry of readdirSync(ROOT)) {
    if (['node_modules', 'dist', '.git', 'package-out'].includes(entry)) continue;
    if (/\.(xpi|zip|log)$/i.test(entry) || entry === '.DS_Store') continue;
    copyInto(join(ROOT, entry), join(STAGE, entry));
  }

  console.log('[package] creating source archive');
  run(`zip -q -r "${SOURCE_ZIP}" . -x '.DS_Store'`, STAGE);

  verifyStage();
  verify(XPI);
  verify(SOURCE_ZIP);
  listZip(XPI);
  console.log(`[package] done:
  XPI:    ${XPI} (UNSIGNED — see README for the Mozilla signing step)
  SOURCE: ${SOURCE_ZIP} (root is a complete loadable copy of the extension)`);
}

function verify(path) {
  if (!existsSync(path)) throw new Error(`archive not created: ${path}`);
}

/**
 * The source archive root must be a loadable extension: every manifest
 * reference must resolve. This is the regression guard for the v1.0.0
 * “blank popup” packaging bug.
 */
function verifyStage() {
  const manifest = JSON.parse(readFileSync(join(STAGE, 'manifest.json'), 'utf-8'));
  const mustExist = (rel) => {
    const full = join(STAGE, rel);
    if (!existsSync(full) || !statSync(full).isFile()) {
      throw new Error(`source stage missing manifest-referenced file: ${rel}`);
    }
  };
  for (const script of manifest['background']?.['scripts'] ?? []) mustExist(script);
  mustExist(manifest['action']?.['default_popup']);
  mustExist(manifest['options_ui']?.['page']);
  for (const icon of Object.values(manifest['icons'] ?? {})) mustExist(icon);
  mustExist('_locales/en/messages.json');
  mustExist('_locales/ar/messages.json');
  mustExist('popup/popup.js');
  mustExist('options/options.js');
  mustExist('content/media-hook.js');
  mustExist('src/background/index.ts');
  console.log('[package] source stage verified: root is loadable, source included');
}

function listZip(path) {
  console.log('[package] XPI contents:');
  const listing = execSync(`unzip -l "${path}"`, { encoding: 'utf-8' });
  for (const line of listing.split('\n')) {
    if (line.trim().length > 0 && !line.startsWith('Archive')) console.log('  ' + line.trim());
  }
}

main();
