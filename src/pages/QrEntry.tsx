import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { placeById } from '../regions';
import { placeKey } from '../lib/qr';
import { useStore } from '../store';

/** 휴대폰 기본 카메라로 현장 QR을 찍으면 열리는 주소: /s/:placeId?k=... */
export default function QrEntry() {
  const { placeId = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const done = useRef(false);
  const valid = placeById.has(placeId) && params.get('k') === placeKey(placeId);

  useEffect(() => {
    if (!valid || done.current) return;
    done.current = true;
    const { uids, duplicate } = useStore.getState().award(placeId, 'qr');
    navigate(`/result?ids=${uids.join(',')}${duplicate ? '&dup=1' : ''}`, { replace: true });
  }, [valid, placeId, navigate]);

  if (valid) return <div className="empty">인장을 찍는 중…</div>;
  return (
    <main className="page">
      <div className="empty">
        확인되지 않은 QR이에요.
        <br />
        장소에 놓인 KO朱印 QR을 다시 찍어 주세요.
        <br />
        <br />
        <Link to="/">방문 화면으로</Link>
      </div>
    </main>
  );
}
