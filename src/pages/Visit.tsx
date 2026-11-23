import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, useNow } from '../components/ui';
import { usePosition } from '../hooks/usePosition';
import { getPlace, placeById, region } from '../regions';
import { distanceM, formatDistance, walkMinutes, type LngLat } from '../lib/geo';
import { DAYPART_LABEL, WEATHER_LABEL } from '../lib/labels';
import { planNow } from '../lib/plan';
import { placeKey } from '../lib/qr';
import { describeCondition, isOpen } from '../lib/rules';
import { hm, isNight } from '../lib/time';
import { useStore } from '../store';

const QrScanner = lazy(() => import('../components/QrScanner').then((m) => ({ default: m.QrScanner })));

export default function Visit() {
  const navigate = useNavigate();
  const pos = usePosition();
  const current = useNow();
  const collected = useStore((s) => s.collected);
  const custom = useStore((s) => s.customStamps);
  const flags = useStore((s) => s.debug.manualFlags);
  const weather = useStore((s) => s.debug.weather);
  const award = useStore((s) => s.award);
  const [scanning, setScanning] = useState(false);

  const visitedPlaces = useMemo(() => new Set(collected.map((c) => c.placeId)), [collected]);
  const visitedDistricts = useMemo(
    () => new Set([...visitedPlaces].map((id) => placeById.get(id)?.district).filter(Boolean)),
    [visitedPlaces],
  );
  const completed = useMemo(() => {
    const byDistrict = new Map<string, string[]>();
    region.places.forEach((p) => byDistrict.set(p.district, [...(byDistrict.get(p.district) ?? []), p.id]));
    return [...byDistrict.values()].filter((ids) => ids.every((id) => visitedPlaces.has(id))).length;
  }, [visitedPlaces]);

  const nearby = useMemo(() => {
    if (!pos.coords) return region.places.map((p) => ({ place: p, dist: null as number | null }));
    return region.places
      .map((p) => ({ place: p, dist: distanceM(pos.coords!, [p.lng, p.lat]) }))
      .sort((a, b) => a.dist! - b.dist!);
  }, [pos.coords]);

  const origin: LngLat = pos.coords ?? region.center;
  const hourKey = `${current.toDateString()}-${current.getHours()}`;
  const plan = useMemo(
    () => planNow(origin, current, collected, custom, flags),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin[0], origin[1], hourKey, collected, custom, flags],
  );

  const here = nearby.find((n) => n.dist != null && n.dist <= n.place.radiusM);
  const openLimited = [...region.limitedStamps, ...custom].filter((s) => s.limited && isOpen(s.condition, current, flags));
  const daypart = isNight(current) ? 'night' : 'day';

  const receive = (placeId: string, via: 'gps' | 'qr') => {
    const { uids, duplicate } = award(placeId, via);
    navigate(`/result?ids=${uids.join(',')}${duplicate ? '&dup=1' : ''}`);
  };

  const onScan = useCallback(
    ({ placeId, key }: { placeId: string; key: string }) => {
      setScanning(false);
      if (!placeById.has(placeId) || key !== placeKey(placeId)) {
        toast('확인되지 않은 QR이에요');
        return;
      }
      const { uids, duplicate } = useStore.getState().award(placeId, 'qr');
      navigate(`/result?ids=${uids.join(',')}${duplicate ? '&dup=1' : ''}`);
    },
    [navigate],
  );

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-top">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="dot" />
            {pos.source === 'demo' ? '시연 위치' : pos.coords ? 'GPS 연결됨' : '위치 확인 중'}
          </span>
          <span>
            {hm(current)} · {WEATHER_LABEL[weather]} · {DAYPART_LABEL[daypart]}
          </span>
        </div>
        {here ? (
          <>
            <h2>{here.place.nameKo}에 도착했어요</h2>
            <p>
              {here.place.nameJa} · {here.place.district}
              {visitedPlaces.has(here.place.id) ? ' · 이미 받은 장소예요' : ' · 아직 없는 인장이에요'}
            </p>
            <button className="btn" onClick={() => receive(here.place.id, 'gps')}>
              인장 받기
            </button>
          </>
        ) : (
          <>
            <h2>{nearby[0]?.dist != null ? `가장 가까운 인장까지 ${formatDistance(nearby[0].dist)}` : '인장 장소를 찾고 있어요'}</h2>
            <p>
              {pos.error
                ? `${pos.error} 오른쪽 아래 '시연'에서 위치를 고를 수 있어요.`
                : nearby[0]?.dist != null
                  ? `${nearby[0].place.nameKo}까지 걸어서 약 ${walkMinutes(pos.coords!, [nearby[0].place.lng, nearby[0].place.lat])}분`
                  : '장소에 도착하면 인장을 받을 수 있어요.'}
            </p>
            <div className="row">
              <Link className="btn" to="/now">
                지금 받을 수 있는 인장
              </Link>
              <button className="btn secondary" style={{ flex: '0 0 84px' }} onClick={() => setScanning(true)}>
                QR
              </button>
            </div>
          </>
        )}
      </section>

      <div className="card progress-card" style={{ marginTop: 12 }}>
        <div>
          <b>{collected.length}</b>
          <span>모은 인장</span>
        </div>
        <div>
          <b>
            {visitedDistricts.size}
            <small style={{ fontSize: 13, color: 'var(--faint)' }}>/25</small>
          </b>
          <span>서울 도장깨기</span>
        </div>
        <div>
          <b style={{ color: 'var(--shu)' }}>{completed}</b>
          <span>★완성한 구</span>
        </div>
      </div>

      {openLimited.length > 0 && (
        <>
          <div className="section-label">지금 열린 시즌·이벤트 인장</div>
          <div className="stack">
            {openLimited.map((s) => (
              <div className="limited-banner" key={s.id} style={{ background: `linear-gradient(120deg, ${s.color}, ${s.color}cc)` }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>限</span>
                <div>
                  <b>{s.title}</b>
                  <span>
                    {getPlace(s.placeId).nameKo} · {describeCondition(s.condition)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">
        지금 받을 수 있는 인장 <small>균형 추천</small>
      </div>
      <Link to="/now" className="card" style={{ display: 'block', textDecoration: 'none' }}>
        {plan.route.map((s, i) => {
          const lv = s.crowd;
          return (
            <div className="list-row" key={s.place.id}>
              <div className="rank" style={{ background: lv.color }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <b>{s.place.nameKo}</b>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {' '}
                  · {s.mode === 'walk' ? '도보' : '지하철·버스'} {s.walk}분{s.limited.length ? ' · 한정 열림' : ''}
                </span>
              </div>
              <span className="pill" style={{ background: lv.color }}>
                {lv.label}
              </span>
            </div>
          );
        })}
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14, color: 'var(--shu)' }}>인장 투어 루트 보기 · 추천 기준 바꾸기 →</div>
      </Link>

      <div className="section-label">
        {pos.coords ? '가까운 인장 장소' : '인장 장소'} <small>{region.places.length}곳</small>
      </div>
      <div className="card">
        {nearby.slice(0, 8).map(({ place, dist }) => {
          const done = visitedPlaces.has(place.id);
          const inRange = dist != null && dist <= place.radiusM;
          return (
            <div className="place-row" key={place.id}>
              <div className={`thumb ${done ? 'done' : ''}`}>{done ? '✓' : place.nameKo[0]}</div>
              <div className="meta">
                <div className="name">
                  {place.nameKo}
                  {place.official && <span className="tag shu">공식</span>}
                  {place.fromVote && <span className="tag">투표로 탄생</span>}
                </div>
                <div className="info">
                  {place.district}
                  {dist != null && ` · ${formatDistance(dist)}`}
                  {dist != null && dist > place.radiusM && ` · 도보 ${walkMinutes(pos.coords!, [place.lng, place.lat])}분`}
                </div>
              </div>
              {inRange && (
                <button className="btn small" onClick={() => receive(place.id, 'gps')}>
                  받기
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn secondary" style={{ marginTop: 14 }} onClick={() => setScanning(true)}>
        현장 QR로 인장 받기
      </button>

      {scanning && (
        <Suspense fallback={null}>
          <QrScanner onClose={() => setScanning(false)} onResult={onScan} />
        </Suspense>
      )}
    </main>
  );
}
