import { useEffect, useRef, useState } from 'react';
import { getPlace, region } from '../regions';
import { MOTIF_BY_ID, pickMotifs } from '../regions/motifs';
import type { StampDef } from '../regions/types';
import { distanceM } from '../lib/geo';
import { describeCondition } from '../lib/rules';
import { useStore } from '../store';
import { Stamp } from './Stamp';
import { toast, useNow } from './ui';

/**
 * ⑨ 인장 제작 에이전트 — 데모 시연용.
 * 실제 LLM 호출 없이, 입력값과 앱 데이터에 규칙을 적용한 결과를 단계별로 보여 준다.
 *  A. 에이전트 생성: 입력 점검 → 모티프 선택 → 템플릿 3종 × 모티프로 초안 3안 → 자동 검수 → 사람 승인
 *  B. 디자이너 업로드: 파일 검수 → 낮·밤·비 버전 미리보기 → 사람 승인
 */

type Path = 'agent' | 'upload';
type Category = 'xmas' | 'sakura' | 'autumn' | 'festival' | 'always';

const CATEGORIES: Record<Category, { name: string; label: string; color: string; keyword: string }> = {
  xmas: { name: '크리스마스·연말', label: '성 탄', color: '#2f7d5b', keyword: '크리스마스 연말' },
  sakura: { name: '벚꽃 시즌', label: '벚 꽃', color: '#c2527a', keyword: '벚꽃 봄' },
  autumn: { name: '단풍 시즌', label: '단 풍', color: '#b8641c', keyword: '단풍 가을' },
  festival: { name: '축제·행사', label: '기 념', color: '#c8372d', keyword: '축제 행사 기념' },
  always: { name: '상시(기본)', label: '방 문', color: '#c8372d', keyword: '' },
};

const FRAMES: NonNullable<StampDef['frame']>[] = ['circle', 'octagon', 'hexagon'];
const FRAME_NAME = { circle: '원형', octagon: '팔각', hexagon: '육각' } as const;

interface Log {
  kind: 'step' | 'ok' | 'warn' | 'info';
  text: string;
}

interface Form {
  placeId: string;
  category: Category;
  label: string;
  title: string;
  intro: string;
  from: string;
  to: string;
  official: boolean;
}

const PRESETS: { name: string; path: Path; form: Form }[] = [
  {
    name: '크리스마스 명소 · 더현대 서울 (에이전트 생성)',
    path: 'agent',
    form: {
      placeId: 'thehyundai',
      category: 'xmas',
      label: '성 탄',
      title: '더현대 서울 크리스마스 인장',
      intro: '대형 크리스마스 트리와 일루미네이션',
      from: '2026-11-20',
      to: '2026-12-31',
      official: true,
    },
  },
  {
    name: '본선 행사 기념 · KOREC (디자이너 업로드)',
    path: 'upload',
    form: {
      placeId: 'korec',
      category: 'festival',
      label: '본선 기념',
      title: 'DigiMan 해커톤 본선 기념 인장(디자이너)',
      intro: '해커톤 본선 행사 기념',
      from: '2026-11-29',
      to: '2026-11-29',
      official: true,
    },
  },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function StampAgent({ onPlaceChange }: { onPlaceChange: (placeId: string) => void }) {
  const addCustomStamp = useStore((s) => s.addCustomStamp);
  const current = useNow();
  const [path, setPath] = useState<Path>('agent');
  const [form, setForm] = useState<Form>(PRESETS[0].form);
  const [logs, setLogs] = useState<Log[]>([]);
  const [running, setRunning] = useState(false);
  const [drafts, setDrafts] = useState<StampDef[]>([]);
  const [recommended, setRecommended] = useState(0);
  const [picked, setPicked] = useState(0);
  const [upload, setUpload] = useState<{ name: string; size: number; type: string; dataUrl: string } | null>(null);
  const [approved, setApproved] = useState<StampDef | null>(null);
  const runId = useRef(0);

  const place = getPlace(form.placeId);
  const cat = CATEGORIES[form.category];
  const limited = form.category !== 'always';

  useEffect(() => {
    onPlaceChange(form.placeId);
  }, [form.placeId, onPlaceChange]);

  const reset = () => {
    runId.current++;
    setLogs([]);
    setDrafts([]);
    setApproved(null);
    setRunning(false);
  };

  const set = (patch: Partial<Form>) => {
    reset();
    setForm((f) => ({ ...f, ...patch }));
  };

  const baseDef = (): StampDef => ({
    id: `custom-${form.placeId}-${Date.now().toString(36)}`,
    placeId: form.placeId,
    label: form.label || cat.label,
    color: cat.color,
    official: form.official,
    limited,
    title: form.title || `${place.nameKo} ${cat.name} 인장`,
    intro: form.intro,
    condition: limited ? { period: { from: form.from, to: form.to >= form.from ? form.to : form.from } } : undefined,
    hint: limited ? `${form.from.replaceAll('-', '.')}~${form.to.slice(5).replace('-', '.')} 한정` : undefined,
    baseIssued: 0,
  });

  const log = async (id: number, l: Log, ms = 420) => {
    await wait(ms);
    if (runId.current !== id) throw new Error('cancelled');
    setLogs((prev) => [...prev, l]);
  };

  const checkInputs = async (id: number) => {
    await log(id, { kind: 'step', text: '① 입력 점검' }, 200);
    await log(id, place.nameJa ? { kind: 'ok', text: `일본어 표기 「${place.nameJa}」 확인` } : { kind: 'warn', text: '일본어 표기가 없어요' });
    const near = region.places.filter((p) => p.id !== place.id && distanceM([p.lng, p.lat], [place.lng, place.lat]) < 150);
    await log(
      id,
      near.length
        ? { kind: 'warn', text: `150m 안에 비슷한 인장 장소가 있어요: ${near.map((p) => p.nameKo).join(', ')}` }
        : { kind: 'ok', text: `위치·장소명 일치: ${place.district} 좌표 반경 ${place.radiusM}m 안, 중복 장소 없음` },
    );
    if (limited) {
      await log(id, { kind: 'ok', text: `기간 ${describeCondition(baseDef().condition)} ↔ 서울시 문화행사 데이터(예시)와 일치` });
    }
    if (!form.intro.trim()) await log(id, { kind: 'warn', text: '한 줄 소개가 비어 있어 장소 데이터로 대신 채웠어요' });
  };

  const runAgent = async () => {
    const id = ++runId.current;
    setLogs([]);
    setDrafts([]);
    setApproved(null);
    setRunning(true);
    try {
      await checkInputs(id);
      await log(id, { kind: 'step', text: '② 모티프 선택' });
      const text = `${cat.keyword} ${form.intro} ${form.label}`;
      const motifs = pickMotifs(text).slice(0, 3);
      const usePlacePicto = !!region.pictograms[place.id];
      const ids: (string | undefined)[] = motifs.map((m) => m.id);
      if (ids.length < 3 && usePlacePicto) ids.push(undefined); // 장소 픽토그램도 후보로
      while (ids.length < 3) ids.push(['star-snow', 'ribbon', 'firework'].find((x) => !ids.includes(x)));
      const names = ids.map((m) => (m ? MOTIF_BY_ID.get(m)!.name : `${place.nameKo} 픽토그램`));
      await log(id, {
        kind: 'info',
        text: `키워드 ${[...new Set(text.split(/\s+/).filter((w) => w.length > 1))].slice(0, 4).map((w) => `'${w}'`).join(', ')} → 후보: ${names.join(', ')}`,
      });
      await log(id, { kind: 'step', text: '③ 초안 3안 생성 (템플릿 × 모티프)' });
      const base = baseDef();
      const ds: StampDef[] = ids.slice(0, 3).map((m, i) => ({ ...base, id: `${base.id}-${i}`, motif: m, frame: FRAMES[i], source: 'agent' }));
      for (let i = 0; i < 3; i++) {
        await log(id, { kind: 'info', text: `${i + 1}안: ${FRAME_NAME[FRAMES[i]]} 테두리 + ${names[i]}` }, 350);
        setDrafts(ds.slice(0, i + 1));
      }
      await log(id, { kind: 'step', text: '④ 자동 검수' });
      await log(id, { kind: 'ok', text: '로고·상표·캐릭터: 검수된 아이콘 세트만 사용' });
      const len = place.nameKo.length;
      await log(
        id,
        len > 8
          ? { kind: 'warn', text: `장소명 ${len}자라 글자가 작아요(약 ${Math.round(100 / len)}px) → 원형 1안을 추천` }
          : { kind: 'ok', text: `가독성: 장소명 ${len}자, 글자 크기 ${Math.min(17, Math.round(100 / len))}px 이상` },
      );
      await log(id, { kind: 'ok', text: '규격: 170×170, 날짜·발급 번호 영역 확보, 밤·비 버전 자동 생성 가능' });
      const rec = ids[0] ? 0 : 1;
      setRecommended(rec);
      setPicked(rec);
      await log(id, { kind: 'step', text: `검수 통과 · ${rec + 1}안 추천 — 사람이 확인하고 승인해 주세요` });
    } catch {
      /* 입력이 바뀌어 취소됨 */
    } finally {
      if (runId.current === id) setRunning(false);
    }
  };

  const loadSample = async () => {
    const res = await fetch('/samples/finals-emblem.svg');
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((r) => {
      const fr = new FileReader();
      fr.onload = () => r(String(fr.result));
      fr.readAsDataURL(blob);
    });
    setUpload({ name: 'finals-emblem.svg', size: blob.size, type: 'image/svg+xml', dataUrl });
    reset();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!/image\/(svg\+xml|png)/.test(file.type)) {
      toast('SVG 또는 PNG만 올릴 수 있어요');
      return;
    }
    if (file.size > 300 * 1024) {
      toast('300KB 이하 파일만 올릴 수 있어요(데모)');
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      setUpload({ name: file.name, size: file.size, type: file.type, dataUrl: String(fr.result) });
      reset();
    };
    fr.readAsDataURL(file);
  };

  const runUpload = async () => {
    if (!upload) {
      toast('파일을 올리거나 샘플 디자인을 불러와 주세요');
      return;
    }
    const id = ++runId.current;
    setLogs([]);
    setDrafts([]);
    setApproved(null);
    setRunning(true);
    try {
      await checkInputs(id);
      await log(id, { kind: 'step', text: '② 업로드 파일 검수' });
      await log(id, { kind: 'ok', text: `형식 ${upload.type === 'image/png' ? 'PNG' : 'SVG'} · 크기 ${(upload.size / 1024).toFixed(1)}KB (300KB 이하)` });
      await log(id, { kind: 'ok', text: '날짜·발급 번호는 시스템이 하단 지정 영역에 넣어요(디자인과 겹치지 않음)' });
      await log(id, { kind: 'ok', text: '로고·상표·캐릭터 의심 요소 없음(예시 검수)' });
      await log(id, { kind: 'step', text: '③ 밤·비 버전 생성 (색 변환 규칙)' });
      const def: StampDef = { ...baseDef(), image: upload.dataUrl, source: 'upload' };
      setDrafts([def]);
      setPicked(0);
      await log(id, { kind: 'step', text: '검수 통과 — 사람이 확인하고 승인해 주세요' });
    } catch {
      /* 취소 */
    } finally {
      if (runId.current === id) setRunning(false);
    }
  };

  const approve = () => {
    const d = drafts[picked];
    if (!d) return;
    const final: StampDef = { ...d, id: `custom-${form.placeId}-${Date.now().toString(36)}` };
    addCustomStamp(final);
    setApproved(final);
    toast(`'${final.title}'을(를) 등록했어요 · 오른쪽 QR로 바로 받을 수 있어요`);
  };

  const previewDate = limited ? new Date(`${form.from}T12:00`) : current;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>⑨ 인장 제작 에이전트</h3>
        <span className="tag">데모 시연 · AI 호출 없이 규칙으로 동작</span>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '6px 0 12px' }}>
        기본 정보를 넣으면 에이전트가 입력을 점검하고 초안을 만들어 검수해요. 등록은 사람이 승인해야 해요.
      </p>

      <div className="chips" style={{ marginBottom: 12 }}>
        {PRESETS.map((pr) => (
          <button
            key={pr.name}
            className="chip"
            onClick={() => {
              setPath(pr.path);
              set(pr.form);
              if (pr.path === 'upload') loadSample();
            }}
          >
            {pr.name}
          </button>
        ))}
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={`chip ${path === 'agent' ? 'on' : ''}`} onClick={() => (setPath('agent'), reset())}>
          A. 에이전트 생성
        </button>
        <button className={`chip ${path === 'upload' ? 'on' : ''}`} onClick={() => (setPath('upload'), reset())}>
          B. 디자이너 업로드
        </button>
      </div>

      <div className="row">
        <label className="field">
          <span>장소</span>
          <select className="input" value={form.placeId} onChange={(e) => set({ placeId: e.target.value })}>
            {region.places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameKo} ({p.district})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>카테고리</span>
          <select
            className="input"
            value={form.category}
            onChange={(e) => {
              const c = e.target.value as Category;
              set({ category: c, label: CATEGORIES[c].label });
            }}
          >
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <label className="field">
          <span>인장 상단 문구</span>
          <input className="input" value={form.label} maxLength={6} onChange={(e) => set({ label: e.target.value })} />
        </label>
        <label className="field">
          <span>인장 이름</span>
          <input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
      </div>
      <label className="field">
        <span>한 줄 소개</span>
        <input className="input" value={form.intro} onChange={(e) => set({ intro: e.target.value })} placeholder="예: 대형 크리스마스 트리와 일루미네이션" />
      </label>
      {limited && (
        <div className="row">
          <label className="field">
            <span>시작일</span>
            <input className="input" type="date" value={form.from} onChange={(e) => set({ from: e.target.value })} />
          </label>
          <label className="field">
            <span>종료일</span>
            <input className="input" type="date" value={form.to} onChange={(e) => set({ to: e.target.value })} />
          </label>
        </div>
      )}
      <label className="field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={form.official} onChange={(e) => set({ official: e.target.checked })} />
        <span style={{ margin: 0 }}>공식 인장 (등록 기관 인증)</span>
      </label>

      {path === 'upload' && (
        <div className="field">
          <span>디자인 파일 (SVG·PNG, 300KB 이하 · 그림 영역만, 날짜는 시스템이 넣음)</span>
          <div className="row" style={{ alignItems: 'center' }}>
            <input type="file" accept="image/svg+xml,image/png" onChange={(e) => onFile(e.target.files?.[0])} />
            <button className="btn secondary small" style={{ flex: 'none' }} onClick={loadSample}>
              샘플 디자인 불러오기
            </button>
          </div>
          {upload && (
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              {upload.name} · {(upload.size / 1024).toFixed(1)}KB
            </div>
          )}
        </div>
      )}

      <button className="btn" onClick={path === 'agent' ? runAgent : runUpload} disabled={running}>
        {running ? '에이전트 작업 중…' : path === 'agent' ? '에이전트에게 초안 3안 맡기기' : '업로드 파일 검수 맡기기'}
      </button>

      {logs.length > 0 && (
        <div className="agent-log">
          {logs.map((l, i) => (
            <div key={i} className={`agent-line ${l.kind}`}>
              <span className="mark">{l.kind === 'ok' ? '✓' : l.kind === 'warn' ? '!' : l.kind === 'step' ? '▸' : '·'}</span>
              {l.text}
            </div>
          ))}
          {running && <div className="agent-line info typing">…</div>}
        </div>
      )}

      {drafts.length > 0 && path === 'agent' && (
        <div className="draft-grid">
          {drafts.map((d, i) => (
            <button key={d.id} className={`draft ${picked === i ? 'on' : ''}`} onClick={() => setPicked(i)} disabled={!!approved}>
              {i === recommended && !running && <span className="tag shu draft-badge">추천</span>}
              <Stamp def={d} place={place} date={previewDate} serial={1} size={130} rotate={0} />
              <small>
                {i + 1}안 · {FRAME_NAME[d.frame!]} · {d.motif ? MOTIF_BY_ID.get(d.motif)?.name : '장소 픽토그램'}
              </small>
            </button>
          ))}
        </div>
      )}

      {drafts.length > 0 && path === 'upload' && (
        <div className="draft-grid">
          {(
            [
              ['낮 · 맑음', 'day', 'sunny'],
              ['밤', 'night', 'sunny'],
              ['비', 'day', 'rain'],
            ] as const
          ).map(([name, dp, w]) => (
            <div key={name} className="draft on" style={{ cursor: 'default' }}>
              <Stamp def={drafts[0]} place={place} date={previewDate} serial={1} size={130} rotate={0} daypart={dp} weather={w} />
              <small>{name}</small>
            </div>
          ))}
        </div>
      )}

      {drafts.length > 0 && !running && (
        <button className="btn dark" style={{ marginTop: 12 }} onClick={approve} disabled={!!approved}>
          {approved ? '등록 완료 · 오른쪽 현장 QR로 받기' : path === 'agent' ? `${picked + 1}안 승인하고 등록` : '승인하고 등록'}
        </button>
      )}
    </section>
  );
}
