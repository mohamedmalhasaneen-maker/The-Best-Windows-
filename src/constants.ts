/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Profile, Addon, CompanyContact, CompanyLocation, SocialChannel } from './types';

export const BRAND_NAME = 'The Best Windows';

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/share/1Hr4XUgzmp/?mibextid=wwXIfr',
  tiktok: 'https://www.tiktok.com/@joemohammed869?_r=1&_t=ZS-9AnQXOg5mJY',
  instagram: 'https://www.instagram.com/joe.moh2013?dlrf=aDJoazducmN6Y2Rq&utm_source=qr',
} as const;

export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    nameAr: 'فيسبوك',
    url: SOCIAL_LINKS.facebook,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    nameAr: 'تيك توك',
    url: SOCIAL_LINKS.tiktok,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    nameAr: 'إنستغرام',
    url: SOCIAL_LINKS.instagram,
  },
];

export const COMPANY_CONTACTS: CompanyContact[] = [
  {
    id: 'youssef_moussa',
    name: 'مهندس يوسف موسى',
    phone: '01099033501',
    telUrl: 'tel:+201099033501',
    whatsappUrl: 'https://wa.me/201099033501',
  },
  {
    id: 'dr_moussa',
    name: 'الدكتور موسى',
    role: 'فرع مدينة نصر',
    phone: '01024545080',
    telUrl: 'tel:+201024545080',
    whatsappUrl: 'https://wa.me/201024545080',
  },
  {
    id: 'eng_ragab',
    name: 'مهندس رجب',
    role: 'فرع طنطا',
    phone: '01064485652',
    telUrl: 'tel:+201064485652',
    whatsappUrl: 'https://wa.me/201064485652',
  },
  {
    id: 'eng_esraa',
    name: 'مهندسة إسراء',
    role: 'مديرة سيلز الشركة',
    phone: '01035920403',
    telUrl: 'tel:+201035920403',
    whatsappUrl: 'https://wa.me/201035920403',
  },
];

const buildGoogleMapsSearchUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const buildGoogleMapsDirectionsUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const COMPANY_LOCATIONS: CompanyLocation[] = [
  {
    id: 'tanta_showroom',
    name: 'فرع طنطا',
    address: 'شارع النحاس، تقاطع شارع علي مبارك، بجوار فندق بانوراما.',
    coordinates: { lat: 30.7881831, lng: 30.9891228 },
    mapsUrl: buildGoogleMapsSearchUrl(30.7881831, 30.9891228),
    directionsUrl: buildGoogleMapsDirectionsUrl(30.7881831, 30.9891228),
    type: 'showroom',
    contactId: 'eng_ragab',
  },
  {
    id: 'nasr_city_branch',
    name: 'فرع مدينة نصر',
    address: 'شارع مكرم عبيد، خلف مفكو حلوان.',
    coordinates: { lat: 30.0665249, lng: 31.3435029 },
    mapsUrl: buildGoogleMapsSearchUrl(30.0665249, 31.3435029),
    directionsUrl: buildGoogleMapsDirectionsUrl(30.0665249, 31.3435029),
    type: 'showroom',
    contactId: 'dr_moussa',
  },
  {
    id: 'mahalla_mansoura_showroom',
    name: 'معرض طريق المحلة – المنصورة',
    coordinates: { lat: 31.103579, lng: 31.218033 },
    mapsUrl: buildGoogleMapsSearchUrl(31.103579, 31.218033),
    directionsUrl: buildGoogleMapsDirectionsUrl(31.103579, 31.218033),
    type: 'showroom',
  },
  {
    id: 'factory',
    name: `مصنع ${BRAND_NAME}`,
    coordinates: { lat: 30.826635, lng: 31.009499 },
    mapsUrl: buildGoogleMapsSearchUrl(30.826635, 31.009499),
    directionsUrl: buildGoogleMapsDirectionsUrl(30.826635, 31.009499),
    type: 'factory',
  },
];


export const PROFILES: Record<string, Profile> = {
  newline: { id: 'newline', name: 'نيولاين (مصري اقتصادي)', price: 3400 },
  premier: { id: 'premier', name: 'بريمير (أوروبي – تقفيل مصري)', price: 3800 },
  craftline: { id: 'craftline', name: 'كرافت لاين (تركي – تقفيل مصري)', price: 4000 },
  wintech: { id: 'wintech', name: 'وينتك Wintech (تركي – تقفيل تركي)', price: 4500 },
  proline: { id: 'proline', name: 'برو لاين (تركي – تقفيل تركي)', price: 4500 },
  kompen: { id: 'kompen', name: 'كومبن (تركي – تقفيل تركي)', price: 5000 }
};

export const ADDONS: Record<string, Addon> = {
  pleated: { id: 'pleated', name: 'سلك بليسيه للحشرات', price: 850 },
  blackout: { id: 'blackout', name: 'بلاك أوت + سلك بليسيه', price: 1600 },
  doubleGlass: { id: 'doubleGlass', name: 'زجاج دبل جلاس (عادي)', price: 850 },
  colorGlass: { id: 'colorGlass', name: 'زجاج دبل ألوان خاصة', price: 1000 },
  specialColor: { id: 'specialColor', name: 'ألوان قطاعات خاصة (خشبي - أرو - رمادي - أسود)', price: 1800 },
  panda: { id: 'panda', name: 'نظام باندا (ضلفة على ضلفة)', price: 0 },
  pombe: { id: 'pombe', name: 'نظام البومبي', price: 4000, isFlat: true, unit: 'للقطعة' },
  dawr: { id: 'dawr', name: 'نظام الدوران', price: 700, isFlat: true, unit: 'للقطعة' },
  doubleHandle: { id: 'doubleHandle', name: 'نظام اتنين مقبض', price: 650, isFlat: true, unit: 'للفتحة' },
  skewWindow1: { id: 'skewWindow1', name: 'مفصلي قلاب شبابيك (ضلفة واحدة)', price: 700, isFlat: true, unit: 'للضلفة' },
  skewWindow2: { id: 'skewWindow2', name: 'مفصلي قلاب شبابيك (ضلفتين)', price: 1400, isFlat: true, unit: 'للضلفتين' },
  skewBalcony1: { id: 'skewBalcony1', name: 'مفصلي قلاب بلكونات (ضلفة واحدة)', price: 850, isFlat: true, unit: 'للضلفة' },
  skewBalcony2: { id: 'skewBalcony2', name: 'مفصلي قلاب بلكونات (ضلفتين)', price: 1400, isFlat: true, unit: 'للضلفتين' },
  singleColorGlass: { id: 'singleColorGlass', name: 'زجاج سنجل ألوان خاصة', price: 200 }
};

export const GLASS_TYPES = [
  'أبيض شفاف', 'مصنفر', 'بني عاكس', 'أبيض عاكس', 'بني سن دبوس',
  'أزرق عاكس', 'أخضر عاكس', 'أسود عاكس'
];

export const OPENING_TYPES = [
  'مفصلي', 'جرار', 'قلاب', 'ثابت'
];
