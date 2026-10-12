/**
 * World location database — Europe (44 countries).
 * See mena.mjs for the data shape contract.
 */
export const EUROPE = [
  {
    en: 'United Kingdom', ar: 'المملكة المتحدة', method: 3, tz: 'Europe/London', lat: 51.5074, lng: -0.1278,
    cities: [
      ['London', 'لندن', 51.5074, -0.1278],
      ['Birmingham', 'برمنغهام', 52.4862, -1.8904],
      ['Manchester', 'مانشستر', 53.4808, -2.2426],
      ['Leeds', 'ليدز', 53.8008, -1.5491],
      ['Glasgow', 'غلاسكو', 55.8642, -4.2518],
      ['Bradford', 'برادفورد', 53.7960, -1.7594],
    ],
  },
  {
    en: 'Ireland', ar: 'أيرلندا', method: 3, tz: 'Europe/Dublin', lat: 53.3498, lng: -6.2603,
    cities: [
      ['Dublin', 'دبلن', 53.3498, -6.2603],
    ],
  },
  {
    en: 'France', ar: 'فرنسا', method: 12, tz: 'Europe/Paris', lat: 48.8566, lng: 2.3522,
    cities: [
      ['Paris', 'باريس', 48.8566, 2.3522],
      ['Marseille', 'مرسيليا', 43.2965, 5.3698],
      ['Lyon', 'ليون', 45.7640, 4.8357],
      ['Toulouse', 'تولوز', 43.6047, 1.4442],
      ['Nice', 'نيس', 43.7102, 7.2620],
      ['Strasbourg', 'ستراسبورغ', 48.5734, 7.7521],
      ['Montpellier', 'مونبلييه', 43.6108, 3.8767],
      ['Bordeaux', 'بوردو', 44.8378, -0.5792],
    ],
  },
  {
    en: 'Spain', ar: 'إسبانيا', method: 3, tz: 'Europe/Madrid', lat: 40.4168, lng: -3.7038,
    cities: [
      ['Madrid', 'مدريد', 40.4168, -3.7038],
      ['Barcelona', 'برشلونة', 41.3874, 2.1686],
      ['Valencia', 'فالنسيا', 39.4699, -0.3763],
      ['Seville', 'إشبيلية', 37.3891, -5.9845],
      ['Zaragoza', 'سرقسطة', 41.6488, -0.8891],
      ['Malaga', 'مالقة', 36.7213, -4.4214],
      ['Granada', 'غرناطة', 37.1773, -3.5986],
      ['Cordoba', 'قرطبة', 37.3886, -5.9823],
    ],
  },
  {
    en: 'Portugal', ar: 'البرتغال', method: 3, tz: 'Europe/Lisbon', lat: 38.7223, lng: -9.1393,
    cities: [
      ['Lisbon', 'لشبونة', 38.7223, -9.1393],
      ['Porto', 'بورتو', 41.1579, -8.6291],
    ],
  },
  {
    en: 'Italy', ar: 'إيطاليا', method: 3, tz: 'Europe/Rome', lat: 41.9028, lng: 12.4964,
    cities: [
      ['Rome', 'روما', 41.9028, 12.4964],
      ['Milan', 'ميلانو', 45.4642, 9.1900],
      ['Naples', 'نابولي', 40.8518, 14.2681],
      ['Turin', 'تورينو', 45.0703, 7.6869],
      ['Palermo', 'باليرمو', 38.1157, 13.3615],
      ['Florence', 'فلورنسا', 43.7696, 11.2558],
    ],
  },
  {
    en: 'Germany', ar: 'ألمانيا', method: 3, tz: 'Europe/Berlin', lat: 52.5200, lng: 13.4050,
    cities: [
      ['Berlin', 'برلين', 52.5200, 13.4050],
      ['Hamburg', 'هامبورغ', 53.5511, 9.9937],
      ['Munich', 'ميونخ', 48.1351, 11.5820],
      ['Cologne', 'كولونيا', 50.9375, 6.9603],
      ['Frankfurt', 'فرانكفورت', 50.1109, 8.6821],
      ['Stuttgart', 'شتوتغارت', 48.7758, 9.1829],
      ['Dusseldorf', 'دوسلدورف', 51.2277, 6.7735],
      ['Essen', 'إيسن', 51.4556, 7.0116],
      ['Dortmund', 'دورتموند', 51.5136, 7.4653],
    ],
  },
  {
    en: 'Netherlands', ar: 'هولندا', method: 3, tz: 'Europe/Amsterdam', lat: 52.3676, lng: 4.9041,
    cities: [
      ['Amsterdam', 'أمستردام', 52.3676, 4.9041],
      ['Rotterdam', 'روتردام', 51.9244, 4.4777],
      ['The Hague', 'لاهاي', 52.0705, 4.3007],
      ['Utrecht', 'أوترخت', 52.0907, 5.1214],
    ],
  },
  {
    en: 'Belgium', ar: 'بلجيكا', method: 3, tz: 'Europe/Brussels', lat: 50.8503, lng: 4.3517,
    cities: [
      ['Brussels', 'بروكسل', 50.8503, 4.3517],
      ['Antwerp', 'أنتويرب', 51.2194, 4.4025],
    ],
  },
  {
    en: 'Switzerland', ar: 'سويسرا', method: 3, tz: 'Europe/Zurich', lat: 47.3769, lng: 8.5417,
    cities: [
      ['Zurich', 'زيورخ', 47.3769, 8.5417],
      ['Geneva', 'جنيف', 46.2044, 6.1432],
      ['Basel', 'بازل', 47.5596, 7.5886],
      ['Bern', 'برن', 46.9480, 7.4474],
    ],
  },
  {
    en: 'Austria', ar: 'النمسا', method: 3, tz: 'Europe/Vienna', lat: 48.2082, lng: 16.3738,
    cities: [
      ['Vienna', 'فيينا', 48.2082, 16.3738],
      ['Graz', 'غراتس', 47.0707, 15.4395],
    ],
  },
  {
    en: 'Luxembourg', ar: 'لوكسمبورغ', method: 3, tz: 'Europe/Luxembourg', lat: 49.6116, lng: 6.1319,
    cities: [
      ['Luxembourg', 'لوكسمبورغ', 49.6116, 6.1319],
    ],
  },
  {
    en: 'Denmark', ar: 'الدنمارك', method: 3, tz: 'Europe/Copenhagen', lat: 55.6761, lng: 12.5683,
    cities: [
      ['Copenhagen', 'كوبنهاغن', 55.6761, 12.5683],
    ],
  },
  {
    en: 'Norway', ar: 'النرويج', method: 3, tz: 'Europe/Oslo', lat: 59.9139, lng: 10.7522,
    cities: [
      ['Oslo', 'أوسلو', 59.9139, 10.7522],
      ['Bergen', 'برغن', 60.3913, 5.3221],
    ],
  },
  {
    en: 'Sweden', ar: 'السويد', method: 3, tz: 'Europe/Stockholm', lat: 59.3293, lng: 18.0686,
    cities: [
      ['Stockholm', 'ستوكهولم', 59.3293, 18.0686],
      ['Gothenburg', 'غوتنبرغ', 57.7089, 11.9746],
      ['Malmo', 'مالمو', 55.6050, 13.0038],
    ],
  },
  {
    en: 'Finland', ar: 'فنلندا', method: 3, tz: 'Europe/Helsinki', lat: 60.1699, lng: 24.9384,
    cities: [
      ['Helsinki', 'هلسنكي', 60.1699, 24.9384],
    ],
  },
  {
    en: 'Iceland', ar: 'آيسلندا', method: 3, tz: 'Atlantic/Reykjavik', lat: 64.1466, lng: -21.9426,
    cities: [
      ['Reykjavik', 'ريكيافيك', 64.1466, -21.9426],
    ],
  },
  {
    en: 'Poland', ar: 'بولندا', method: 3, tz: 'Europe/Warsaw', lat: 52.2297, lng: 21.0122,
    cities: [
      ['Warsaw', 'وارسو', 52.2297, 21.0122],
      ['Krakow', 'كراكوف', 50.0647, 19.9450],
      ['Gdansk', 'غدانسك', 54.3520, 18.6466],
    ],
  },
  {
    en: 'Czechia', ar: 'التشيك', method: 3, tz: 'Europe/Prague', lat: 50.0755, lng: 14.4378,
    cities: [
      ['Prague', 'براغ', 50.0755, 14.4378],
    ],
  },
  {
    en: 'Slovakia', ar: 'سلوفاكيا', method: 3, tz: 'Europe/Bratislava', lat: 48.1486, lng: 17.1077,
    cities: [
      ['Bratislava', 'براتيسلافا', 48.1486, 17.1077],
    ],
  },
  {
    en: 'Hungary', ar: 'هنغاريا', method: 3, tz: 'Europe/Budapest', lat: 47.4979, lng: 19.0402,
    cities: [
      ['Budapest', 'بودابست', 47.4979, 19.0402],
    ],
  },
  {
    en: 'Romania', ar: 'رومانيا', method: 3, tz: 'Europe/Bucharest', lat: 44.4268, lng: 26.1025,
    cities: [
      ['Bucharest', 'بوخارست', 44.4268, 26.1025],
      ['Cluj-Napoca', 'كلوج نابوكا', 46.7712, 23.6236],
    ],
  },
  {
    en: 'Bulgaria', ar: 'بلغاريا', method: 3, tz: 'Europe/Sofia', lat: 42.6977, lng: 23.3219,
    cities: [
      ['Sofia', 'صوفيا', 42.6977, 23.3219],
      ['Plovdiv', 'بلوفديف', 42.1354, 24.7453],
    ],
  },
  {
    en: 'Greece', ar: 'اليونان', method: 3, tz: 'Europe/Athens', lat: 37.9838, lng: 23.7275,
    cities: [
      ['Athens', 'أثينا', 37.9838, 23.7275],
      ['Thessaloniki', 'سالونيك', 40.6401, 22.9444],
    ],
  },
  {
    en: 'Croatia', ar: 'كرواتيا', method: 3, tz: 'Europe/Zagreb', lat: 45.8150, lng: 15.9819,
    cities: [
      ['Zagreb', 'زغرب', 45.8150, 15.9819],
      ['Split', 'سبليت', 43.5081, 16.4402],
    ],
  },
  {
    en: 'Slovenia', ar: 'سلوفينيا', method: 3, tz: 'Europe/Ljubljana', lat: 46.0569, lng: 14.5058,
    cities: [
      ['Ljubljana', 'ليوبليانا', 46.0569, 14.5058],
    ],
  },
  {
    en: 'Serbia', ar: 'صربيا', method: 3, tz: 'Europe/Belgrade', lat: 44.7866, lng: 20.4489,
    cities: [
      ['Belgrade', 'بلغراد', 44.7866, 20.4489],
      ['Novi Sad', 'نوفي ساد', 45.2671, 19.8335],
    ],
  },
  {
    en: 'Bosnia and Herzegovina', ar: 'البوسنة والهرسك', method: 3, tz: 'Europe/Sarajevo', lat: 43.8563, lng: 18.4131,
    cities: [
      ['Sarajevo', 'سراييفو', 43.8563, 18.4131],
      ['Banja Luka', 'بانيا لوكا', 44.7722, 17.1910],
      ['Mostar', 'موستار', 43.3433, 17.8078],
    ],
  },
  {
    en: 'Montenegro', ar: 'الجبل الأسود', method: 3, tz: 'Europe/Podgorica', lat: 42.4304, lng: 19.2594,
    cities: [
      ['Podgorica', 'بودغوريتسا', 42.4304, 19.2594],
    ],
  },
  {
    en: 'North Macedonia', ar: 'مقدونيا الشمالية', method: 3, tz: 'Europe/Skopje', lat: 41.9981, lng: 21.4254,
    cities: [
      ['Skopje', 'سكوبيه', 41.9981, 21.4254],
    ],
  },
  {
    en: 'Albania', ar: 'ألبانيا', method: 3, tz: 'Europe/Tirane', lat: 41.3275, lng: 19.8187,
    cities: [
      ['Tirana', 'تيرانا', 41.3275, 19.8187],
    ],
  },
  {
    en: 'Kosovo', ar: 'كوسوفو', method: 3, tz: 'Europe/Belgrade', lat: 42.6629, lng: 21.1655,
    cities: [
      ['Pristina', 'بريشتينا', 42.6629, 21.1655],
    ],
  },
  {
    en: 'Moldova', ar: 'مولدوفا', method: 3, tz: 'Europe/Chisinau', lat: 47.0105, lng: 28.8638,
    cities: [
      ['Chisinau', 'كيشيناو', 47.0105, 28.8638],
    ],
  },
  {
    en: 'Ukraine', ar: 'أوكرانيا', method: 3, tz: 'Europe/Kyiv', lat: 50.4501, lng: 30.5234,
    cities: [
      ['Kyiv', 'كييف', 50.4501, 30.5234],
      ['Kharkiv', 'خاركيف', 49.9935, 36.2304],
      ['Odesa', 'أوديسا', 46.4825, 30.7233],
      ['Lviv', 'لفيف', 49.8397, 24.0297],
    ],
  },
  {
    en: 'Belarus', ar: 'بيلاروسيا', method: 3, tz: 'Europe/Minsk', lat: 53.9006, lng: 27.5590,
    cities: [
      ['Minsk', 'مينسك', 53.9006, 27.5590],
    ],
  },
  {
    en: 'Russia', ar: 'روسيا', method: 14, tz: 'Europe/Moscow', lat: 55.7558, lng: 37.6173,
    cities: [
      ['Moscow', 'موسكو', 55.7558, 37.6173],
      ['Saint Petersburg', 'سانت بطرسبرغ', 59.9311, 30.3609],
      ['Kazan', 'قازان', 55.7963, 49.1088],
      ['Ufa', 'أوفا', 54.7388, 55.9721, 'Asia/Yekaterinburg'],
      ['Grozny', 'غروزني', 43.3169, 45.6981],
      ['Makhachkala', 'محج قلعة', 42.9764, 47.5023],
      ['Samara', 'سامارا', 53.1959, 50.1002, 'Europe/Samara'],
      ['Sochi', 'سوتشي', 43.5855, 39.7231],
      ['Yekaterinburg', 'يكاترينبورغ', 56.8389, 60.6057, 'Asia/Yekaterinburg'],
      ['Novosibirsk', 'نوفوسيبيرسك', 55.0084, 82.9357, 'Asia/Novosibirsk'],
      ['Omsk', 'أومسك', 54.9885, 73.3242, 'Asia/Omsk'],
      ['Krasnoyarsk', 'كراسنويارسك', 56.0153, 92.8932, 'Asia/Krasnoyarsk'],
    ],
  },
  {
    en: 'Estonia', ar: 'إستونيا', method: 3, tz: 'Europe/Tallinn', lat: 59.4370, lng: 24.7536,
    cities: [
      ['Tallinn', 'تالين', 59.4370, 24.7536],
    ],
  },
  {
    en: 'Latvia', ar: 'لاتفيا', method: 3, tz: 'Europe/Riga', lat: 56.9496, lng: 24.1052,
    cities: [
      ['Riga', 'ريغا', 56.9496, 24.1052],
    ],
  },
  {
    en: 'Lithuania', ar: 'ليتوانيا', method: 3, tz: 'Europe/Vilnius', lat: 54.6872, lng: 25.2797,
    cities: [
      ['Vilnius', 'فيلنيوس', 54.6872, 25.2797],
    ],
  },
  {
    en: 'Malta', ar: 'مالطا', method: 3, tz: 'Europe/Malta', lat: 35.8989, lng: 14.5146,
    cities: [
      ['Valletta', 'فاليتا', 35.8989, 14.5146],
    ],
  },
  {
    en: 'Vatican City', ar: 'الفاتيكان', method: 3, tz: 'Europe/Rome', lat: 41.9029, lng: 12.4534,
    cities: [
      ['Vatican City', 'مدينة الفاتيكان', 41.9029, 12.4534],
    ],
  },
  {
    en: 'San Marino', ar: 'سان مارينو', method: 3, tz: 'Europe/Rome', lat: 43.9356, lng: 12.4473,
    cities: [
      ['San Marino', 'سان مارينو', 43.9356, 12.4473],
    ],
  },
  {
    en: 'Andorra', ar: 'أندورا', method: 3, tz: 'Europe/Andorra', lat: 42.5063, lng: 1.5218,
    cities: [
      ['Andorra la Vella', 'أندورا لا فيلا', 42.5063, 1.5218],
    ],
  },
  {
    en: 'Monaco', ar: 'موناكو', method: 3, tz: 'Europe/Monaco', lat: 43.7384, lng: 7.4246,
    cities: [
      ['Monaco', 'موناكو', 43.7384, 7.4246],
    ],
  },
  {
    en: 'Liechtenstein', ar: 'ليختنشتاين', method: 3, tz: 'Europe/Vaduz', lat: 47.1410, lng: 9.5209,
    cities: [
      ['Vaduz', 'فادوتس', 47.1410, 9.5209],
    ],
  },
];
