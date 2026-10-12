/**
 * World location database — South & Central Asia (13 countries).
 * See mena.mjs for the data shape contract.
 */
export const ASIA_SOUTH = [
  {
    en: 'Pakistan', ar: 'باكستان', method: 1, tz: 'Asia/Karachi', lat: 33.6844, lng: 73.0479,
    cities: [
      ['Islamabad', 'إسلام آباد', 33.6844, 73.0479],
      ['Karachi', 'كراتشي', 24.8607, 67.0011],
      ['Lahore', 'لاهور', 31.5204, 74.3587],
      ['Faisalabad', 'فيصل آباد', 31.4187, 73.0791],
      ['Rawalpindi', 'راولبندي', 33.5651, 73.0169],
      ['Multan', 'ملتان', 30.1968, 71.4782],
      ['Peshawar', 'بيشاور', 34.0151, 71.5249],
      ['Quetta', 'كويتا', 30.1798, 66.9750],
      ['Hyderabad', 'حيدر آباد', 25.3960, 68.3578],
      ['Gujranwala', 'غوجرانوالا', 32.1877, 74.1945],
      ['Sialkot', 'سيالكوت', 32.4945, 74.5229],
    ],
  },
  {
    en: 'Afghanistan', ar: 'أفغانستان', method: 1, tz: 'Asia/Kabul', lat: 34.5553, lng: 69.2075,
    cities: [
      ['Kabul', 'كابل', 34.5553, 69.2075],
      ['Kandahar', 'قندهار', 31.6133, 65.7100],
      ['Herat', 'هرات', 34.3529, 62.2040],
      ['Mazar-i-Sharif', 'مزار شريف', 36.7090, 67.1109],
      ['Jalalabad', 'جلال آباد', 34.4265, 70.4515],
    ],
  },
  {
    en: 'India', ar: 'الهند', method: 1, tz: 'Asia/Kolkata', lat: 28.6139, lng: 77.2090,
    cities: [
      ['New Delhi', 'نيودلهي', 28.6139, 77.2090],
      ['Mumbai', 'مومباي', 19.0760, 72.8777],
      ['Kolkata', 'كلكتا', 22.5726, 88.3639],
      ['Hyderabad', 'حيدر آباد', 17.3850, 78.4867],
      ['Chennai', 'تشيناي', 13.0827, 80.2707],
      ['Bengaluru', 'بنغالور', 12.9716, 77.5946],
      ['Ahmedabad', 'أحمد آباد', 23.0225, 72.5714],
      ['Lucknow', 'لكهنؤ', 26.8467, 80.9462],
      ['Jaipur', 'جايبور', 26.9124, 75.7873],
      ['Pune', 'بونا', 18.5204, 73.8567],
      ['Surat', 'سورات', 21.1702, 72.8311],
      ['Kanpur', 'كانبور', 26.4499, 80.3319],
      ['Bhopal', 'بهوبال', 23.2599, 77.4126],
    ],
  },
  {
    en: 'Bangladesh', ar: 'بنغلاديش', method: 1, tz: 'Asia/Dhaka', lat: 23.8103, lng: 90.4125,
    cities: [
      ['Dhaka', 'داكا', 23.8103, 90.4125],
      ['Chittagong', 'شيتاغونغ', 22.3569, 91.7832],
      ['Khulna', 'خولنا', 22.8456, 89.5403],
      ['Rajshahi', 'راجشاهي', 24.3745, 88.6042],
      ['Sylhet', 'سيلهيت', 24.8949, 91.8687],
      ['Barisal', 'باريسال', 22.7010, 90.3535],
    ],
  },
  {
    en: 'Sri Lanka', ar: 'سريلانكا', method: 3, tz: 'Asia/Colombo', lat: 6.9271, lng: 79.8612,
    cities: [
      ['Colombo', 'كولومبو', 6.9271, 79.8612],
      ['Kandy', 'كاندي', 7.2906, 80.6337],
      ['Jaffna', 'جفنا', 9.6615, 80.0255],
    ],
  },
  {
    en: 'Nepal', ar: 'نيبال', method: 3, tz: 'Asia/Kathmandu', lat: 27.7172, lng: 85.3240,
    cities: [
      ['Kathmandu', 'كاتماندو', 27.7172, 85.3240],
      ['Pokhara', 'بوخارا', 28.2096, 83.9856],
    ],
  },
  {
    en: 'Bhutan', ar: 'بوتان', method: 3, tz: 'Asia/Thimphu', lat: 27.4728, lng: 89.6390,
    cities: [
      ['Thimphu', 'تيمفو', 27.4728, 89.6390],
    ],
  },
  {
    en: 'Maldives', ar: 'جزر المالديف', method: 3, tz: 'Indian/Maldives', lat: 4.1755, lng: 73.5093,
    cities: [
      ['Male', 'ماليه', 4.1755, 73.5093],
    ],
  },
  {
    en: 'Kazakhstan', ar: 'كازاخستان', method: 3, tz: 'Asia/Almaty', lat: 51.1694, lng: 71.4491,
    cities: [
      ['Astana', 'أستانا', 51.1694, 71.4491],
      ['Almaty', 'ألماتي', 43.2220, 76.8512],
      ['Shymkent', 'شيمكنت', 42.3417, 69.5901],
      ['Karaganda', 'قراغندي', 49.8047, 73.1094],
    ],
  },
  {
    en: 'Uzbekistan', ar: 'أوزبكستان', method: 3, tz: 'Asia/Tashkent', lat: 41.2995, lng: 69.2401,
    cities: [
      ['Tashkent', 'طشقند', 41.2995, 69.2401],
      ['Samarkand', 'سمرقند', 39.6270, 66.9750],
      ['Bukhara', 'بخارى', 39.7681, 64.4556],
      ['Andijan', 'أنديجان', 40.7821, 72.3442],
    ],
  },
  {
    en: 'Turkmenistan', ar: 'تركمانستان', method: 3, tz: 'Asia/Ashgabat', lat: 37.9601, lng: 58.3261,
    cities: [
      ['Ashgabat', 'عشق آباد', 37.9601, 58.3261],
    ],
  },
  {
    en: 'Kyrgyzstan', ar: 'قيرغيزستان', method: 3, tz: 'Asia/Bishkek', lat: 42.8746, lng: 74.5698,
    cities: [
      ['Bishkek', 'بشكيك', 42.8746, 74.5698],
      ['Osh', 'أوش', 40.5130, 72.7890],
    ],
  },
  {
    en: 'Tajikistan', ar: 'طاجيكستان', method: 3, tz: 'Asia/Dushanbe', lat: 38.5598, lng: 68.7870,
    cities: [
      ['Dushanbe', 'دوشنبه', 38.5598, 68.7870],
    ],
  },
];
