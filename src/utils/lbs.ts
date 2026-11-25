import { CampusZone } from '../types';

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
    nameEn: 'ZhuangJing Outer Dorms',
    zone: 'dorms',
    coordinates: { lat: 24.9888, lng: 121.5722 },
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
    nameEn: 'McDonald’s Side (Zhinan Rd)',
    zone: 'off_campus',
    coordinates: { lat: 24.9881, lng: 121.5772 },
  },
];

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
