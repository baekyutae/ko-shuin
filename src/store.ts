import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { baseStampOf, getPlace, region } from './regions';
import type { Daypart, StampDef, Weather } from './regions/types';
import { isLimitedFull, isOpen } from './lib/rules';
import { isNight, ymd } from './lib/time';

export interface Collected {
  uid: string;
  stampId: string;
  placeId: string;
  /** ISO 시각 */
  at: string;
  serial: number;
  via: 'gps' | 'qr' | 'seed';
  /** 그날의 기록: 받을 때의 날씨와 낮/밤 (인장 디자인에 반영) */
  weather: Weather;
  daypart: Daypart;
}

export interface Proposal {
  id: string;
  name: string;
  district: string;
  reason: string;
  votes: number;
  status: 'voting' | 'review' | 'added';
  mine?: boolean;
}

export interface DebugState {
  /** 실제 시각과의 차이(ms). 시연용 시간 이동 */
  timeOffsetMs: number;
  /** 시연용 위치: 장소 id. null이면 실제 GPS */
  locationPlaceId: string | null;
  manualFlags: string[];
  /** 시연용 날씨. 실서비스는 서울시 실시간 도시데이터의 날씨를 쓴다 */
  weather: Weather;
}

export interface TrackPoint {
  t: number;
  lng: number;
  lat: number;
}

/** ⑧ 연속 GPS 타임라인(선택 기능, 기본값 꺼짐) */
export interface TimelineState {
  enabled: boolean;
  consentAt: string | null;
  points: TrackPoint[];
}

interface State {
  collected: Collected[];
  customStamps: StampDef[];
  proposals: Proposal[];
  voted: string[];
  debug: DebugState;
  timeline: TimelineState;
  award: (placeId: string, via: 'gps' | 'qr') => { uids: string[]; duplicate: boolean };
  vote: (id: string) => Proposal | undefined;
  addProposal: (p: Pick<Proposal, 'name' | 'district' | 'reason'>) => void;
  addCustomStamp: (s: StampDef) => void;
  removeCustomStamp: (id: string) => void;
  setDebug: (d: Partial<DebugState>) => void;
  setTimeline: (enabled: boolean) => void;
  addTrackPoint: (p: TrackPoint) => void;
  clearTrack: () => void;
  seedDemo: () => void;
  resetAll: () => void;
}

export const VOTE_GOAL = 100;

const seedProposals: Proposal[] = [
  { id: 'euljiro', name: '을지로 노가리 골목', district: '중구', reason: '저녁 분위기를 보러 꼭 가는 곳', votes: 99, status: 'voting' },
  { id: 'ikseon', name: '익선동 한옥거리', district: '종로구', reason: '한옥 카페가 모여 있어요', votes: 64, status: 'voting' },
  { id: 'bukhansan', name: '북한산 백운대', district: '강북구', reason: '등산 인증을 남기고 싶어요', votes: 37, status: 'voting' },
  { id: 'mangwon-market', name: '망원시장', district: '마포구', reason: '로컬 시장 먹거리', votes: 21, status: 'voting' },
  { id: 'seongsu', name: '성수동 카페거리', district: '성동구', reason: '팝업 성지', votes: 100, status: 'added' },
];

const initialDebug: DebugState = { timeOffsetMs: 0, locationPlaceId: null, manualFlags: [], weather: 'sunny' };
const initialTimeline: TimelineState = { enabled: false, consentAt: null, points: [] };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function now(): Date {
  return new Date(Date.now() + useStore.getState().debug.timeOffsetMs);
}

export function allStampDefs(custom: StampDef[] = useStore.getState().customStamps): StampDef[] {
  return [...region.places.map(baseStampOf), ...region.limitedStamps, ...custom];
}

export function stampDefById(id: string): StampDef | undefined {
  return allStampDefs().find((s) => s.id === id);
}

/** 이 장소에서 지금 받을 수 있는 인장들(기본 인장 + 열린 시즌·이벤트 인장) */
export function openStampsAt(placeId: string, at: Date, collected: Collected[], custom: StampDef[], flags: string[]) {
  const place = getPlace(placeId);
  const defs = [baseStampOf(place), ...region.limitedStamps, ...custom].filter((s) => s.placeId === placeId);
  return defs.filter((d) => {
    if (!d.limited) return true;
    const issued = collected.filter((c) => c.stampId === d.id).length;
    return isOpen(d.condition, at, flags) && !isLimitedFull(d, issued);
  });
}

function build(
  stampId: string,
  placeId: string,
  at: Date,
  list: Collected[],
  via: Collected['via'],
  defs: StampDef[],
  weather: Weather,
): Collected {
  const def = defs.find((s) => s.id === stampId);
  const issued = list.filter((c) => c.stampId === stampId).length;
  return {
    uid: uid(),
    stampId,
    placeId,
    at: at.toISOString(),
    serial: (def?.baseIssued ?? 0) + issued + 1,
    via,
    weather,
    daypart: isNight(at) ? 'night' : 'day',
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      collected: [],
      customStamps: [],
      proposals: seedProposals,
      voted: [],
      debug: initialDebug,
      timeline: initialTimeline,

      award: (placeId, via) => {
        const at = now();
        const { collected, customStamps, debug } = get();
        const today = ymd(at);
        const open = openStampsAt(placeId, at, collected, customStamps, debug.manualFlags);
        const defs = allStampDefs(customStamps);
        const added: Collected[] = [];
        const existing: string[] = [];
        for (const def of open) {
          const same = collected.find((c) => c.stampId === def.id && ymd(new Date(c.at)) === today);
          if (same) existing.push(same.uid);
          else added.push(build(def.id, placeId, at, [...collected, ...added], via, defs, debug.weather));
        }
        if (added.length) set({ collected: [...collected, ...added] });
        return { uids: [...added.map((a) => a.uid), ...existing], duplicate: added.length === 0 };
      },

      vote: (id) => {
        const { proposals, voted } = get();
        if (voted.includes(id)) return undefined;
        let updated: Proposal | undefined;
        const next = proposals.map((p) => {
          if (p.id !== id || p.status !== 'voting') return p;
          const votes = p.votes + 1;
          updated = { ...p, votes, status: votes >= VOTE_GOAL ? 'review' : 'voting' };
          return updated;
        });
        set({ proposals: next, voted: [...voted, id] });
        return updated;
      },

      addProposal: ({ name, district, reason }) => {
        const p: Proposal = { id: uid(), name, district, reason, votes: 1, status: 'voting', mine: true };
        set({ proposals: [p, ...get().proposals], voted: [...get().voted, p.id] });
      },

      addCustomStamp: (s) => set({ customStamps: [...get().customStamps, s] }),
      removeCustomStamp: (id) =>
        set({
          customStamps: get().customStamps.filter((s) => s.id !== id),
          collected: get().collected.filter((c) => c.stampId !== id),
        }),

      setDebug: (d) => set({ debug: { ...get().debug, ...d } }),

      setTimeline: (enabled) =>
        set({
          timeline: {
            ...get().timeline,
            enabled,
            consentAt: enabled ? (get().timeline.consentAt ?? new Date().toISOString()) : get().timeline.consentAt,
          },
        }),
      addTrackPoint: (p) => {
        const points = [...get().timeline.points, p];
        set({ timeline: { ...get().timeline, points: points.slice(-5000) } });
      },
      clearTrack: () => set({ timeline: { ...get().timeline, points: [] } }),

      seedDemo: () => {
        const defs = allStampDefs(get().customStamps);
        const list: Collected[] = [];
        const visits: [string, string, Weather][] = [
          ['2026-11-26T13:00', 'coex', 'sunny'],
          ['2026-11-26T14:30', 'bongeunsa', 'sunny'],
          ['2026-11-27T14:00', 'hongdae', 'rain'],
          ['2026-11-27T16:10', 'mangwon', 'rain'],
          ['2026-11-27T18:20', 'yeouido', 'rain'],
          ...region.demoDay.stops.map(
            (s) => [`${region.demoDay.date}T${s.time}`, s.placeId, 'sunny'] as [string, string, Weather],
          ),
        ];
        for (const [t, placeId, weather] of visits) {
          const at = new Date(t);
          for (const d of openStampsAt(placeId, at, list, get().customStamps, [])) {
            list.push(build(d.id, placeId, at, list, 'seed', defs, weather));
          }
        }
        set({ collected: list });
      },

      resetAll: () =>
        set({
          collected: [],
          customStamps: [],
          proposals: seedProposals,
          voted: [],
          debug: initialDebug,
          timeline: initialTimeline,
        }),
    }),
    // v2: 인장 기록에 날씨·낮밤이 추가되어 저장 키를 바꿨다.
    { name: 'ko-shuin-v2' },
  ),
);
