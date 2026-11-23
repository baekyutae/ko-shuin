import { getPlace, region } from '../regions';
import type { Place, StampDef, Weather } from '../regions/types';
import { openStampsAt, type Collected } from '../store';
import { crowdView, type CrowdView } from './crowd';
import { distanceM, walkMinutes, type LngLat } from './geo';
import { ymd } from './time';

/**
 * ⑩ 인장 투어 플래너 에이전트 — 데모 시연용 규칙 엔진.
 * 실제 LLM 없이 문장에서 지역·시간·관심사를 키워드로 뽑고,
 * 앱의 인장 장소·혼잡도·날씨·함께 들른 장소(⑦) 데이터 안에서만 루트를 짠다(없는 장소를 만들지 않음).
 */

const AREAS: { names: string[]; label: string; center: LngLat }[] = [
  { names: ['성수', '서울숲', '뚝섬'], label: '성수', center: [127.047, 37.5445] },
  { names: ['신촌', '이대', '연세', '연희'], label: '신촌', center: [126.937, 37.5585] },
  { names: ['홍대', '연남', '합정', '망원'], label: '홍대', center: [126.924, 37.557] },
  { names: ['종로', '경복궁', '북촌', '인사동', '광화문', '창덕궁'], label: '종로', center: [126.982, 37.577] },
  { names: ['명동', '남산', '을지로', '남대문'], label: '명동', center: [126.984, 37.561] },
  { names: ['동대문', 'DDP', '광장시장'], label: '동대문', center: [127.005, 37.568] },
  { names: ['강남', '코엑스', '삼성', '봉은사', '압구정'], label: '강남', center: [127.055, 37.514] },
  { names: ['여의도', '더현대'], label: '여의도', center: [126.93, 37.527] },
  { names: ['잠실', '석촌', '롯데'], label: '잠실', center: [127.103, 37.511] },
];

const INTERESTS: { words: string[]; label: string; match: (p: Place) => boolean }[] = [
  { words: ['카페', '커피'], label: '카페', match: (p) => /카페|연남|연희|성수|대림/.test(p.nameKo) },
  { words: ['시장', '먹', '맛집', '길거리'], label: '시장·먹거리', match: (p) => p.themes.includes('시장') },
  { words: ['궁', '역사', '전통', '한옥'], label: '궁궐·전통', match: (p) => p.themes.includes('궁궐') || /한옥|인사동|봉원사|봉은사/.test(p.nameKo) },
  { words: ['한강', '강변', '산책', '공원', '숲'], label: '산책', match: (p) => p.themes.includes('한강') || p.themes.includes('공원') },
  { words: ['야경', '전망', '타워', '뷰'], label: '전망', match: (p) => p.themes.includes('전망') },
  { words: ['전시', '박물관', '미술', '갤러리', '책', '도서관'], label: '전시·문화', match: (p) => p.themes.includes('문화') },
  { words: ['쇼핑', '거리'], label: '쇼핑·거리', match: (p) => p.themes.includes('거리') },
];

export interface PlanRequest {
  text: string;
  area: { label: string; center: LngLat } | null;
  budgetMin: number;
  interests: string[];
  quiet: boolean;
  indoor: boolean;
}

export function parseRequest(text: string): PlanRequest {
  const area = AREAS.find((a) => a.names.some((n) => text.includes(n))) ?? null;
  let budgetMin = 180;
  const h = text.match(/(\d+(?:\.\d+)?)\s*시간/);
  const m = text.match(/(\d+)\s*분/);
  if (h) budgetMin = Math.round(parseFloat(h[1]) * 60) + (m ? parseInt(m[1], 10) : 0);
  else if (m) budgetMin = parseInt(m[1], 10);
  else if (text.includes('반나절')) budgetMin = 240;
  else if (text.includes('하루')) budgetMin = 420;
  const interests = INTERESTS.filter((i) => i.words.some((w) => text.includes(w))).map((i) => i.label);
  const quiet = /한산|조용|덜 붐|여유|사람 적/.test(text);
  const indoor = /실내|비 오|비오|우천|추워|더워/.test(text);
  return { text, area: area ? { label: area.label, center: area.center } : null, budgetMin: Math.max(60, Math.min(600, budgetMin)), interests, quiet, indoor };
}

export interface TourStop {
  place: Place;
  walk: number;
  mode: 'walk' | 'transit';
  arrive: number; // 분(0시 기준)
  leave: number;
  crowd: CrowdView;
  limited: StampDef[];
  reasons: string[];
}

export interface TourPlan {
  stops: TourStop[];
  usedMin: number;
  searched: number;
  start: LngLat;
}

export interface PlanContext {
  at: Date;
  weather: Weather;
  collected: Collected[];
  custom: StampDef[];
  flags: string[];
  /** 붐비기 시작했다고 알려진 장소(시연용) */
  crowdOverride?: Record<string, number>;
  exclude?: string[];
}

const STAY_MIN = 30;

export function planTour(req: PlanRequest, from: LngLat, ctx: PlanContext): TourPlan {
  const start = req.area?.center ?? from;
  const today = ymd(ctx.at);
  const hour = ctx.at.getHours();
  const rainy = ctx.weather !== 'sunny' || req.indoor;
  const got = new Set(ctx.collected.filter((c) => ymd(new Date(c.at)) === today).map((c) => c.placeId));
  const interestFns = INTERESTS.filter((i) => req.interests.includes(i.label));

  let pool = region.places.filter((p) => !got.has(p.id) && !(ctx.exclude ?? []).includes(p.id) && distanceM(start, [p.lng, p.lat]) <= 2300);
  if (pool.length < 3) {
    pool = region.places
      .filter((p) => !got.has(p.id) && !(ctx.exclude ?? []).includes(p.id))
      .sort((a, b) => distanceM(start, [a.lng, a.lat]) - distanceM(start, [b.lng, b.lat]))
      .slice(0, 6);
  }

  const stops: TourStop[] = [];
  // 지역을 말했으면 그 지역에 도착한 시점부터 루트를 짠다(가는 길은 계산하지 않음).
  let cur = start;
  let prevId: string | null = null;
  let clock = hour * 60 + ctx.at.getMinutes();
  let used = 0;
  const left = [...pool];

  while (left.length) {
    const scored = left.map((p) => {
      const walk = walkMinutes(cur, [p.lng, p.lat]);
      const view = crowdView(p, hour, today);
      const level = ctx.crowdOverride?.[p.id] ?? view.level;
      const interest = interestFns.some((f) => f.match(p));
      const limited = openStampsAt(p.id, ctx.at, ctx.collected, ctx.custom, ctx.flags).filter((d) => d.limited);
      const together = prevId ? region.transitions[prevId]?.find(([id]) => id === p.id)?.[1] : undefined;
      const cost =
        Math.min(walk, 45) +
        level * (req.quiet ? 9 : 4) -
        (interest ? 12 : 0) -
        (limited.length ? 5 : 0) -
        (together ? together / 5 : 0) +
        (rainy ? (p.indoor ? -14 : 10) : 0);
      return { p, walk, view, level, interest, limited, together, cost };
    });
    scored.sort((a, b) => a.cost - b.cost);
    const best = scored.find((s) => {
      const travel = s.walk > 30 ? Math.round((distanceM(cur, [s.p.lng, s.p.lat]) * 1.3) / 333) + 8 : s.walk;
      return used + travel + STAY_MIN <= req.budgetMin;
    });
    if (!best || stops.length >= 4) break;
    const transit = best.walk > 30;
    const travel = transit ? Math.round((distanceM(cur, [best.p.lng, best.p.lat]) * 1.3) / 333) + 8 : best.walk;
    const crowd = ctx.crowdOverride?.[best.p.id] != null ? { ...best.view, level: best.level, label: '붐빔', color: '#d0412f', known: true } : best.view;
    const reasons: string[] = [];
    if (best.interest) reasons.push(`관심사(${req.interests.join('·')})와 맞음`);
    if (crowd.known) reasons.push(`지금 ${crowd.label}`);
    else reasons.push('혼잡도 정보 없음(보통으로 계산)');
    if (rainy) reasons.push(best.p.indoor ? '실내' : '실외 · 우산 챙기기');
    if (best.limited.length) reasons.push(`한정 인장 열림 · ${best.limited.map((d) => d.label.replace(/\s/g, '')).join(', ')}`);
    if (best.together && prevId) reasons.push(`${getPlace(prevId).nameKo} 다음에 ${best.together}%가 방문`);
    used += travel + STAY_MIN;
    clock += travel;
    stops.push({
      place: best.p,
      walk: travel,
      mode: transit ? 'transit' : 'walk',
      arrive: clock,
      leave: clock + STAY_MIN,
      crowd,
      limited: best.limited,
      reasons,
    });
    clock += STAY_MIN;
    cur = [best.p.lng, best.p.lat];
    prevId = best.p.id;
    left.splice(left.indexOf(best.p), 1);
  }

  return { stops, usedMin: used, searched: pool.length, start };
}
