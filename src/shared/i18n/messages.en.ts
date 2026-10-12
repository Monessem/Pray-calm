/**
 * English message catalog — Tcalm Firefox Extension.
 *
 * Canonical UI strings. The build script derives dist/_locales/en/messages.json
 * from this module, so Firefox-native localization and the runtime
 * language switch share ONE source of truth.
 *
 * Notification strings are carried over from the original Tcalm project
 * (tcalm_core/i18n.py) to preserve behavior.
 */
export const MESSAGES_EN: Record<string, string> = {
  // --- Extension identity (also used by manifest via _locales) ---
  name: 'Tcalm — Prayer Times & Media Pause',
  description:
    'Islamic prayer times with notifications and automatic media pause in Firefox tabs. Offline, private, English & العربية.',
  actionTitle: 'Tcalm — prayer times',
  commandOpenPopup: 'Open the Tcalm popup',

  // --- Prayer names ---
  prayer_fajr: 'Fajr',
  prayer_dhuhr: 'Dhuhr',
  prayer_asr: 'Asr',
  prayer_maghrib: 'Maghrib',
  prayer_isha: 'Isha',
  prayer_sunrise: 'Sunrise',
  prayer_sunset: 'Sunset',

  // --- Calculation methods (Tcalm/Aladhan ids) ---
  method_1: 'University of Islamic Sciences, Karachi',
  method_2: 'Islamic Society of North America (ISNA)',
  method_3: 'Muslim World League (MWL)',
  method_4: 'Umm Al-Qura University, Makkah',
  method_5: 'Egyptian General Authority of Survey',
  method_7: 'Institute of Geophysics, University of Tehran',
  method_8: 'Gulf Region',
  method_9: 'Kuwait',
  method_10: 'Qatar',
  method_11: 'Majlis Ugama Islam Singapura',
  method_12: 'Union des Organisations Islamiques de France',
  method_13: 'Diyanet İşleri Başkanlığı, Turkey',
  method_14: 'Spiritual Administration of Muslims of Russia',
  method_15: 'Moonsighting Committee Worldwide',

  // --- Popup ---
  popup_nextPrayer: 'Next Prayer',
  popup_nextPrayerNone: 'No computable prayer time for this location',
  popup_todayPrayers: 'Today’s Prayers',
  popup_statusPassed: 'Passed',
  popup_statusNext: 'Next',
  popup_enabledLabel: 'Active',
  popup_disabledLabel: 'Paused',
  popup_openOptions: 'Open settings',
  popup_toggleExtension: 'Enable or pause Tcalm',
  popup_locationFallback: 'Location not set',

  // --- Notifications (Tcalm originals; {time} added in v1.0.6) ---
  notify_title: 'It is now time for {prayer} prayer',
  notify_body_media: '{time} — media in Firefox tabs has been paused (Tcalm)',
  notify_body_plain: '{time} — Tcalm prayer time reminder',
  notify_pre_title: '{prayer} in {minutes} minutes',
  notify_pre_body: 'Prayer time: {time}.',

  // --- Toolbar badge (v1.1.6: next prayer indicator) ---
  badge_nextTitle: 'Tcalm — next prayer: {prayer} at {time}',

  // --- Verified notification test (v1.1.6) ---
  notify_testTitle: 'Tcalm notification test',
  notify_testBody: 'If you can read this, the notification was displayed.',
  options_notifyTesting: 'Sending the test notification…',
  options_notifyTestOk: 'The notification appeared on screen — prayer notifications are working.',
  options_notifyTestSuppressed:
    'The notification was created but the system did not display it. Allow Firefox to show notifications in your OS notification settings, turn off Focus Assist / Do Not Disturb, then try again.',
  options_notifyTestUnknown:
    'The notification was created. This browser cannot confirm on-screen display — watch for it now.',
  options_notifyTestFail: 'Failed to create the notification: {error}',
  options_notifyOsHint:
    'The notification permission is required by this extension (granted automatically at install — it is not optional). If notifications still never appear despite a passing test: make sure your OS lets Firefox show notifications, Do-Not-Disturb is off, and Firefox-level notification settings allow them.',

  // --- Guaranteed alert window (v1.1.17; 'never' is the default since v1.1.21) ---
  toast_close: 'Close',
  options_alertWindowMode: 'On-screen alert window',
  options_alertWindowMode_always: 'Always',
  options_alertWindowMode_auto: 'Fallback',
  options_alertWindowMode_never: 'Never',
  options_alertWindowModeHint:
    'A Tcalm window no OS setting can block — Fallback shows it only when the banner fails. Default: Never.',
  options_alertWindowSeconds: 'Alert window duration (seconds)',
  options_alertWindowSecondsHint:
    'The window closes itself after this delay; click it, press the × button, or hit Esc to close it immediately.',
  options_toastTestOpened:
    'The on-screen alert window opened — you should see it right now. This is the fallback channel that cannot fail.',
  options_toastTestDisabled: 'The alert window is disabled in settings (mode: never).',
  options_toastTestFailed: 'The alert window could not be opened — send this log with your report.',

  // --- Options: general ---
  options_title: 'Tcalm Settings',
  options_sectionGeneral: 'General',
  options_language: 'Language',
  options_language_auto: 'Follow Firefox',
  options_theme: 'Appearance',
  options_theme_light: 'Light',
  options_theme_dark: 'Dark',
  options_theme_system: 'Match system',
  options_timeFormat: 'Time format',
  options_timeFormat_12: '12-hour (AM / PM)',
  options_timeFormat_24: '24-hour',
  options_timeFormatHint: 'Shown in the popup and in notifications (12-hour is the default).',

  // --- Options: location ---
  options_sectionLocation: 'Location',
  options_locationMode: 'Location source',
  options_location_auto: 'Automatic (browser geolocation)',
  options_location_manual: 'Manual',
  options_location_autoHint:
    'Automatic mode asks Firefox for your position only when you press the button. Your coordinates never leave the extension except for the optional IP lookup below.',
  options_gpsButton: 'Detect my location',
  options_gpsWorking: 'Waiting for permission…',
  options_gpsSuccess: 'Location detected: {place}',
  options_gpsDenied: 'Permission denied — enable location for this site in Firefox settings.',
  options_gpsFailed: 'Could not determine your location.',
  options_ipButton: 'Approximate location via IP',
  options_ipHint:
    'Optional: sends your IP address to the public service ipwho.is to estimate city and timezone. Nothing is sent otherwise.',
  options_ipSuccess: 'Approximate location found: {place}',
  options_ipFailed: 'IP lookup failed or was not authorized.',
  options_country: 'Country',
  options_city: 'City',
  options_worldHint:
    'Choose from {countries} countries and {cities} cities worldwide — coordinates and timezone fill in automatically as you pick.',
  options_latitude: 'Latitude',
  options_longitude: 'Longitude',
  options_timezone: 'Timezone',
  options_timezone_auto: 'Follow system timezone',
  options_coordsHint: 'Coordinates drive the calculation; city and country are labels only.',
  options_invalidCoords: 'Latitude must be -90…90 and longitude -180…180.',

  // --- Options: calculation ---
  options_sectionCalculation: 'Prayer calculation',
  options_method: 'Calculation method',
  options_methodHint: 'Default is the Egyptian General Authority of Survey, as in Tcalm.',
  options_asr: 'Asr method',
  options_asr_standard: 'Standard — shadow factor 1 (Shafiʿi, Mālikī, Ḥanbalī)',
  options_asr_hanafi: 'Ḥanafī — shadow factor 2',
  options_highLat: 'High latitude rule',
  'options_highLat_night-middle': 'Middle of the night',
  'options_highLat_angle-based': 'Angle-based',
  'options_highLat_one-seventh': 'One seventh of the night',
  options_highLat_unresolved: 'No adjustment (may be unavailable at extreme latitudes)',
  options_highLatHint: 'Applies near polar latitudes where the sun does not reach the Fajr/Isha angles.',
  options_hijriOffset: 'Hijri date adjustment (days)',
  options_hijriHint: 'Shifts the Hijri date shown in the popup if your local calendar differs.',

  // --- Options: notifications ---
  options_sectionNotifications: 'Notifications',
  options_notifications: 'Prayer notifications',
  options_minutesBefore: 'Advance notice (minutes before prayer)',
  options_minutesBeforeHint: '0 = notify at prayer time only (Tcalm behavior).',
  options_sound: 'Play a short chime',
  options_soundHint: 'Where Firefox allows audio from the background page.',
  options_perPrayer: 'Prayers to notify',
  options_testNotification: 'Send a test notification',

  // --- Options: media ---
  options_sectionMedia: 'Media pause',
  options_media: 'Pause media at prayer time',
  options_mediaScope: 'Scope',
  options_mediaScope_all: 'All Firefox tabs',
  options_mediaScope_allowlist: 'Only allowed sites',
  options_mediaSites: 'Allowed sites',
  options_mediaSitesHint: 'Host names like youtube.com or music.youtube.com. Applies only in allowlist mode.',
  options_mediaAddSite: 'Add site',
  options_mediaRemoveSite: 'Remove',
  options_mediaInvalidSite: 'Enter a plain host name such as “youtube.com”.',
  options_mediaDuration: 'Pause duration (minutes)',
  options_mediaDurationHint:
    '0 = media stays paused until you press play again yourself (Tcalm default). Above 0: media stays paused for the duration, then Tcalm resumes only what it paused itself.',
  options_mediaPermission: 'Site access permission',
  options_mediaGrant: 'Grant access to all sites',
  options_mediaGranted: 'Granted — Tcalm can pause media in Firefox tabs.',
  options_mediaNotGranted:
    'Not granted — Tcalm cannot pause media until you grant site access. You can revoke it anytime in Firefox Add-ons settings.',
  options_mediaPermissionMissing:
    '⚠ Media pause needs the site access permission first — grant it below, then test again.',
  options_openSetup: 'Permission setup',
  options_mediaLimitation:
    'Note: a Firefox extension can pause media playing inside Firefox tabs — including custom players that keep their element off-page (SoundCloud) and Web Audio sites. It cannot pause desktop apps like Spotify or VLC — that requires Tcalm’s desktop daemon.',
  options_testMedia: 'Test media pause',
  options_resumeMedia: 'Resume paused media',
  options_mediaResumeNote:
    'Resume restores the media paused by the most recent pause event — older paused tabs stay paused until you play them yourself. Pausing targets only tabs that are playing sound (or are on screen), so a large tab count no longer slows it down.',
  options_mediaPlatforms:
    'Pauses any site playing media in a Firefox tab — YouTube, Netflix, Spotify, Apple Music, Anghami, Deezer, Shahid, SoundCloud and every other player, including custom ones that keep their audio element off-page. During a hold (duration > 0), restarted players are re-paused within seconds.',
  options_testNoMedia:
    'No playing media found — {candidates} tab(s) with sound or on-screen activity checked, {unreachable} not reachable. Open a tab with audio or video playing, then try again.',
  options_testResistant:
    'Media on {hosts} resisted pausing — reload that tab once, then test again.',
  options_testWebAudio: ' +{count} web audio',
  options_testSinglePause: 'stays paused until you press play',
  options_testAutoResume: 'auto-resumes at {time}',
  options_mediaResumed: 'Resumed {count} item(s) from the last pause.',
  options_mediaNothingToResume: 'The last pause left nothing waiting to resume.',
  options_mediaNoResponse: 'Background script did not respond — please reload this page.',

  // --- First-install onboarding page (v1.1.22; 3-step wizard since v1.1.26) ---
  onboarding_title: 'Welcome to Tcalm',
  onboarding_tagline: 'Calm prayer times, right inside Firefox',
  onboarding_intro:
    'Tcalm shows prayer times, notifies you at prayer time, and can automatically pause playing media in your Firefox tabs. Everything is computed locally — your data never leaves your device.',
  onboarding_step1: 'Welcome',
  onboarding_step2: 'Location',
  onboarding_step3: 'Permissions',
  onboarding_continue: 'Continue',
  onboarding_back: 'Back',
  onboarding_featTitle: 'What Tcalm does',
  onboarding_featTimes: 'Prayer times & notifications',
  onboarding_featTimesNote:
    'Five daily prayer times computed on your device, with a banner and a sound at prayer time.',
  onboarding_featMedia: 'Media pause at prayer time',
  onboarding_featMediaNote:
    'Audio and video playing in your Firefox tabs goes quiet for the prayer — and comes back afterwards.',
  onboarding_featPrivacy: 'Private & offline',
  onboarding_featPrivacyNote:
    'No accounts, no tracking, no data collection. Times are computed locally, always.',
  onboarding_platformsTitle: 'Works where you watch & listen',
  onboarding_platformsNote:
    '…and any other site that plays audio or video in a Firefox tab.',
  onboarding_locationTitle: 'Where should prayer times be calculated?',
  onboarding_locationNote:
    'The calculation method follows your country’s convention. You can change all of this anytime in settings.',
  onboarding_countryLabel: 'Country',
  onboarding_cityLabel: 'City',
  onboarding_locationSaved: 'Location saved — times will update in a moment.',
  onboarding_permsTitle: 'Permissions',
  onboarding_permsIntro:
    'These settings can be changed anytime from the Tcalm settings page.',
  onboarding_permCore: 'Prayer times & notifications',
  onboarding_permCoreNote: 'Required — granted automatically at install.',
  onboarding_permMedia: 'Pause media at prayer time',
  onboarding_permMediaNote:
    'Optional — lets Tcalm pause video/audio playing in Firefox tabs. Needs access to all sites.',
  onboarding_permIp: 'Location via IP',
  onboarding_permIpNote:
    'Optional — one request to ipwho.is to estimate your city when you press the button. Nothing is sent otherwise.',
  onboarding_grantBtn: 'Enable all permissions',
  onboarding_grantWorking: 'Waiting for Firefox…',
  onboarding_grantedTitle: 'All permissions enabled',
  onboarding_grantedNote:
    'Media pause and IP location are ready. You can turn each feature on or off in settings.',
  onboarding_openSettings: 'Open settings',
  onboarding_done: 'Done',
  onboarding_privacy:
    'Private by design: no accounts, no tracking, no data collection. See Firefox’s permission description for the exact scope.',
  onboarding_revokedNote:
    'Permissions were revoked — press the button to enable them again.',

  // --- Options: diagnostics (v1.0.4; one-week retention since v1.1.21) ---
  options_sectionDiagnostics: 'Diagnostics',
  diag_hint:
    'Recent internal events, kept only on this device and auto-deleted after 7 days, so the log can never affect storage size or performance. If anything misbehaves, press “Copy for support” and send the log with your report.',
  diag_empty: 'No events recorded — Tcalm has not reported any errors.',
  diag_summary: 'Showing {shown} of {total} events — auto-deleted after 7 days',
  diag_copy: 'Copy for support',
  diag_clear: 'Clear log',
  diag_copied: 'Diagnostics copied to clipboard.',

  // --- Options: advanced ---
  options_sectionAdvanced: 'Advanced',
  options_recalculate: 'Recalculate now',
  options_clearCache: 'Clear cached data',
  options_export: 'Export settings',
  options_import: 'Import settings',
  options_reset: 'Reset to defaults',
  options_resetConfirm: 'Reset all settings to their defaults?',
  options_saved: 'Saved',
  options_importInvalid: 'The selected file is not a valid Tcalm settings export.',
  options_importSuccess: 'Settings imported and applied.',
  options_recalculated: 'Schedule recalculated.',
  options_cacheCleared: 'Cached data cleared.',
  options_resetDone: 'Settings restored to defaults.',

  // --- Options: about (v1.0.6) ---
  options_sectionAbout: 'About',
  about_intro:
    'This browser extension is inspired by and builds on the idea of Tcalm, an open-source desktop project: calm, offline prayer-time reminders with automatic media pause.',
  about_credit: 'Many thanks to the author of the original Tcalm project for the wonderful idea.',
  about_link_label: 'Original project on GitHub',
  about_author: 'Browser version developed by Mohamed Naseem.',

  // --- Status / misc ---
  status_calculating: 'Calculating prayer times…',
};
