#!/usr/bin/env python3
"""
Real-Firefox E2E for Tcalm v1.1.21 — ESR 140 headless + shipped XPI.

Proves on the exact artifact that ships:
  1. the WORLD database (194 countries / 593 cities) in the options page,
     locale-sorted, with multi-timezone city zones applied on selection;
  2. the alert-window default is 'never' on a fresh install;
  3. diagnostics one-week retention (an 8-day-old stored entry is not
     rendered; the summary line shows the real count);
  4. the full save flow still works (select -> storage -> toast);
  5. Arabic mode: RTL, Arabic-sorted country list, Arabic hint;
  6. popup + background answer runtime messages; alarm fleet alive.

Usage: python3 scripts/e2e-v1121-check.py [path-to-xpi]
"""
import json
import os
import re
import sys
import time

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.ui import WebDriverWait

GECKODRIVER = "/home/z/e2e/geckodriver"
FIREFOX_BIN = "/home/z/e2e/firefox/firefox"
PROFILE = "/home/z/e2e/profile-v1121"
EXT_ID = "{35e5cf8f-d5b8-436b-ae84-0291e49bb7c2}"
FIXED_UUID = "11a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"
SHOT_DIR = "/home/z/my-project/tcalm-firefox/package-out/e2e-shots"
DEFAULT_XPI = "/home/z/my-project/tcalm-firefox/package-out/tcalm-v1.1.21.xpi"

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


def selected_value(driver, elem_id):
    return js(driver, f"document.getElementById('{elem_id}').value")


def wait_for_options(driver, timeout=20):
    WebDriverWait(driver, timeout).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, "#country option")) > 190
    )


def main():
    xpi = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XPI)
    os.makedirs(SHOT_DIR, exist_ok=True)
    driver = make_driver()
    driver.set_page_load_timeout(30)
    try:
        addon_id = driver.install_addon(xpi, temporary=True)
        print("installed add-on id:", addon_id)

        uuid = resolve_uuid(driver)
        check("extension UUID resolved (options page reachable)", uuid is not None, uuid)
        if uuid is None:
            raise SystemExit("cannot reach the extension pages")
        base = f"moz-extension://{uuid}"

        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)

        # --- 1. world database ------------------------------------------------
        country_opts = Select(driver.find_element(By.ID, "country")).options
        check("country list = 194 countries + placeholder", len(country_opts) == 195,
              f"{len(country_opts)} options")
        en_labels = [o.get_attribute("textContent") for o in country_opts[1:]]
        check("EN country list is alphabetical (first = Afghanistan)",
              en_labels[0].strip() == "Afghanistan", en_labels[0])

        hint = driver.find_element(By.ID, "world-hint").get_attribute("textContent")
        check("world hint mentions 194 countries & 593 cities",
              "194 countries" in hint and "593 cities" in hint, hint[:60])

        # Egypt (default install country) — richest row.
        check("fresh install defaults to Egypt",
              selected_value(driver, "country") == "Egypt")
        city_opts = Select(driver.find_element(By.ID, "city")).options
        check("Egypt has 21 cities", len(city_opts) == 22, f"{len(city_opts)} options")
        check("Egypt method hint = 5 (Egyptian authority)",
              selected_value(driver, "method") == "5")

        # Multi-timezone country: United States -> Los Angeles.
        set_select(driver, "country", "United States")
        WebDriverWait(driver, 10).until(
            lambda d: d.find_element(By.ID, "latitude").get_attribute("value") != "30.0444"
        )
        us_cities = Select(driver.find_element(By.ID, "city")).options
        check("United States has 17 cities", len(us_cities) == 18, f"{len(us_cities)} options")
        check("US method hint = 2 (ISNA)", selected_value(driver, "method") == "2")

        set_select(driver, "city", "Los Angeles")
        time.sleep(1.0)  # debounce (300 ms) + save
        check("Los Angeles applies its OWN timezone",
              selected_value(driver, "timezone") == "America/Los_Angeles",
              selected_value(driver, "timezone"))
        lat = driver.find_element(By.ID, "latitude").get_attribute("value")
        lng = driver.find_element(By.ID, "longitude").get_attribute("value")
        check("LA coordinates applied", lat.startswith("34.05") and lng.startswith("-118.24"),
              f"{lat}, {lng}")

        # --- 2. save flow ------------------------------------------------------
        stored = js(driver, """
            (async () => {
              const s = (await browser.storage.local.get('settings')).settings;
              return s;
            })()
        """)
        # execute_script is sync — use the async variant instead:
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

        # --- 3. alert-window default -------------------------------------------
        alert_mode_opts = js(driver, """
            Array.from(document.getElementById('alert-window-mode').options)
              .map(o => [o.value, o.textContent.trim()])
        """)
        alert_val = selected_value(driver, "alert-window-mode")
        check("alert-window default = never (fresh install)", alert_val == "never")
        never_label = dict(alert_mode_opts).get("never", "")
        check("never option is labeled the default",
              "default" in never_label.lower() or "الافتراضي" in never_label, never_label[:60])

        # --- 4. diagnostics one-week retention ---------------------------------
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
        # Prove the injection actually landed in storage BEFORE judging the render.
        stored_diag = driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.get('_diagnostics').then(r => cb(r._diagnostics));"
        )
        check("injected diag entries are in storage",
              stored_diag and any(e["message"] == "FRESH-EVENT" for e in stored_diag),
              json.dumps(stored_diag)[:90] if stored_diag else "none")
        # Force a REAL reload (driver.get on the same URL may not re-navigate).
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

        # --- 5. Arabic mode ------------------------------------------------------
        set_select(driver, "language", "ar")
        time.sleep(1.2)
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.documentElement.lang") == "ar"
        )
        check("Arabic mode: document lang=ar dir=rtl",
              js(driver, "document.documentElement.dir") == "rtl")
        ar_country = Select(driver.find_element(By.ID, "country"))
        ar_labels = [o.get_attribute("textContent") for o in ar_country.options[1:]]
        check("Arabic country labels are Arabic (194)",
              len(ar_labels) == 194 and sum(1 for t in ar_labels if re.search(r"[\u0600-\u06FF]", t)) >= 190)
        dom_sorted = js(driver, """
            Array.from(document.querySelectorAll('#country option'))
              .slice(1).map(o => o.textContent.trim())
        """)
        py_sorted = sorted(dom_sorted, key=lambda s: s)  # placeholder for collator check below
        coll_ok = js(driver, """
            (function () {
              const labels = Array.from(document.querySelectorAll('#country option'))
                .slice(1).map(o => o.textContent.trim());
              const c = new Intl.Collator('ar', { sensitivity: 'base' });
              const ref = labels.slice().sort((a, b) => c.compare(a, b));
              return labels.every((l, i) => l === ref[i]);
            })()
        """)
        check("Arabic list is sorted with the AR collator", coll_ok,
              ar_labels[0] + " / " + ar_labels[1])
        ar_hint = driver.find_element(By.ID, "world-hint").get_attribute("textContent")
        check("Arabic world hint (194 دولة / 593 مدينة)",
              "194 دولة" in ar_hint and "593 مدينة" in ar_hint, ar_hint[:70])
        driver.save_screenshot(f"{SHOT_DIR}/options-light-ar.png")

        # Dark mode Arabic
        driver.execute_script(
            "document.documentElement.dataset.theme = 'dark'")
        time.sleep(0.6)
        driver.save_screenshot(f"{SHOT_DIR}/options-dark-ar.png")

        # --- 6. popup + background ------------------------------------------------
        driver.get(f"{base}/popup/popup.html")
        WebDriverWait(driver, 15).until(
            lambda d: d.find_elements(By.ID, "prayer-list") or
            d.find_elements(By.CSS_SELECTOR, ".prayer-row, .prayers, #next-prayer")
        )
        pop_text = driver.find_element(By.TAG_NAME, "body").get_attribute("textContent")
        check("popup renders prayers in Arabic", "الفجر" in pop_text or "العشاء" in pop_text,
              (pop_text or "")[:40].strip())

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

        # --- 7. tab favicon (regression v1.1.20) ----------------------------------
        driver.get(f"{base}/options/options.html")
        wait_for_options(driver)
        favicon = driver.find_elements(By.CSS_SELECTOR, "link[rel='icon']")
        check("options page favicon link present", len(favicon) >= 1)
        # Final gallery shot: EN dark options (regression: v1.1.20 dark elevation)
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
