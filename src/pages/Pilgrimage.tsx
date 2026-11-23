import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toPng } from 'html-to-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Stamp } from '../components/Stamp';
import { TimelineCard } from '../components/TimelineCard';
import { Sheet, toast, useNow } from '../components/ui';
import { baseStampOf, getPlace, region } from '../regions';
import { arcBetween, bearing, distanceM, formatDistance, type LngLat } from '../lib/geo';
import { MAP_STYLE } from '../lib/map';
import { dotDate, hmFromMinutes, isNight, minutesOf, ymd } from '../lib/time';
import type { Daypart, Weather } from '../regions/types';
import { openStampsAt, stampDefById, useStore, type TrackPoint } from '../store';

interface Stop {
  placeId: string;
  /** 받은 시각(ms) */
  at: number;
  minutes: number;
  stampIds: string[];
  serial?: number;
  weather: Weather;
  daypart: Daypart;
}

const PAUSE_MS = 750;
const TRAVEL_MS = 13000;

/** 인장 지점 사이 경로. 미리 받아 둔 도보 경로가 있으면 쓰고, 없으면 곡선으로 잇는다. */
function legCoords(a: string, b: string): LngLat[] {
  const fwd = region.demoRoutes.find((l) => l.from === a && l.to === b);
  if (fwd) return fwd.coords;
  const rev = region.demoRoutes.find((l) => l.from === b && l.to === a);
  if (rev) return [...rev.coords].reverse();
  const pa = getPlace(a);
  const pb = getPlace(b);
  return arcBetween([pa.lng, pa.lat], [pb.lng, pb.lat]);
}

/**
 * 인장 지점을 시간순으로 잇는 경로.
 * ⑧ GPS 타임라인이 켜져 있어 두 인장 사이의 실제 위치 기록이 있으면 그 이동선을 쓴다.
 */
function buildPath(stops: Stop[], track: TrackPoint[] = []) {
  const coords: LngLat[] = [];
  let gpsLegs = 0;
  const stopDist: number[] = [];
  const cum: number[] = [];
  let total = 0;
  const push = (c: LngLat) => {
    if (coords.length) total += distanceM(coords[coords.length - 1], c);
    coords.push(c);
    cum.push(total);
  };
  stops.forEach((s, i) => {
    const p = getPlace(s.placeId);
    if (i === 0) push([p.lng, p.lat]);
    else {
      const between = track.filter((t) => t.t > stops[i - 1].at && t.t < s.at);
      if (between.length >= 2) {
        gpsLegs++;
        between.forEach((t) => push([t.lng, t.lat]));
        push([p.lng, p.lat]);
      } else legCoords(stops[i - 1].placeId, s.placeId).forEach(push);
    }
    stopDist.push(total);
  });
  return { coords, cum, stopDist, total, gpsLegs };
}

/** 이동 거리 d까지 잘라 낸 경로와 머리 위치 */
function sliceAt(coords: LngLat[], cum: number[], d: number): { line: LngLat[]; head: LngLat; dir: number } {
  let i = cum.findIndex((c) => c >= d);
  if (i <= 0) return { line: [coords[0]], head: coords[0], dir: 0 };
  if (i === -1) i = coords.length - 1;
  const a = coords[i - 1];
  const b = coords[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
  const head: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { line: [...coords.slice(0, i), head], head, dir: bearing(a, b) };
}

function useStops(mode: 'today' | 'demo'): { stops: Stop[]; date: string } {
  const collected = useStore((s) => s.collected);
  const today = ymd(useNow());
  return useMemo(() => {
    if (mode === 'demo') {
      const date = region.demoDay.date;
      return {
        date,
        stops: region.demoDay.stops.map((s) => {
          const at = new Date(`${date}T${s.time}`);
          return {
            placeId: s.placeId,
            at: at.getTime(),
            minutes: minutesOf(s.time),
            stampIds: openStampsAt(s.placeId, at, [], [], []).map((d) => d.id),
            weather: 'sunny' as Weather,
            daypart: (isNight(at) ? 'night' : 'day') as Daypart,
          };
        }),
      };
    }
    const mine = collected.filter((c) => ymd(new Date(c.at)) === today).sort((a, b) => a.at.localeCompare(b.at));
    const stops: Stop[] = [];
    mine.forEach((c) => {
      const last = stops[stops.length - 1];
      const at = new Date(c.at);
      if (last && last.placeId === c.placeId) last.stampIds.push(c.stampId);
      else
        stops.push({
          placeId: c.placeId,
          at: at.getTime(),
          minutes: at.getHours() * 60 + at.getMinutes(),
          stampIds: [c.stampId],
          serial: c.serial,
          weather: c.weather,
          daypart: c.daypart,
        });
    });
    return { date: today, stops };
  }, [mode, collected, today]);
}

export default function Pilgrimage() {
  const collected = useStore((s) => s.collected);
  const current = useNow();
  const todayCount = collected.filter((c) => ymd(new Date(c.at)) === ymd(current)).length;
  const [mode, setMode] = useState<'today' | 'demo'>(todayCount >= 2 ? 'today' : 'demo');
  const { stops, date } = useStops(mode);
  const playable = stops.length >= 2;

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<{ marker: maplibregl.Marker; root: Root }[]>([]);
  const raf = useRef(0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [speed, setSpeed] = useState(1);
  const [hud, setHud] = useState({ clock: stops[0]?.minutes ?? 0, dist: 0, count: 0, active: -1 });
  const [shot, setShot] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);

  // GPS 타임라인이 켜져 있으면 위치 기록이 계속 늘어난다. 재생 중·재생 후에 경로가 다시
  // 계산되면 재생이 초기화되므로, 재생 전(idle)일 때만 최신 기록을 경로에 반영한다.
  const track = useStore((s) => s.timeline.points);
  const [trackSnap, setTrackSnap] = useState(track);
  useEffect(() => {
    if (phase === 'idle') setTrackSnap(track);
  }, [track, phase]);
  const path = useMemo(
    () => (playable ? buildPath(stops, mode === 'today' ? trackSnap : []) : null),
    [stops, playable, mode, trackSnap],
  );

  // 지도 생성
  useEffect(() => {
    if (!mapEl.current) return;
    const map = new maplibregl.Map({
      container: mapEl.current,
      style: MAP_STYLE,
      center: region.center,
      zoom: 12.5,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;
    map.on('load', () => {
      // 축약형 출처 표기를 처음부터 접어 둔다(ⓘ를 누르면 펼쳐짐).
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      map.addSource('ghost', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('head', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'ghost',
        type: 'line',
        source: 'ghost',
        paint: { 'line-color': '#c8372d', 'line-opacity': 0.25, 'line-width': 3, 'line-dasharray': [1.5, 1.5] },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#ffffff', 'line-width': 9 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#c8372d', 'line-width': 5 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
      map.addLayer({
        id: 'head-halo',
        type: 'circle',
        source: 'head',
        paint: { 'circle-radius': 14, 'circle-color': '#c8372d', 'circle-opacity': 0.2 },
      });
      map.addLayer({
        id: 'head',
        type: 'circle',
        source: 'head',
        paint: { 'circle-radius': 6, 'circle-color': '#c8372d', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 },
      });
      setReady(true);
    });
    return () => {
      cancelAnimationFrame(raf.current);
      markers.current.forEach(({ marker, root }) => {
        marker.remove();
        setTimeout(() => root.unmount());
      });
      markers.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const clearMarkers = () => {
    markers.current.forEach(({ marker, root }) => {
      marker.remove();
      setTimeout(() => root.unmount());
    });
    markers.current = [];
  };

  const addStampMarker = (stop: Stop) => {
    const map = mapRef.current;
    if (!map) return;
    const place = getPlace(stop.placeId);
    const el = document.createElement('div');
    el.className = 'stamp-marker';
    const root = createRoot(el);
    const def = stampDefById(stop.stampIds[stop.stampIds.length - 1]) ?? baseStampOf(place);
    root.render(
      <Stamp def={def} place={place} size={54} rotate={-6} date={new Date(stop.at)} weather={stop.weather} daypart={stop.daypart} />,
    );
    const marker = new maplibregl.Marker({ element: el }).setLngLat([place.lng, place.lat]).addTo(map);
    markers.current.push({ marker, root });
  };

  // 경로가 바뀌면 전체 경로를 흐리게 보여 주고 시작 상태로 맞춘다.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    cancelAnimationFrame(raf.current);
    clearMarkers();
    setPhase('idle');
    setShot(null);
    const empty = { type: 'FeatureCollection' as const, features: [] };
    (map.getSource('route') as GeoJSONSource).setData(empty);
    (map.getSource('head') as GeoJSONSource).setData(empty);
    if (!path) {
      (map.getSource('ghost') as GeoJSONSource).setData(empty);
      return;
    }
    (map.getSource('ghost') as GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: path.coords },
    });
    const b = new maplibregl.LngLatBounds();
    path.coords.forEach((c) => b.extend(c));
    map.fitBounds(b, { padding: { top: 90, bottom: 80, left: 40, right: 40 }, pitch: 0, bearing: 0, duration: 800 });
    setHud({ clock: stops[0].minutes, dist: 0, count: 0, active: -1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path]);

  const play = () => {
    const map = mapRef.current;
    if (!map || !path) return;
    cancelAnimationFrame(raf.current);
    clearMarkers();
    setShot(null);
    setPhase('playing');

    const travel = TRAVEL_MS / speed;
    const pause = PAUSE_MS / speed;
    // 구간: [멈춤0, 이동0, 멈춤1, 이동1, ..., 멈춤n]
    const legTimes = stops.slice(1).map((_, i) => ((path.stopDist[i + 1] - path.stopDist[i]) / path.total) * travel);
    const totalMs = pause * stops.length + legTimes.reduce((a, b) => a + b, 0);
    let shown = -1;
    let camBearing = map.getBearing();
    const routeSrc = map.getSource('route') as GeoJSONSource;
    const headSrc = map.getSource('head') as GeoJSONSource;

    const first = getPlace(stops[0].placeId);
    map.flyTo({ center: [first.lng, first.lat], zoom: 15.2, pitch: 50, bearing: 0, duration: 1200 / speed });

    const start = performance.now() + 1200 / speed;
    const frame = (nowMs: number) => {
      const t = Math.max(0, nowMs - start);
      let acc = 0;
      let d = 0;
      let reached = 0;
      let clock = stops[0].minutes;
      for (let i = 0; i < stops.length; i++) {
        if (t < acc + pause) {
          d = path.stopDist[i];
          reached = i;
          clock = stops[i].minutes;
          break;
        }
        acc += pause;
        reached = i;
        if (i === stops.length - 1) {
          d = path.total;
          clock = stops[i].minutes;
          break;
        }
        const lt = legTimes[i];
        if (t < acc + lt) {
          const r = (t - acc) / lt;
          d = path.stopDist[i] + (path.stopDist[i + 1] - path.stopDist[i]) * r;
          clock = stops[i].minutes + (stops[i + 1].minutes - stops[i].minutes) * r;
          break;
        }
        acc += lt;
      }

      while (shown < reached) {
        shown++;
        addStampMarker(stops[shown]);
      }

      const { line, head, dir } = sliceAt(path.coords, path.cum, d);
      routeSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } });
      headSrc.setData({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: head } });
      if (nowMs >= start) {
        // 진행 방향으로 천천히 회전
        const diff = ((dir - camBearing + 540) % 360) - 180;
        camBearing += diff * 0.03;
        map.jumpTo({ center: head, bearing: camBearing });
      }
      setHud({ clock, dist: d, count: stops.slice(0, reached + 1).reduce((n, s) => n + s.stampIds.length, 0), active: reached });

      if (t < totalMs) {
        raf.current = requestAnimationFrame(frame);
      } else {
        const b = new maplibregl.LngLatBounds();
        path.coords.forEach((c) => b.extend(c));
        map.fitBounds(b, { padding: { top: 90, bottom: 80, left: 40, right: 40 }, pitch: 0, bearing: 0, duration: 1600 });
        map.once('moveend', () => {
          setPhase('done');
          // 타일이 다 그려지면 카드용 지도 이미지를 뜬다(늦어지면 1.5초 뒤 그대로 뜬다).
          let taken = false;
          const capture = () => {
            if (taken || mapRef.current !== map) return;
            taken = true;
            try {
              setShot(map.getCanvas().toDataURL('image/png'));
            } catch {
              setShot(null);
            }
          };
          map.once('idle', capture);
          setTimeout(capture, 1500);
        });
      }
    };
    raf.current = requestAnimationFrame(frame);
  };

  const totalStamps = stops.reduce((n, s) => n + s.stampIds.length, 0);
  const elapsed = stops.length ? stops[stops.length - 1].minutes - stops[0].minutes : 0;

  return (
    <main className="page">
      <h1 className="page-title">오늘의 순례 루트</h1>
      <p className="page-sub">인장을 받은 순서대로 하루를 다시 걸어 봐요.</p>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button className={`chip ${mode === 'today' ? 'on' : ''}`} onClick={() => setMode('today')}>
          오늘 내 기록 {todayCount > 0 ? todayCount : ''}
        </button>
        <button className={`chip ${mode === 'demo' ? 'on' : ''}`} onClick={() => setMode('demo')}>
          예시 하루
        </button>
      </div>

      <div className="route-wrap">
        <div ref={mapEl} className="route-map" />
        {playable && (
          <div className="hud">
            <div>
              <span>시각</span>
              <b>{hmFromMinutes(hud.clock)}</b>
            </div>
            <div>
              <span>걸은 거리</span>
              <b>{(hud.dist / 1000).toFixed(1)}km</b>
            </div>
            <div>
              <span>인장</span>
              <b>
                {hud.count}
                <small style={{ fontSize: 12, opacity: 0.6 }}>/{totalStamps}</small>
              </b>
            </div>
          </div>
        )}
        <div className="route-controls">
          {playable ? (
            <>
              <button className="btn" onClick={play} disabled={!ready || phase === 'playing'}>
                {phase === 'idle' ? '▶ 순례 재생' : phase === 'playing' ? '재생 중…' : '↻ 다시 재생'}
              </button>
              <button className="btn secondary" style={{ flex: '0 0 64px' }} onClick={() => setSpeed(speed === 1 ? 2 : 1)}>
                {speed}x
              </button>
              {phase === 'done' && (
                <button className="btn dark" onClick={() => setCardOpen(true)}>
                  공유 카드
                </button>
              )}
            </>
          ) : (
            <div className="card" style={{ width: '100%', fontSize: 14 }}>
              오늘 받은 인장이 2개 이상이면 재생할 수 있어요.{' '}
              <button className="chip" onClick={() => setMode('demo')}>
                예시 하루 보기
              </button>
            </div>
          )}
        </div>
      </div>

      {playable && (
        <>
          <div className="section-label">
            {dotDate(new Date(`${date}T00:00`))} 타임라인 <small>{mode === 'demo' ? '예시 데이터' : '내 기록'}</small>
          </div>
          <div className="card">
            <ul className="timeline">
              {stops.map((s, i) => {
                const p = getPlace(s.placeId);
                const limited = s.stampIds.filter((id) => stampDefById(id)?.limited);
                return (
                  <li key={`${s.placeId}-${i}`} className={hud.active >= i || phase === 'idle' ? 'on' : ''}>
                    <span className="t">{hmFromMinutes(s.minutes)}</span>
                    <span className="d" />
                    <span style={{ flex: 1 }}>{p.nameKo}</span>
                    {limited.map((id) => (
                      <span className="tag shu" key={id}>
                        {stampDefById(id)?.label.replace(/\s/g, '')}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
            <div className="demo-note">
              {path && path.gpsLegs > 0
                ? `GPS 타임라인으로 기록한 실제 이동선 ${path.gpsLegs}구간을 표시했어요. `
                : ''}
              도보 경로: © OpenStreetMap contributors (OSRM). 기본은 인장 지점만 이어 그리고, GPS 타임라인을 켠 사용자만 실제 이동선을 기록합니다.
            </div>
          </div>
        </>
      )}

      <TimelineCard />

      {cardOpen && path && (
        <ShareCard
          onClose={() => setCardOpen(false)}
          shot={shot}
          date={date}
          stops={stops}
          distance={path.total}
          elapsed={elapsed}
          totalStamps={totalStamps}
        />
      )}
    </main>
  );
}

function ShareCard(props: {
  onClose: () => void;
  shot: string | null;
  date: string;
  stops: Stop[];
  distance: number;
  elapsed: number;
  totalStamps: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const districts = new Set(props.stops.map((s) => getPlace(s.placeId).district));

  const save = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const url = await toPng(ref.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `ko-shuin-${props.date}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'KO朱印 오늘의 순례' });
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('이미지를 만들지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={props.onClose}>
      <div ref={ref} className="share-card">
        {props.shot ? <img className="map" src={props.shot} alt="오늘의 순례 경로" /> : <div style={{ height: 120, background: '#e8e4dc' }} />}
        <div className="sc-body">
          <div className="sc-title">
            <span>KO朱印</span> 오늘의 순례
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {dotDate(new Date(`${props.date}T00:00`))} · 서울 {[...districts].join('·')}
          </div>
          <div className="sc-stats">
            <div>
              <b>{props.totalStamps}</b>
              <small>인장</small>
            </div>
            <div>
              <b>{formatDistance(props.distance)}</b>
              <small>걸은 거리</small>
            </div>
            <div>
              <b>
                {Math.floor(props.elapsed / 60)}h {props.elapsed % 60}m
              </b>
              <small>순례 시간</small>
            </div>
          </div>
          <div className="sc-stamps">
            {props.stops.map((s, i) => {
              const place = getPlace(s.placeId);
              const def = stampDefById(s.stampIds[s.stampIds.length - 1]) ?? baseStampOf(place);
              return (
                <Stamp
                  key={i}
                  def={def}
                  place={place}
                  size={58}
                  rotate={((i * 7) % 11) - 5}
                  date={new Date(s.at)}
                  weather={s.weather}
                  daypart={s.daypart}
                />
              );
            })}
          </div>
          <div className="sc-foot">
            <span>#KO朱印 #ソウル御朱印</span>
            <span>ko-shuin</span>
          </div>
        </div>
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={save} disabled={busy}>
        {busy ? '만드는 중…' : '이미지로 저장·공유'}
      </button>
    </Sheet>
  );
}
