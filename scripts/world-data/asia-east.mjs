/**
 * World location database — East & Southeast Asia (17 countries).
 * See mena.mjs for the data shape contract.
 */
export const ASIA_EAST = [
  {
    en: 'China', ar: 'الصين', method: 1, tz: 'Asia/Shanghai', lat: 39.9042, lng: 116.4074,
    cities: [
      ['Beijing', 'بكين', 39.9042, 116.4074],
      ['Shanghai', 'شانغهاي', 31.2304, 121.4737],
      ['Guangzhou', 'قوانغتشو', 23.1291, 113.2644],
      ['Chengdu', 'تشنغدو', 30.5728, 104.0668],
      ['Xian', 'شيان', 34.3416, 108.9398],
      ['Shenzhen', 'شنجن', 22.5431, 114.0579],
      ['Hangzhou', 'هانغتشو', 30.2741, 120.1551],
      ['Nanjing', 'نانجينغ', 32.0603, 118.7969],
      ['Wuhan', 'ووهان', 30.5928, 114.3055],
      ['Kunming', 'كونمينغ', 24.8801, 102.8329],
      ['Lanzhou', 'لانتشو', 36.0611, 103.8343],
      ['Yinchuan', 'ينتشوان', 38.4872, 106.2309],
      ['Urumqi', 'أورومتشي', 43.8256, 87.6168],
    ],
  },
  {
    en: 'Taiwan', ar: 'تايوان', method: 3, tz: 'Asia/Taipei', lat: 25.0330, lng: 121.5654,
    cities: [
      ['Taipei', 'تايبيه', 25.0330, 121.5654],
      ['Kaohsiung', 'كاوهسيونغ', 22.6273, 120.3014],
    ],
  },
  {
    en: 'Mongolia', ar: 'منغوليا', method: 3, tz: 'Asia/Ulaanbaatar', lat: 47.8864, lng: 106.9057,
    cities: [
      ['Ulaanbaatar', 'أولان باتور', 47.8864, 106.9057],
    ],
  },
  {
    en: 'Japan', ar: 'اليابان', method: 3, tz: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503,
    cities: [
      ['Tokyo', 'طوكيو', 35.6762, 139.6503],
      ['Osaka', 'أوساكا', 34.6937, 135.5023],
      ['Nagoya', 'ناغويا', 35.1815, 136.9066],
      ['Fukuoka', 'فوكوكا', 33.5902, 130.4017],
      ['Sapporo', 'سابورو', 43.0618, 141.3545],
      ['Kyoto', 'كيوتو', 35.0116, 135.7681],
    ],
  },
  {
    en: 'South Korea', ar: 'كوريا الجنوبية', method: 3, tz: 'Asia/Seoul', lat: 37.5665, lng: 126.9780,
    cities: [
      ['Seoul', 'سيول', 37.5665, 126.9780],
      ['Busan', 'بوسان', 35.1796, 129.0756],
      ['Incheon', 'إنشيون', 37.4563, 126.7052],
    ],
  },
  {
    en: 'North Korea', ar: 'كوريا الشمالية', method: 3, tz: 'Asia/Pyongyang', lat: 39.0392, lng: 125.7625,
    cities: [
      ['Pyongyang', 'بيونغ يانغ', 39.0392, 125.7625],
    ],
  },
  {
    en: 'Indonesia', ar: 'إندونيسيا', method: 11, tz: 'Asia/Jakarta', lat: -6.2088, lng: 106.8456,
    cities: [
      ['Jakarta', 'جاكرتا', -6.2088, 106.8456],
      ['Surabaya', 'سورابايا', -7.2575, 112.7521],
      ['Bandung', 'باندونغ', -6.9175, 107.6191],
      ['Medan', 'ميدان', 3.5952, 98.6722],
      ['Semarang', 'سيمارانغ', -6.9667, 110.4167],
      ['Makassar', 'ماكاسار', -5.1477, 119.4327, 'Asia/Makassar'],
      ['Palembang', 'باليمبانغ', -2.9761, 104.7754],
      ['Yogyakarta', 'يوغياكارتا', -7.7956, 110.3695],
      ['Denpasar', 'دنباسار', -8.6500, 115.2167, 'Asia/Makassar'],
      ['Banda Aceh', 'باندا آتشيه', 5.5483, 95.3238],
    ],
  },
  {
    en: 'Malaysia', ar: 'ماليزيا', method: 11, tz: 'Asia/Kuala_Lumpur', lat: 3.1390, lng: 101.6869,
    cities: [
      ['Kuala Lumpur', 'كوالالمبور', 3.1390, 101.6869],
      ['George Town', 'جورج تاون', 5.4141, 100.3288],
      ['Johor Bahru', 'جوهور بهرو', 1.4927, 103.7414],
      ['Ipoh', 'إيبوه', 4.5975, 101.0901],
      ['Kuching', 'كوتشينغ', 1.5500, 110.3333, 'Asia/Kuching'],
      ['Kota Kinabalu', 'كوتا كينابالو', 5.9804, 116.0735, 'Asia/Kuching'],
    ],
  },
  {
    en: 'Singapore', ar: 'سنغافورة', method: 11, tz: 'Asia/Singapore', lat: 1.3521, lng: 103.8198,
    cities: [
      ['Singapore', 'سنغافورة', 1.3521, 103.8198],
    ],
  },
  {
    en: 'Brunei', ar: 'بروناي', method: 11, tz: 'Asia/Brunei', lat: 4.8903, lng: 114.9402,
    cities: [
      ['Bandar Seri Begawan', 'بندر سري بكاوان', 4.8903, 114.9402],
    ],
  },
  {
    en: 'Thailand', ar: 'تايلاند', method: 3, tz: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018,
    cities: [
      ['Bangkok', 'بانكوك', 13.7563, 100.5018],
      ['Chiang Mai', 'شيانغ ماي', 18.7883, 98.9853],
    ],
  },
  {
    en: 'Vietnam', ar: 'فيتنام', method: 3, tz: 'Asia/Ho_Chi_Minh', lat: 21.0285, lng: 105.8048,
    cities: [
      ['Hanoi', 'هانوي', 21.0285, 105.8048, 'Asia/Ho_Chi_Minh'],
      ['Ho Chi Minh City', 'مدينة هو تشي منه', 10.7769, 106.6955],
      ['Da Nang', 'دا نانغ', 16.0544, 108.2022],
    ],
  },
  {
    en: 'Cambodia', ar: 'كمبوديا', method: 3, tz: 'Asia/Phnom_Penh', lat: 11.5564, lng: 104.9282,
    cities: [
      ['Phnom Penh', 'بنوم بنه', 11.5564, 104.9282],
      ['Siem Reap', 'سيام ريب', 13.3633, 103.8564],
    ],
  },
  {
    en: 'Laos', ar: 'لاوس', method: 3, tz: 'Asia/Vientiane', lat: 17.9757, lng: 102.6331,
    cities: [
      ['Vientiane', 'فيينتيان', 17.9757, 102.6331],
    ],
  },
  {
    en: 'Myanmar', ar: 'ميانمار', method: 3, tz: 'Asia/Yangon', lat: 16.8661, lng: 96.1951,
    cities: [
      ['Yangon', 'يانغون', 16.8661, 96.1951],
      ['Mandalay', 'ماندالاي', 21.9586, 96.0891],
      ['Naypyidaw', 'نايبيداو', 19.7633, 96.0785],
    ],
  },
  {
    en: 'Philippines', ar: 'الفلبين', method: 3, tz: 'Asia/Manila', lat: 14.5995, lng: 120.9842,
    cities: [
      ['Manila', 'مانيلا', 14.5995, 120.9842],
      ['Quezon City', 'كيزون سيتي', 14.6760, 121.0437],
      ['Cebu', 'سيبو', 10.3157, 123.8854],
      ['Davao', 'دافاو', 7.1907, 125.4553],
    ],
  },
  {
    en: 'East Timor', ar: 'تيمور الشرقية', method: 3, tz: 'Asia/Dili', lat: -8.5569, lng: 125.5603,
    cities: [
      ['Dili', 'ديلي', -8.5569, 125.5603],
    ],
  },
];
