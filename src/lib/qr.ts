/**
 * 데모용 현장 QR 키. 장소 id에서 고정값을 만든다.
 * 실서비스에서는 서버 비밀키로 30초마다 바뀌는 서명 토큰(TOTP 방식)을 발급해
 * QR 사진을 공유해도 인장을 받을 수 없게 한다.
 */
export function placeKey(placeId: string): string {
  let h = 5381;
  const s = `ko-shuin:${placeId}`;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function stampUrl(placeId: string, origin = window.location.origin): string {
  return `${origin}/s/${placeId}?k=${placeKey(placeId)}`;
}

/** 스캔한 문자열에서 장소 id와 키를 꺼낸다. */
export function parseStampUrl(text: string): { placeId: string; key: string } | null {
  try {
    const url = new URL(text);
    const m = url.pathname.match(/^\/s\/([\w-]+)$/);
    if (!m) return null;
    return { placeId: m[1], key: url.searchParams.get('k') ?? '' };
  } catch {
    return null;
  }
}
