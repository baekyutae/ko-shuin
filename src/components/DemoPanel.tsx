import { useState } from 'react';
import { Link } from 'react-router-dom';
import { region } from '../regions';
import { hm, toLocalInput, dotDate } from '../lib/time';
import { useStore } from '../store';
import { Sheet, toast, useNow } from './ui';

/** 시연용 패널: 시간·위치를 바꾸고 예시 데이터를 채운다. */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const debug = useStore((s) => s.debug);
  const setDebug = useStore((s) => s.setDebug);
  const seedDemo = useStore((s) => s.seedDemo);
  const resetAll = useStore((s) => s.resetAll);
  const current = useNow(5000);
  const active = debug.timeOffsetMs !== 0 || debug.locationPlaceId !== null;

  const setTime = (value: string) => {
    if (!value) return;
    setDebug({ timeOffsetMs: new Date(value).getTime() - Date.now() });
  };

  const snow = debug.manualFlags.includes('first-snow');

  return (
    <>
      <button className={`demo-fab ${active ? 'active' : ''}`} onClick={() => setOpen(true)}>
        시연 {active ? '· 켜짐' : ''}
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h3 style={{ margin: '0 0 4px' }}>시연 설정</h3>
          <p className="muted" style={{ margin: '0 0 16px', fontSize: 13.5 }}>
            발표·테스트용입니다. 실제 서비스에서는 서버 시간과 실제 위치로만 판정합니다.
          </p>

          <label className="field">
            <span>
              현재 시각 · {dotDate(current)} {hm(current)}
            </span>
            <input className="input" type="datetime-local" value={toLocalInput(current)} onChange={(e) => setTime(e.target.value)} />
          </label>
          <div className="chips" style={{ marginBottom: 18 }}>
            <button className="chip" onClick={() => setTime('2026-11-29T10:30')}>
              본선 당일 10:30
            </button>
            <button className="chip" onClick={() => setTime(`${toLocalInput(current).slice(0, 10)}T18:30`)}>
              오늘 18:30 (야경)
            </button>
            <button className="chip" onClick={() => setTime(`${toLocalInput(current).slice(0, 10)}T09:20`)}>
              오늘 09:20 (아침)
            </button>
            <button className="chip" onClick={() => setDebug({ timeOffsetMs: 0 })}>
              실제 시각
            </button>
          </div>

          <label className="field">
            <span>현재 위치</span>
            <select
              className="input"
              value={debug.locationPlaceId ?? ''}
              onChange={(e) => setDebug({ locationPlaceId: e.target.value || null })}
            >
              <option value="">실제 GPS 사용</option>
              {region.places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameKo} ({p.district})
                </option>
              ))}
            </select>
          </label>

          <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={snow}
              onChange={(e) =>
                setDebug({
                  manualFlags: e.target.checked
                    ? [...debug.manualFlags, 'first-snow']
                    : debug.manualFlags.filter((f) => f !== 'first-snow'),
                })
              }
            />
            <span style={{ margin: 0 }}>첫눈 이벤트 열기 (반포한강공원 첫눈 인장)</span>
          </label>

          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn secondary small"
              onClick={() => {
                seedDemo();
                toast('예시 기록(3일치)을 채웠어요');
              }}
            >
              예시 기록 채우기
            </button>
            <button
              className="btn secondary small"
              onClick={() => {
                if (confirm('모은 인장과 설정을 모두 지울까요?')) {
                  resetAll();
                  toast('초기화했어요');
                }
              }}
            >
              전체 초기화
            </button>
          </div>
          <Link to="/admin" className="btn dark" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>
            관리자 화면 (공식 인장·QR)
          </Link>
        </Sheet>
      )}
    </>
  );
}
