import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stamp } from '../components/Stamp';
import { Sheet } from '../components/ui';
import { getPlace, region } from '../regions';
import type { StampDef } from '../regions/types';
import { describeCondition } from '../lib/rules';
import { DAYPART_LABEL, WEATHER_LABEL } from '../lib/labels';
import { dotDate, hm } from '../lib/time';
import { stampDefById, useStore, type Collected } from '../store';

type Tab = 'all' | 'limited' | 'official' | 'missed';

const rot = (s: string) => ((s.charCodeAt(0) + s.length * 3) % 11) - 5;

export default function Book() {
  const collected = useStore((s) => s.collected);
  const custom = useStore((s) => s.customStamps);
  const [tab, setTab] = useState<Tab>('all');
  const [open, setOpen] = useState<Collected | null>(null);
  const [ghost, setGhost] = useState<StampDef | null>(null);

  const sorted = useMemo(() => [...collected].sort((a, b) => b.at.localeCompare(a.at)), [collected]);
  const defOf = (c: Collected) => stampDefById(c.stampId);
  const limited = sorted.filter((c) => defOf(c)?.limited);
  const official = sorted.filter((c) => defOf(c)?.official);
  const got = new Set(collected.map((c) => c.stampId));
  const missed = [...region.limitedStamps, ...custom].filter((s) => s.limited && !got.has(s.id));

  const list = tab === 'all' ? sorted : tab === 'limited' ? limited : tab === 'official' ? official : [];

  return (
    <main className="page">
      <h1 className="page-title">나의 고슈인 수첩</h1>
      <p className="page-sub">장소에 가야만 받을 수 있는 그날의 인장이에요.</p>

      <div className="chips" style={{ marginBottom: 14 }}>
        {(
          [
            ['all', `전체 ${sorted.length}`],
            ['limited', `한정 ${limited.length}`],
            ['official', `공식 ${official.length}`],
            ['missed', `놓친 한정 ${missed.length}`],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab !== 'missed' && list.length === 0 && (
        <div className="card empty">
          아직 인장이 없어요.
          <br />
          장소에 가서 첫 인장을 받아 보세요.
          <br />
          <br />
          <Link className="btn small" to="/">
            인장 장소 보기
          </Link>
        </div>
      )}

      {tab !== 'missed' && list.length > 0 && (
        <div className="book">
          {list.map((c) => {
            const def = defOf(c);
            if (!def) return null;
            const place = getPlace(c.placeId);
            return (
              <button className="book-cell" key={c.uid} onClick={() => setOpen(c)}>
                <Stamp def={def} place={place} date={new Date(c.at)} serial={c.serial} size={128} rotate={rot(c.uid)} weather={c.weather} daypart={c.daypart} />
                <small>{dotDate(new Date(c.at))}</small>
              </button>
            );
          })}
          {tab === 'all' &&
            missed.slice(0, 4).map((s) => (
              <button className="book-cell ghost" key={s.id} onClick={() => setGhost(s)}>
                <Stamp def={s} place={getPlace(s.placeId)} size={128} rotate={rot(s.id)} ghost />
                <small>못 받은 한정 인장</small>
              </button>
            ))}
        </div>
      )}

      {tab === 'missed' && (
        <div className="book">
          {missed.map((s) => (
            <button className="book-cell ghost" key={s.id} onClick={() => setGhost(s)}>
              <Stamp def={s} place={getPlace(s.placeId)} size={128} rotate={rot(s.id)} ghost />
              <small>{describeCondition(s.condition)}</small>
            </button>
          ))}
          {missed.length === 0 && <div className="empty">놓친 한정 인장이 없어요.</div>}
        </div>
      )}

      {open && (
        <Sheet onClose={() => setOpen(null)}>
          {(() => {
            const def = defOf(open)!;
            const place = getPlace(open.placeId);
            const at = new Date(open.at);
            return (
              <>
                <div className="preview-pane">
                  <Stamp def={def} place={place} date={at} serial={open.serial} size={220} weather={open.weather} daypart={open.daypart} />
                </div>
                <dl className="kv">
                  <dt>인장</dt>
                  <dd>{def.title}</dd>
                  <dt>받은 때</dt>
                  <dd>
                    {dotDate(at)} {hm(at)}
                  </dd>
                  <dt>장소</dt>
                  <dd>
                    {place.nameKo} · {place.nameJa} ({place.district})
                  </dd>
                  <dt>그날의 기록</dt>
                  <dd>
                    {WEATHER_LABEL[open.weather]} · {DAYPART_LABEL[open.daypart]}
                  </dd>
                  <dt>번호</dt>
                  <dd>{open.serial.toLocaleString()}번째</dd>
                  <dt>인증</dt>
                  <dd>{open.via === 'qr' ? '현장 QR' : open.via === 'gps' ? 'GPS' : '예시 데이터'}</dd>
                </dl>
              </>
            );
          })()}
        </Sheet>
      )}

      {ghost && (
        <Sheet onClose={() => setGhost(null)}>
          <div className="preview-pane">
            <Stamp def={ghost} place={getPlace(ghost.placeId)} size={220} ghost />
          </div>
          <dl className="kv">
            <dt>인장</dt>
            <dd>{ghost.title}</dd>
            <dt>받을 수 있는 때</dt>
            <dd>{describeCondition(ghost.condition)}</dd>
            <dt>장소</dt>
            <dd>{getPlace(ghost.placeId).nameKo}</dd>
          </dl>
          <p className="muted" style={{ fontSize: 13.5 }}>
            다음 기회에 꼭 받아 보세요. 열리면 알림으로 알려 드릴게요.
          </p>
        </Sheet>
      )}
    </main>
  );
}
