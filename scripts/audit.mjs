/* eslint-disable no-script-url -- this scanner intentionally MATCHES the
   literal pattern `javascript:` inside its forbidden-pattern regex. */
/**
 * Security audit — Tcalm Firefox Extension.
 *
 * Automated checks that back up the security claims in SECURITY.md:
 *   1. Forbidden runtime patterns (eval, Function constructor, innerHTML,
 *      insertAdjacentHTML, document.write, remote script loading).
 *   2. Manifest permission allowlist (least privilege).
 *   3. CSP must not allow unsafe-inline/unsafe-eval/remote sources.
 *   4. _locales completeness for every shipped locale.
 *   5. No development-only files inside dist/.
 *
 * Scans both src/ (always) and dist/ (when present). Exits non-zero on any
 * violation so it can gate `npm run lint` and the package step.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CODE_EXTENSIONS = new Set(['.js', '.ts', '.mjs', '.html']);

const FORBIDDEN_PATTERNS = [
  { name: 'eval()', pattern: /(^|[^.\w])eval\s*\(/ },
  { name: 'Function constructor', pattern: /new\s+Function\s*\(/ },
  { name: 'innerHTML assignment', pattern: /\.innerHTML\s*=/ },
  { name: 'insertAdjacentHTML', pattern: /\.insertAdjacentHTML\s*\(/ },
  { name: 'document.write', pattern: /document\.write\s*\(/ },
  { name: 'javascript: URL', pattern: /javascript\s*:/i },
  { name: 'srcdoc', pattern: /srcdoc\s*=/ },
  { name: 'remote script src', pattern: /<script[^>]+src\s*=\s*["']https?:/i },
  { name: 'remote iframe src', pattern: /<iframe[^>]+src\s*=\s*["']https?:/i },
  { name: 'webhunt/beacon', pattern: /navigator\.sendBeacon/ },
];

const ALLOWED_PERMISSIONS = new Set(['alarms', 'notifications', 'storage']);
const ALLOWED_OPTIONAL_PERMISSIONS = new Set(['scripting']);
const ALLOWED_OPTIONAL_ORIGINS = new Set(['<all_urls>', 'https://ipwho.is/*']);

const DIST_ALLOWED = new Set([
  'manifest.json',
  'background.js',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'options/options.html',
  'options/options.css',
  'options/options.js',
  'content/media-hook.js',
  // v1.1.17: the guaranteed toast alert window page (browser.windows).
  'notify/toast.html',
  'notify/toast.css',
  'notify/toast.js',
  // v1.1.22: first-install onboarding page (permission landing).
  'onboarding/onboarding.html',
  'onboarding/onboarding.css',
  'onboarding/onboarding.js',
  'audio/chime.ogg',
  '_locales/en/messages.json',
  '_locales/ar/messages.json',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-96.png',
  'icons/icon-128.png',
  // v1.0.7: official logo artwork (transparent) used by popup/options.
  'logo/logo.png',
]);

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`[audit] FAIL: ${message}`);
}

function walk(dir, visitor) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, visitor);
    } else {
      visitor(full);
    }
  }
}

function scanCodeFiles() {
  const scanned = { src: 0, dist: 0 };
  walk(join(ROOT, 'src'), (full) => {
    if (CODE_EXTENSIONS.has(extname(full))) {
      scanFile(full, relative(ROOT, full));
      scanned.src += 1;
    }
  });
  const distDir = join(ROOT, 'dist');
  if (existsSync(distDir)) {
    walk(distDir, (full) => {
      if (CODE_EXTENSIONS.has(extname(full))) {
        scanFile(full, `dist/${relative(distDir, full)}`);
        scanned.dist += 1;
      }
    });
  }
  console.log(`[audit] scanned ${scanned.src} source + ${scanned.dist} dist code files`);
}

function scanFile(full, label) {
  const content = readFileSync(full, 'utf-8');
  for (const { name, pattern } of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      fail(`${label}: forbidden pattern "${name}"`);
    }
  }
}

function auditManifest() {
  const manifestPath = join(ROOT, 'dist', 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.log('[audit] dist/ not present — manifest checks skipped (run build first)');
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  if (manifest['manifest_version'] !== 3) fail('manifest_version must be 3');
  if (manifest['host_permissions'] && manifest['host_permissions'].length > 0) {
    fail(`host_permissions must be empty (found: ${manifest['host_permissions'].join(', ')})`);
  }
  for (const permission of manifest['permissions'] ?? []) {
    if (!ALLOWED_PERMISSIONS.has(permission)) {
      fail(`unexpected permission: ${permission}`);
    }
  }
  for (const permission of manifest['optional_permissions'] ?? []) {
    if (!ALLOWED_OPTIONAL_PERMISSIONS.has(permission)) {
      fail(`unexpected optional permission: ${permission}`);
    }
  }
  for (const origin of manifest['optional_host_permissions'] ?? []) {
    if (!ALLOWED_OPTIONAL_ORIGINS.has(origin)) {
      fail(`unexpected optional origin: ${origin}`);
    }
  }
  const csp = manifest['content_security_policy']?.['extension_pages'] ?? '';
  if (/unsafe-inline|unsafe-eval|https?:/.test(csp)) {
    fail(`CSP too permissive: ${csp}`);
  }
  const geckoId = manifest['browser_specific_settings']?.['gecko']?.['id'];
  if (!geckoId || !/^\{[0-9a-f-]{36}\}$/i.test(geckoId)) {
    fail('missing or invalid gecko id');
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest['version'])) fail('version must be semver-ish');
  console.log('[audit] manifest policy checks passed');
}

function auditDistContents() {
  const distDir = join(ROOT, 'dist');
  if (!existsSync(distDir)) return;
  const seen = new Set();
  walk(distDir, (full) => {
    if (statSync(full).isFile()) {
      const relFromDist = relative(distDir, full).split('\\').join('/');
      seen.add(relFromDist);
      if (!DIST_ALLOWED.has(relFromDist)) {
        fail(`unexpected file in dist/: ${relFromDist}`);
      }
    }
  });
  for (const required of DIST_ALLOWED) {
    if (!seen.has(required)) fail(`missing required dist file: ${required}`);
  }
  console.log('[audit] dist contents verified');
}

function auditLocaleParity() {
  const localesDir = join(ROOT, 'dist', '_locales');
  if (!existsSync(localesDir)) return;
  const locales = {};
  for (const dir of readdirSync(localesDir)) {
    const file = join(localesDir, dir, 'messages.json');
    if (existsSync(file)) {
      locales[dir] = Object.keys(JSON.parse(readFileSync(file, 'utf-8')));
    }
  }
  const names = Object.keys(locales);
  if (names.length < 2) return; // dist absent — parity covered by unit tests
  const base = [...locales[names[0]]].sort().join(',');
  for (const name of names.slice(1)) {
    if ([...locales[name]].sort().join(',') !== base) {
      fail(`_locales key mismatch between ${names[0]} and ${name}`);
    }
  }
  console.log('[audit] _locales parity verified');
}

scanCodeFiles();
auditManifest();
auditDistContents();
auditLocaleParity();

if (failures > 0) {
  console.error(`[audit] ${failures} violation(s)`);
  process.exit(1);
}
console.log('[audit] all checks passed');
