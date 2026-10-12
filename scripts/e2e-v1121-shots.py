#!/usr/bin/env python3
"""Capture v1.1.21 proof shots: Location section (world DB) + Diagnostics."""
import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

GECKODRIVER = "/home/z/e2e/geckodriver"
FIREFOX_BIN = "/home/z/e2e/firefox/firefox"
PROFILE = "/home/z/e2e/profile-v1121b"
EXT_ID = "{35e5cf8f-d5b8-436b-ae84-0291e49bb7c2}"
FIXED_UUID = "11a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"
XPI = "/home/z/my-project/tcalm-firefox/package-out/tcalm-v1.1.21.xpi"
OUT = "/home/z/my-project/download"


def make_driver():
    os.makedirs(PROFILE, exist_ok=True)
    with open(os.path.join(PROFILE, "user.js"), "w", encoding="utf-8") as f:
        f.write(
            'user_pref("extensions.webextensions.uuids", '
            '"{\\"' + EXT_ID + '\\": \\"' + FIXED_UUID + '\\"}");\n'
        )
    opts = Options()
    opts.binary_location = FIREFOX_BIN
    opts.add_argument("-headless")
    opts.add_argument("-profile")
    opts.add_argument(PROFILE)
    return webdriver.Firefox(service=Service(GECKODRIVER), options=opts)


def set_select(driver, elem_id, value):
    driver.execute_script(
        "const s = document.getElementById(arguments[0]);"
        "s.value = arguments[1];"
        "s.dispatchEvent(new Event('change', { bubbles: true }));",
        elem_id,
        value,
    )


def nav_to(driver, label):
    driver.execute_script(
        "const btns = Array.from(document.querySelectorAll('.nav-item'));"
        "const hit = btns.find(b => (b.textContent || '').includes(arguments[0]));"
        "if (hit) hit.click();",
        label,
    )
    time.sleep(0.8)


def main():
    driver = make_driver()
    driver.set_page_load_timeout(30)
    try:
        driver.install_addon(XPI, temporary=True)
        base = f"moz-extension://{FIXED_UUID}"
        driver.get(f"{base}/options/options.html")
        WebDriverWait(driver, 20).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, "#country option")) > 190
        )

        # --- Location section, EN light: world list + hint + LA selected -------
        nav_to(driver, "Location")
        set_select(driver, "country", "United States")
        time.sleep(0.8)
        set_select(driver, "city", "Los Angeles")
        time.sleep(1.2)
        driver.save_screenshot(f"{OUT}/options-v1.1.21-location-world-en.png")

        # --- Location section, AR light: Arabic world list ----------------------
        set_select(driver, "language", "ar")
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.documentElement.lang") == "ar"
        )
        time.sleep(0.8)
        driver.save_screenshot(f"{OUT}/options-v1.1.21-location-world-ar.png")

        # --- Location dark EN ---------------------------------------------------
        set_select(driver, "language", "en")
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.documentElement.lang") == "en"
        )
        driver.execute_script("document.documentElement.dataset.theme = 'dark'")
        time.sleep(0.6)
        driver.save_screenshot(f"{OUT}/options-v1.1.21-location-world-dark.png")

        # --- Diagnostics section with the retention summary ---------------------
        driver.execute_script("document.documentElement.dataset.theme = 'light'")
        now_s = time.time()
        fresh = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_s - 1800))
        mid = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_s - 5400))
        old = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_s - 9 * 86400))
        driver.execute_async_script(
            "const cb = arguments[arguments.length - 1];"
            "browser.storage.local.set({ _diagnostics: ["
            f"{{ at: '{old}', context: 'background', level: 'error', message: 'sample: 9-day-old entry (must be auto-deleted)' }},"
            f"{{ at: '{mid}', context: 'popup', level: 'info', message: 'sample: popup loaded OK' }},"
            f"{{ at: '{fresh}', context: 'background', level: 'error', message: 'sample: notification failed (maghrib): timeout' }}"
            "] }).then(() => cb());"
        )
        driver.get("about:blank")
        driver.get(f"{base}/options/options.html")
        WebDriverWait(driver, 20).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, "#country option")) > 190
        )
        time.sleep(1.2)
        nav_to(driver, "التشخيص") or nav_to(driver, "Diagnostics")
        time.sleep(0.5)
        driver.save_screenshot(f"{OUT}/options-v1.1.21-diagnostics-ar.png")
        print("shots captured")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
