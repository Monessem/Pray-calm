/**
 * Arabic message catalog — Tcalm Firefox Extension.
 *
 * Notification strings and calculation-method names are carried over from
 * the original Tcalm project (tcalm_core/i18n.py). The key set must exactly
 * match messages.en.ts (enforced by tests/i18n.test.ts).
 */
export const MESSAGES_AR: Record<string, string> = {
  // --- Extension identity ---
  name: 'Tcalm — مواقيت الصلاة وإيقاف الوسائط',
  description:
    'مواقيت الصلاة مع إشعارات وإيقاف تلقائي للوسائط في تبويبات فايرفوكس. يعمل دون اتصال ويحترم الخصوصية، بالعربية والإنجليزية.',
  actionTitle: 'Tcalm — مواقيت الصلاة',
  commandOpenPopup: 'فتح نافذة Tcalm المنبثقة',

  // --- Prayer names ---
  prayer_fajr: 'الفجر',
  prayer_dhuhr: 'الظهر',
  prayer_asr: 'العصر',
  prayer_maghrib: 'المغرب',
  prayer_isha: 'العشاء',
  prayer_sunrise: 'الشروق',
  prayer_sunset: 'الغروب',

  // --- Calculation methods (Tcalm/Aladhan ids) ---
  method_1: 'جامعة العلوم الإسلامية، كراتشي',
  method_2: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
  method_3: 'رابطة العالم الإسلامي',
  method_4: 'جامعة أم القرى، مكة المكرمة',
  method_5: 'الهيئة المصرية العامة للمساحة',
  method_7: 'معهد الجيوفيزياء، جامعة طهران',
  method_8: 'منطقة الخليج العربي',
  method_9: 'دولة الكويت',
  method_10: 'دولة قطر',
  method_11: 'مجلس الشؤون الإسلامية، سنغافورة',
  method_12: 'اتحاد المنظمات الإسلامية بفرنسا',
  method_13: 'رئاسة الشؤون الدينية، تركيا',
  method_14: 'الإدارة الدينية لمسلمي روسيا',
  method_15: 'لجنة رؤية الهلال العالمية',

  // --- Popup ---
  popup_nextPrayer: 'الأذان القادم',
  popup_nextPrayerNone: 'لا يمكن حساب مواقيت الصلاة لهذا الموقع',
  popup_todayPrayers: 'صلوات اليوم',
  popup_statusPassed: 'انتهت',
  popup_statusNext: 'التالية',
  popup_enabledLabel: 'يعمل',
  popup_disabledLabel: 'متوقف مؤقتاً',
  popup_openOptions: 'فتح الإعدادات',
  popup_toggleExtension: 'تشغيل أو إيقاف Tcalm مؤقتاً',
  popup_locationFallback: 'لم يتم تحديد الموقع',

  // --- الإشعارات (نصوص Tcalm الأصلية مع إضافة الوقت في v1.0.6) ---
  notify_title: 'حان الآن موعد أذان {prayer}',
  notify_body_media: '{time} — تم إيقاف الوسائط مؤقتاً في تبويبات فايرفوكس (Tcalm)',
  notify_body_plain: '{time} — تذكير بموعد الصلاة',
  notify_pre_title: '{prayer} بعد {minutes} دقيقة',
  notify_pre_body: 'موعد الصلاة: {time}.',

  // --- شعار شريط الأدوات (v1.1.6: الصلاة القادمة) ---
  badge_nextTitle: 'Tcalm — الأذان القادم: {prayer} {time}',

  // --- اختبار الإشعارات مع التحقق (v1.1.6) ---
  notify_testTitle: 'اختبار إشعارات Tcalm',
  notify_testBody: 'إن كنت تقرأ هذا فقد ظهر الإشعار بنجاح.',
  options_notifyTesting: 'جارٍ إرسال الإشعار التجريبي…',
  options_notifyTestOk: 'ظهر الإشعار على الشاشة — إشعارات الصلاة تعمل بشكل صحيح.',
  options_notifyTestSuppressed:
    'تم إنشاء الإشعار لكن النظام لم يعرضه على الشاشة. فعّل إشعارات فايرفوكس من إعدادات إشعارات النظام، وأطفئ «عدم الإزعاج / مساعد التركيز»، ثم أعد المحاولة.',
  options_notifyTestUnknown:
    'تم إنشاء الإشعار. لا يمكن التأكد من ظهوره على هذا المتصفح — راقب ظهوره الآن.',
  options_notifyTestFail: 'فشل إنشاء الإشعار: {error}',
  options_notifyOsHint:
    'إذن الإشعارات أساسي في هذه الإضافة (يُمنح تلقائياً عند التثبيت وليس اختيارياً). إن لم تظهر الإشعارات رغم نجاح الاختبار: تأكد من السماح لفايرفوكس بإرسال الإشعارات في إعدادات النظام، وأن «عدم الإزعاج» مطفأ، وأن الإشعارات مفعّلة لفايرفوكس من إعدادات المتصفح.',

  // --- نافذة التنبيه المضمونة (v1.1.17؛ الديفولت «أبداً» منذ v1.1.21) ---
  toast_close: 'إغلاق',
  options_alertWindowMode: 'نافذة التنبيه على الشاشة',
  options_alertWindowMode_always: 'دائماً',
  options_alertWindowMode_auto: 'البديل',
  options_alertWindowMode_never: 'أبداً',
  options_alertWindowModeHint:
    'نافذة من Tcalm لا يستطيع النظام حجبها؛ «البديل» عند فشل الإشعار فقط. الافتراضي: أبداً.',
  options_alertWindowSeconds: 'مدة بقاء نافذة التنبيه (بالثواني)',
  options_alertWindowSecondsHint:
    'تُغلق النافذة تلقائياً بعد هذه المدة، ويمكن إغلاقها فوراً بالنقر عليها أو بزر الإغلاق أو بزر Esc.',
  options_toastTestOpened:
    'تم فتح نافذة التنبيه — يجب أن تراها الآن على الشاشة، وهذا هو الضمان البديل الذي لا يفشل.',
  options_toastTestDisabled: 'نافذة التنبيه معطّلة من الإعدادات (الوضع: أبداً).',
  options_toastTestFailed: 'تعذّر فتح نافذة التنبيه — أرسل هذا السجل مع بلاغك.',

  // --- Options: general ---
  options_title: 'إعدادات Tcalm',
  options_sectionGeneral: 'عام',
  options_language: 'اللغة',
  options_language_auto: 'حسب لغة فايرفوكس',
  options_theme: 'المظهر',
  options_theme_light: 'فاتح',
  options_theme_dark: 'داكن',
  options_theme_system: 'حسب النظام',
  options_timeFormat: 'تنسيق الوقت',
  options_timeFormat_12: '12 ساعة (ص / م)',
  options_timeFormat_24: '24 ساعة',
  options_timeFormatHint: 'يظهر في النافذة المنبثقة وفي الإشعارات (12 ساعة هي الافتراضية).',

  // --- Options: location ---
  options_sectionLocation: 'الموقع',
  options_locationMode: 'مصدر الموقع',
  options_location_auto: 'تلقائي (تحديد الموقع عبر المتصفح)',
  options_location_manual: 'يدوي',
  options_location_autoHint:
    'في الوضع التلقائي يطلب Tcalm موقعك من فايرفوكس فقط عند الضغط على الزر، ولا تُرسل إحداثياتك إلى أي جهة خارجية، باستثناء خدمة تحديد الموقع عبر IP الاختيارية أدناه.',
  options_gpsButton: 'تحديد موقعي',
  options_gpsWorking: 'بانتظار الإذن…',
  options_gpsSuccess: 'تم تحديد الموقع: {place}',
  options_gpsDenied: 'تم رفض الإذن — فعّل تحديد الموقع لهذا الموقع من إعدادات فايرفوكس.',
  options_gpsFailed: 'تعذر تحديد موقعك.',
  options_ipButton: 'موقع تقريبي عبر عنوان IP',
  options_ipHint:
    'اختياري: يرسل عنوان IP الخاص بك إلى الخدمة العامة ipwho.is لتقدير المدينة والمنطقة الزمنية. لا يُرسل أي شيء خلاف ذلك.',
  options_ipSuccess: 'تم العثور على موقع تقريبي: {place}',
  options_ipFailed: 'فشل تحديد الموقع عبر IP أو لم يُمنح الإذن.',
  options_country: 'الدولة',
  options_city: 'المدينة',
  options_worldHint:
    'اختر من بين {countries} دولة و{cities} مدينة من جميع أنحاء العالم — تُملأ الإحداثيات والمنطقة الزمنية تلقائياً عند الاختيار.',
  options_latitude: 'خط العرض',
  options_longitude: 'خط الطول',
  options_timezone: 'المنطقة الزمنية',
  options_timezone_auto: 'حسب المنطقة الزمنية للنظام',
  options_coordsHint: 'الإحداثيات هي أساس الحساب؛ أما المدينة والدولة فهما للتسمية فقط.',
  options_invalidCoords: 'يجب أن يكون خط العرض بين ‎-90‎ و90 وخط الطول بين ‎-180‎ و180.',

  // --- Options: calculation ---
  options_sectionCalculation: 'حساب مواقيت الصلاة',
  options_method: 'طريقة الحساب',
  options_methodHint: 'الافتراضية هي الهيئة المصرية العامة للمساحة، كما في Tcalm الأصلية.',
  options_asr: 'طريقة العصر',
  options_asr_standard: 'القياسية — معامل الظل 1 (الشافعي والمالكي والحنبلي)',
  options_asr_hanafi: 'الحنفية — معامل الظل 2',
  options_highLat: 'قاعدة خطوط العرض العالية',
  'options_highLat_night-middle': 'منتصف الليل',
  'options_highLat_angle-based': 'حسب الزاوية',
  'options_highLat_one-seventh': 'سُبع الليل',
  options_highLat_unresolved: 'بدون تعديل (قد لا تتوفر المواقيت في خطوط العرض القطبية)',
  options_highLatHint: 'تُطبق قرب المناطق القطبية حيث لا تصل الشمس إلى زوايا الفجر والعشاء.',
  options_hijriOffset: 'تعديل التاريخ الهجري (بالأيام)',
  options_hijriHint: 'يزيح التاريخ الهجري الظاهر في النافذة المنبثقة إذا اختلف التقويم المحلي.',

  // --- Options: notifications ---
  options_sectionNotifications: 'الإشعارات',
  options_notifications: 'إشعارات الصلاة',
  options_minutesBefore: 'تنبيه مسبق (دقائق قبل الصلاة)',
  options_minutesBeforeHint: '0 = إشعار عند وقت الصلاة فقط (سلوك Tcalm).',
  options_sound: 'تشغيل نغمة قصيرة',
  options_soundHint: 'حيثما سمح فايرفوكس بتشغيل الصوت من صفحة الخلفية.',
  options_perPrayer: 'الصلوات المُشعَر عنها',
  options_testNotification: 'إرسال إشعار تجريبي',

  // --- Options: media ---
  options_sectionMedia: 'إيقاف الوسائط',
  options_media: 'إيقاف الوسائط عند وقت الصلاة',
  options_mediaScope: 'النطاق',
  options_mediaScope_all: 'جميع تبويبات فايرفوكس',
  options_mediaScope_allowlist: 'المواقع المسموح بها فقط',
  options_mediaSites: 'المواقع المسموح بها',
  options_mediaSitesHint:
    'أسماء نطاقات مثل youtube.com أو music.youtube.com. تُطبق في وضع القائمة المسموحة فقط.',
  options_mediaAddSite: 'إضافة موقع',
  options_mediaRemoveSite: 'إزالة',
  options_mediaInvalidSite: 'أدخل اسم نطاق بسيط مثل "youtube.com".',
  options_mediaDuration: 'مدة الإيقاف (بالدقائق)',
  options_mediaDurationHint:
    '0 = تبقى الوسائط متوقفة حتى تعيد تشغيلها بنفسك (الافتراضي في Tcalm). أكبر من 0: تبقى متوقفة للمدة المحددة ثم يعيد Tcalm تشغيل ما أوقفه هو فقط.',
  options_mediaPermission: 'إذن الوصول إلى المواقع',
  options_mediaGrant: 'منح الوصول إلى جميع المواقع',
  options_mediaGranted: 'تم المنح — يمكن لـ Tcalm إيقاف الوسائط في تبويبات فايرفوكس.',
  options_mediaNotGranted:
    'لم يُمنح — لا يستطيع Tcalm إيقاف الوسائط قبل منح إذن الوصول إلى المواقع، ويمكنك سحبه في أي وقت من إعدادات إضافات فايرفوكس.',
  options_mediaPermissionMissing:
    '⚠ إيقاف الوسائط يحتاج منح إذن الوصول إلى المواقع أولاً — امنحه أدناه ثم أعد المحاولة.',
  options_openSetup: 'إعداد الصلاحيات',
  options_mediaLimitation:
    'ملاحظة: يستطيع امتداد فايرفوكس إيقاف الوسائط داخل تبويبات فايرفوكس — بما فيها المشغلات المخصصة التي تُبقي عنصر الصوت خارج الصفحة (مثل SoundCloud) ومواقع Web Audio، ولا يمكنه إيقاف تطبيقات سطح المكتب مثل Spotify أو VLC — ذلك يتطلب نسخة Tcalm لسطح المكتب.',
  options_testMedia: 'تجربة إيقاف الوسائط',
  options_resumeMedia: 'استئناف الوسائط المتوقفة',
  options_mediaResumeNote:
    'الاستئناف يعيد تشغيل ما أوقفه آخر حدث إيقاف فقط — التبويبات المتوقفة قبل ذلك تبقى متوقفة حتى تشغّلها بنفسك. كما يستهدف الإيقاف التبويبات التي تصدر صوتاً (أو المعروضة على الشاشة) فقط، لذا لم يَعُد عدد التبويبات الكبير يبطئه.',
  options_mediaPlatforms:
    'يوقف أي موقع يشغّل وسائط داخل تبويب فايرفوكس — يوتيوب ونت فلكس وسبوتفاي وأبل ميوزك وأنغامي وديزر وشاهد وساوند كلاود وكل مشغّل آخر، بما فيها المشغّلات التي تُبقي عنصر الصوت خارج الصفحة. وأثناء مدة الإيقاف (أكثر من صفر) يُعاد إيقاف المشغّلات التي تحاول الاستئناف خلال ثوانٍ.',
  options_testNoMedia:
    'لا توجد وسائط قيد التشغيل — تم فحص {candidates} تبويباً به نشاط صوتي أو معروض، و{unreachable} غير متاح للوصول. افتح تبويباً يشغّل صوتاً أو فيديو ثم أعد المحاولة.',
  options_testResistant:
    'الوسائط على {hosts} قاومت الإيقاف — أعد تحميل ذلك التبويب مرة واحدة ثم أعد الاختبار.',
  options_testWebAudio: ' +{count} صوت ويب',
  options_testSinglePause: 'ستبقى متوقفة حتى تعيد تشغيلها بنفسك',
  options_testAutoResume: 'يُستأنف تلقائياً في {time}',
  options_mediaResumed: 'تم استئناف {count} من عناصر آخر عملية إيقاف.',
  options_mediaNothingToResume: 'لا يوجد شيء من آخر عملية إيقاف في انتظار الاستئناف.',
  options_mediaNoResponse: 'لم يستجب السكربت الخلفي — أعد تحميل هذه الصفحة من فضلك.',

  // --- صفحة الترحيب عند أول تثبيت (v1.1.22؛ معالج من 3 خطوات منذ v1.1.26) ---
  onboarding_title: 'مرحباً بك في Tcalm',
  onboarding_tagline: 'مواقيت صلاة هادئة، داخل فايرفوكس مباشرة',
  onboarding_intro:
    'يعرض Tcalm مواقيت الصلاة ويُذكّرك عند دخول الوقت، ويمكنه إيقاف الوسائط المشغّلة تلقائياً في تبويبات فايرفوكس. كل الحسابات تتم محلياً — بياناتك لا تغادر جهازك أبداً.',
  onboarding_step1: 'الترحيب',
  onboarding_step2: 'الموقع',
  onboarding_step3: 'الصلاحيات',
  onboarding_continue: 'متابعة',
  onboarding_back: 'رجوع',
  onboarding_featTitle: 'ماذا يفعل Tcalm؟',
  onboarding_featTimes: 'مواقيت الصلاة والإشعارات',
  onboarding_featTimesNote:
    'مواقيت الصلاة الخمسة تُحسب على جهازك، مع تنبيه وصوت عند دخول الوقت.',
  onboarding_featMedia: 'إيقاف الوسائط وقت الصلاة',
  onboarding_featMediaNote:
    'الصوت والفيديو المشغّل في تبويبات فايرفوكس يتوقف وقت الصلاة — ويعود من بعد ذلك.',
  onboarding_featPrivacy: 'خصوصية وعمل دون اتصال',
  onboarding_featPrivacyNote:
    'لا حسابات ولا تتبّع ولا جمع بيانات — كل الحسابات تتم محلياً دائماً.',
  onboarding_platformsTitle: 'يعمل أينما تشاهد وتستمع',
  onboarding_platformsNote:
    '…وأي موقع آخر يشغّل صوتاً أو فيديو داخل تبويبات فايرفوكس.',
  onboarding_locationTitle: 'أين تُحسب مواقيت الصلاة؟',
  onboarding_locationNote:
    'طريقة الحساب تتبع اعتماد دولتك، ويمكنك تغيير كل ذلك في أي وقت من الإعدادات.',
  onboarding_countryLabel: 'الدولة',
  onboarding_cityLabel: 'المدينة',
  onboarding_locationSaved: 'تم حفظ الموقع — سيتحدّث المواقيت بعد لحظات.',
  onboarding_permsTitle: 'الصلاحيات',
  onboarding_permsIntro: 'يمكنك تغيير هذه الإعدادات في أي وقت من صفحة إعدادات Tcalm.',
  onboarding_permCore: 'مواقيت الصلاة والإشعارات',
  onboarding_permCoreNote: 'أساسية — تُمنح تلقائياً عند التثبيت.',
  onboarding_permMedia: 'إيقاف الوسائط عند وقت الصلاة',
  onboarding_permMediaNote:
    'اختيارية — تتيح لـ Tcalm إيقاف الفيديو/الصوت المشغّل في تبويبات فايرفوكس، وتحتاج الوصول إلى جميع المواقع.',
  onboarding_permIp: 'تحديد الموقع عبر IP',
  onboarding_permIpNote:
    'اختيارية — طلب واحد إلى ipwho.is لتقدير مدينتك عند الضغط على الزر، ولا يُرسل أي شيء خلاف ذلك.',
  onboarding_grantBtn: 'تفعيل جميع الصلاحيات',
  onboarding_grantWorking: 'بانتظار فايرفوكس…',
  onboarding_grantedTitle: 'تم تفعيل جميع الصلاحيات',
  onboarding_grantedNote:
    'إيقاف الوسائط وتحديد الموقع عبر IP جاهزان الآن، ويمكنك تشغيل أو إيقاف كل ميزة من الإعدادات.',
  onboarding_openSettings: 'فتح الإعدادات',
  onboarding_done: 'تم',
  onboarding_privacy:
    'الخصوصية بالتصميم: لا حسابات، لا تتبّع، لا جمع بيانات. راجع وصف الصلاحيات في فايرفوكس لمعرفة النطاق بالضبط.',
  onboarding_revokedNote: 'تم سحب الصلاحيات — اضغط الزر لتفعيلها من جديد.',

  // --- Options: diagnostics (v1.0.4؛ الاحتفاظ أسبوع منذ v1.1.21) ---
  options_sectionDiagnostics: 'التشخيص',
  diag_hint:
    'أحدث الأحداث الداخلية، وتُحفظ على جهازك فقط، وتُحذف تلقائياً بعد 7 أيام حتى لا تؤثر على حجم البيانات أو أداء الإضافة. لو حدثت أي مشكلة اضغط «نسخ من أجل الدعم» وأرسل السجل مع بلاغك.',
  diag_empty: 'لا توجد أحداث مسجلة — لم تُبلّغ الإضافة عن أي أخطاء.',
  diag_summary: 'عرض {shown} من {total} حدثاً — تُحذف تلقائياً بعد 7 أيام',
  diag_copy: 'نسخ من أجل الدعم',
  diag_clear: 'مسح السجل',
  diag_copied: 'تم نسخ بيانات التشخيص إلى الحافظة.',

  // --- Options: advanced ---
  options_sectionAdvanced: 'خيارات متقدمة',
  options_recalculate: 'إعادة الحساب الآن',
  options_clearCache: 'مسح البيانات المخزنة مؤقتاً',
  options_export: 'تصدير الإعدادات',
  options_import: 'استيراد الإعدادات',
  options_reset: 'استعادة الإعدادات الافتراضية',
  options_resetConfirm: 'هل تريد استعادة جميع الإعدادات الافتراضية؟',
  options_saved: 'تم حفظ الإعدادات.',
  options_importInvalid: 'الملف المحدد ليس ملف إعدادات Tcalm صالحاً.',
  options_importSuccess: 'تم استيراد الإعدادات وتطبيقها.',
  options_recalculated: 'تمت إعادة حساب الجدول.',
  options_cacheCleared: 'تم مسح البيانات المخزنة مؤقتاً.',
  options_resetDone: 'تمت استعادة الإعدادات الافتراضية.',

  // --- Options: حول الإضافة (v1.0.6) ---
  options_sectionAbout: 'حول الإضافة',
  about_intro:
    'هذه الإضافة مستوحاة من فكرة مشروع Tcalm مفتوح المصدر وتستند إليها: تذكير هادئ بمواقيت الصلاة يعمل دون اتصال، مع إيقاف تلقائي للوسائط.',
  about_credit: 'شكر جزيل لمؤلف مشروع Tcalm الأصلي على هذه الفكرة الرائعة.',
  about_link_label: 'المشروع الأصلي على GitHub',
  about_author: 'نسخة المتصفح من تطوير محمد نسيم.',

  // --- Status / misc ---
  status_calculating: 'جارٍ حساب مواقيت الصلاة…',
};
