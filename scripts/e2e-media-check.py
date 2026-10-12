#!/usr/bin/env python3
"""
Real-Firefox E2E for Tcalm v1.1.26 media pause — ESR 140 headless.

Proves the SoundCloud fix AND the v1.1.24 targeted-sweep + last-pause-only
resume end-to-end on a build of the actual extension, through the actual
options-page buttons:

  PHASE A — the owner's exact scenario ("SoundCloud already playing when
  the extension arrives"): the fixture page with six hard players
  (in-DOM audio, DETACHED audio — the SoundCloud case —, shadow-DOM
  audio, cross-origin-iframe audio, a Web Audio context, and a STUBBORN
  auto-resume player that retries play() twice after every external
  pause)
  starts playing FIRST; the extension is installed AFTERWARDS; "Test
  media pause" must pause every media element through the
  late-injection getter trap — and the v1.1.26 anti-auto-resume watch
  must outlast the stubborn player's restart — while "Resume paused
  media" restores them.

  PHASE B — the steady state: the page is reloaded with the extension
  present, so the static document_start MAIN-world registration covers
  it; the pause now ALSO suspends the tracked Web Audio context.

  PHASE C — v1.1.24 semantics: two fixture windows playing plus a
  deselected background tab and a never-played silent tab; the sweep's
  own target list (targetTabIds, read back through the real message
  handler) must contain exactly the three on-screen tabs — never the
  out-of-scope ones; after a second pause event, "Resume paused media"
  restores the newest event's tab ONLY — the older event's tab stays
  paused (the exact owner complaint: resume used to restart every
  paused tab together).

  Environment note (why the options page lives in its OWN WINDOW):
  headless Firefox has no audio device, so tab.audible never flips —
  the sweep's active-tab-per-window targeting is what covers the
  fixture here; the audible-query path is pinned by unit tests
  (test/media.test.ts, test/audibletabs.test.ts).

  Firefox quirk discovered while building this (documented in
  sweep_targets): a single scripting.executeScript call that carries
  `args` (allFrames, world MAIN) may also execute its function in
  other same-site tabs; those leaked executions' results are dropped,
  so the controller's counts stay correct — but page-side "was pause
  called here" counters would lie. The targeting checks therefore read
  the controller's own target list instead.

The variant manifest used here moves the optional permissions
(scripting + <all_urls>) into required ones so headless Firefox needs no
permission prompts; the shipped XPI keeps them optional. Everything else
is the exact built extension.

Usage: python3 scripts/e2e-media-check.py [--keep]
"""
import json
import os
import re
import shutil
import sys
import threading
import time
import zipfile
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

GECKODRIVER = "/home/z/e2e/geckodriver"
FIREFOX_BIN = "/home/z/e2e/firefox/firefox"
PROFILE = "/home/z/e2e/profile-media-e2e"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE_DIR = os.path.join(ROOT, "scripts", "e2e-media-fixture")
OUT_DIR = os.path.join(ROOT, "package-out", "e2e-media")
VARIANT_DIR = os.path.join(OUT_DIR, "dist-e2e")
VARIANT_XPI = os.path.join(OUT_DIR, "tcalm-e2e-variant.xpi")
EXT_ID = "{35e5cf8f-d5b8-436b-ae84-0291e49bb7c2}"
FIXED_UUID = "11a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"
FIXTURE_URL = "http://localhost:8137/index.html"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), str(detail)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def build_variant():
    """Copy dist/ and make scripting + <all_urls> REQUIRED (no prompts)."""
    if os.path.exists(VARIANT_DIR):
        shutil.rmtree(VARIANT_DIR)
    shutil.copytree(os.path.join(ROOT, "dist"), VARIANT_DIR)
    manifest_path = os.path.join(VARIANT_DIR, "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    perms = set(manifest.get("permissions", []))
    perms.add("scripting")
    # E2E tooling only (the shipped XPI never requests "tabs"): lets the
    # driver print tab URLs to verify window/tab topology when debugging.
    if os.environ.get("TCALM_E2E_DEBUG_TABS") == "1":
        perms.add("tabs")
    manifest["permissions"] = sorted(perms)
    manifest["host_permissions"] = ["<all_urls>"]
    optional = [p for p in manifest.get("optional_permissions", []) if p != "scripting"]
    manifest["optional_permissions"] = optional
    hosts = [h for h in manifest.get("optional_host_permissions", []) if h != "<all_urls>"]
    manifest["optional_host_permissions"] = hosts
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    if os.path.exists(VARIANT_XPI):
        os.remove(VARIANT_XPI)
    with zipfile.ZipFile(VARIANT_XPI, "w", zipfile.ZIP_DEFLATED) as zf:
        for base, _dirs, files in os.walk(VARIANT_DIR):
            for name in files:
                path = os.path.join(base, name)
                zf.write(path, os.path.relpath(path, VARIANT_DIR))
    return VARIANT_XPI


def start_fixture_servers():
    handler = partial(SimpleHTTPRequestHandler, directory=FIXTURE_DIR)
    servers = []
    for binding in (("127.0.0.1", 8137), ("127.0.0.1", 8138)):
        srv = HTTPServer(binding, handler)
        # Note: 8137 is reached as "localhost" (resolves to 127.0.0.1),
        # 8138 as "127.0.0.1" — different origins, so the fixture iframe
        # is genuinely cross-origin.
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        servers.append(srv)
    return servers


def make_driver():
    # Fresh profile per run: a reused profile serves cached fixture pages
    # from previous runs (HTTP caching), silently testing yesterday's code.
    if os.path.exists(PROFILE):
        shutil.rmtree(PROFILE, ignore_errors=True)
    os.makedirs(PROFILE, exist_ok=True)
    with open(os.path.join(PROFILE, "user.js"), "w", encoding="utf-8") as f:
        f.write(
            'user_pref("extensions.webextensions.uuids", '
            '"{\\"' + EXT_ID + '\\": \\"' + FIXED_UUID + '\\"}");\n'
        )
        f.write('user_pref("app.update.enabled", false);\n')
        f.write('user_pref("browser.shell.checkDefaultBrowser", false);\n')
        # Let the fixture's players start without fighting the autoplay
        # policy (the real user gesture click covers it anyway).
        f.write('user_pref("media.autoplay.default", 0);\n')
        f.write('user_pref("media.autoplay.blocking_policy", 0);\n')
    opts = Options()
    opts.binary_location = FIREFOX_BIN
    opts.add_argument("-headless")
    opts.add_argument("-profile")
    opts.add_argument(PROFILE)
    return webdriver.Firefox(service=Service(GECKODRIVER), options=opts)


def resolve_uuid(driver, return_to_handle):
    """Probe in a throwaway tab so the fixture tab is never navigated."""
    driver.execute_script("window.open('about:blank', '_blank');")
    probe = driver.window_handles[-1]
    driver.switch_to.window(probe)
    uuid = None
    try:
        try:
            driver.set_page_load_timeout(15)
            driver.get(f"moz-extension://{FIXED_UUID}/options/options.html")
            if "options" in (driver.current_url or ""):
                uuid = FIXED_UUID
        except (TimeoutException, WebDriverException):
            pass
        if uuid is None:
            driver.get("about:debugging#/runtime/this-firefox")
            time.sleep(4)
            try:
                src = driver.page_source
                m = re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", src)
                if m:
                    uuid = m.group(0)
            except WebDriverException:
                pass
    finally:
        try:
            driver.close()
        except WebDriverException:
            pass
        driver.switch_to.window(return_to_handle)
    return uuid


def js(driver, script):
    return driver.execute_script("return (" + script + ")")


def fixture_report(driver):
    return json.loads(js(driver, "window.__report()"))


def show_section(driver, section_id):
    """Click the sidebar nav item so the section is VISIBLE (sections are
    display:none unless .is-active — hidden content can't be clicked)."""
    driver.execute_script(
        f"document.querySelector('.nav-item[data-nav-target=\"{section_id}\"]')?.click();"
    )
    time.sleep(0.4)


def iframe_report(driver):
    frame = driver.find_element(By.ID, "xorigin")
    driver.switch_to.frame(frame)
    try:
        return json.loads(js(driver, "window.__report()"))
    finally:
        driver.switch_to.default_content()


def start_iframe_audio(driver):
    """Click the iframe's own Start button (a trusted gesture inside the
    cross-origin frame — the only reliable way past the autoplay policy)."""
    frame = driver.find_element(By.ID, "xorigin")
    driver.switch_to.frame(frame)
    try:
        WebDriverWait(driver, 10).until(
            lambda d: d.find_elements(By.ID, "start")
        )
        driver.find_element(By.ID, "start").click()
    finally:
        driver.switch_to.default_content()


def wait_playing(driver, timeout=15):
    """All media players actually producing sound."""
    def all_playing(d):
        r = fixture_report(d)
        return r["indom"] and r["detached"] and r["shadow"] and r["stubborn"]
    WebDriverWait(driver, timeout).until(all_playing)
    start_iframe_audio(driver)
    WebDriverWait(driver, 10).until(lambda d: iframe_report(d)["iframe"])


def wait_audio_context(driver, timeout=25):
    """Headless Firefox's audio thread can take several seconds to move a
    freshly created AudioContext from 'suspended' to 'running'. Wait for
    it, but never fail the run on it — the ctx assertions are conditional
    wherever they matter."""
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: fixture_report(d)["ctx"] == "running"
        )
        return True
    except TimeoutException:
        return False


def open_options(driver, uuid):
    """v1.1.24: the options page must live in its OWN WINDOW. The pause
    sweep targets the active tab of every window — keeping the fixture
    tab selected in its window is what lets the headless run (no audio
    device, so tab.audible never flips) exercise the real pause path."""
    driver.switch_to.new_window("window")
    options_handle = driver.current_window_handle
    driver.get(f"moz-extension://{uuid}/options/options.html")
    WebDriverWait(driver, 20).until(
        lambda d: d.find_elements(By.ID, "test-media")
    )
    return options_handle


def sweep_targets(driver):
    """Run one test-media sweep through the real message handler and
    return the exact list of tab ids the controller targeted — the
    authoritative targeting proof (no page-side counters needed).

    Firefox quirk this replaces page-side checks for: a single
    scripting.executeScript call carrying `args` (allFrames, world MAIN)
    may ALSO run its function in other same-site tabs — the leaked
    executions' results are discarded, but a page-side pause-call
    counter would still see them. The controller's own target list is
    the ground truth."""
    return driver.execute_script(
        "return browser.runtime.sendMessage({type: 'tcalm:test-media-pause'})"
        ".then(r => r.targetTabIds || [])"
    )


def click_and_read_status(driver, button_id, timeout=25):
    driver.find_element(By.ID, button_id).click()
    def answered(d):
        text = d.find_element(By.ID, "media-test-status").text or ""
        return text.strip() not in ("", "…")
    WebDriverWait(driver, timeout).until(answered)
    return driver.find_element(By.ID, "media-test-status").text.strip()


def open_fixture_window(driver, start=True):
    """A new WINDOW with a fresh fixture page, its players started."""
    driver.switch_to.new_window("window")
    handle = driver.current_window_handle
    driver.get(FIXTURE_URL)
    WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "start-all"))
    if start:
        driver.find_element(By.ID, "start-all").click()
        wait_playing(driver)
    return handle


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    xpi = build_variant()
    servers = start_fixture_servers()
    driver = None
    try:
        driver = make_driver()
        driver.set_page_load_timeout(20)

        # ---- PHASE A: players first, extension afterwards ----------------
        driver.get(FIXTURE_URL)
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "start-all"))
        driver.find_element(By.ID, "start-all").click()
        wait_playing(driver)
        before = fixture_report(driver)
        iframe_before = iframe_report(driver)
        check("A: in-DOM + detached + shadow players are playing", True,
              f"ctx={before['ctx']} hook={before['hook']} iframe={iframe_before['iframe']}")
        # document.querySelectorAll sees ONLY the in-DOM <audio>: the
        # shadow one is behind a shadow root, the iframe is another
        # document, and the DETACHED one (the SoundCloud case) is out of
        # the DOM tree entirely — invisible to any DOM query.
        check("A: the detached player is invisible to DOM queries (the bug we fix)",
              js(driver, "document.querySelectorAll('audio,video').length") == 1)

        fixture_handle = driver.current_window_handle
        driver.install_addon(xpi, temporary=True)
        time.sleep(3)
        uuid = resolve_uuid(driver, fixture_handle)
        check("A: extension installed and UUID resolved", uuid is not None, str(uuid))

        # The fixture page was NEVER reloaded, yet Firefox injects static
        # content scripts into existing tabs at install time — so the hook
        # IS here. Its registry missed every play() call (they happened
        # before it arrived), so the getter trap is the only thing that can
        # still find the detached player. That is exactly what the next
        # checks prove.
        pre = fixture_report(driver)
        check("A: hook arrived on the never-reloaded page (install-time injection)",
              pre["hook"] is True, json.dumps(pre))
        check("A: players still playing after install",
              pre["indom"] and pre["detached"] and pre["shadow"], json.dumps(pre))

        options_handle = open_options(driver, uuid)
        show_section(driver, "section-media")
        status = click_and_read_status(driver, "test-media")
        check("A: test button reports paused media (not 'no playing media')",
              "No playing media" not in status, status)

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        after = fixture_report(driver)
        iframe_after = iframe_report(driver)
        check("A: in-DOM audio paused", after["indom"] is False, json.dumps(after))
        check("A: DETACHED audio paused (the SoundCloud fix)",
              after["detached"] is False, json.dumps(after))
        check("A: shadow-DOM audio paused", after["shadow"] is False, json.dumps(after))
        # v1.1.26: the stubborn player restarts 100 ms after the pause and
        # retries twice — the anti-auto-resume watch (+200 ms / +500 ms
        # re-checks) must have drained its retry budget and left it
        # paused inside the SAME pause call. Read the state AFTER the
        # watch window has fully elapsed, so a lost race cannot hide
        # behind timing.
        time.sleep(1.0)
        after_watch = fixture_report(driver)
        check("A: STUBBORN auto-resume player stays paused (the v1.1.26 watch)",
              after_watch["stubborn"] is False, json.dumps(after_watch))
        check("A: cross-origin iframe audio paused (allFrames)",
              iframe_after["iframe"] is False, json.dumps(iframe_after))
        check("A: hook installed late into the live page", after["hook"] is True)
        if before["ctx"] == "running":
            # Late injection cannot retro-track an AudioContext created
            # before the hook existed — the documented limitation; after a
            # reload (phase B) it is suspended.
            check("A: pre-existing AudioContext untouched (documented limitation)",
                  after["ctx"] == "running", after["ctx"])
        check("A: mediaSession reports the pause", after["ms"] in ("paused", "none"), after["ms"])

        # Resume through the button, on the SAME live page.
        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        resume_status = click_and_read_status(driver, "resume-media")
        check("A: resume button reports restored media", "Resumed" in resume_status, resume_status)

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        restored = fixture_report(driver)
        iframe_restored = iframe_report(driver)
        check("A: in-DOM audio resumed", restored["indom"] is True, json.dumps(restored))
        check("A: DETACHED audio resumed (SoundCloud-style restore)",
              restored["detached"] is True, json.dumps(restored))
        check("A: shadow-DOM audio resumed", restored["shadow"] is True, json.dumps(restored))
        check("A: STUBBORN player resumed too (and keeps playing on its own)",
              restored["stubborn"] is True, json.dumps(restored))
        check("A: cross-origin iframe audio resumed", iframe_restored["iframe"] is True,
              json.dumps(iframe_restored))

        # ---- PHASE B: static document_start registration ------------------
        driver.switch_to.window(fixture_handle)
        driver.get(FIXTURE_URL)  # reload — now the static hook applies
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "start-all"))
        static = fixture_report(driver)
        check("B: static MAIN-world hook present right after load",
              static["hook"] is True, json.dumps(static))
        driver.find_element(By.ID, "start-all").click()
        wait_playing(driver)
        ctx_running_b = wait_audio_context(driver)
        before_b = fixture_report(driver)
        check("B: players playing again", True,
              json.dumps({**before_b, "ctx": before_b["ctx"] + " (waited)"}))

        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        status_b = click_and_read_status(driver, "test-media")
        check("B: test button reports paused media",
              "No playing media" not in status_b, status_b)
        if ctx_running_b:
            check("B: suspended Web Audio contexts join the count (+N web audio)",
                  "web audio" in status_b, status_b)

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        after_b = fixture_report(driver)
        check("B: every element paused", after_b["indom"] is False and after_b["detached"] is False
              and after_b["shadow"] is False and after_b["stubborn"] is False, json.dumps(after_b))
        if ctx_running_b:
            check("B: Web Audio context suspended (tracked from construction)",
                  after_b["ctx"] == "suspended", after_b["ctx"])

        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        resume_b = click_and_read_status(driver, "resume-media")
        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        restored_b = fixture_report(driver)
        if ctx_running_b:
            # The context resume is async — give it the same headless grace.
            wait_audio_context(driver)
            restored_b = fixture_report(driver)
            check("B: Web Audio context resumed", restored_b["ctx"] == "running", restored_b["ctx"])
        check("B: elements resumed after the hold-free single pause",
              restored_b["indom"] is True and restored_b["detached"] is True
              and restored_b["shadow"] is True and restored_b["stubborn"] is True,
              json.dumps(restored_b))

        # ---- PHASE C: v1.1.24 targeting + last-pause-only resume ---------
        # Window A (fixture_handle) is still playing from phase B's resume.
        window_b = open_fixture_window(driver, start=True)
        check("C: second fixture window playing", fixture_report(driver)["indom"] is True)

        # A BACKGROUND tab in window A: it plays while selected (so it was
        # genuinely audible once), then gets deselected. In this headless
        # environment Firefox auto-pauses a deselected tab's media — but the
        # tab stays on the sweep's target list via the recently-audible
        # cache: exactly the SoundCloud track-gap semantics it exists for.
        driver.switch_to.window(fixture_handle)
        driver.execute_script("window.open(arguments[0], '_blank');", FIXTURE_URL)
        bg_handle = driver.window_handles[-1]
        driver.switch_to.window(bg_handle)
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "start-all"))
        driver.find_element(By.ID, "start-all").click()
        wait_playing(driver)
        driver.switch_to.window(fixture_handle)  # background it again

        # A SILENT tab: never played anything, so it was never audible and
        # never cached; it is deselected at pause time — genuinely OUT of
        # the sweep's scope. Its instrumented pause-call counter must stay
        # at zero while the sweep runs: the targeting proof.
        driver.execute_script("window.open(arguments[0], '_blank');", FIXTURE_URL)
        silent_handle = driver.window_handles[-1]
        driver.switch_to.window(silent_handle)
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.ID, "start-all"))
        driver.switch_to.window(fixture_handle)  # deselect it immediately

        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        status_c1 = click_and_read_status(driver, "test-media")
        check("C1: both on-screen fixture tabs paused by one event",
              "No playing media" not in status_c1, status_c1)

        # The authoritative targeting proof: the sweep's own target list.
        # Tab ids are deterministic in this flow: 1 = fixture A, 2 = the
        # (closed) UUID probe, 3/4 = the options window, 5 = fixture B,
        # 6 = the deselected background tab, 7 = the silent tab. The sweep
        # must see exactly the three on-screen tabs — never 6 or 7.
        targets_c1 = sweep_targets(driver)
        check("C1: the sweep targeted exactly the three on-screen tabs (no blind sweep)",
              targets_c1 == [1, 4, 5], json.dumps(targets_c1))

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        a1 = fixture_report(driver)
        driver.switch_to.window(window_b)
        b1 = fixture_report(driver)
        check("C1: window A paused", a1["indom"] is False and a1["detached"] is False,
              json.dumps(a1))
        check("C1: window B paused", b1["indom"] is False and b1["detached"] is False,
              json.dumps(b1))

        # The user manually restarts window A (their own click wins over
        # Tcalm: the hook drops those elements from its restore set).
        driver.switch_to.window(fixture_handle)
        driver.find_element(By.ID, "start-all").click()
        wait_playing(driver)
        check("C2: user manually restarted window A", fixture_report(driver)["indom"] is True)

        # Event 2: pause again — ONLY window A has playing media now, so the
        # lastPause record points at window A alone.
        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        status_c2 = click_and_read_status(driver, "test-media")
        check("C2: second pause event reports paused media",
              "No playing media" not in status_c2, status_c2)

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        a2 = fixture_report(driver)
        check("C2: window A paused again by the newest event", a2["indom"] is False,
              json.dumps(a2))

        # Resume: must restore window A ONLY — window B was paused by the
        # OLDER event and must stay paused (the owner's exact complaint).
        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        resume_c = click_and_read_status(driver, "resume-media")
        check("C3: resume reports restored items", "Resumed" in resume_c, resume_c)

        driver.switch_to.window(fixture_handle)
        time.sleep(1)
        a3 = fixture_report(driver)
        driver.switch_to.window(window_b)
        b3 = fixture_report(driver)
        check("C3: window A resumed (the newest pause event)", a3["indom"] is True,
              json.dumps(a3))
        check("C3: window B STAYS PAUSED (older event, not resumed together)",
              b3["indom"] is False and b3["detached"] is False, json.dumps(b3))

        # The record is consumed: a second resume click has nothing to do.
        driver.switch_to.window(options_handle)
        show_section(driver, "section-media")
        resume_c2 = click_and_read_status(driver, "resume-media")
        check("C3: second resume is a clean no-op",
              "Resumed" not in resume_c2, resume_c2)

    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
        for srv in servers:
            srv.shutdown()
        if "--keep" not in sys.argv:
            pass  # keep OUT_DIR artifacts for inspection

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed", flush=True)
    if failed:
        for name, _ok, detail in failed:
            print(f"  FAILED: {name} [{detail}]", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
