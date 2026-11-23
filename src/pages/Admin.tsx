import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stamp } from '../components/Stamp';
import { StampAgent } from '../components/StampAgent';
import { useNow } from '../components/ui';
import { baseStampOf, getPlace, region } from '../regions';
import { stampUrl } from '../lib/qr';
import { describeCondition } from '../lib/rules';
import { ymd } from '../lib/time';
import { useStore } from '../store';

const SOURCE_LABEL = { agent: '에이전트 생성', upload: '디자이너 업로드', manual: '직접 입력' } as const;

/** 기관·사업주용 관리자 화면: ⑨ 인장 제작 에이전트, 현장 QR 포스터, 등록 현황 */
export default function Admin() {
  const custom = useStore((s) => s.customStamps);
  const collected = useStore((s) => s.collected);
  const removeCustomStamp = useStore((s) => s.removeCustomStamp);
  const current = useNow();
  const [placeId, setPlaceId] = useState('thehyundai');
  const [qr, setQr] = useState('');

  const place = getPlace(placeId);
  const url = stampUrl(placeId);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 520, margin: 1, color: { dark: '#1c1a17', light: '#ffffff' } }).then(setQr);
  }, [url]);

  const todayAtPlace = collected.filter((c) => c.placeId === placeId && ymd(new Date(c.at)) === ymd(current)).length;
  const placeCustom = custom.filter((s) => s.placeId === placeId);

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
        <StampAgent onPlaceChange={setPlaceId} />

        <section className="stack">
          <div className="card qr-box">
            <h3 style={{ margin: 0 }}>{place.nameKo} 현장 QR 포스터</h3>
            {qr && <img src={qr} alt={`${place.nameKo} 인장 QR`} />}
            <div className="muted" style={{ fontSize: 13.5 }}>
              화면에 띄우거나 인쇄해 두면 방문자가 휴대폰 카메라로 찍어 인장을 받아요. 열려 있는 한정 인장도 함께 찍혀요.
            </div>
            <code>{url}</code>
            <p className="demo-note" style={{ margin: 0 }}>
              데모 QR은 고정 키입니다. 실서비스는 30초마다 바뀌는 서명 토큰으로 사진 공유를 막습니다.
            </p>
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 6px' }}>등록한 인장</h3>
            {custom.length === 0 && <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>아직 없어요. 왼쪽에서 에이전트로 만들어 보세요.</p>}
            {custom.map((s) => (
              <div className="list-row" key={s.id}>
                <Stamp def={s} place={getPlace(s.placeId)} size={52} rotate={0} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{s.title}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {getPlace(s.placeId).nameKo} · {describeCondition(s.condition)} · {s.source ? SOURCE_LABEL[s.source] : '직접 입력'} · 발급{' '}
                    {collected.filter((c) => c.stampId === s.id).length}
                  </div>
                </div>
                <button className="btn secondary small" onClick={() => removeCustomStamp(s.id)}>
                  삭제
                </button>
              </div>
            ))}
            {placeCustom.length > 0 && (
              <p className="demo-note" style={{ marginBottom: 0 }}>
                {place.nameKo} QR을 찍으면 위 인장 중 지금 기간에 해당하는 것이 함께 발급돼요.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 4px' }}>장소별 인장 미리보기</h3>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 14px' }}>
          명소 픽토그램이 있는 장소는 가운데에 그림이 들어가요(風景印 참고). 테두리는 테마별로 원(궁궐·문화)·팔각(시장·거리)·육각(전망·한강·공원).
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
