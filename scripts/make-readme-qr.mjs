// README용 테스트 QR(배포 주소 기준)을 만든다. 키 계산은 src/lib/qr.ts의 placeKey와 같다.
import QRCode from 'qrcode';

const ORIGIN = 'https://ko-shuin.vercel.app';
const placeKey = (placeId) => {
  let h = 5381;
  const s = `ko-shuin:${placeId}`;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

for (const placeId of process.argv.slice(2)) {
  const url = `${ORIGIN}/s/${placeId}?k=${placeKey(placeId)}`;
  await QRCode.toFile(`docs/qr-${placeId}.png`, url, { width: 360, margin: 2, color: { dark: '#1c1a17', light: '#ffffff' } });
  console.log(placeId, url);
}
