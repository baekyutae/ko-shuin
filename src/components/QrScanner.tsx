import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { parseStampUrl } from '../lib/qr';

interface Props {
  onClose: () => void;
  onResult: (r: { placeId: string; key: string }) => void;
}

/** 카메라로 현장 QR을 읽는다. 카메라는 HTTPS(또는 localhost)에서만 열린다. */
export function QrScanner({ onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState('장소에 놓인 KO朱印 QR을 네모 안에 맞춰 주세요.');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && ctx && v.readyState === v.HAVE_ENOUGH_DATA) {
        const w = 480;
        const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(v, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          const parsed = parseStampUrl(code.data);
          if (parsed) {
            stopped = true;
            onResult(parsed);
            return;
          }
          setMsg('KO朱印 QR이 아니에요. 장소에 놓인 QR을 찍어 주세요.');
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMsg('이 환경에서는 카메라를 쓸 수 없어요. HTTPS 주소로 접속했는지 확인해 주세요.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        raf = requestAnimationFrame(tick);
      } catch {
        setMsg('카메라 권한이 필요해요. 브라우저 설정에서 카메라를 허용해 주세요.');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="scanner">
      <div className="scan-top">
        <b>QR로 인장 받기</b>
        <button className="icon-btn" onClick={onClose}>
          닫기
        </button>
      </div>
      <video ref={videoRef} playsInline muted />
      <div className="frame" />
      <div className="scan-msg">{msg}</div>
    </div>
  );
}
