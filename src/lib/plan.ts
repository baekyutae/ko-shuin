import { region } from '../regions';
import type { Place, StampDef } from '../regions/types';
import { openStampsAt, type Collected } from '../store';
import { crowdLevel, quietestHour } from './crowd';
import { distanceM, walkMinutes, type LngLat } from './geo';
import { ymd } from './time';

/** 혼잡도 한 단계를 도보 몇 m만큼의 부담으로 볼지 */
const CROWD_COST_M = 700;
const SEARCH_RADIUS_M = 2500;

export interface Candidate {
  place: Place;
  dist: number;
  level: number;
  limited: StampDef[];
  isNew: boolean;
  score: number;
}

export interface PlannedStop extends Candidate {
  /** 이동 시간(분, 추정) */
  walk: number;
  /** 도보로 25분이 넘으면 지하철·버스를 권한다 */
  mode: 'walk' | 'transit';
}

const WALK_LIMIT_MIN = 25;

export interface NowPlan {
  candidates: Candidate[];
  route: PlannedStop[];
  totalWalk: number;
  /** 가까운데 붐벼서 뒤로 미룬 곳 */
  avoided: { place: Place; level: number; quietHour: number | null } | null;
}

/**
 * ③ 「지금 받을 수 있는 인장」
 * 지금 위치 주변 인장 장소 중 덜 붐비는 곳을 우선해 2~3곳을 도보 루트로 잇는다.
 * 점수 = 거리 + 혼잡도 부담 - (열린 시즌·이벤트 인장 가산) - (아직 없는 인장 가산)
 */
export function planNow(pos: LngLat, at: Date, collected: Collected[], custom: StampDef[], flags: string[]): NowPlan {
  const today = ymd(at);
  const hour = at.getHours();
  const gotToday = new Set(collected.filter((c) => ymd(new Date(c.at)) === today).map((c) => c.placeId));
  const everGot = new Set(collected.map((c) => c.placeId));

  const all: Candidate[] = region.places
    .filter((p) => !gotToday.has(p.id))
    .map((p) => {
      const dist = distanceM(pos, [p.lng, p.lat]);
      const level = crowdLevel(p, hour, today);
      const limited = openStampsAt(p.id, at, collected, custom, flags).filter((d) => d.limited);
      const isNew = !everGot.has(p.id);
      const score = dist + level * CROWD_COST_M - (limited.length ? 600 : 0) - (isNew ? 300 : 0);
      return { place: p, dist, level, limited, isNew, score };
    });

  let pool = all.filter((c) => c.dist <= SEARCH_RADIUS_M);
  if (pool.length < 3) pool = [...all].sort((a, b) => a.dist - b.dist).slice(0, 5);
  const candidates = [...pool].sort((a, b) => a.score - b.score);

  // 상위 3곳을 고른 뒤, 현재 위치에서 "거리 + 혼잡 부담"이 가장 작은 곳부터 차례로 잇는다.
  const picked = candidates.slice(0, 3);
  const route: PlannedStop[] = [];
  let cur = pos;
  const left = [...picked];
  while (left.length) {
    left.sort(
      (a, b) =>
        distanceM(cur, [a.place.lng, a.place.lat]) + a.level * CROWD_COST_M - (distanceM(cur, [b.place.lng, b.place.lat]) + b.level * CROWD_COST_M),
    );
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
  const crowded = nearest.find((c) => c.level >= 2 && !picked.includes(c));
  const avoided = crowded ? { place: crowded.place, level: crowded.level, quietHour: quietestHour(crowded.place, today, hour + 1) } : null;

  return { candidates, route, totalWalk: route.reduce((n, s) => n + s.walk, 0), avoided };
}
