import { CampusZone, Language } from '../types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CampusLandmark {
  id: string;
  name: string;
  nameEn: string;
  zone: CampusZone;
  coordinates: Coordinates;
  isFemaleDorm?: boolean;
}

export const NCCU_LANDMARKS: CampusLandmark[] = [
  {
    id: 'main_library',
    name: '總圖書館',
    nameEn: 'Main Library',
    zone: 'downhill',
    coordinates: { lat: 24.9866, lng: 121.5766 },
  },
  {
    id: 'commerce',
    name: '商學院',
    nameEn: 'College of Commerce',
    zone: 'downhill',
    coordinates: { lat: 24.9866, lng: 121.5754 },
  },
  {
    id: 'dah_hsian',
    name: '達賢圖書館',
    nameEn: 'Dah Hsian Library',
    zone: 'downhill',
    coordinates: { lat: 24.9849, lng: 121.5727 },
  },
  {
    id: 'zhuangjing',
    name: '莊敬外舍',
    nameEn: 'Zhuangjing Dorm',
    zone: 'dorms',
    coordinates: { lat: 24.9888, lng: 121.5722 },
    isFemaleDorm: true,
  },
  {
    id: 'zhuangjing_1_3',
    name: '莊敬一～三舍(女宿)',
    nameEn: 'Zhuangjing Dorms 1-3 (Female)',
    zone: 'dorms',
    coordinates: { lat: 24.9872, lng: 121.5761 },
    isFemaleDorm: true,
  },
  {
    id: 'ziqiang_10_female',
    name: '自強十舍(女宿區)',
    nameEn: 'Ziqiang Dorm 10 (Female Wing)',
    zone: 'dorms',
    coordinates: { lat: 24.9815, lng: 121.5812 },
    isFemaleDorm: true,
  },
  {
    id: 'main_gate',
    name: '山下校門口',
    nameEn: 'Main Gate',
    zone: 'downhill',
    coordinates: { lat: 24.9877, lng: 121.5759 },
  },
  {
    id: 'mcd_side',
    name: '麥側',
    nameEn: "McDonald's Side",
    zone: 'off_campus',
    coordinates: { lat: 24.9881, lng: 121.5772 },
  },
];

export const NCCU_LOCATION_BILINGUAL_MAP: Record<string, string> = {
  總圖書館: 'Main Library',
  中正圖書館: 'Main Library',
  商學院: 'College of Commerce',
  商館: 'College of Commerce',
  '商館（商學院大樓）': 'College of Commerce',
  達賢圖書館: 'Dah Hsian Library',
  莊敬外舍: 'Zhuangjing Dorm',
  莊敬舍: 'Zhuangjing Dorm',
  '莊敬舍（山下宿舍區）': 'Zhuangjing Dorm',
  莊敬一舍: 'Zhuangjing Dorm 1 (Female)',
  莊敬二舍: 'Zhuangjing Dorm 2 (Female)',
  莊敬三舍: 'Zhuangjing Dorm 3 (Female)',
  '莊敬一～三舍(女宿)': 'Zhuangjing Dorms 1-3 (Female)',
  '自強十舍(女宿區)': 'Ziqiang Dorm 10 (Female Wing)',
  自強十舍女宿區: 'Ziqiang Dorm 10 (Female Wing)',
  自強舍: 'Ziqiang Dorms',
  '舍區（自強舍群 自五/六/七/十舍）': 'Ziqiang Dorms',
  山下校門口: 'Main Gate',
  政大校門口: 'NCCU Main Gate',
  麥側: "McDonald's Side",
  綜院: 'General Building',
  '綜院（綜合院館）': 'General Building',
  山上綜合大樓: 'Uphill College Complex',
  '綜合大樓（山上社科院）': 'Uphill College Complex',
  行政大樓: 'Admin Building',
  行政大樓前: 'Admin Building Plaza',
  '行政大樓（八角亭廣場）': 'Admin Building Plaza',
  季陶樓: 'JiTao Hall',
  '季陶樓（外文語言中心）': 'JiTao Hall',
  果夫樓: 'Guofu Hall',
  '果夫樓（應用數學/理學院）': 'Guofu Hall',
  百年樓: 'Bainian Hall',
  '百年樓（文學院）': 'Bainian Hall',
  藝文中心: 'Art & Culture Center',
  水岸運動公園: 'Riverside Sports Park',
  政大校園: 'NCCU Campus',
  山下校區: 'Downhill Campus',
  山上校區: 'Uphill Campus',
  指南路: 'Zhinan Rd.',
};

export function localizeLocationName(
  locationZh: string,
  lang: Language,
  fallbackEn?: string
): string {
  if (lang === 'zh') return locationZh;
  const trimmed = locationZh.trim();
  if (NCCU_LOCATION_BILINGUAL_MAP[trimmed]) {
    return NCCU_LOCATION_BILINGUAL_MAP[trimmed];
  }
  const base = trimmed.split('（')[0].trim();
  if (NCCU_LOCATION_BILINGUAL_MAP[base]) {
    return NCCU_LOCATION_BILINGUAL_MAP[base];
  }
  for (const [zhKey, enVal] of Object.entries(NCCU_LOCATION_BILINGUAL_MAP)) {
    if (trimmed.includes(zhKey)) {
      return enVal;
    }
  }
  if (fallbackEn && fallbackEn.trim() && fallbackEn.trim() !== trimmed) {
    return fallbackEn.trim();
  }
  return trimmed;
}

export function isFemaleDormLocationName(locationName: string): boolean {
  const normalized = locationName.trim();
  return (
    normalized.includes('女宿') ||
    normalized.includes('莊敬一') ||
    normalized.includes('莊敬二') ||
    normalized.includes('莊敬三') ||
    normalized.includes('莊敬外舍') ||
    normalized.includes('莊敬舍') ||
    normalized.includes('自強十舍')
  );
}

export const MANUAL_CAMPUS_AREAS: {
  id: 'downhill' | 'uphill' | 'zhinan';
  zone: CampusZone;
  labelZh: string;
  labelEn: string;
  coordinates: Coordinates;
}[] = [
  {
    id: 'downhill',
    zone: 'downhill',
    labelZh: '山下校區',
    labelEn: 'Downhill Campus',
    coordinates: { lat: 24.9866, lng: 121.5758 },
  },
  {
    id: 'uphill',
    zone: 'uphill',
    labelZh: '山上校區',
    labelEn: 'Uphill Campus',
    coordinates: { lat: 24.9825, lng: 121.5795 },
  },
  {
    id: 'zhinan',
    zone: 'off_campus',
    labelZh: '指南路',
    labelEn: 'Zhinan Rd.',
    coordinates: { lat: 24.9881, lng: 121.5772 },
  },
];

export function calculateHaversineDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (coord1.lat * Math.PI) / 180;
  const phi2 = (coord2.lat * Math.PI) / 180;
  const deltaPhi = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLambda = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function findNearestLandmark(coord: Coordinates): {
  landmark: CampusLandmark;
  distanceMeters: number;
} {
  let nearest = NCCU_LANDMARKS[0];
  let minDistance = calculateHaversineDistanceMeters(coord, nearest.coordinates);

  for (let i = 1; i < NCCU_LANDMARKS.length; i++) {
    const candidate = NCCU_LANDMARKS[i];
    const dist = calculateHaversineDistanceMeters(coord, candidate.coordinates);
    if (dist < minDistance) {
      nearest = candidate;
      minDistance = dist;
    }
  }

  return { landmark: nearest, distanceMeters: minDistance };
}
