import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Stamp } from '../components/Stamp';
import { useNow } from '../components/ui';
import { getPlace, placeById, region } from '../regions';
import { CROWD_LEVELS, crowdLevel, forecast, quietestHour } from '../lib/crowd';
import { pressFeedback } from '../lib/feedback';
import { walkMinutes } from '../lib/geo';
import { DAYPART_LABEL, WEATHER_LABEL } from '../lib/labels';
import { hm, reiwaDate, ymd } from '../lib/time';
import { stampDefById, useStore } from '../store';

export default function Result() {
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const duplicate = params.get('dup') === '1';
  const collected = useStore((s) => s.collected);
  const current = useNow();

  const items = ids.map((id) => collected.find((c) => c.uid === id)).filter((c) => c != null);
  const main = items[0];

  useEffect(() => {
    if (!main || duplicate) return;
    const t = setTimeout(pressFeedback, 480);
    return () => clearTimeout(t);
  }, [main, duplicate]);

  const recs = useMemo(() => {
    if (!main) return [];
    const from = getPlace(main.placeId);
    const visited = new Set(collected.map((c) => c.placeId));
    let list = region.transitions[from.id];
    if (!list) {
      // 집계 데이터가 없는 장소는 가까운 곳으로 대체(콜드 스타트)
      list = region.places
        .filter((p) => p.id !== from.id)
        .map((p) => [p.id, Math.abs(p.lat - from.lat) + Math.abs(p.lng - from.lng)] as [string, number])
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([id], i) => [id, 20 - i * 5] as [string, number]);
    }
    return list
      .filter(([id]) => !visited.has(id) || list.length <= 3)
      .slice(0, 3)
      .map(([id, pct]) => {
        const p = getPlace(id);
        return { place: p, pct, walk: walkMinutes([from.lng, from.lat], [p.lng, p.lat]), visited: visited.has(id) };
      });
  }, [main, collected]);

  if (!main) {
    return (
      <main className="page">
        <div className="empty">
          인장 기록을 찾지 못했어요.
          <br />
          <Link to="/">방문 화면으로</Link>
        </div>
      </main>
    );
  }

  const place = getPlace(main.placeId);
  const def = stampDefById(main.stampId)!;
  // 이번 인장으로 이 구에 처음 들어왔는지(도장깨기 지도가 칠해짐)
  const before = collected.filter((c) => c.at < main.at);
  const firstInDistrict = !before.some((c) => placeById.get(c.placeId)?.district === place.district);
  const districtCount = new Set(collected.filter((c) => c.at <= main.at).map((c) => placeById.get(c.placeId)?.district)).size;
  const at = new Date(main.at);
  const dayKey = ymd(current);
  const fc = forecast(place, dayKey);
  const nowHour = current.getHours();
  const quiet = quietestHour(place, dayKey, Math.max(9, nowHour));

  return (
    <main className="page">
      <section className="press-stage">
        <div className="press-place">{place.nameKo}</div>
        <div className="press-sub">
          {place.nameJa} · {place.district}
        </div>
        <div className="press">
          <Stamp def={def} place={place} date={at} serial={main.serial} size={190} weather={main.weather} daypart={main.daypart} />
        </div>
        <div className="press-got">{duplicate ? '오늘 이미 받은 인장이에요' : '인장을 받았어요'}</div>
        <div className="press-meta">
          {hm(at)} 방문 · <b>{main.serial.toLocaleString()}번째</b> 방문자 · {main.via === 'qr' ? 'QR 인증' : 'GPS 인증'}
        </div>
        <div className="press-meta">
          {reiwaDate(at)} · 그날의 인장: {WEATHER_LABEL[main.weather]} · {DAYPART_LABEL[main.daypart]}
        </div>
        {firstInDistrict && !duplicate && (
          <div className="tag shu" style={{ marginTop: 12, padding: '7px 12px', fontSize: 13 }}>
            {place.district}가 칠해졌어요 · 서울 도장깨기 {districtCount}/25
          </div>
        )}
        {items.length > 1 && (
          <>
            <div className="press-meta" style={{ marginTop: 14 }}>
              <b>한정 인장도 함께 받았어요</b>
            </div>
            <div className="extra-stamps">
              {items.slice(1).map((c, i) => (
                <div className="press delay" key={c.uid} style={{ animationDelay: `${0.9 + i * 0.35}s`, margin: '8px 0 0' }}>
                  <Stamp def={stampDefById(c.stampId)!} place={place} date={new Date(c.at)} serial={c.serial} size={120} rotate={6} weather={c.weather} daypart={c.daypart} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="section-label">
        다음은 어디로? <small>{place.nameKo} 다음에 사람들이 간 곳</small>
      </div>
      <div className="card">
        {recs.map(({ place: p, pct, walk, visited }, i) => {
          const lv = CROWD_LEVELS[crowdLevel(p, nowHour, dayKey)];
          return (
            <div className="rec" key={p.id}>
              <div className="rank">{i + 1}</div>
              <div className="meta">
                <div className="name">{p.nameKo}</div>
                <div className="info">
                  <b>{pct}%</b>가 다음에 방문 · 도보 {walk}분
                </div>
                <div className="tags">
                  <span className="pill" style={{ background: lv.color }}>
                    지금 {lv.label}
                  </span>
                  {p.official && <span className="tag shu">공식 인장</span>}
                  {visited && <span className="tag">받은 곳</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div className="demo-note">
          비율은 운영팀 시드 데이터(대표 관광 동선)이고 혼잡도는 예시입니다. 실제 방문 순서가 쌓이면 실데이터로 바꿉니다(5명 미만 비공개).
        </div>
        <Link className="btn secondary" to="/now" style={{ marginTop: 12 }}>
          지금 받을 수 있는 인장 · 덜 붐비는 루트
        </Link>
      </div>

      <div className="section-label">
        {place.nameKo} 혼잡 예보 <small>{quiet != null ? `가장 한산한 때 ${quiet}시쯤` : ''}</small>
      </div>
      <div className="card">
        <div className="bars">
          {fc.map(({ hour, level }) => (
            <div className={`b ${hour === nowHour ? 'now' : ''}`} key={hour}>
              <i style={{ height: 12 + level * 14, background: CROWD_LEVELS[level].color }} />
              <span>{hour}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <Link className="btn secondary" to="/book">
          수첩 보기
        </Link>
        <Link className="btn dark" to="/route">
          오늘의 순례 루트
        </Link>
      </div>
    </main>
  );
}
