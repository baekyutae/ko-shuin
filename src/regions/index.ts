import { seoul } from './seoul';
import type { Place, StampDef } from './types';

/** 현재 지역 팩. 부산 등 다른 지역은 같은 RegionPack 형태로 추가한다. */
export const region = seoul;

export const placeById = new Map(region.places.map((pl) => [pl.id, pl]));

export function getPlace(id: string): Place {
  const pl = placeById.get(id);
  if (!pl) throw new Error(`unknown place: ${id}`);
  return pl;
}

/** 장소마다 하나씩 있는 기본(방문) 인장 */
export function baseStampOf(place: Place): StampDef {
  return {
    id: place.id,
    placeId: place.id,
    label: '방 문',
    color: '#c8372d',
    official: !!place.official,
    limited: false,
    title: `${place.nameKo} 인장`,
    baseIssued: place.baseVisitors,
  };
}

export type { Place, StampDef } from './types';
