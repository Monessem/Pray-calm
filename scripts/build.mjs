/**
 * Build script — Tcalm Firefox Extension.
 *
 * Bundles the four entry points with esbuild (background event page,
 * popup, options, content-script media agent), copies static assets,
 * generates _locales from the TypeScript catalogs, and verifies that every
 * file referenced by manifest.json exists. Output: dist/ — exactly the
 * contents of the extension package, nothing else.
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, statSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');

function log(message) {
  console.log(`[build] ${message}`);
}

async function main() {
  log('cleaning dist/');
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  log('bundling entry points with esbuild');
  const shared = {
    bundle: true,
    format: 'iife',
    target: ['firefox115'],
    minify: true,
    legalComments: 'none',
    sourcemap: false,
    logLevel: 'info',
    charset: 'utf8',
  };

  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/background/index.ts')],
    outfile: resolve(DIST, 'background.js'),
  });
  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/popup/popup.ts')],
    outfile: resolve(DIST, 'popup/popup.js'),
  });
  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/options/options.ts')],
    outfile: resolve(DIST, 'options/options.js'),
  });
  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/content/mediaHook.ts')],
    outfile: resolve(DIST, 'content/media-hook.js'),
  });
  // v1.1.17: the guaranteed toast alert window page.
  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/notify/toast.ts')],
    outfile: resolve(DIST, 'notify/toast.js'),
  });
  // v1.1.22: the first-install onboarding page (permission landing).
  await build({
    ...shared,
    entryPoints: [resolve(ROOT, 'src/onboarding/onboarding.ts')],
    outfile: resolve(DIST, 'onboarding/onboarding.js'),
  });

  log('copying static assets');
  cpSync(resolve(ROOT, 'manifest.json'), resolve(DIST, 'manifest.json'));
  cpSync(resolve(ROOT, 'src/popup/popup.html'), resolve(DIST, 'popup/popup.html'));
  cpSync(resolve(ROOT, 'src/popup/popup.css'), resolve(DIST, 'popup/popup.css'));
  cpSync(resolve(ROOT, 'src/options/options.html'), resolve(DIST, 'options/options.html'));
  cpSync(resolve(ROOT, 'src/options/options.css'), resolve(DIST, 'options/options.css'));
  // v1.1.17: the toast alert window page (opened via browser.windows.create
  // by shared/notify/toastWindow.ts at prayer time).
  mkdirSync(resolve(DIST, 'notify'), { recursive: true });
  cpSync(resolve(ROOT, 'src/notify/toast.html'), resolve(DIST, 'notify/toast.html'));
  cpSync(resolve(ROOT, 'src/notify/toast.css'), resolve(DIST, 'notify/toast.css'));
  // v1.1.22: onboarding landing page (opened by the background on first
  // install; reachable from Settings -> Media pause -> Permission setup).
  mkdirSync(resolve(DIST, 'onboarding'), { recursive: true });
  cpSync(resolve(ROOT, 'src/onboarding/onboarding.html'), resolve(DIST, 'onboarding/onboarding.html'));
  cpSync(resolve(ROOT, 'src/onboarding/onboarding.css'), resolve(DIST, 'onboarding/onboarding.css'));
  mkdirSync(resolve(DIST, 'icons'), { recursive: true });
  for (const size of [16, 32, 48, 96, 128]) {
    cpSync(
      resolve(ROOT, `assets/icons/icon-${size}.png`),
      resolve(DIST, `icons/icon-${size}.png`),
    );
  }
  // v1.0.7: the official logo artwork (transparent, de-haloed) shown in
  // the popup/options headers and the About card at its natural aspect.
  mkdirSync(resolve(DIST, 'logo'), { recursive: true });
  cpSync(resolve(ROOT, 'assets/logo/logo-clean.png'), resolve(DIST, 'logo/logo.png'));
  mkdirSync(resolve(DIST, 'audio'), { recursive: true });
  cpSync(resolve(ROOT, 'assets/audio/chime.ogg'), resolve(DIST, 'audio/chime.ogg'));

  log('generating _locales');
  const result = spawnSync('node', [resolve(ROOT, 'scripts/dump-locales.ts')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('dump-locales failed');
  }

  verifyDist();
  log('build complete: dist/');
}

function mustExist(path) {
  if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size === 0) {
    throw new Error(`missing or empty dist file: ${path}`);
  }
}

/** Structural verification: every manifest reference resolves. */
function verifyDist() {
  const manifest = JSON.parse(readFileSync(resolve(DIST, 'manifest.json'), 'utf-8'));

  mustExist(resolve(DIST, 'background.js'));
  for (const script of manifest['background']?.['scripts'] ?? []) {
    mustExist(resolve(DIST, script));
  }
  mustExist(resolve(DIST, manifest['action']?.['default_popup']));
  mustExist(resolve(DIST, manifest['options_ui']?.['page']));
  for (const icon of Object.values(manifest['icons'] ?? {})) {
    mustExist(resolve(DIST, icon));
  }
  // Referenced by the background page via browser.scripting.executeScript
  // AND statically registered in manifest.json (content_scripts, MAIN world).
  mustExist(resolve(DIST, 'content/media-hook.js'));
  // v1.1.23: the manifest's static content-script registration must point
  // at a file that actually ships.
  for (const entry of manifest['content_scripts'] ?? []) {
    for (const script of entry['js'] ?? []) {
      mustExist(resolve(DIST, script));
    }
  }
  mustExist(resolve(DIST, 'audio/chime.ogg'));
  // v1.0.7: logo artwork referenced by popup.html and options.html.
  mustExist(resolve(DIST, 'logo/logo.png'));

  const defaultLocale = manifest['default_locale'];
  mustExist(resolve(DIST, `_locales/${defaultLocale}/messages.json`));
  for (const key of ['name', 'description', 'actionTitle']) {
    const messages = JSON.parse(
      readFileSync(resolve(DIST, `_locales/${defaultLocale}/messages.json`), 'utf-8'),
    );
    if (!messages[key]) {
      throw new Error(`default locale missing key: ${key}`);
    }
  }
  mustExist(resolve(DIST, '_locales/ar/messages.json'));

  const html = readFileSync(resolve(DIST, 'popup/popup.html'), 'utf-8');
  for (const ref of ['popup.js', 'popup.css']) {
    if (!html.includes(ref)) throw new Error(`popup.html missing reference: ${ref}`);
    mustExist(resolve(DIST, `popup/${ref}`));
  }
  const optionsHtml = readFileSync(resolve(DIST, 'options/options.html'), 'utf-8');
  for (const ref of ['options.js', 'options.css']) {
    if (!optionsHtml.includes(ref)) throw new Error(`options.html missing reference: ${ref}`);
    mustExist(resolve(DIST, `options/${ref}`));
  }
  // v1.1.17: toast page must ship complete and self-consistent.
  const toastHtml = readFileSync(resolve(DIST, 'notify/toast.html'), 'utf-8');
  for (const ref of ['toast.js', 'toast.css']) {
    if (!toastHtml.includes(ref)) throw new Error(`toast.html missing reference: ${ref}`);
    mustExist(resolve(DIST, `notify/${ref}`));
  }
  if (!toastHtml.includes('../logo/logo.png')) {
    throw new Error('toast.html missing the logo reference');
  }
  mustExist(resolve(DIST, 'notify/toast.js'));
  // v1.1.22: onboarding must ship complete and self-consistent.
  const onbHtml = readFileSync(resolve(DIST, 'onboarding/onboarding.html'), 'utf-8');
  for (const ref of ['onboarding.js', 'onboarding.css']) {
    if (!onbHtml.includes(ref)) throw new Error(`onboarding.html missing reference: ${ref}`);
    mustExist(resolve(DIST, `onboarding/${ref}`));
  }
  if (!onbHtml.includes('../logo/logo.png')) {
    throw new Error('onboarding.html missing the logo reference');
  }
  log('manifest/file references verified');
}

main().catch((error) => {
  console.error('[build] FAILED:', error);
  process.exit(1);
});
