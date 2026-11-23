import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stamp } from '../components/Stamp';
import { toast, useNow } from '../components/ui';
import { baseStampOf, getPlace, region } from '../regions';
import type { StampDef } from '../regions/types';
import { stampUrl } from '../lib/qr';
import { describeCondition } from '../lib/rules';
import { ymd } from '../lib/time';
import { useStore } from '../store';

const COLORS = ['#c8372d', '#2f4b7c', '#b8641c', '#6b4fa0', '#2f7d5b', '#c2527a'];

const PRESETS = [
  { name: '본선 행사 기념', placeId: 'korec', label: '본선 기념', title: 'DigiMan 해커톤 본선 기념 인장', color: '#c8372d', official: true, from: '2026-11-29', to: '2026-11-29' },
  { name: '크리스마스 명소', placeId: 'thehyundai', label: '성 탄', title: '더현대 서울 크리스마스 인장', color: '#2f7d5b', official: true, from: '2026-12-01', to: '2026-12-25' },
  { name: '벚꽃 시즌', placeId: 'yeouido', label: '벚 꽃', title: '여의도 벚꽃 인장', color: '#c2527a', official: false, from: '2027-04-01', to: '2027-04-14' },
  { name: '축제 기간', placeId: 'yeouido', label: '불꽃 축제', title: '여의도 불꽃축제 인장', color: '#6b4fa0', official: true, from: '2027-10-02', to: '2027-10-02' },
];

/** 기관·사업주용 관리자 화면: 공식·한정 인장 등록과 현장 QR 출력 */
export default function Admin() {
  const custom = useStore((s) => s.customStamps);
  const collected = useStore((s) => s.collected);
  const addCustomStamp = useStore((s) => s.addCustomStamp);
  const removeCustomStamp = useStore((s) => s.removeCustomStamp);
  const current = useNow();

  const [placeId, setPlaceId] = useState('korec');
  const [label, setLabel] = useState('본선 기념');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [official, setOfficial] = useState(true);
  const [from, setFrom] = useState('2026-11-29');
  const [to, setTo] = useState('2026-11-29');
  const [useHours, setUseHours] = useState(false);
  const [fromH, setFromH] = useState(18);
  const [toH, setToH] = useState(24);
  const [limit, setLimit] = useState('');
  const [qr, setQr] = useState('');

  const place = getPlace(placeId);
  const url = stampUrl(placeId);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 520, margin: 1, color: { dark: '#1c1a17', light: '#ffffff' } }).then(setQr);
  }, [url]);

  const draft: StampDef = useMemo(
    () => ({
      id: `custom-${placeId}-${Date.now().toString(36)}`,
      placeId,
      label: label || '한 정',
      color,
      official,
      limited: true,
      title: title || `${place.nameKo} ${label || '한정'} 인장`,
      condition: {
        period: from ? { from, to: to && to >= from ? to : from } : undefined,
        hours: useHours ? [fromH, toH] : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      hint: from ? `${from.replaceAll('-', '.')}${to && to !== from ? `~${to.slice(5).replace('-', '.')}` : ''} 한정` : '기간 한정',
      baseIssued: 0,
    }),
    [placeId, label, color, official, title, place.nameKo, from, to, useHours, fromH, toH, limit],
  );

  const todayAtPlace = collected.filter((c) => c.placeId === placeId && ymd(new Date(c.at)) === ymd(current)).length;
  const register = () => {
    addCustomStamp({ ...draft, id: `custom-${placeId}-${Date.now().toString(36)}` });
    toast(`'${draft.title}' 을(를) 등록했어요`);
  };

  return (
    <div className="admin">
      <div className="admin-top">
        <b>KO朱印 파트너 관리</b>
        <Link to="/" className="icon-btn">
          ← 사용자 앱
        </Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <small>오늘 이 장소 인장 발급</small>
          <b>{(place.baseVisitors % 97) + todayAtPlace}</b>
        </div>
        <div className="kpi">
          <small>누적 방문자 (예시)</small>
          <b>{place.baseVisitors.toLocaleString()}</b>
        </div>
        <div className="kpi">
          <small>다음 방문지 1위 (예시)</small>
          <b style={{ fontSize: 18 }}>{region.transitions[placeId]?.[0] ? getPlace(region.transitions[placeId][0][0]).nameKo : '-'}</b>
        </div>
      </div>

      <div className="admin-grid">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>시즌·행사 한정 인장 등록</h3>
          <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
            한정은 실제로 그 시기에만 의미가 있는 장소에만 써요(벚꽃·단풍 시즌, 크리스마스 명소, 축제·행사 기간).
          </p>
          <div className="chips" style={{ marginBottom: 16 }}>
            {PRESETS.map((pr) => (
              <button
                key={pr.name}
                className="chip"
                onClick={() => {
                  setPlaceId(pr.placeId);
                  setLabel(pr.label);
                  setTitle(pr.title);
                  setColor(pr.color);
                  setOfficial(pr.official);
                  setFrom(pr.from);
                  setTo(pr.to);
                  setUseHours(false);
                  setLimit('');
                }}
              >
                {pr.name}
              </button>
            ))}
          </div>
          <label className="field">
            <span>장소</span>
            <select className="input" value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
              {region.places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameKo} ({p.district}){p.official ? ' · 공식 파트너' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <label className="field">
              <span>인장 상단 문구</span>
              <input className="input" value={label} maxLength={6} onChange={(e) => setLabel(e.target.value)} />
            </label>
            <label className="field">
              <span>인장 이름</span>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${place.nameKo} ${label} 인장`} />
            </label>
          </div>
          <div className="field">
            <span>색</span>
            <div className="chips">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="chip"
                  aria-label={c}
                  onClick={() => setColor(c)}
                  style={{ background: c, width: 34, height: 34, padding: 0, boxShadow: color === c ? '0 0 0 3px #fff, 0 0 0 5px #1c1a17' : 'none' }}
                />
              ))}
            </div>
          </div>
          <div className="row">
            <label className="field">
              <span>시즌·행사 시작일</span>
              <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span>종료일</span>
              <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span>선착순 수량 (선택)</span>
              <input className="input" type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="제한 없음" />
            </label>
          </div>
          <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={useHours} onChange={(e) => setUseHours(e.target.checked)} />
            <span style={{ margin: 0 }}>시간대 제한</span>
            {useHours && (
              <>
                <input className="input" style={{ width: 80 }} type="number" min={0} max={23} value={fromH} onChange={(e) => setFromH(Number(e.target.value))} />
                <span style={{ margin: 0 }}>시 ~</span>
                <input className="input" style={{ width: 80 }} type="number" min={1} max={24} value={toH} onChange={(e) => setToH(Number(e.target.value))} />
                <span style={{ margin: 0 }}>시</span>
              </>
            )}
          </label>
          <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={official} onChange={(e) => setOfficial(e.target.checked)} />
            <span style={{ margin: 0 }}>공식 인장 표시 (등록 기관 인증)</span>
          </label>
          <p className="muted" style={{ fontSize: 13 }}>
            조건: {describeCondition(draft.condition)}
          </p>
          <button className="btn" onClick={register}>
            인장 등록
          </button>

          {custom.length > 0 && (
            <>
              <h4 style={{ margin: '22px 0 6px' }}>등록한 인장</h4>
              {custom.map((s) => (
                <div className="list-row" key={s.id}>
                  <Stamp def={s} place={getPlace(s.placeId)} size={52} rotate={0} />
                  <div style={{ flex: 1 }}>
                    <b>{s.title}</b>
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {getPlace(s.placeId).nameKo} · {describeCondition(s.condition)} · 발급 {collected.filter((c) => c.stampId === s.id).length}
                    </div>
                  </div>
                  <button className="btn secondary small" onClick={() => removeCustomStamp(s.id)}>
                    삭제
                  </button>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="stack">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>미리보기</h3>
            <div className="preview-pane">
              <Stamp def={draft} place={place} date={from ? new Date(`${from}T12:00`) : current} serial={1} size={200} />
            </div>
          </div>
          <div className="card qr-box">
            <h3 style={{ margin: 0 }}>{place.nameKo} 현장 QR</h3>
            {qr && <img src={qr} alt={`${place.nameKo} 인장 QR`} />}
            <div className="muted" style={{ fontSize: 13.5 }}>
              화면에 띄우거나 인쇄해 두면 방문자가 휴대폰 카메라로 찍어 인장을 받아요.
            </div>
            <code>{url}</code>
            <p className="demo-note" style={{ margin: 0 }}>
              데모 QR은 고정 키입니다. 실서비스는 30초마다 바뀌는 서명 토큰으로 사진 공유를 막습니다.
            </p>
          </div>
        </section>
            </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 4px' }}>장소별 인장 미리보기</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
          명소 픽토그램이 있는 장소는 가운데에 그림이 들어가요(風景印 참고). 테두리는 테마별로 원(궁궐·문화)·팔각(시장·거리)·육각(전망·한강·공원).
          실서비스에서는 AI 픽토그램 초안을 사람이 검수해 등록합니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {region.places.map((p) => (
            <div key={p.id} className="preview-pane" style={{ flexDirection: 'column', alignItems: 'center', padding: 10 }}>
              <Stamp def={baseStampOf(p)} place={p} date={current} serial={p.baseVisitors} size={130} rotate={0} />
              <small className="muted" style={{ marginTop: 4 }}>
                {p.nameKo} · {region.pictograms[p.id] ? '픽토그램' : '글자형'}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
