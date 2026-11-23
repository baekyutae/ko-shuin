import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosition } from '../hooks/usePosition';
import { region } from '../regions';
import { quietestHour } from '../lib/crowd';
import type { LngLat } from '../lib/geo';
import { WEATHER_LABEL } from '../lib/labels';
import { parseRequest, planTour, type PlanRequest, type TourPlan } from '../lib/planner';
import { hmFromMinutes, ymd } from '../lib/time';
import { now, useStore } from '../store';

const RoutePreviewMap = lazy(() => import('../components/RoutePreviewMap'));

type Msg =
  | { role: 'user'; text: string }
  | { role: 'tools'; lines: string[] }
  | { role: 'agent'; text: string; plan?: TourPlan; done?: string[]; push?: boolean };

const EXAMPLES = ['오후 3시간, 성수 근처, 카페도 들르고 싶어', '신촌에서 2시간, 한산한 곳 위주로', '종로에서 반나절, 궁이랑 시장 보고 싶어'];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ⑩ 인장 투어 플래너 에이전트 — 데모 시연(규칙 기반, AI 호출 없음) */
export default function Planner() {
  const pos = usePosition();
  const collected = useStore((s) => s.collected);
  const custom = useStore((s) => s.customStamps);
  const flags = useStore((s) => s.debug.manualFlags);
  const appWeather = useStore((s) => s.debug.weather);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'agent',
      text: '어디서, 얼마나, 무엇을 하고 싶은지 말해 주세요. 인장 장소·혼잡도·날씨·영업시간·함께 들른 장소 데이터 안에서만 루트를 짜요.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ req: PlanRequest; plan: TourPlan; done: number; rain: boolean; crowd: Record<string, number> } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 최신 Chrome은 scrollIntoView가 Promise를 돌려주므로 반환하지 않는다(정리 함수로 오인됨).
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs]);

  const origin: LngLat = pos.coords ?? region.center;
  const ctxBase = () => ({ at: now(), collected, custom, flags });

  const runTools = async (lines: string[]) => {
    setMsgs((m) => [...m, { role: 'tools', lines: [] }]);
    for (const l of lines) {
      await wait(380);
      setMsgs((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last.role === 'tools') copy[copy.length - 1] = { role: 'tools', lines: [...last.lines, l] };
        return copy;
      });
    }
    await wait(300);
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    const req = parseRequest(text);
    const weather = req.indoor ? 'rain' : appWeather;
    const plan = planTour(req, origin, { ...ctxBase(), weather });
    await runTools([
      `요청 해석: ${req.area ? `지역 ${req.area.label}` : '지역 없음 → 현재 위치 기준'} · ${Math.floor(req.budgetMin / 60)}시간${req.budgetMin % 60 ? ` ${req.budgetMin % 60}분` : ''}${req.interests.length ? ` · 관심사 ${req.interests.join(', ')}` : ''}${req.quiet ? ' · 한산함 우선' : ''}`,
      `인장 DB 조회: 근처 인장 장소 ${plan.searched}곳`,
      '혼잡도 조회: 서울시 실시간 도시데이터 (예시 데이터)',
      `날씨: ${WEATHER_LABEL[weather]}${weather !== 'sunny' ? ' → 실내 장소 우선' : ''}`,
      '영업시간 확인 (예시 데이터)',
      '함께 들른 장소(⑦) 데이터 반영',
    ]);
    if (!plan.stops.length) {
      setMsgs((m) => [...m, { role: 'agent', text: '조건에 맞는 인장 장소를 찾지 못했어요. 시간을 늘리거나 다른 지역으로 말해 주세요.' }]);
      setBusy(false);
      return;
    }
    const limitedCount = plan.stops.reduce((n, s) => n + s.limited.length, 0);
    setMsgs((m) => [
      ...m,
      {
        role: 'agent',
        text: `${req.area ? `${req.area.label}에 도착한 뒤` : '현재 위치에서'} ${plan.stops.length}곳을 이었어요. 이동·체류 포함 약 ${plan.usedMin}분, 인장 ${plan.stops.length}개${limitedCount ? ` + 한정 ${limitedCount}개` : ''}예요.`,
        plan,
      },
    ]);
    setState({ req, plan, done: 0, rain: weather !== 'sunny', crowd: {} });
    setBusy(false);
  };

  /** 상황 변화 시연: 첫 장소를 마친 뒤 비가 오거나 다음 장소가 붐비기 시작함 → 에이전트가 먼저 알리고 다시 제안 */
  const simulate = async (kind: 'rain' | 'crowd') => {
    if (!state || busy) return;
    setBusy(true);
    const done = Math.max(1, state.done);
    const doneStops = state.plan.stops.slice(0, done);
    const here = doneStops[doneStops.length - 1];
    const remaining = state.req.budgetMin - (here.leave - state.plan.stops[0].arrive + state.plan.stops[0].walk);
    const crowd = { ...state.crowd };
    const next = state.plan.stops[done];
    if (kind === 'crowd' && next) crowd[next.place.id] = 3;
    const rain = kind === 'rain' ? true : state.rain;
    const at = new Date(now().getTime() + (here.leave - (now().getHours() * 60 + now().getMinutes())) * 60000);
    const re = planTour({ ...state.req, budgetMin: Math.max(60, remaining), area: null }, [here.place.lng, here.place.lat], {
      ...ctxBase(),
      at,
      weather: rain ? 'rain' : appWeather,
      crowdOverride: crowd,
      exclude: doneStops.map((s) => s.place.id),
    });
    await wait(500);
    let text: string;
    if (kind === 'rain') {
      text = `🌧 지금 ${state.req.area?.label ?? '근처'}에 비가 오기 시작했어요(시연). ${here.place.nameKo} 다음 루트를 실내 위주로 다시 짰어요. 오늘 받는 인장은 비 버전 디자인으로 찍혀요.`;
    } else if (next) {
      const stillIn = re.stops.findIndex((s) => s.place.id === next.place.id);
      const qh = quietestHour(next.place, ymd(at), at.getHours() + 1);
      text =
        stillIn < 0
          ? `👥 다음 장소 ${next.place.nameKo}가 지금 붐비기 시작했어요(시연). 루트에서 빼고 한산한 곳으로 바꿨어요${qh ? ` · ${next.place.nameKo}는 ${qh}시쯤 한산해질 예정이에요` : ''}.`
          : `👥 다음 장소 ${next.place.nameKo}가 붐비기 시작해서(시연) 순서를 뒤로 미뤘어요.`;
    } else {
      text = '남은 장소가 없어 루트를 그대로 둘게요.';
    }
    setMsgs((m) => [...m, { role: 'agent', push: true, text, plan: re, done: doneStops.map((s) => s.place.nameKo) }]);
    setState({ ...state, plan: { ...re, stops: [...doneStops, ...re.stops] }, done, rain, crowd });
    setBusy(false);
  };

  const lastPlanIndex = msgs.map((m, i) => (m.role === 'agent' && m.plan ? i : -1)).filter((i) => i >= 0).pop();

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 className="page-title">인장 투어 플래너</h1>
        <span className="tag">고도화 · 데모 시연</span>
      </div>
      <p className="page-sub" style={{ marginBottom: 10 }}>
        대화로 루트를 짜고, 상황이 바뀌면 먼저 다시 제안해요. 지금은 AI 호출 없이 규칙과 앱 데이터로 시연해요.
      </p>

      <div className="chat">
        {msgs.map((m, i) => {
          if (m.role === 'user') return <div key={i} className="bubble user">{m.text}</div>;
          if (m.role === 'tools')
            return (
              <div key={i} className="tool-steps">
                {m.lines.map((l, j) => (
                  <div key={j}>⚙ {l}</div>
                ))}
              </div>
            );
          return (
            <div key={i} className={`bubble agent ${m.push ? 'push' : ''}`}>
              {m.push && <div style={{ fontSize: 12, fontWeight: 700, color: '#8a6500', marginBottom: 4 }}>먼저 알려 드려요</div>}
              {m.text}
              {m.done && m.done.length > 0 && (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  완료: {m.done.join(' → ')}
                </div>
              )}
              {m.plan && m.plan.stops.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {m.plan.stops.map((s, k) => (
                    <div key={s.place.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                      <div className="rank" style={{ background: s.crowd.color, marginTop: 2 }}>
                        {k + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>
                          {hmFromMinutes(s.arrive)} {s.place.nameKo}
                        </div>
                        <div className="muted" style={{ fontSize: 12.5 }}>
                          {s.mode === 'walk' ? `도보 ${s.walk}분` : `지하철·버스 약 ${s.walk}분`} · 30분 머물기
                        </div>
                        <div className="tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {s.reasons.map((r) => (
                            <span key={r} className="tag">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {i === lastPlanIndex && (
                    <div className="route-wrap" style={{ height: 220, minHeight: 0, marginTop: 10 }}>
                      <Suspense fallback={null}>
                        <RoutePreviewMap
                          origin={m.done || state?.req.area ? null : pos.coords}
                          stops={m.plan.stops.map((s) => ({ coord: [s.place.lng, s.place.lat] as LngLat, label: s.place.nameKo, color: s.crowd.color }))}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {busy && <div className="tool-steps typing">에이전트가 생각하는 중…</div>}
        <div ref={endRef} />
      </div>

      {state && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>상황 바꿔 보기 (시연)</div>
          <div className="row">
            <button className="btn secondary small" disabled={busy} onClick={() => simulate('rain')}>
              🌧 비가 오기 시작
            </button>
            <button className="btn secondary small" disabled={busy} onClick={() => simulate('crowd')}>
              👥 다음 장소가 붐빔
            </button>
          </div>
          <p className="demo-note" style={{ marginBottom: 0 }}>
            첫 장소를 마친 뒤의 상황을 가정해요. 실서비스는 날씨·혼잡도 변화를 감지해 푸시 알림으로 먼저 알려요.
          </p>
        </div>
      )}

      <div className="chips" style={{ marginTop: 14 }}>
        {EXAMPLES.map((e) => (
          <button key={e} className="chip" disabled={busy} onClick={() => send(e)}>
            {e}
          </button>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="예: 홍대에서 2시간, 한산한 곳 위주로" />
        <button className="btn small" type="submit" disabled={busy || !input.trim()} style={{ flex: 'none' }}>
          보내기
        </button>
      </form>
      <p className="demo-note">
        규칙 기반 시연: 문장에서 지역·시간·관심사를 키워드로 뽑아요. 실서비스는 LLM이 대화를 이해하되, 장소는 인장 DB에서만 골라 없는 장소를 만들지 않아요.{' '}
        <Link to="/now">규칙 기반 추천(③) 보기</Link>
      </p>
    </main>
  );
}
