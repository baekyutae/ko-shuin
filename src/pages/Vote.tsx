import { useState } from 'react';
import { Sheet, toast } from '../components/ui';
import { region } from '../regions';
import { useStore, VOTE_GOAL } from '../store';

const STATUS = {
  voting: { label: '투표 중', cls: 'tag' },
  review: { label: '검토 중', cls: 'tag shu' },
  added: { label: '인장 생김', cls: 'tag shu' },
} as const;

export default function Vote() {
  const proposals = useStore((s) => s.proposals);
  const voted = useStore((s) => s.voted);
  const collectedCount = useStore((s) => s.collected.length);
  const vote = useStore((s) => s.vote);
  const addProposal = useStore((s) => s.addProposal);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [reason, setReason] = useState('');

  const districts = region.districts.features.map((f) => f.properties.name).sort();
  const canVote = collectedCount > 0;

  const onVote = (id: string) => {
    if (!canVote) {
      toast('인장을 1개 이상 받은 사람만 투표할 수 있어요');
      return;
    }
    const p = vote(id);
    if (p?.status === 'review') toast(`🎉 ${p.name} ${VOTE_GOAL}표 달성! 검토 후 새 인장이 생겨요`);
  };

  const submit = () => {
    if (!name.trim() || !district) {
      toast('장소 이름과 구를 입력해 주세요');
      return;
    }
    addProposal({ name: name.trim(), district, reason: reason.trim() });
    setFormOpen(false);
    setName('');
    setDistrict('');
    setReason('');
    toast('제안했어요. 첫 표는 내가 넣었어요');
  };

  const sorted = [...proposals].sort((a, b) => {
    const rank = { review: 0, voting: 1, added: 2 } as const;
    return rank[a.status] - rank[b.status] || b.votes - a.votes;
  });

  return (
    <main className="page">
      <h1 className="page-title">새 인장 만들기</h1>
      <p className="page-sub">
        가고 싶은 장소를 제안하고 투표해요. {VOTE_GOAL}표를 넘으면 검토를 거쳐 새 인장이 생기고, 제안·투표한 사람에게 알려 드려요.
      </p>

      <button className="btn" onClick={() => setFormOpen(true)}>
        장소 제안하기
      </button>

      <div className="section-label">
        제안된 장소 <small>{canVote ? '1인 1표' : '인장 1개 이상 보유 시 투표 가능'}</small>
      </div>
      <div className="card">
        {sorted.map((p) => {
          const pct = Math.min(100, (p.votes / VOTE_GOAL) * 100);
          const did = voted.includes(p.id);
          return (
            <div className="prop" key={p.id}>
              <div className="prop-head">
                <div>
                  <div className="prop-name">
                    {p.name} <span className={STATUS[p.status].cls}>{STATUS[p.status].label}</span>
                    {p.mine && (
                      <span className="tag" style={{ marginLeft: 4 }}>
                        내 제안
                      </span>
                    )}
                  </div>
                  <div className="prop-reason">
                    {p.district}
                    {p.reason && ` · ${p.reason}`}
                  </div>
                </div>
                {p.status === 'voting' && (
                  <button className={`btn small ${did ? 'secondary' : ''}`} disabled={did} onClick={() => onVote(p.id)} style={{ flex: 'none' }}>
                    {did ? '투표함' : '투표'}
                  </button>
                )}
              </div>
              <div className="meter">
                <i style={{ width: `${pct}%` }} />
              </div>
              <div className="meter-label">
                <span>
                  {p.votes}표 / {VOTE_GOAL}표
                </span>
                <span>
                  {p.status === 'voting'
                    ? `${VOTE_GOAL - p.votes}표 남음`
                    : p.status === 'review'
                      ? '운영팀 검토 중 (주거지·사유지·안전 확인)'
                      : '인장 장소에 추가됨'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="demo-note">투표 수는 예시 데이터입니다. 실서비스는 장소당 1인 1표, 인장 보유자만 투표할 수 있게 서버에서 검증합니다.</p>

      {formOpen && (
        <Sheet onClose={() => setFormOpen(false)}>
          <h3 style={{ margin: '0 0 14px' }}>장소 제안</h3>
          <label className="field">
            <span>장소 이름</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 익선동 한옥거리" />
          </label>
          <label className="field">
            <span>구</span>
            <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">선택</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>추천 이유 (선택)</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 저녁 분위기가 좋아요" />
          </label>
          <button className="btn" onClick={submit}>
            제안하기
          </button>
        </Sheet>
      )}
    </main>
  );
}
