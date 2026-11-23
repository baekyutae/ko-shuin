import { useEffect } from 'react';
import { distanceM } from '../lib/geo';
import { useStore } from '../store';

const MIN_MOVE_M = 20;
const MIN_GAP_MS = 10_000;

/**
 * ⑧ 연속 GPS 타임라인. 사용자가 동의하고 켰을 때만 위치를 기록한다(기본값 꺼짐).
 * 웹은 앱이 열려 있고 화면이 켜져 있을 때만 위치를 받을 수 있다.
 * 백그라운드 기록은 네이티브 앱에서 지원한다.
 */
export function useTimelineRecorder() {
  const enabled = useStore((s) => s.timeline.enabled);
  const demoLocation = useStore((s) => s.debug.locationPlaceId);

  useEffect(() => {
    if (!enabled || demoLocation || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const { timeline, addTrackPoint, debug } = useStore.getState();
        const point = { t: Date.now() + debug.timeOffsetMs, lng: p.coords.longitude, lat: p.coords.latitude };
        const last = timeline.points[timeline.points.length - 1];
        if (last && (point.t - last.t < MIN_GAP_MS || distanceM([last.lng, last.lat], [point.lng, point.lat]) < MIN_MOVE_M)) return;
        addTrackPoint(point);
      },
      () => {
        /* 위치를 못 받으면 이번 점은 건너뛴다 */
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, demoLocation]);
}
