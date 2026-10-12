#!/usr/bin/env python3
"""
Real-Firefox E2E for Tcalm v1.1.22 — ESR 140 headless + shipped XPI.

Proves on the exact artifact that ships:
  1. FIRST-INSTALL ONBOARDING: the landing page opens by itself after a
     fresh install, renders its permission walkthrough (bilingual), and
     the "Open settings" hand-off works;
  2. the alert-window control is now a 3-way iOS segment defaulting to
     'never', one click switches and persists the mode;
  3. the media permission card shows the amber WARNING state on a fresh
     install, "Test media pause" refuses to run with the localized
     warning, and the background answers permissionMissing without
     sweeping tabs;
  4. "Permission setup" in Settings reopens the onboarding page anytime;
  5. v1.1.21 regressions: world database, save flow, one-week
     diagnostics retention, Arabic RTL, popup + background, alarms,
     tab favicon.

Usage: python3 scripts/e2e-v1122-check.py [path-to-xpi]
"""
import json
import os
import re
import sys
import time

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.ui import WebDriverWait

GECKODRIVER = "/home/z/e2e/geckodriver"
FIREFOX_BIN = "/home/z/e2e/firefox/firefox"
PROFILE = "/home/z/e2e/profile-v1122"
EXT_ID = "{35e5cf8f-d5b8-436b-ae84-0291e49bb7c2}"
FIXED_UUID = "11a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"
SHOT_DIR = "/home/z/my-project/tcalm-firefox/package-out/e2e-shots-v1122"
DEFAULT_XPI = "/home/z/my-project/tcalm-firefox/package-out/tcalm-v1.1.22.xpi"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), str(detail)))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def make_driver():
    os.makedirs(PROFILE, exist_ok=True)
    with open(os.path.join(PROFILE, "user.js"), "w", encoding="utf-8") as f:
        # Pre-seed the extension's internal UUID so moz-extension:// URLs
        # are deterministic. If Firefox ignores the pref, we fall back to
        # scraping about:debugging for the runtime UUID.
        f.write(
            'user_pref("extensions.webextensions.uuids", '
            '"{\\"' + EXT_ID + '\\": \\"' + FIXED_UUID + '\\"}");\n'
        )
        f.write('user_pref("app.update.enabled", false);\n')
        f.write('user_pref("browser.shell.checkDefaultBrowser", false);\n')
    opts = Options()
    opts.binary_location = FIREFOX_BIN
    opts.add_argument("-headless")
    opts.add_argument("-profile")
    opts.add_argument(PROFILE)
    return webdriver.Firefox(service=Service(GECKODRIVER), options=opts)


def resolve_uuid(driver):
    """Try the pre-seeded UUID; otherwise scrape about:debugging."""
    try:
        driver.set_page_load_timeout(15)
        driver.get(f"moz-extension://{FIXED_UUID}/options/options.html")
        if "options" in (driver.current_url or ""):
            return FIXED_UUID
    except (TimeoutException, WebDriverException):
        pass
    # Fallback: about:debugging lists temporary extensions with their UUID.
    driver.get("about:debugging#/runtime/this-firefox")
    time.sleep(4)
    try:
        cards = driver.find_elements(By.CSS_SELECTOR, "li, div")
        for card in cards:
            if "Tcalm" in (card.text or "") and len(card.text) < 300:
                try:
                    card.click()
                    time.sleep(1)
                except Exception:
                    pass
                break
        src = driver.page_source
        m = re.search(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", src
        )
        if m:
            return m.group(0)
    except WebDriverException:
        pass
    return None


def js(driver, script):
    return driver.execute_script("return (" + script + ")")


def set_select(driver, elem_id, value):
    """Set a <select> value the way a real user change does (change event)
    — native option.click() is unreliable for long lists in headless."""
    driver.execute_script(
        "const s = document.getElementById(arguments[0]);"
        "s.value = arguments[1];"
        "s.dispatchEvent(new Event('change', { bubbles: true }));",
        elem_id,
        value,
    )


def wait_for_options(driver, timeout=20):
    WebDriverWait(driver, timeout).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#country option")) > 190
    )


def wait_for_onboarding(driver, timeout=15):
    WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(By.ID, "grant-btn")
    )


def show_section(driver, section_id):
    """Click the sidebar nav item so the section is VISIBLE (sections are
    display:none unless .is-active — hidden content can't be clicked or
    screenshot)."""
    driver.execute_script(
        f"document.querySelector('.nav-item[data-nav-target=\"{section_id}\"]')?.click();"
    )
    time.sleep(0.4)


def switch_to_url_containing(driver, needle, timeout=10):
    """Find (and switch to) ANY open tab whose URL contains needle —
    openOptionsPage() opens a NEW tab because options_ui.open_in_tab=true."""
    end = time.time() + timeout
    while time.time() < end:
        for handle in driver.window_handles:
            driver.switch_to.window(handle)
            try:
                if needle in (driver.current_url or ""):
                    return True
            except WebDriverException:
                pass
        time.sleep(0.5)
    return False


def main():
    xpi = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XPI)
    os.makedirs(SHOT_DIR, exist_ok=True)
    driver = make_driver()
    driver.set_page_load_timeout(30)
    try:
        before_handles = set(driver.window_handles)
        addon_id = driver.install_addon(xpi, temporary=True)
        print("installed add-on id:", addon_id)
        time.sleep(3.0)  # onInstalled -> tabs.create(onboarding)

        # --- 1. onboarding auto-opens on FIRST INSTALL ------------------------
        after_handles = set(driver.window_handles)
        new_handles = after_handles - before_handles
        onb_tab = None
        for handle in new_handles:
            driver.switch_to.window(handle)
            if "onboarding" in (driver.current_url or ""):
                onb_tab = handle
                break
        check("first install: onboarding tab opened by itself", onb_tab is not None,
              f"{len(new_handles)} new tab(s), url={driver.current_url}")
        if onb_tab is None and new_handles:
            # still inspect whatever tab opened
            driver.switch_to.window(sorted(new_handles)[0])

        uuid = resolve_uuid(driver)
        # resolve_uuid may have navigated away; remember it worked
        check("extension UUID resolved (pages reachable)", uuid is not None, uuid)
        if uuid is None:
            raise SystemExit("cannot reach the extension pages")
        base = f"moz-extension://{uuid}"

        # --- 2. onboarding content (fresh install = nothing granted) ----------
        driver.get(f"{base}/onboarding/onboarding.html")
        wait_for_onboarding(driver)
        check("onboarding: boot warning is HIDDEN once JS runs",
              js(driver, "document.getElementById('boot-warning').offsetParent") is None)
        onb_title = driver.find_element(By.TAG_NAME, "body").get_attribute("textContent")
        check("onboarding: welcome + tagline render",
              "Welcome to Tcalm" in onb_title and "Firefox" in onb_title,
              onb_title[:60].strip())
        for row_id, needle in [
            ("perm-row-core", "Required"),
            ("perm-row-media", "Optional"),
            ("perm-row-ip", "ipwho.is"),
        ]:
            row_text = driver.find_element(By.ID, row_id).get_attribute("textContent")
            check(f"onboarding: {row_id} explains itself", needle in row_text,
                  row_text[:70].strip())
        grant_btn = driver.find_element(By.ID, "grant-btn")
        check("onboarding: grant button is ENABLED (nothing granted yet)",
              grant_btn.is_enabled() and grant_btn.get_attribute("textContent").strip() == "Enable all permissions",
              grant_btn.get_attribute("textContent").strip()[:50])
        check("onboarding: one script tag only (CSP clean)",
              js(driver, "document.scripts.length") == 1)
        driver.save_screenshot(f"{SHOT_DIR}/onboarding-light-en.png")

        # Open settings hand-off from the onboarding page (NEW tab).
        driver.find_element(By.ID, "open-settings-btn").click()
        check("onboarding: Open settings lands on the options page",
              switch_to_url_containing(driver, "options"), driver.current_url)
        wait_for_options(driver)

        # --- 3. alert-window 3-way segment --------------------------------------
        show_section(driver, "section-notifications")
        seg = driver.find_elements(By.CSS_SELECTOR, ".ios-segment.seg-3")
        check("alert-window: 3-way segment present", len(seg) == 1)
        checked_default = js(driver, """
            ['always','auto','never'].map(m =>
              document.getElementById('alert-window-mode-' + m).checked)
        """)
        check("alert-window: default = never (fresh install)",
              checked_default == [False, False, True], str(checked_default))
        hint = driver.find_element(
            By.CSS_SELECTOR, "[data-i18n='options_alertWindowModeHint']").get_attribute("textContent")
        check("alert-window: hint is SHORT and names the default",
              0 < len(hint.strip()) <= 120 and "Default: Never" in hint, hint.strip()[:80])
        check("alert-window: the old wall-of-text is gone",
              "radical guarantee" not in hint and "Focus Assist" not in hint)

        # One real click switches + persists the mode (JS .click() fires the
        # native change event — the radio input itself is visually hidden
        # behind the segment, exactly like the real control).
        driver.execute_script("document.getElementById('alert-window-mode-always').click();")
        time.sleep(1.0)  # 300 ms debounce + save
        stored_mode = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.get('settings').then(r => cb(r.settings.alertWindowMode));"
        )
        check("alert-window: one click switches + saves 'always'",
              stored_mode == "always", str(stored_mode))
        # Back to never for the rest of the flow.
        driver.execute_script("document.getElementById('alert-window-mode-never').click();")
        time.sleep(1.0)
        driver.save_screenshot(f"{SHOT_DIR}/options-alert-segment-en.png")

        # --- 4. media permission WARNING state (fresh install) ------------------
        show_section(driver, "section-media")
        state = js(driver, "document.getElementById('perm-card').dataset.state")
        check("permission card: denied state on fresh install", state == "denied", state)
        perm_text = driver.find_element(By.ID, "permission-status").get_attribute("textContent")
        check("permission card: warning names the consequence",
              "Not granted" in perm_text and "cannot pause" in perm_text, perm_text[:70].strip())
        setup_btn = driver.find_elements(By.ID, "open-setup")
        check("permission card: Permission setup entry present", len(setup_btn) == 1)
        driver.save_screenshot(f"{SHOT_DIR}/options-perm-warning-en.png")

        # Test media pause refuses to run without the permission.
        driver.find_element(By.ID, "test-media").click()
        time.sleep(0.8)
        test_status = driver.find_element(By.ID, "media-test-status").get_attribute("textContent")
        check("test-media: warning shown, test refused",
              "permission first" in test_status and "No playing media" not in test_status,
              test_status[:80].strip())

        # The background handler short-circuits with permissionMissing.
        bg_answer = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.runtime.sendMessage({ type: 'tcalm:test-media-pause' })"
            ".then(r => cb(r), e => cb({ err: String(e) }));"
        )
        check("background: answers permissionMissing (no tab sweep)",
              bg_answer and bg_answer.get("permissionMissing") is True
              and bg_answer.get("ok") is False,
              json.dumps(bg_answer)[:70])

        # --- 5. "Permission setup" reopens onboarding anytime --------------------
        driver.switch_to.window(driver.window_handles[0])
        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        show_section(driver, "section-media")
        driver.find_element(By.ID, "open-setup").click()
        check("settings: Permission setup reopens the onboarding page",
              switch_to_url_containing(driver, "onboarding"), driver.current_url)
        wait_for_onboarding(driver)
        driver.save_screenshot(f"{SHOT_DIR}/onboarding-reopened.png")

        # --- 6. v1.1.21 regressions: world database -------------------------------
        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        country_opts = Select(driver.find_element(By.ID, "country")).options
        check("country list = 194 countries + placeholder", len(country_opts) == 195,
              f"{len(country_opts)} options")
        en_labels = [o.get_attribute("textContent") for o in country_opts[1:]]
        check("EN country list is alphabetical (first = Afghanistan)",
              en_labels[0].strip() == "Afghanistan", en_labels[0])

        hint_w = driver.find_element(By.ID, "world-hint").get_attribute("textContent")
        check("world hint mentions 194 countries & 593 cities",
              "194 countries" in hint_w and "593 cities" in hint_w, hint_w[:60])

        check("fresh install defaults to Egypt",
              js(driver, "document.getElementById('country').value") == "Egypt")
        city_opts = Select(driver.find_element(By.ID, "city")).options
        check("Egypt has 21 cities", len(city_opts) == 22, f"{len(city_opts)} options")
        check("Egypt method hint = 5 (Egyptian authority)",
              js(driver, "document.getElementById('method').value") == "5")

        set_select(driver, "country", "United States")
        WebDriverWait(driver, 10).until(
            lambda d: d.find_element(By.ID, "latitude").get_attribute("value") != "30.0444"
        )
        us_cities = Select(driver.find_element(By.ID, "city")).options
        check("United States has 17 cities", len(us_cities) == 18, f"{len(us_cities)} options")
        set_select(driver, "city", "Los Angeles")
        time.sleep(1.0)
        check("Los Angeles applies its OWN timezone",
              js(driver, "document.getElementById('timezone').value") == "America/Los_Angeles",
              js(driver, "document.getElementById('timezone').value"))

        stored = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.get('settings').then(r => cb(r.settings));"
        )
        check("save flow persisted LA to storage",
              stored and stored.get("timezone") == "America/Los_Angeles"
              and stored.get("country") == "United States"
              and stored.get("city") == "Los Angeles",
              json.dumps({k: stored.get(k) for k in ("country", "city", "timezone")})
              if stored else "none")

        # --- 6b. v1.1.25: Diagnostics is signal-only (BEFORE section 7 wipes
        # the buffer with injected entries). The badge-tick alarm has fired
        # every minute since install, waking the background event page each
        # time. OLD builds appended one "notifications ready" Diagnostics
        # line PER WAKE (the owner's noise report); v1.1.25 records it once
        # per browser session.
        def diag_ready_lines():
            entries = driver.execute_async_script(
                "const cb = arguments[arguments.length - 1];"
                "browser.storage.local.get('_diagnostics').then(r => cb(r._diagnostics || []));"
            )
            return sum(1 for e in (entries or [])
                       if e and "notifications ready" in (e.get("message") or ""))

        before = diag_ready_lines()
        time.sleep(65)  # at least one more badge-tick wake beyond install
        after = diag_ready_lines()
        check("v1.1.25: readiness announced ONCE despite repeated wakes",
              before == 1 and after == 1, f"before={before} after65s={after}")

        # --- 7. diagnostics one-week retention -------------------------------------
        now_s = time.time()
        old_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_s - 8 * 86400))
        fresh_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_s - 3600))
        driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.set({ _diagnostics: ["
            f"{{ at: '{old_iso}', context: 'background', level: 'error', message: 'EIGHT-DAYS-OLD' }},"
            f"{{ at: '{fresh_iso}', context: 'popup', level: 'info', message: 'FRESH-EVENT' }}"
            "] }).then(() => cb());"
        )
        stored_diag = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.get('_diagnostics').then(r => cb(r._diagnostics));"
        )
        check("injected diag entries are in storage",
              stored_diag and any(e["message"] == "FRESH-EVENT" for e in stored_diag),
              json.dumps(stored_diag)[:90] if stored_diag else "none")
        driver.get("about:blank")
        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        time.sleep(1.5)
        diag_text = driver.find_element(By.ID, "diag-list").get_attribute("textContent")
        check("8-day-old entry is NOT rendered (retention)",
              "EIGHT-DAYS-OLD" not in diag_text)
        check("fresh entry IS rendered", "FRESH-EVENT" in diag_text)
        check("summary line shows the 7-day policy",
              "7 days" in diag_text and "1 of 1" in diag_text, diag_text[:80].strip())

        driver.save_screenshot(f"{SHOT_DIR}/options-light-en.png")

        # --- 8. Arabic mode (options + onboarding) ----------------------------------
        set_select(driver, "language", "ar")
        time.sleep(1.2)
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.documentElement.lang") == "ar"
        )
        check("Arabic mode: document lang=ar dir=rtl",
              js(driver, "document.documentElement.dir") == "rtl")
        ar_labels = [o.get_attribute("textContent")
                     for o in Select(driver.find_element(By.ID, "country")).options[1:]]
        check("Arabic country labels are Arabic (194)",
              len(ar_labels) == 194
              and sum(1 for t in ar_labels if re.search(r"[\u0600-\u06FF]", t)) >= 190)
        ar_hint = driver.find_element(By.ID, "world-hint").get_attribute("textContent")
        check("Arabic world hint (194 دولة / 593 مدينة)",
              "194 دولة" in ar_hint and "593 مدينة" in ar_hint, ar_hint[:70])

        # Arabic alert segment + short Arabic hint.
        ar_alert_hint = driver.find_element(
            By.CSS_SELECTOR, "[data-i18n='options_alertWindowModeHint']").get_attribute("textContent")
        check("Arabic alert hint is short + names the default",
              0 < len(ar_alert_hint.strip()) <= 120 and "الافتراضي" in ar_alert_hint,
              ar_alert_hint.strip()[:70])
        ar_seg_labels = js(driver, """
            ['always','auto','never'].map(m =>
              document.querySelector('#alert-window-mode-' + m + ' + span').textContent.trim())
        """)
        check("Arabic segment labels (دائماً/البديل/أبداً)",
              ar_seg_labels == ["دائماً", "البديل", "أبداً"], str(ar_seg_labels))
        ar_perm = driver.find_element(By.ID, "permission-status").get_attribute("textContent")
        check("Arabic permission warning renders",
              "لم يُمنح" in ar_perm, ar_perm[:60].strip())
        driver.save_screenshot(f"{SHOT_DIR}/options-light-ar.png")

        # Arabic onboarding page.
        driver.get(f"{base}/onboarding/onboarding.html")
        wait_for_onboarding(driver)
        check("Arabic onboarding: dir=rtl + Arabic welcome",
              js(driver, "document.documentElement.dir") == "rtl"
              and "مرحباً" in driver.find_element(By.TAG_NAME, "body").get_attribute("textContent"))
        driver.save_screenshot(f"{SHOT_DIR}/onboarding-light-ar.png")
        driver.execute_script("document.documentElement.dataset.theme = 'dark'")
        time.sleep(0.6)
        driver.save_screenshot(f"{SHOT_DIR}/onboarding-dark-ar.png")

        # Dark mode Arabic options.
        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        driver.execute_script("document.documentElement.dataset.theme = 'dark'")
        time.sleep(0.6)
        driver.save_screenshot(f"{SHOT_DIR}/options-dark-ar.png")

        # --- 9. popup + background + alarms + favicon -------------------------------
        driver.get(f"{base}/popup/popup.html")
        WebDriverWait(driver, 15).until(
            lambda d: d.find_elements(By.ID, "prayer-list") or
            d.find_elements(By.CSS_SELECTOR, ".prayer-row, .prayers, #next-prayer")
        )
        pop_text = driver.find_element(By.TAG_NAME, "body").get_attribute("textContent")
        check("popup renders prayers in Arabic", "الفجر" in pop_text or "العشراء" in pop_text
              or "العشاء" in pop_text, (pop_text or "")[:40].strip())

        answer = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.runtime.sendMessage({ type: 'tcalm:recalculate' }).then(r => cb(r), e => cb({err: String(e)}));"
        )
        check("background answers runtime messages", answer and answer.get("ok") is True,
              json.dumps(answer)[:80])
        driver.save_screenshot(f"{SHOT_DIR}/popup-ar.png")

        alarms = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.alarms.getAll().then(a => cb(a.map(x => x.name)));"
        )
        check("alarm fleet alive (>= 6)", alarms and len(alarms) >= 6,
              f"{len(alarms)}: {sorted(alarms)[:3]}...")

        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        favicon = driver.find_elements(By.CSS_SELECTOR, "link[rel='icon']")
        check("options page favicon link present", len(favicon) >= 1)
        driver.execute_script("document.documentElement.dataset.theme = 'dark'")
        driver.execute_script("document.documentElement.lang = 'en'")
        time.sleep(0.6)
        driver.save_screenshot(f"{SHOT_DIR}/options-dark-en.png")

    finally:
        driver.quit()

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n=== E2E: {passed}/{len(results)} PASS ===")
    for name, ok, detail in results:
        if not ok:
            print(f"  FAILED: {name} [{detail}]")
    sys.exit(0 if passed == len(results) else 1)


if __name__ == "__main__":
    main()
