import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

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
  note?: string;
}

export interface StampCondition {
  /** [시작 시, 끝 시) 24시간제 */
  hours?: [number, number];
  /** YYYY-MM-DD 목록 */
  dates?: string[];
  /** 1~12 */
  months?: number[];
  /** 0(일)~6(토) */
  weekdays?: number[];
  /** 운영자가 수동으로 여는 조건(예: 첫눈) */
  manual?: string;
  /** 선착순 수량 */
  limit?: number;
}

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
  /** 예시 하루 (순례 재생용) */
  demoDay: { date: string; stops: DemoStop[] };
  demoRoutes: RouteLeg[];
  /** 데모용: 이 장소 다음에 들른 장소 비율(%) */
  transitions: Record<string, [string, number][]>;
}
