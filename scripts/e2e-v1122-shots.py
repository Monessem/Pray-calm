#!/usr/bin/env python3
"""Full-page visual captures of the v1.1.22 onboarding + options states
(the E2E screenshots are viewport-sized and cut the action row)."""
import os
import sys
import time

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

GECKODRIVER = "/home/z/e2e/geckodriver"
FIREFOX_BIN = "/home/z/e2e/firefox/firefox"
PROFILE = "/home/z/e2e/profile-v1122-shots"
EXT_ID = "{35e5cf8f-d5b8-436b-ae84-0291e49bb7c2}"
FIXED_UUID = "11a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6"
XPI = "/home/z/my-project/tcalm-firefox/package-out/tcalm-v1.1.22.xpi"
OUT = "/home/z/my-project/tcalm-firefox/package-out/e2e-shots-v1122"

os.makedirs(PROFILE, exist_ok=True)
with open(os.path.join(PROFILE, "user.js"), "w", encoding="utf-8") as f:
    f.write(
        'user_pref("extensions.webextensions.uuids", '
        '"{\\"' + EXT_ID + '\\": \\"' + FIXED_UUID + '\\"}");\n'
    )
    f.write('user_pref("app.update.enabled", false);\n')

opts = Options()
opts.binary_location = FIREFOX_BIN
opts.add_argument("-headless")
opts.add_argument("-profile")
opts.add_argument(PROFILE)
driver = webdriver.Firefox(service=Service(GECKODRIVER), options=opts)
driver.set_page_load_timeout(30)

try:
    driver.install_addon(XPI, temporary=True)
    time.sleep(3)
    base = f"moz-extension://{FIXED_UUID}"

    # Large viewport, full-page screenshots.
    driver.set_window_size(1280, 1400)

    # Onboarding EN (full page incl. the action buttons).
    driver.get(f"{base}/onboarding/onboarding.html")
    time.sleep(1.5)
    driver.save_screenshot(f"{OUT}/full-onboarding-en.png")

    # Onboarding dark EN.
    driver.execute_script("document.documentElement.dataset.theme = 'dark'")
    time.sleep(0.5)
    driver.save_screenshot(f"{OUT}/full-onboarding-dark-en.png")
    driver.execute_script("document.documentElement.dataset.theme = 'system'")

    # Options: permission warning card (EN) + segment, full-page.
    driver.get(f"{base}/options/options.html")
    time.sleep(1.5)
    driver.execute_script(
        "document.querySelector('.nav-item[data-nav-target=\"section-media\"]').click();"
    )
    time.sleep(0.5)
    print("active:", driver.execute_script(
        "return Array.from(document.querySelectorAll('.ios-section.is-active')).map(s => s.id);"))
    driver.save_screenshot(f"{OUT}/full-options-media-en.png")
    driver.execute_script(
        "document.querySelector('.nav-item[data-nav-target=\"section-notifications\"]').click();"
    )
    time.sleep(0.5)
    driver.save_screenshot(f"{OUT}/full-options-notifications-en.png")
finally:
    driver.quit()
print("done")
