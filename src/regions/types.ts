import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { ReactNode } from 'react';

export type Theme = '궁궐' | '시장' | '한강' | '거리' | '전망' | '문화' | '공원';

export interface Place {
  id: string;
  nameKo: string;
  nameJa: string;
  /** 행정구역(구) 이름. 지역 팩의 districts GeoJSON 이름과 같아야 한다. */
  district: string;
  lat: number;
  lng: number;
  /** GPS 인증 반경(m) */
  radiusM: number;
  themes: Theme[];
  /** 기관·사업주가 등록한 공식 인장 장소 */
  official?: boolean;
  /** 장소 제안·투표로 생긴 인장 */
  fromVote?: boolean;
  /** 데모용 누적 방문자 수(인장 번호 계산에 사용) */
  baseVisitors: number;
  /** false면 혼잡도 데이터가 없는 장소(서울시 도시데이터 범위 밖) → '정보 없음' */
  crowdData?: boolean;
  /** 데모용 혼잡도 보정값(예시 데이터의 장소별 성격) */
  crowdBias?: number;
  note?: string;
}

export interface StampCondition {
  /**
   * 열리는 기간(시작·끝 포함). 'MM-DD'는 매년 반복, 'YYYY-MM-DD'는 그해만.
   * 한정은 "실제로 그때만 의미가 있는 장소·시기"에만 쓴다(벚꽃·단풍·크리스마스·축제·행사).
   */
  period?: { from: string; to: string };
  /** [시작 시, 끝 시) 24시간제. 행사 시간 등 관리자가 정할 때만 */
  hours?: [number, number];
  /** 운영자가 수동으로 여는 조건(예: 첫눈) */
  manual?: string;
  /** 선착순 수량 */
  limit?: number;
}

/** 그날의 기록: 인장 디자인에만 반영하고 한정 조건으로 쓰지 않는다. */
export type Weather = 'sunny' | 'rain' | 'snow';
export type Daypart = 'day' | 'night';

export interface StampDef {
  id: string;
  placeId: string;
  /** 인장 상단 문구 (예: 참배, 야경) */
  label: string;
  color: string;
  official: boolean;
  limited: boolean;
  title: string;
  condition?: StampCondition;
  /** 아직 못 받은 한정 인장의 안내 문구 */
  hint?: string;
  /** 데모용 기존 발급 수 */
  baseIssued?: number;
}

export interface DemoStop {
  placeId: string;
  /** HH:MM */
  time: string;
}

export interface RouteLeg {
  from: string;
  to: string;
  distanceM: number;
  coords: [number, number][];
}

export type DistrictCollection = FeatureCollection<Polygon | MultiPolygon, { name: string }>;

export interface RegionPack {
  id: string;
  nameKo: string;
  nameJa: string;
  center: [number, number];
  places: Place[];
  limitedStamps: StampDef[];
  districts: DistrictCollection;
  /** 예시 하루 (오늘의 발자취 재생용) */
  demoDay: { date: string; stops: DemoStop[] };
  demoRoutes: RouteLeg[];
  /** 장소 픽토그램(76×44 선화). 없는 장소는 글자 중심 인장으로 만든다 */
  pictograms: Record<string, ReactNode>;
  /** 데모용: 이 장소 다음에 들른 장소 비율(%) */
  transitions: Record<string, [string, number][]>;
}
