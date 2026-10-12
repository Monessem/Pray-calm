/**
 * World location database — The Americas (37 countries).
 * See mena.mjs for the data shape contract.
 */
export const AMERICAS = [
  {
    en: 'United States', ar: 'الولايات المتحدة الأمريكية', method: 2, tz: 'America/New_York', lat: 40.7128, lng: -74.0060,
    cities: [
      ['New York', 'نيويورك', 40.7128, -74.0060],
      ['Los Angeles', 'لوس أنجلوس', 34.0522, -118.2437, 'America/Los_Angeles'],
      ['Chicago', 'شيكاغو', 41.8781, -87.6298, 'America/Chicago'],
      ['Houston', 'هيوستن', 29.7604, -95.3698, 'America/Chicago'],
      ['Philadelphia', 'فيلادلفيا', 39.9526, -75.1652],
      ['Phoenix', 'فينيكس', 33.4484, -112.0740, 'America/Phoenix'],
      ['San Antonio', 'سان أنطونيو', 29.4241, -98.4936, 'America/Chicago'],
      ['San Diego', 'سان دييغو', 32.7157, -117.1611, 'America/Los_Angeles'],
      ['Dallas', 'دالاس', 32.7767, -96.7970, 'America/Chicago'],
      ['Detroit', 'ديترويت', 42.3314, -83.0458],
      ['Washington', 'واشنطن العاصمة', 38.9072, -77.0369],
      ['Miami', 'ميامي', 25.7617, -80.1918],
      ['Atlanta', 'أتلانتا', 33.7490, -84.3880],
      ['Seattle', 'سياتل', 47.6062, -122.3321, 'America/Los_Angeles'],
      ['Denver', 'دنفر', 39.7392, -104.9903, 'America/Denver'],
      ['Minneapolis', 'مينيابوليس', 44.9778, -93.2650, 'America/Chicago'],
      ['Las Vegas', 'لاس فيغاس', 36.1699, -115.1398, 'America/Los_Angeles'],
    ],
  },
  {
    en: 'Canada', ar: 'كندا', method: 2, tz: 'America/Toronto', lat: 43.6532, lng: -79.3832,
    cities: [
      ['Toronto', 'تورونتو', 43.6532, -79.3832],
      ['Montreal', 'مونتريال', 45.5017, -73.5673],
      ['Vancouver', 'فانكوفر', 49.2827, -123.1207, 'America/Vancouver'],
      ['Calgary', 'كالغاري', 51.0447, -114.0719, 'America/Edmonton'],
      ['Ottawa', 'أوتاوا', 45.4215, -75.6972],
      ['Edmonton', 'إدمونتون', 53.5461, -113.4938, 'America/Edmonton'],
      ['Winnipeg', 'وينيبيغ', 49.8951, -97.1384, 'America/Winnipeg'],
      ['Halifax', 'هاليفاكس', 44.6488, -63.5752, 'America/Halifax'],
    ],
  },
  {
    en: 'Mexico', ar: 'المكسيك', method: 3, tz: 'America/Mexico_City', lat: 19.4326, lng: -99.1332,
    cities: [
      ['Mexico City', 'مدينة مكسيكو', 19.4326, -99.1332],
      ['Guadalajara', 'غوادالاخارا', 20.6597, -103.3496],
      ['Monterrey', 'مونتيري', 25.6866, -100.3161, 'America/Monterrey'],
      ['Tijuana', 'تيخوانا', 32.5149, -117.0382, 'America/Tijuana'],
      ['Puebla', 'بويبلا', 19.0414, -98.2063],
      ['Cancun', 'كانكون', 21.1619, -86.8515, 'America/Cancun'],
    ],
  },
  {
    en: 'Guatemala', ar: 'غواتيمالا', method: 3, tz: 'America/Guatemala', lat: 14.6349, lng: -90.5069,
    cities: [
      ['Guatemala City', 'مدينة غواتيمالا', 14.6349, -90.5069],
    ],
  },
  {
    en: 'Belize', ar: 'بليز', method: 3, tz: 'America/Belize', lat: 17.2514, lng: -88.7590,
    cities: [
      ['Belmopan', 'بلموبان', 17.2514, -88.7590],
    ],
  },
  {
    en: 'Honduras', ar: 'هندوراس', method: 3, tz: 'America/Tegucigalpa', lat: 14.0723, lng: -87.1921,
    cities: [
      ['Tegucigalpa', 'تيغوسيغالبا', 14.0723, -87.1921],
      ['San Pedro Sula', 'سان بيدرو سولا', 15.5041, -88.0250],
    ],
  },
  {
    en: 'El Salvador', ar: 'السلفادور', method: 3, tz: 'America/El_Salvador', lat: 13.6929, lng: -89.2182,
    cities: [
      ['San Salvador', 'سان سلفادور', 13.6929, -89.2182],
    ],
  },
  {
    en: 'Nicaragua', ar: 'نيكاراغوا', method: 3, tz: 'America/Managua', lat: 12.1150, lng: -86.2362,
    cities: [
      ['Managua', 'ماناغوا', 12.1150, -86.2362],
    ],
  },
  {
    en: 'Costa Rica', ar: 'كوستاريكا', method: 3, tz: 'America/Costa_Rica', lat: 9.9281, lng: -84.0907,
    cities: [
      ['San Jose', 'سان خوسيه', 9.9281, -84.0907],
    ],
  },
  {
    en: 'Panama', ar: 'بنما', method: 3, tz: 'America/Panama', lat: 8.9824, lng: -79.5199,
    cities: [
      ['Panama City', 'مدينة بنما', 8.9824, -79.5199],
    ],
  },
  {
    en: 'Cuba', ar: 'كوبا', method: 3, tz: 'America/Havana', lat: 23.1136, lng: -82.3666,
    cities: [
      ['Havana', 'هافانا', 23.1136, -82.3666],
    ],
  },
  {
    en: 'Jamaica', ar: 'جامايكا', method: 3, tz: 'America/Jamaica', lat: 17.9712, lng: -76.7931,
    cities: [
      ['Kingston', 'كينغستون', 17.9712, -76.7931],
    ],
  },
  {
    en: 'Haiti', ar: 'هايتي', method: 3, tz: 'America/Port-au-Prince', lat: 18.5944, lng: -72.3074,
    cities: [
      ['Port-au-Prince', 'بورت أو برنس', 18.5944, -72.3074],
    ],
  },
  {
    en: 'Dominican Republic', ar: 'جمهورية الدومينيكان', method: 3, tz: 'America/Santo_Domingo', lat: 18.4861, lng: -69.9312,
    cities: [
      ['Santo Domingo', 'سانتو دومينغو', 18.4861, -69.9312],
    ],
  },
  {
    en: 'Bahamas', ar: 'جزر البهاما', method: 3, tz: 'America/Nassau', lat: 25.0443, lng: -77.3504,
    cities: [
      ['Nassau', 'ناساو', 25.0443, -77.3504],
    ],
  },
  {
    en: 'Trinidad and Tobago', ar: 'ترينيداد وتوباغو', method: 3, tz: 'America/Port_of_Spain', lat: 10.6510, lng: -61.5019,
    cities: [
      ['Port of Spain', 'بورت أوف سبين', 10.6510, -61.5019],
    ],
  },
  {
    en: 'Barbados', ar: 'بربادوس', method: 3, tz: 'America/Barbados', lat: 13.1132, lng: -59.5988,
    cities: [
      ['Bridgetown', 'بريدجتاون', 13.1132, -59.5988],
    ],
  },
  {
    en: 'Saint Lucia', ar: 'سانت لوسيا', method: 3, tz: 'America/St_Lucia', lat: 14.0101, lng: -60.9996,
    cities: [
      ['Castries', 'كاستريس', 14.0101, -60.9996],
    ],
  },
  {
    en: 'Grenada', ar: 'غرينادا', method: 3, tz: 'America/Grenada', lat: 12.0562, lng: -61.7486,
    cities: [
      ["Saint George's", 'سانت جورج', 12.0562, -61.7486],
    ],
  },
  {
    en: 'Dominica', ar: 'دومينيكا', method: 3, tz: 'America/Dominica', lat: 15.3018, lng: -61.3881,
    cities: [
      ['Roseau', 'روزو', 15.3018, -61.3881],
    ],
  },
  {
    en: 'Antigua and Barbuda', ar: 'أنتيغوا وبربودا', method: 3, tz: 'America/Antigua', lat: 17.1210, lng: -61.8455,
    cities: [
      ["Saint John's", 'سانت جونز', 17.1210, -61.8455],
    ],
  },
  {
    en: 'Saint Kitts and Nevis', ar: 'سانت كيتس ونيفيس', method: 3, tz: 'America/St_Kitts', lat: 17.2975, lng: -62.7170,
    cities: [
      ['Basseterre', 'باسيتير', 17.2975, -62.7170],
    ],
  },
  {
    en: 'Saint Vincent and the Grenadines', ar: 'سانت فينسنت وجزر غرينادين', method: 3, tz: 'America/St_Vincent', lat: 13.1567, lng: -61.2246,
    cities: [
      ['Kingstown', 'كينغستاون', 13.1567, -61.2246],
    ],
  },
  {
    en: 'Brazil', ar: 'البرازيل', method: 3, tz: 'America/Sao_Paulo', lat: -23.5505, lng: -46.6333,
    cities: [
      ['Sao Paulo', 'ساو باولو', -23.5505, -46.6333],
      ['Rio de Janeiro', 'ريو دي جانيرو', -22.9068, -43.1729],
      ['Brasilia', 'برازيليا', -15.7939, -47.8828],
      ['Salvador', 'سلفادور', -12.9777, -38.5016, 'America/Bahia'],
      ['Fortaleza', 'فورتاليزا', -3.7319, -38.5267, 'America/Fortaleza'],
      ['Belo Horizonte', 'بيلو هوريزونتي', -19.9167, -43.9345],
      ['Manaus', 'ماناوس', -3.1190, -60.0217, 'America/Manaus'],
      ['Recife', 'ريسيفي', -8.0476, -34.8770, 'America/Recife'],
      ['Belem', 'بيليم', -1.4558, -48.5039, 'America/Belem'],
      ['Porto Alegre', 'بورتو أليغري', -30.0346, -51.2177],
    ],
  },
  {
    en: 'Argentina', ar: 'الأرجنتين', method: 3, tz: 'America/Argentina/Buenos_Aires', lat: -34.6037, lng: -58.3816,
    cities: [
      ['Buenos Aires', 'بوينس آيرس', -34.6037, -58.3816],
      ['Cordoba', 'قرطبة', -31.4201, -64.1888],
      ['Rosario', 'روساريو', -32.9442, -60.6505],
      ['Mendoza', 'مندوزا', -32.8895, -68.8458],
    ],
  },
  {
    en: 'Chile', ar: 'تشيلي', method: 3, tz: 'America/Santiago', lat: -33.4489, lng: -70.6693,
    cities: [
      ['Santiago', 'سانتياغو', -33.4489, -70.6693],
      ['Valparaiso', 'فالبارايسو', -33.0472, -71.6127],
    ],
  },
  {
    en: 'Peru', ar: 'بيرو', method: 3, tz: 'America/Lima', lat: -12.0464, lng: -77.0428,
    cities: [
      ['Lima', 'ليما', -12.0464, -77.0428],
      ['Arequipa', 'أريكيبا', -16.4090, -71.5375],
    ],
  },
  {
    en: 'Colombia', ar: 'كولومبيا', method: 3, tz: 'America/Bogota', lat: 4.7110, lng: -74.0721,
    cities: [
      ['Bogota', 'بوغوتا', 4.7110, -74.0721],
      ['Medellin', 'ميديلين', 6.2442, -75.5812],
      ['Cali', 'كالي', 3.4516, -76.5320],
    ],
  },
  {
    en: 'Venezuela', ar: 'فنزويلا', method: 3, tz: 'America/Caracas', lat: 10.4806, lng: -66.9036,
    cities: [
      ['Caracas', 'كراكاس', 10.4806, -66.9036],
      ['Maracaibo', 'ماراكايبو', 10.6545, -71.6402],
    ],
  },
  {
    en: 'Ecuador', ar: 'الإكوادور', method: 3, tz: 'America/Guayaquil', lat: -0.1807, lng: -78.4678,
    cities: [
      ['Quito', 'كيتو', -0.1807, -78.4678],
      ['Guayaquil', 'غواياكيل', -2.1894, -79.8891],
    ],
  },
  {
    en: 'Bolivia', ar: 'بوليفيا', method: 3, tz: 'America/La_Paz', lat: -16.4897, lng: -68.1193,
    cities: [
      ['La Paz', 'لا باز', -16.4897, -68.1193],
      ['Santa Cruz de la Sierra', 'سانتا كروز دي لا سييرا', -17.7833, -63.1821],
    ],
  },
  {
    en: 'Paraguay', ar: 'باراغواي', method: 3, tz: 'America/Asuncion', lat: -25.2637, lng: -57.5759,
    cities: [
      ['Asuncion', 'أسونسيون', -25.2637, -57.5759],
    ],
  },
  {
    en: 'Uruguay', ar: 'أوروغواي', method: 3, tz: 'America/Montevideo', lat: -34.9011, lng: -56.1645,
    cities: [
      ['Montevideo', 'مونتيفيديو', -34.9011, -56.1645],
    ],
  },
  {
    en: 'Guyana', ar: 'غيانا', method: 3, tz: 'America/Guyana', lat: 6.8013, lng: -58.1551,
    cities: [
      ['Georgetown', 'جورج تاون', 6.8013, -58.1551],
    ],
  },
  {
    en: 'Suriname', ar: 'سورينام', method: 3, tz: 'America/Paramaribo', lat: 5.8520, lng: -55.2038,
    cities: [
      ['Paramaribo', 'باراماريبو', 5.8520, -55.2038],
    ],
  },
];
