import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../components/ui';
import { usePosition } from '../hooks/usePosition';
import { region } from '../regions';
import { CROWD_LEVELS } from '../lib/crowd';
import { formatDistance, type LngLat } from '../lib/geo';
import { DAYPART_LABEL, WEATHER_LABEL } from '../lib/labels';
import { planNow } from '../lib/plan';
import { describeCondition } from '../lib/rules';
import { hm, isNight } from '../lib/time';
import { useStore } from '../store';

const RoutePreviewMap = lazy(() => import('../components/RoutePreviewMap'));

/** ③ 「지금 받을 수 있는 인장」 + 덜 붐비는 곳부터 도는 도보 루트 */
export default function NowRoute() {
  const pos = usePosition();
  const current = useNow();
  const collected = useStore((s) => s.collected);
  const custom = useStore((s) => s.customStamps);
  const flags = useStore((s) => s.debug.manualFlags);
  const weather = useStore((s) => s.debug.weather);

  const origin: LngLat = pos.coords ?? region.center;
  const hourKey = `${current.toDateString()}-${current.getHours()}`;
  const plan = useMemo(
    () => planNow(origin, current, collected, custom, flags),
    // 같은 시간대 안에서는 다시 계산하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [origin[0], origin[1], hourKey, collected, custom, flags],
  );

  const stops = plan.route.map((s) => ({
    coord: [s.place.lng, s.place.lat] as LngLat,
    label: s.place.nameKo,
    color: CROWD_LEVELS[s.level].color,
  }));

  return (
    <main className="page">
      <h1 className="page-title">지금 받을 수 있는 인장</h1>
      <p className="page-sub">
        주변 인장 장소를 <b>지금 덜 붐비는 곳부터</b> 이어서 안내해요. 인장을 모으다 보면 자연스럽게 혼잡을 피하게 돼요.
      </p>

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
        추천 루트 <small>총 이동 약 {plan.totalWalk}분</small>
      </div>
      <div className="card">
        {plan.route.map((s, i) => {
          const lv = CROWD_LEVELS[s.level];
          return (
            <div className="rec" key={s.place.id}>
              <div className="rank" style={{ background: lv.color }}>
                {i + 1}
              </div>
              <div className="meta">
                <div className="name">{s.place.nameKo}</div>
                <div className="info">
                  {i === 0 ? '여기서' : '이전 장소에서'} {s.mode === 'walk' ? `도보 ${s.walk}분` : `지하철·버스 약 ${s.walk}분`} ·{' '}
                  {s.place.district}
                </div>
                <div className="tags">
                  <span className="pill" style={{ background: lv.color }}>
                    지금 {lv.label}
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
          );
        })}
        {plan.avoided && (
          <div className="tag" style={{ marginTop: 12, padding: '8px 10px', fontSize: 13, whiteSpace: 'normal', lineHeight: 1.5 }}>
            가까운 {plan.avoided.place.nameKo}은(는) 지금 {CROWD_LEVELS[plan.avoided.level].label}이라 뒤로 미뤘어요
            {plan.avoided.quietHour != null ? ` · ${plan.avoided.quietHour}시쯤 한산해질 예정` : ''}
          </div>
        )}
        <div className="demo-note">
          혼잡도는 예시 데이터입니다. 실서비스는 서울시 실시간 도시데이터(주요 장소 5분 갱신·12시간 예측)를 쓰고, 지도 선은 도보 경로 API로 그립니다.
        </div>
      </div>

      <div className="section-label">
        주변 인장 장소 <small>덜 붐비는 순</small>
      </div>
      <div className="card">
        {[...plan.candidates]
          .sort((a, b) => a.level - b.level || a.dist - b.dist)
          .slice(0, 8)
          .map((c) => {
            const lv = CROWD_LEVELS[c.level];
            return (
              <div className="place-row" key={c.place.id}>
                <div className="thumb" style={{ background: `${lv.color}22`, color: lv.color }}>
                  {c.place.nameKo[0]}
                </div>
                <div className="meta">
                  <div className="name">
                    {c.place.nameKo}
                    {c.limited.length > 0 && <span className="tag shu">한정 열림</span>}
                  </div>
                  <div className="info">
                    {formatDistance(c.dist)} · {c.place.district}
                    {c.limited.map((d) => ` · ${describeCondition(d.condition)}`)}
                  </div>
                </div>
                <span className="pill" style={{ background: lv.color }}>
                  {lv.label}
                </span>
              </div>
            );
          })}
      </div>

      <Link className="btn dark" to="/" style={{ marginTop: 16 }}>
        도착하면 인장 받기
      </Link>
    </main>
  );
}
