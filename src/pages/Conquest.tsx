import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sheet } from '../components/ui';
import { region } from '../regions';
import type { Place, Theme } from '../regions/types';
import { useStore } from '../store';

const W = 360;
const H = 300;
const LAT0 = 37.55;
const KX = Math.cos((LAT0 * Math.PI) / 180);

type Ring = [number, number][];

/** 서울 구 경계를 화면 좌표로 바꾼다(위도 보정 등장방형). */
function useProjected() {
  return useMemo(() => {
    const feats = region.districts.features.map((f) => {
      const polys: Ring[][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates as Ring[]] : (f.geometry.coordinates as Ring[][]);
      return { name: f.properties.name, polys };
    });
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    feats.forEach((f) =>
      f.polys.forEach((poly) =>
        poly[0].forEach(([x, y]) => {
          const px = x * KX;
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }),
      ),
    );
    const pad = 8;
    const s = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
    const ox = (W - (maxX - minX) * s) / 2;
    const oy = (H - (maxY - minY) * s) / 2;
    const proj = ([x, y]: [number, number]): [number, number] => [ox + (x * KX - minX) * s, oy + (maxY - y) * s];

    return feats.map((f) => {
      let d = '';
      let best = { area: 0, cx: 0, cy: 0 };
      f.polys.forEach((poly) => {
        poly.forEach((ring) => {
          const pts = ring.map(proj);
          d += `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join('L')}Z`;
        });
        // 바깥 고리의 무게중심을 라벨 위치로 쓴다.
        const pts = poly[0].map(proj);
        let a = 0,
          cx = 0,
          cy = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          const cr = x1 * y2 - x2 * y1;
          a += cr;
          cx += (x1 + x2) * cr;
          cy += (y1 + y2) * cr;
        }
        a /= 2;
        if (Math.abs(a) > best.area) best = { area: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
      });
      return { name: f.name, d, cx: best.cx, cy: best.cy };
    });
  }, []);
}

function fillFor(total: number, got: number) {
  if (total === 0) return 'url(#hatch)';
  if (got === 0) return '#f3e3df';
  if (got === total) return '#9f2a22';
  const r = got / total;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * r);
  return `rgb(${mix(240, 200)},${mix(170, 55)},${mix(160, 45)})`;
}

const THEMES: { theme: Theme; icon: string }[] = [
  { theme: '궁궐', icon: '宮' },
  { theme: '시장', icon: '市' },
  { theme: '한강', icon: '江' },
  { theme: '거리', icon: '街' },
  { theme: '문화', icon: '文' },
  { theme: '전망', icon: '望' },
];

export default function Conquest() {
  const shapes = useProjected();
  const collected = useStore((s) => s.collected);
  const [sel, setSel] = useState<string | null>(null);

  const visited = useMemo(() => new Set(collected.map((c) => c.placeId)), [collected]);
  const byDistrict = useMemo(() => {
    const m = new Map<string, Place[]>();
    region.places.forEach((p) => m.set(p.district, [...(m.get(p.district) ?? []), p]));
    return m;
  }, []);

  const stat = (name: string) => {
    const ps = byDistrict.get(name) ?? [];
    return { total: ps.length, got: ps.filter((p) => visited.has(p.id)).length, places: ps };
  };

  const withStamps = [...byDistrict.keys()].length;
  const conquered = [...byDistrict.keys()].filter((n) => {
    const s = stat(n);
    return s.total > 0 && s.got === s.total;
  });
  const visitedDistricts = new Set(region.places.filter((p) => visited.has(p.id)).map((p) => p.district));

  // 완성에 가장 가까운 구
  const nextTarget = [...byDistrict.keys()]
    .map((n) => ({ n, ...stat(n) }))
    .filter((s) => s.got > 0 && s.got < s.total)
    .sort((a, b) => a.total - a.got - (b.total - b.got))[0];

  const trophies = [
    { icon: '初', label: '첫 인장', ok: collected.length > 0 },
    { icon: '完', label: '첫 구 완성', ok: conquered.length > 0 },
    { icon: '夜', label: '밤의 인장', ok: collected.some((c) => c.daypart === 'night') },
    { icon: '雨', label: '비 오는 날 인장', ok: collected.some((c) => c.weather === 'rain') },
    { icon: '限', label: '시즌·이벤트 인장', ok: collected.some((c) => region.limitedStamps.some((l) => l.id === c.stampId)) },
    { icon: '五', label: '5개 구 방문', ok: visitedDistricts.size >= 5 },
  ];

  const selStat = sel ? stat(sel) : null;

  return (
    <main className="page">
      <h1 className="page-title">서울 도장깨기 지도</h1>
      <p className="page-sub">인장을 받은 구가 하나씩 칠해져요. 구 안의 인장 장소를 모두 모으면 ★완성.</p>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="muted" style={{ fontSize: 13 }}>
              서울 도장깨기
            </div>
            <div className="big-num">
              <span style={{ color: 'var(--shu)' }}>{visitedDistricts.size}</span>
              <span style={{ fontSize: 16, color: 'var(--faint)' }}> / 25</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted" style={{ fontSize: 13 }}>
              ★완성한 구
            </div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {conquered.length} / {withStamps}
            </div>
          </div>
        </div>
        <svg className="conquest-svg" viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10 }}>
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#ece8e1" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ddd7cd" strokeWidth="2" />
            </pattern>
          </defs>
          {shapes.map((s) => {
            const st = stat(s.name);
            return (
              <path key={s.name} d={s.d} fill={fillFor(st.total, st.got)} className={sel === s.name ? 'sel' : ''} onClick={() => setSel(s.name)}>
                <title>{s.name}</title>
              </path>
            );
          })}
          {shapes.map((s) => {
            const st = stat(s.name);
            if (!st.total) return null;
            return (
              <text key={s.name} x={s.cx} y={s.cy} textAnchor="middle">
                {st.got === st.total ? '★' : ''}
                {s.name.replace(/구$/, '')}
              </text>
            );
          })}
        </svg>
        <div className="legend">
          <span>
            <i style={{ background: '#9f2a22' }} /> ★완성
          </span>
          <span>
            <i style={{ background: 'rgb(220,110,100)' }} /> 진행 중
          </span>
          <span>
            <i style={{ background: '#f3e3df' }} /> 미방문
          </span>
          <span>
            <i style={{ background: '#e4dfd6' }} /> 인장 준비 중
          </span>
        </div>
        {nextTarget && (
          <div className="tag shu" style={{ marginTop: 12, padding: '8px 10px', fontSize: 13 }}>
            {nextTarget.n} 완성까지 {nextTarget.total - nextTarget.got}곳 남았어요
          </div>
        )}
      </div>

      <div className="section-label">테마별 수첩</div>
      <div className="card">
        {THEMES.map(({ theme, icon }) => {
          const ps = region.places.filter((p) => p.themes.includes(theme));
          const got = ps.filter((p) => visited.has(p.id)).length;
          return (
            <div className="list-row" key={theme}>
              <div className={`thumb ${got === ps.length ? 'done' : ''}`} style={{ width: 38, height: 38, fontSize: 16 }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{theme}</div>
                <div className="meter" style={{ marginTop: 6 }}>
                  <i style={{ width: `${(got / ps.length) * 100}%` }} />
                </div>
              </div>
              <b style={{ fontSize: 14 }}>
                {got}/{ps.length}
              </b>
            </div>
          );
        })}
      </div>

      <div className="section-label">업적</div>
      <div className="trophy-row">
        {trophies.map((t) => (
          <div className={`trophy ${t.ok ? '' : 'locked'}`} key={t.label}>
            <b style={{ fontFamily: 'var(--serif)', color: 'var(--shu)' }}>{t.icon}</b>
            {t.label}
          </div>
        ))}
      </div>

      {sel && selStat && (
        <Sheet onClose={() => setSel(null)}>
          <h3 style={{ margin: '0 0 4px' }}>{sel}</h3>
          {selStat.total === 0 ? (
            <>
              <p className="muted">아직 인장 장소가 없는 구예요. 가고 싶은 장소를 제안해 주세요.</p>
              <Link className="btn" to="/vote" onClick={() => setSel(null)}>
                장소 제안하기
              </Link>
            </>
          ) : (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                {selStat.got === selStat.total ? '★ 완성했어요!' : `완성까지 ${selStat.total - selStat.got}곳 남았어요`}
              </p>
              {selStat.places.map((p) => (
                <div className="list-row" key={p.id}>
                  <div className={`thumb ${visited.has(p.id) ? 'done' : ''}`} style={{ width: 36, height: 36, fontSize: 15 }}>
                    {visited.has(p.id) ? '✓' : p.nameKo[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <b>{p.nameKo}</b> <span className="muted">{p.nameJa}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </Sheet>
      )}
    </main>
  );
}
