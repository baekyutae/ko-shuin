import { useState } from 'react';
import { ymd } from '../lib/time';
import { now, useStore } from '../store';
import { Sheet, toast } from './ui';

/** ⑧ 연속 GPS 타임라인 켜기·끄기 (선택 기능, 기본값 꺼짐) */
export function TimelineCard() {
  const timeline = useStore((s) => s.timeline);
  const setTimeline = useStore((s) => s.setTimeline);
  const clearTrack = useStore((s) => s.clearTrack);
  const demoLocation = useStore((s) => s.debug.locationPlaceId);
  const [consent, setConsent] = useState(false);
  const today = ymd(now());
  const todayPoints = timeline.points.filter((p) => ymd(new Date(p.t)) === today).length;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>
            GPS 타임라인 <span className="tag">선택</span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
            {timeline.enabled
              ? demoLocation
                ? '켜짐 · 시연 위치를 쓰는 동안에는 기록하지 않아요'
                : `켜짐 · 오늘 ${todayPoints}개 지점 기록`
              : '켜면 인장 사이의 실제 이동선까지 순례 루트에 그려요'}
          </div>
        </div>
        <button
          className={`btn small ${timeline.enabled ? 'secondary' : 'dark'}`}
          style={{ flex: 'none' }}
          onClick={() => (timeline.enabled ? setTimeline(false) : setConsent(true))}
        >
          {timeline.enabled ? '끄기' : '켜기'}
        </button>
      </div>
      {timeline.points.length > 0 && (
        <button
          className="chip"
          style={{ marginTop: 10 }}
          onClick={() => {
            clearTrack();
            toast('위치 기록을 모두 지웠어요');
          }}
        >
          위치 기록 삭제 ({timeline.points.length})
        </button>
      )}

      {consent && (
        <Sheet onClose={() => setConsent(false)}>
          <h3 style={{ margin: '0 0 8px' }}>위치 기록에 동의하시겠어요?</h3>
          <ul className="muted" style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 18, margin: '0 0 16px' }}>
            <li>앱이 열려 있는 동안 20m 이상 움직일 때마다 위치를 기록해요.</li>
            <li>기록은 오늘의 순례 루트 카드에 실제 이동선을 그리는 데만 써요.</li>
            <li>데모에서는 이 기기에만 저장돼요. 언제든 끄고 기록을 지울 수 있어요.</li>
            <li>화면이 꺼지거나 앱을 닫으면 기록이 멈춰요(웹 제약).</li>
          </ul>
          <button
            className="btn"
            onClick={() => {
              setTimeline(true);
              setConsent(false);
              toast('GPS 타임라인을 켰어요');
            }}
          >
            동의하고 켜기
          </button>
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => setConsent(false)}>
            취소
          </button>
        </Sheet>
      )}
    </div>
  );
}
