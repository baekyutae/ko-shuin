import { useEffect, useState } from 'react';
import { placeById } from '../regions';
import type { LngLat } from '../lib/geo';
import { useStore } from '../store';

export interface PositionState {
  coords: LngLat | null;
  source: 'gps' | 'demo';
  accuracy?: number;
  error?: string;
}

/** 현재 위치. 시연용 위치가 정해져 있으면 그 장소 좌표를 쓴다. */
export function usePosition(): PositionState {
  const override = useStore((s) => s.debug.locationPlaceId);
  const [gps, setGps] = useState<PositionState>({ coords: null, source: 'gps' });

  useEffect(() => {
    if (override) return;
    if (!('geolocation' in navigator)) {
      setGps({ coords: null, source: 'gps', error: '이 브라우저는 위치 기능을 지원하지 않아요.' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setGps({ coords: [p.coords.longitude, p.coords.latitude], source: 'gps', accuracy: p.coords.accuracy }),
      (e) =>
        setGps({
          coords: null,
          source: 'gps',
          error: e.code === e.PERMISSION_DENIED ? '위치 권한이 꺼져 있어요.' : '위치를 가져오지 못했어요.',
        }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [override]);

  if (override) {
    const pl = placeById.get(override);
    if (pl) return { coords: [pl.lng, pl.lat], source: 'demo', accuracy: 5 };
  }
  return gps;
}
