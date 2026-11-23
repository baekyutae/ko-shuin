import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { arcBetween, type LngLat } from '../lib/geo';
import { MAP_STYLE } from '../lib/map';

interface Stop {
  coord: LngLat;
  label: string;
  color: string;
}

/** 「지금 받을 수 있는 인장」 추천 도보 루트 미리보기 지도 */
export default function RoutePreviewMap({ origin, stops }: { origin: LngLat | null; stops: Stop[] }) {
  const el = useRef<HTMLDivElement>(null);
  // 부모가 매번 새 배열을 넘겨도 내용이 같으면 지도를 다시 만들지 않는다.
  const key = JSON.stringify({ origin, stops });

  useEffect(() => {
    if (!el.current || !stops.length) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: MAP_STYLE,
      center: stops[0].coord,
      zoom: 13,
      attributionControl: { compact: true },
      interactive: true,
    });
    const markers: maplibregl.Marker[] = [];
    const pts = origin ? [origin, ...stops.map((s) => s.coord)] : stops.map((s) => s.coord);
    const line: LngLat[] = [];
    for (let i = 1; i < pts.length; i++) line.push(...arcBetween(pts[i - 1], pts[i], 20));

    map.on('load', () => {
      // 축약형 출처 표기를 처음부터 접어 둔다(ⓘ를 누르면 펼쳐짐).
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      map.addSource('plan', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } } });
      map.addLayer({
        id: 'plan-casing',
        type: 'line',
        source: 'plan',
        paint: { 'line-color': '#fff', 'line-width': 7 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      map.addLayer({
        id: 'plan',
        type: 'line',
        source: 'plan',
        paint: { 'line-color': '#1c1a17', 'line-width': 3.5, 'line-dasharray': [2, 1.6] },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    });

    if (origin) {
      const me = document.createElement('div');
      me.style.cssText =
        'width:16px;height:16px;border-radius:50%;background:#2f6fd6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(47,111,214,.2)';
      markers.push(new maplibregl.Marker({ element: me }).setLngLat(origin).addTo(map));
    }
    stops.forEach((s, i) => {
      const m = document.createElement('div');
      m.style.cssText = `width:30px;height:30px;border-radius:50%;background:${s.color};color:#fff;display:grid;place-items:center;font:800 14px Pretendard Variable,sans-serif;border:2.5px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.25)`;
      m.textContent = String(i + 1);
      m.title = s.label;
      markers.push(new maplibregl.Marker({ element: m }).setLngLat(s.coord).addTo(map));
    });

    const b = new maplibregl.LngLatBounds();
    pts.forEach((p) => b.extend(p));
    map.fitBounds(b, { padding: 46, duration: 0, maxZoom: 15.5 });

    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={el} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
