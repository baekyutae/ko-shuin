import type { Place } from '../regions/types';

/**
 * 혼잡도 예시 데이터.
 * 실서비스에서는 서울시 실시간 도시데이터 API(주요 장소, 5분 갱신, 12시간 예측)를
 * 서버리스 함수로 프록시해 가장 가까운 지역 값을 쓴다.
 */
export const CROWD_LEVELS = [
  { label: '여유', color: '#2f9e6a' },
  { label: '보통', color: '#4f7fb5' },
  { label: '약간 붐빔', color: '#d9881c' },
  { label: '붐빔', color: '#d0412f' },
] as const;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** 0~3 */
export function crowdLevel(place: Place, hour: number, dayKey: string): number {
  const peak = Math.exp(-((hour - 14) ** 2) / 18); // 14시 전후가 가장 붐빔
  const popularity = Math.min(1, place.baseVisitors / 4000);
  const noise = hash(`${place.id}-${dayKey}-${hour}`) * 0.5;
  const v = peak * 1.6 + popularity * 1.2 + noise - 0.4;
  return Math.max(0, Math.min(3, Math.round(v)));
}

export function forecast(place: Place, dayKey: string, from = 9, to = 21) {
  const hours: { hour: number; level: number }[] = [];
  for (let h = from; h <= to; h++) hours.push({ hour: h, level: crowdLevel(place, h, dayKey) });
  return hours;
}

export function quietestHour(place: Place, dayKey: string, afterHour: number): number | null {
  const fc = forecast(place, dayKey).filter((x) => x.hour >= afterHour);
  if (!fc.length) return null;
  return fc.reduce((a, b) => (b.level < a.level ? b : a)).hour;
}
