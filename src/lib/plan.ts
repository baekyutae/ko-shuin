import { region } from '../regions';
import type { Place, StampDef } from '../regions/types';
import { openStampsAt, type Collected } from '../store';
import { crowdView, quietestHour, type CrowdView } from './crowd';
import { distanceM, walkMinutes, type LngLat } from './geo';
import { ymd } from './time';

/** ③ 추천 기준 필터 (문서 v2.3) */
export type RouteFilter = 'balanced' | 'nearest' | 'quiet';

export const ROUTE_FILTERS: { id: RouteFilter; label: string; ja: string; desc: string }[] = [
  { id: 'balanced', label: '균형', ja: 'おすすめ', desc: '도보 시간과 혼잡도를 함께 계산해요' },
  { id: 'nearest', label: '최단 거리', ja: '近い順', desc: '도보 시간이 짧은 순이에요' },
  { id: 'quiet', label: '한산함 우선', ja: '空いてる順', desc: `혼잡도가 낮은 순이에요 (도보 ${30}분 이내)` },
];

/** 균형 점수: 혼잡도 한 단계를 도보 몇 분만큼의 부담으로 볼지. '붐빔'(3단계)이면 약 12분 */
const CROWD_WEIGHT_MIN = 4;
/** 한산함 우선에서 너무 먼 곳이 뜨지 않도록 하는 도보 시간 상한 */
const QUIET_MAX_WALK_MIN = 30;
/** 후보로 볼 최대 도보 시간 */
const SEARCH_MAX_WALK_MIN = 40;
/** 도보로 이보다 오래 걸리는 구간은 지하철·버스를 권한다(한산함 우선 상한과 같게) */
const WALK_LIMIT_MIN = 30;
const ROUTE_SIZE = 3;

export interface Candidate {
  place: Place;
  dist: number;
  /** 현재 위치에서 도보 시간(분, 추정) */
  walkFromHere: number;
  crowd: CrowdView;
  limited: StampDef[];
  isNew: boolean;
}

export interface PlannedStop extends Candidate {
  /** 이전 지점에서의 이동 시간(분, 추정) */
  walk: number;
  mode: 'walk' | 'transit';
}

export interface NowPlan {
  filter: RouteFilter;
  candidates: Candidate[];
  route: PlannedStop[];
  totalWalk: number;
  /** 가까운데 붐벼서 루트에서 뺀 곳 */
  avoided: { place: Place; crowd: CrowdView; quietHour: number | null } | null;
}

/** 필터별 "다음 장소 비용"(작을수록 먼저). 혼잡도 정보가 없으면 '보통'으로 계산한다. */
function cost(filter: RouteFilter, walk: number, c: Candidate): number {
  const limitedBonus = c.limited.length ? 3 : 0;
  if (filter === 'nearest') return walk;
  if (filter === 'quiet') return c.crowd.level * 100 + walk; // 혼잡도 단계가 먼저, 같으면 가까운 곳
  return walk + c.crowd.level * CROWD_WEIGHT_MIN - limitedBonus;
}

/**
 * ③ 「지금 받을 수 있는 인장」 + 인장 투어 루트
 * 지금 위치 주변에서 오늘 아직 받지 않은 인장 장소를 추천 기준에 따라 2~3곳 골라 차례로 잇는다.
 */
export function planNow(
  pos: LngLat,
  at: Date,
  collected: Collected[],
  custom: StampDef[],
  flags: string[],
  filter: RouteFilter = 'balanced',
): NowPlan {
  const today = ymd(at);
  const hour = at.getHours();
  const gotToday = new Set(collected.filter((c) => ymd(new Date(c.at)) === today).map((c) => c.placeId));
  const everGot = new Set(collected.map((c) => c.placeId));

  const all: Candidate[] = region.places
    .filter((p) => !gotToday.has(p.id))
    .map((p) => ({
      place: p,
      dist: distanceM(pos, [p.lng, p.lat]),
      walkFromHere: walkMinutes(pos, [p.lng, p.lat]),
      crowd: crowdView(p, hour, today),
      limited: openStampsAt(p.id, at, collected, custom, flags).filter((d) => d.limited),
      isNew: !everGot.has(p.id),
    }));

  let pool = all.filter((c) => c.walkFromHere <= SEARCH_MAX_WALK_MIN);
  if (pool.length < ROUTE_SIZE) pool = [...all].sort((a, b) => a.dist - b.dist).slice(0, 5);
  if (filter === 'quiet') {
    const near = pool.filter((c) => c.walkFromHere <= QUIET_MAX_WALK_MIN);
    if (near.length >= 2) pool = near;
  }

  const candidates = [...pool].sort((a, b) => cost(filter, a.walkFromHere, a) - cost(filter, b.walkFromHere, b));

  // 후보 상위 3곳을 고른 뒤, 현재 위치에서 같은 기준의 비용이 가장 작은 곳부터 차례로 잇는다.
  const picked = candidates.slice(0, ROUTE_SIZE);
  const route: PlannedStop[] = [];
  let cur = pos;
  const left = [...picked];
  while (left.length) {
    left.sort((a, b) => cost(filter, walkMinutes(cur, [a.place.lng, a.place.lat]), a) - cost(filter, walkMinutes(cur, [b.place.lng, b.place.lat]), b));
    const next = left.shift()!;
    const to: LngLat = [next.place.lng, next.place.lat];
    const walk = walkMinutes(cur, to);
    const transit = walk > WALK_LIMIT_MIN;
    // 대중교통은 직선거리 기준 평균 시속 약 20km + 대기·환승 8분으로 어림한다.
    const minutes = transit ? Math.round((distanceM(cur, to) * 1.3) / 333) + 8 : walk;
    route.push({ ...next, walk: minutes, mode: transit ? 'transit' : 'walk' });
    cur = to;
  }

  const nearest = [...pool].sort((a, b) => a.dist - b.dist).slice(0, 4);
  const crowded = nearest.find((c) => c.crowd.known && c.crowd.level >= 2 && !picked.includes(c));
  const avoided = crowded
    ? { place: crowded.place, crowd: crowded.crowd, quietHour: quietestHour(crowded.place, today, hour + 1) }
    : null;

  return { filter, candidates, route, totalWalk: route.reduce((n, s) => n + s.walk, 0), avoided };
}
