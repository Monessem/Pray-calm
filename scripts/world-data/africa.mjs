/**
 * World location database — Sub-Saharan Africa (43 countries).
 * See mena.mjs for the data shape contract.
 */
export const AFRICA = [
  {
    en: 'Nigeria', ar: 'نيجيريا', method: 3, tz: 'Africa/Lagos', lat: 9.0579, lng: 7.4951,
    cities: [
      ['Abuja', 'أبوجا', 9.0579, 7.4951],
      ['Lagos', 'لاغوس', 6.5244, 3.3792],
      ['Kano', 'كانو', 12.0022, 8.5920],
      ['Ibadan', 'إبادان', 7.3775, 3.9470],
      ['Kaduna', 'كادونا', 10.5222, 7.4678],
      ['Port Harcourt', 'بورت هاركورت', 4.8156, 7.0498],
      ['Maiduguri', 'مايدوغوري', 11.8311, 13.1510],
      ['Ilorin', 'إيلورين', 8.4799, 4.5418],
      ['Sokoto', 'سوكوتو', 13.0622, 5.2338],
    ],
  },
  {
    en: 'Ghana', ar: 'غانا', method: 3, tz: 'Africa/Accra', lat: 5.6037, lng: -0.1870,
    cities: [
      ['Accra', 'أكرا', 5.6037, -0.1870],
      ['Kumasi', 'كوماسي', 6.6885, -1.6244],
      ['Tamale', 'تامالي', 9.4008, -0.8393],
    ],
  },
  {
    en: 'Senegal', ar: 'السنغال', method: 3, tz: 'Africa/Dakar', lat: 14.7167, lng: -17.4677,
    cities: [
      ['Dakar', 'داكار', 14.7167, -17.4677],
      ['Thies', 'تيس', 14.7886, -16.9246],
      ['Saint-Louis', 'سانت لويس', 16.0326, -16.4818],
    ],
  },
  {
    en: 'Mali', ar: 'مالي', method: 3, tz: 'Africa/Bamako', lat: 12.6392, lng: -8.0029,
    cities: [
      ['Bamako', 'باماكو', 12.6392, -8.0029],
      ['Timbuktu', 'تمبكتو', 16.7735, -3.0074],
      ['Mopti', 'موبتي', 14.5170, -4.1833],
    ],
  },
  {
    en: 'Niger', ar: 'النيجر', method: 3, tz: 'Africa/Niamey', lat: 13.5127, lng: 2.1128,
    cities: [
      ['Niamey', 'نيامي', 13.5127, 2.1128],
      ['Zinder', 'زندر', 13.8053, 8.9881],
      ['Maradi', 'مرادي', 13.4977, 7.1017],
    ],
  },
  {
    en: 'Chad', ar: 'تشاد', method: 3, tz: 'Africa/Ndjamena', lat: 12.1348, lng: 15.0557,
    cities: [
      ["N'Djamena", 'إنجامينا', 12.1348, 15.0557],
      ['Moundou', 'موندو', 8.5667, 16.0833],
    ],
  },
  {
    en: 'Burkina Faso', ar: 'بوركينا فاسو', method: 3, tz: 'Africa/Ouagadougou', lat: 12.3714, lng: -1.5197,
    cities: [
      ['Ouagadougou', 'واغادوغو', 12.3714, -1.5197],
      ['Bobo-Dioulasso', 'بوبو ديولاسو', 11.1771, -4.2979],
    ],
  },
  {
    en: 'Guinea', ar: 'غينيا', method: 3, tz: 'Africa/Conakry', lat: 9.6412, lng: -13.5784,
    cities: [
      ['Conakry', 'كوناكري', 9.6412, -13.5784],
      ['Kankan', 'كانكان', 10.3833, -9.3000],
    ],
  },
  {
    en: 'Sierra Leone', ar: 'سيراليون', method: 3, tz: 'Africa/Freetown', lat: 8.4657, lng: -13.2317,
    cities: [
      ['Freetown', 'فريتاون', 8.4657, -13.2317],
      ['Bo', 'بو', 7.9650, -11.7385],
    ],
  },
  {
    en: 'Liberia', ar: 'ليبيريا', method: 3, tz: 'Africa/Monrovia', lat: 6.3005, lng: -10.7965,
    cities: [
      ['Monrovia', 'مونروفيا', 6.3005, -10.7965],
    ],
  },
  {
    en: 'Ivory Coast', ar: 'ساحل العاج', method: 3, tz: 'Africa/Abidjan', lat: 6.8276, lng: -5.2893,
    cities: [
      ['Yamoussoukro', 'ياموسوكرو', 6.8276, -5.2893],
      ['Abidjan', 'أبيدجان', 5.3599, -4.0083],
      ['Bouake', 'بواكي', 7.6906, -5.0301],
    ],
  },
  {
    en: 'Gambia', ar: 'غامبيا', method: 3, tz: 'Africa/Banjul', lat: 13.4527, lng: -16.5776,
    cities: [
      ['Banjul', 'بانجول', 13.4527, -16.5776],
      ['Serrekunda', 'سيري كوندا', 13.4333, -16.6833],
    ],
  },
  {
    en: 'Guinea-Bissau', ar: 'غينيا بيساو', method: 3, tz: 'Africa/Bissau', lat: 11.8635, lng: -15.5977,
    cities: [
      ['Bissau', 'بيساو', 11.8635, -15.5977],
    ],
  },
  {
    en: 'Togo', ar: 'توغو', method: 3, tz: 'Africa/Lome', lat: 6.1319, lng: 1.2228,
    cities: [
      ['Lome', 'لومي', 6.1319, 1.2228],
    ],
  },
  {
    en: 'Benin', ar: 'بنين', method: 3, tz: 'Africa/Porto-Novo', lat: 6.4969, lng: 2.6289,
    cities: [
      ['Porto-Novo', 'بورتو نوفو', 6.4969, 2.6289],
      ['Cotonou', 'كتونو', 6.3653, 2.4183],
    ],
  },
  {
    en: 'Cameroon', ar: 'الكاميرون', method: 3, tz: 'Africa/Douala', lat: 3.8480, lng: 11.5021,
    cities: [
      ['Yaounde', 'ياوندي', 3.8480, 11.5021],
      ['Douala', 'دوالا', 4.0511, 9.7679],
      ['Garoua', 'غاروا', 9.3013, 13.3921],
    ],
  },
  {
    en: 'Central African Republic', ar: 'جمهورية أفريقيا الوسطى', method: 3, tz: 'Africa/Bangui', lat: 4.3947, lng: 18.5582,
    cities: [
      ['Bangui', 'بانغي', 4.3947, 18.5582],
    ],
  },
  {
    en: 'Gabon', ar: 'الغابون', method: 3, tz: 'Africa/Libreville', lat: 0.4162, lng: 9.4673,
    cities: [
      ['Libreville', 'ليبرفيل', 0.4162, 9.4673],
    ],
  },
  {
    en: 'Congo', ar: 'جمهورية الكونغو', method: 3, tz: 'Africa/Brazzaville', lat: -4.2634, lng: 15.2429,
    cities: [
      ['Brazzaville', 'برازافيل', -4.2634, 15.2429],
      ['Pointe-Noire', 'بوانت نوار', -4.7692, 11.8664],
    ],
  },
  {
    en: 'DR Congo', ar: 'الكونغو الديمقراطية', method: 3, tz: 'Africa/Kinshasa', lat: -4.4419, lng: 15.2663,
    cities: [
      ['Kinshasa', 'كينشاسا', -4.4419, 15.2663],
      ['Lubumbashi', 'لوبومباشي', -11.6647, 27.4795, 'Africa/Lubumbashi'],
      ['Mbuji-Mayi', 'مبوجي مايي', -6.1361, 23.5897, 'Africa/Lubumbashi'],
      ['Kisangani', 'كيسانغاني', 0.5153, 25.1907],
      ['Goma', 'غوما', -1.6585, 29.2204],
    ],
  },
  {
    en: 'Angola', ar: 'أنغولا', method: 3, tz: 'Africa/Luanda', lat: -8.8390, lng: 13.2894,
    cities: [
      ['Luanda', 'لواندا', -8.8390, 13.2894],
      ['Huambo', 'هوامبو', -12.7761, 15.7392],
    ],
  },
  {
    en: 'Zambia', ar: 'زامبيا', method: 3, tz: 'Africa/Lusaka', lat: -15.4167, lng: 28.2833,
    cities: [
      ['Lusaka', 'لوساكا', -15.4167, 28.2833],
      ['Kitwe', 'كيتوي', -12.8024, 28.2133],
    ],
  },
  {
    en: 'Zimbabwe', ar: 'زيمبابوي', method: 3, tz: 'Africa/Harare', lat: -17.8252, lng: 31.0335,
    cities: [
      ['Harare', 'هراري', -17.8252, 31.0335],
      ['Bulawayo', 'بولاوايو', -20.1500, 28.5833],
    ],
  },
  {
    en: 'Malawi', ar: 'مالاوي', method: 3, tz: 'Africa/Blantyre', lat: -13.9626, lng: 33.7741,
    cities: [
      ['Lilongwe', 'ليلونغوي', -13.9626, 33.7741],
      ['Blantyre', 'بلانتير', -15.7861, 35.0058],
    ],
  },
  {
    en: 'Mozambique', ar: 'موزمبيق', method: 3, tz: 'Africa/Maputo', lat: -25.9655, lng: 32.5832,
    cities: [
      ['Maputo', 'مابوتو', -25.9655, 32.5832],
      ['Beira', 'بيرا', -19.8436, 34.8389],
      ['Nampula', 'نامبولا', -15.1165, 39.2666],
    ],
  },
  {
    en: 'Tanzania', ar: 'تنزانيا', method: 3, tz: 'Africa/Dar_es_Salaam', lat: -6.1630, lng: 35.7516,
    cities: [
      ['Dodoma', 'دودوما', -6.1630, 35.7516],
      ['Dar es Salaam', 'دار السلام', -6.7924, 39.2083],
      ['Mwanza', 'موانزا', -2.5167, 32.9000],
      ['Zanzibar City', 'زنجبار', -6.1659, 39.2026],
      ['Arusha', 'أروشا', -3.3869, 36.6830],
    ],
  },
  {
    en: 'Kenya', ar: 'كينيا', method: 3, tz: 'Africa/Nairobi', lat: -1.2921, lng: 36.8219,
    cities: [
      ['Nairobi', 'نيروبي', -1.2921, 36.8219],
      ['Mombasa', 'مومباسا', -4.0435, 39.6682],
      ['Kisumu', 'كيسومو', -0.0917, 34.7680],
    ],
  },
  {
    en: 'Uganda', ar: 'أوغندا', method: 3, tz: 'Africa/Kampala', lat: 0.3476, lng: 32.5825,
    cities: [
      ['Kampala', 'كمبالا', 0.3476, 32.5825],
    ],
  },
  {
    en: 'Rwanda', ar: 'رواندا', method: 3, tz: 'Africa/Kigali', lat: -1.9441, lng: 30.0619,
    cities: [
      ['Kigali', 'كيغالي', -1.9441, 30.0619],
    ],
  },
  {
    en: 'Burundi', ar: 'بوروندي', method: 3, tz: 'Africa/Bujumbura', lat: -3.3731, lng: 29.9189,
    cities: [
      ['Gitega', 'غيتيغا', -3.4271, 29.9246],
      ['Bujumbura', 'بوجومبورا', -3.3731, 29.9189],
    ],
  },
  {
    en: 'Ethiopia', ar: 'إثيوبيا', method: 3, tz: 'Africa/Addis_Ababa', lat: 9.0250, lng: 38.7469,
    cities: [
      ['Addis Ababa', 'أديس أبابا', 9.0250, 38.7469],
      ['Dire Dawa', 'ديري داوا', 9.5931, 41.8661],
      ['Mekelle', 'ميكيلي', 13.4967, 39.4753],
      ['Gondar', 'غوندر', 12.6000, 37.4667],
      ['Bahir Dar', 'بحر دار', 11.5936, 37.3908],
    ],
  },
  {
    en: 'Eritrea', ar: 'إريتريا', method: 3, tz: 'Africa/Asmara', lat: 15.3229, lng: 38.9251,
    cities: [
      ['Asmara', 'أسمرة', 15.3229, 38.9251],
    ],
  },
  {
    en: 'South Sudan', ar: 'جنوب السودان', method: 5, tz: 'Africa/Juba', lat: 4.8594, lng: 31.5713,
    cities: [
      ['Juba', 'جوبا', 4.8594, 31.5713],
    ],
  },
  {
    en: 'Equatorial Guinea', ar: 'غينيا الاستوائية', method: 3, tz: 'Africa/Malabo', lat: 3.7500, lng: 8.7833,
    cities: [
      ['Malabo', 'مالابو', 3.7500, 8.7833],
    ],
  },
  {
    en: 'Sao Tome and Principe', ar: 'ساو تومي وبرينسيبي', method: 3, tz: 'Africa/Sao_Tome', lat: 0.3365, lng: 6.7273,
    cities: [
      ['Sao Tome', 'ساو تومي', 0.3365, 6.7273],
    ],
  },
  {
    en: 'Cabo Verde', ar: 'الرأس الأخضر (كابو فيردي)', method: 3, tz: 'Atlantic/Cape_Verde', lat: 14.9330, lng: -23.5133,
    cities: [
      ['Praia', 'برايا', 14.9330, -23.5133],
    ],
  },
  {
    en: 'Botswana', ar: 'بوتسوانا', method: 3, tz: 'Africa/Gaborone', lat: -24.6532, lng: 25.9066,
    cities: [
      ['Gaborone', 'غابورون', -24.6532, 25.9066],
      ['Francistown', 'فرانسستاون', -21.1700, 27.5100],
    ],
  },
  {
    en: 'Namibia', ar: 'ناميبيا', method: 3, tz: 'Africa/Windhoek', lat: -22.5597, lng: 17.0832,
    cities: [
      ['Windhoek', 'ويندهوك', -22.5597, 17.0832],
    ],
  },
  {
    en: 'South Africa', ar: 'جنوب أفريقيا', method: 3, tz: 'Africa/Johannesburg', lat: -26.2041, lng: 28.0473,
    cities: [
      ['Johannesburg', 'جوهانسبرغ', -26.2041, 28.0473],
      ['Cape Town', 'كيب تاون', -33.9249, 18.4241],
      ['Durban', 'ديربان', -29.8587, 31.0218],
      ['Pretoria', 'بريتوريا', -25.7479, 28.2293],
      ['Port Elizabeth', 'بورت إليزابيث', -33.9608, 25.6022],
    ],
  },
  {
    en: 'Lesotho', ar: 'ليسوتو', method: 3, tz: 'Africa/Maseru', lat: -29.3100, lng: 27.4800,
    cities: [
      ['Maseru', 'ماسيرو', -29.3100, 27.4800],
    ],
  },
  {
    en: 'Eswatini', ar: 'إسواتيني', method: 3, tz: 'Africa/Mbabane', lat: -26.3186, lng: 31.1367,
    cities: [
      ['Mbabane', 'مبابان', -26.3186, 31.1367],
      ['Manzini', 'مانزيني', -26.4988, 31.3800],
    ],
  },
  {
    en: 'Madagascar', ar: 'مدغشقر', method: 3, tz: 'Indian/Antananarivo', lat: -18.8792, lng: 47.5079,
    cities: [
      ['Antananarivo', 'أنتاناناريفو', -18.8792, 47.5079],
      ['Toamasina', 'تواماسينا', -18.1494, 49.3925],
    ],
  },
  {
    en: 'Seychelles', ar: 'سيشل', method: 3, tz: 'Indian/Mahe', lat: -4.6196, lng: 55.4510,
    cities: [
      ['Victoria', 'فيكتوريا', -4.6196, 55.4510],
    ],
  },
  {
    en: 'Mauritius', ar: 'موريشيوس', method: 3, tz: 'Indian/Mauritius', lat: -20.1609, lng: 57.5012,
    cities: [
      ['Port Louis', 'بور لويس', -20.1609, 57.5012],
    ],
  },
];
