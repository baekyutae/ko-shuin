import { lazy, Suspense, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useNow } from '../components/ui';
import { usePosition } from '../hooks/usePosition';
import { region } from '../regions';
import { formatDistance, type LngLat } from '../lib/geo';
import { DAYPART_LABEL, WEATHER_LABEL } from '../lib/labels';
import { planNow, ROUTE_FILTERS, type RouteFilter } from '../lib/plan';
import { describeCondition } from '../lib/rules';
import { hm, isNight } from '../lib/time';
import { useStore } from '../store';

const RoutePreviewMap = lazy(() => import('../components/RoutePreviewMap'));

/** ③ 「지금 받을 수 있는 인장」 + 추천 기준(균형·최단 거리·한산함 우선)별 인장 투어 루트 */
export default function NowRoute() {
  const pos = usePosition();
  const current = useNow();
  const collected = useStore((s) => s.collected);
  const custom = useStore((s) => s.customStamps);
  const flags = useStore((s) => s.debug.manualFlags);
  const weather = useStore((s) => s.debug.weather);
  const [params, setParams] = useSearchParams();
  const filter = (ROUTE_FILTERS.find((f) => f.id === params.get('f'))?.id ?? 'balanced') as RouteFilter;

  const origin: LngLat = pos.coords ?? region.center;
  const hourKey = `${current.toDateString()}-${current.getHours()}`;
  const plan = useMemo(
    () => planNow(origin, current, collected, custom, flags, filter),
    // 같은 시간대 안에서는 다시 계산하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin[0], origin[1], hourKey, collected, custom, flags, filter],
  );

  const stops = plan.route.map((s) => ({
    coord: [s.place.lng, s.place.lat] as LngLat,
    label: s.place.nameKo,
    color: s.crowd.color,
  }));
  const meta = ROUTE_FILTERS.find((f) => f.id === filter)!;

  return (
    <main className="page">
      <h1 className="page-title">지금 받을 수 있는 인장</h1>
      <p className="page-sub">주변 인장 장소를 골라 2~3곳을 잇는 인장 투어 루트를 만들어요.</p>

      <div className="chips" style={{ marginBottom: 6 }}>
        {ROUTE_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'on' : ''}`}
            onClick={() => setParams(f.id === 'balanced' ? {} : { f: f.id }, { replace: true })}
          >
            {f.label}
            {f.id === 'balanced' && <span style={{ opacity: 0.6 }}> · 기본</span>}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '0 2px 12px' }}>
        {meta.desc} <span style={{ color: 'var(--faint)' }}>({meta.ja})</span>
      </p>

      <Link to="/planner" className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 12, padding: 14 }}>
        <span style={{ fontSize: 22 }}>💬</span>
        <span style={{ flex: 1 }}>
          <b style={{ display: 'block', fontSize: 14.5 }}>대화로 루트 짜기 · 인장 투어 플래너</b>
          <span className="muted" style={{ fontSize: 12.5 }}>"오후 3시간, 성수 근처, 카페도" 처럼 말하면 루트를 짜고, 비가 오면 먼저 다시 제안해요</span>
        </span>
        <span className="tag">고도화 데모</span>
      </Link>

      <div className="chips" style={{ marginBottom: 12 }}>
        <span className="tag">{hm(current)}</span>
        <span className="tag">
          {WEATHER_LABEL[weather]} · {DAYPART_LABEL[isNight(current) ? 'night' : 'day']}
        </span>
        <span className="tag">{pos.source === 'demo' ? '시연 위치' : pos.coords ? '현재 위치' : '서울 중심 기준'}</span>
      </div>

      {plan.route.length > 0 && (
        <div className="route-wrap" style={{ height: '38dvh', minHeight: 260 }}>
          <Suspense fallback={null}>
            <RoutePreviewMap origin={pos.coords} stops={stops} />
          </Suspense>
        </div>
      )}

      <div className="section-label">
        인장 투어 루트 <small>총 이동 약 {plan.totalWalk}분</small>
      </div>
      <div className="card">
        {plan.route.map((s, i) => (
          <div className="rec" key={s.place.id}>
            <div className="rank" style={{ background: s.crowd.color }}>
              {i + 1}
            </div>
            <div className="meta">
              <div className="name">{s.place.nameKo}</div>
              <div className="info">
                {i === 0 ? '여기서' : '이전 장소에서'} {s.mode === 'walk' ? `도보 ${s.walk}분` : `지하철·버스 약 ${s.walk}분`} ·{' '}
                {s.place.district}
              </div>
              <div className="tags">
                <span className="pill" style={{ background: s.crowd.color }}>
                  {s.crowd.known ? `지금 ${s.crowd.label}` : '혼잡도 정보 없음'}
                </span>
                {s.limited.map((d) => (
                  <span className="tag shu" key={d.id}>
                    한정 · {d.title.replace(/ 인장$/, '')}
                  </span>
                ))}
                {s.isNew && <span className="tag">새 인장</span>}
                {s.place.official && <span className="tag shu">공식</span>}
              </div>
            </div>
          </div>
        ))}
        {plan.avoided && filter !== 'nearest' && (
          <div className="tag" style={{ marginTop: 12, padding: '8px 10px', fontSize: 13, whiteSpace: 'normal', lineHeight: 1.5 }}>
            가까운 {plan.avoided.place.nameKo}은(는) 지금 {plan.avoided.crowd.label}이라 뒤로 미뤘어요
            {plan.avoided.quietHour != null ? ` · ${plan.avoided.quietHour}시쯤 한산해질 예정` : ''}
          </div>
        )}
        <div className="demo-note">
          혼잡도는 예시 데이터입니다. 실서비스는 서울시 실시간 도시데이터(주요 장소 5분 갱신·12시간 예측)를 쓰고, 데이터가 없는 장소는 '정보 없음'으로
          표시하되 계산에서는 '보통'으로 봅니다. 지도 선은 도보 경로 API로 그립니다.
        </div>
      </div>

      <div className="section-label">
        주변 인장 장소 <small>{meta.label} 순</small>
      </div>
      <div className="card">
        {plan.candidates.slice(0, 8).map((c) => (
          <div className="place-row" key={c.place.id}>
            <div className="thumb" style={{ background: `${c.crowd.color}22`, color: c.crowd.color }}>
              {c.place.nameKo[0]}
            </div>
            <div className="meta">
              <div className="name">
                {c.place.nameKo}
                {c.limited.length > 0 && <span className="tag shu">한정 열림</span>}
              </div>
              <div className="info">
                {formatDistance(c.dist)} · 도보 {c.walkFromHere}분 · {c.place.district}
                {c.limited.map((d) => ` · ${describeCondition(d.condition)}`)}
              </div>
            </div>
            <span className="pill" style={{ background: c.crowd.color }}>
              {c.crowd.label}
            </span>
          </div>
        ))}
      </div>

      <Link className="btn dark" to="/" style={{ marginTop: 16 }}>
        도착하면 인장 받기
      </Link>
    </main>
  );
}
