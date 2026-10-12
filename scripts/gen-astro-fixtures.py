#!/usr/bin/env python3
"""Generate prayer-time reference fixtures using INDEPENDENT solar math.

This oracle intentionally uses the NOAA (Spencer series) declination and
equation-of-time formulas — different from the PrayTimes-style series used
by the extension's JS engine — so the cross-check is meaningful. If both
independent implementations agree within a few minutes, the solar geometry
is correct.

Output: test/fixtures/astro-fixtures.json
  Each case: local-clock MINUTES-from-midnight for each time.
"""
import json
import math

OUT = "/home/z/my-project/tcalm-firefox/test/fixtures/astro-fixtures.json"

def day_of_year(y, m, d):
    import datetime
    return datetime.date(y, m, d).timetuple().tm_yday

def julian_day(y, m, d):
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + d + b - 1524.5

def noaa_sun(doy, hour=12.0):
    gamma = 2 * math.pi / 365.0 * (doy - 1 + (hour - 12) / 24.0)
    eqt = 229.18 * (
        0.000075
        + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2 * gamma)
        - 0.040849 * math.sin(2 * gamma)
    )  # minutes
    decl = (
        0.006918
        - 0.399912 * math.cos(gamma)
        + 0.070257 * math.sin(gamma)
        - 0.006758 * math.cos(2 * gamma)
        + 0.000907 * math.sin(2 * gamma)
        - 0.002697 * math.cos(3 * gamma)
        + 0.00148 * math.sin(3 * gamma)
    )  # radians
    return math.degrees(decl), eqt

def hour_angle_minutes(zenith_deg, lat, decl_deg):
    """Return the hour angle in MINUTES (4 minutes per degree)."""
    cos_h = (
        math.cos(math.radians(zenith_deg))
        - math.sin(math.radians(lat)) * math.sin(math.radians(decl_deg))
    ) / (math.cos(math.radians(lat)) * math.cos(math.radians(decl_deg)))
    cos_h = max(-1.0, min(1.0, cos_h))
    return 4.0 * math.degrees(math.acos(cos_h))

def asr_zenith(lat, decl_deg, shadow_factor):
    altitude = math.degrees(math.atan(1.0 / (shadow_factor + math.tan(math.radians(abs(lat - decl_deg))))))
    return 90.0 - altitude

def compute_case(case):
    doy = day_of_year(*case["date"])
    decl, eqt = noaa_sun(doy)
    # Solar noon in local clock minutes.
    noon = 720.0 - 4.0 * case["lng"] - eqt + 60.0 * case["tz"]

    def before_after(zenith):
        ha = hour_angle_minutes(zenith, case["lat"], decl)
        return noon - ha, noon + ha

    fajr, _ = before_after(90.0 + case["fajr"])
    sunrise, sunset = before_after(90.0 + 0.833)
    asr = noon + hour_angle_minutes(asr_zenith(case["lat"], decl, case.get("asr", 1)), case["lat"], decl)
    maghrib = sunset
    if "isha_minutes" in case:
        isha = maghrib + case["isha_minutes"]
    else:
        _, isha = before_after(90.0 + case["isha"])
    return {
        "fajr": fajr,
        "sunrise": sunrise,
        "dhuhr": noon,
        "asr": asr,
        "maghrib": maghrib,
        "sunset": sunset,
        "isha": isha,
    }

CASES = [
    {"name": "cairo-september", "methodId": 5, "asrMethod": "standard", "lat": 30.0444, "lng": 31.2357, "tz": 3.0, "date": [2026, 9, 18], "fajr": 19.5, "isha": 17.5, "asr": 1},
    {"name": "cairo-winter", "methodId": 5, "asrMethod": "standard", "lat": 30.0444, "lng": 31.2357, "tz": 2.0, "date": [2026, 1, 15], "fajr": 19.5, "isha": 17.5, "asr": 1},
    {"name": "makkah-equinox", "methodId": 4, "asrMethod": "standard", "lat": 21.4225, "lng": 39.8262, "tz": 3.0, "date": [2026, 3, 20], "fajr": 18.5, "isha_minutes": 90, "asr": 1},
    {"name": "newyork-winter", "methodId": 2, "asrMethod": "standard", "lat": 40.7128, "lng": -74.006, "tz": -5.0, "date": [2026, 1, 15], "fajr": 15, "isha": 15, "asr": 1},
    {"name": "newyork-summer", "methodId": 2, "asrMethod": "standard", "lat": 40.7128, "lng": -74.006, "tz": -4.0, "date": [2026, 7, 15], "fajr": 15, "isha": 15, "asr": 1},
    {"name": "london-summer", "methodId": 3, "asrMethod": "standard", "lat": 51.5074, "lng": -0.1278, "tz": 1.0, "date": [2026, 6, 21], "fajr": 18, "isha": 17, "asr": 1},
    {"name": "karachi-hanafi", "methodId": 1, "asrMethod": "hanafi", "lat": 24.8607, "lng": 67.0011, "tz": 5.0, "date": [2026, 12, 21], "fajr": 18, "isha": 18, "asr": 2},
    {"name": "jakarta", "methodId": 11, "asrMethod": "standard", "lat": -6.2088, "lng": 106.8456, "tz": 7.0, "date": [2026, 9, 1], "fajr": 20, "isha": 18, "asr": 1},
    {"name": "sydney-summer", "methodId": 3, "asrMethod": "standard", "lat": -33.8688, "lng": 151.2093, "tz": 11.0, "date": [2026, 12, 21], "fajr": 18, "isha": 17, "asr": 1},
    {"name": "anchorage-spring", "methodId": 2, "asrMethod": "standard", "lat": 61.2181, "lng": -149.5003, "tz": -8.0, "date": [2026, 3, 15], "fajr": 15, "isha": 15, "asr": 1},
    {"name": "generic-equator-equinox", "methodId": 3, "asrMethod": "standard", "lat": 0.0, "lng": 0.0, "tz": 0.0, "date": [2026, 3, 20], "fajr": 18, "isha": 17, "asr": 1},
]

def main():
    fixtures = []
    for case in CASES:
        expected = compute_case(case)
        entry = {
            "name": case["name"],
            "methodId": case.get("methodId"),
            "asrMethod": case.get("asrMethod", "standard"),
            "lat": case["lat"],
            "lng": case["lng"],
            "tzOffsetHours": case["tz"],
            "date": {"year": case["date"][0], "month": case["date"][1], "day": case["date"][2]},
            "fajrAngle": case["fajr"],
            "ishaAngle": case.get("isha"),
            "ishaMinutes": case.get("isha_minutes"),
            "asrShadowFactor": case.get("asr", 1),
            "expectedMinutes": expected,
        }
        fixtures.append(entry)
        pretty = {k: f"{int(v // 60):02d}:{int(round(v % 60)):02d}" for k, v in expected.items()}
        print(f"{case['name']:>24}: {pretty}")
    with open(OUT, "w", encoding="utf-8") as handle:
        json.dump({"cases": fixtures}, handle, indent=2)
    print(f"wrote {OUT} ({len(fixtures)} cases)")

if __name__ == "__main__":
    main()
