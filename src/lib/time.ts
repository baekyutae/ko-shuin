const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dotDate(d: Date): string {
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

export function hm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local 입력값 형식 */
export function toLocalInput(d: Date): string {
  return `${ymd(d)}T${hm(d)}`;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function hmFromMinutes(min: number): string {
  const m = Math.round(min);
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function kanjiNum(n: number): string {
  if (n <= 10) return n === 10 ? '十' : KANJI[n];
  if (n < 20) return `十${KANJI[n - 10]}`;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${KANJI[t]}十${o ? KANJI[o] : ''}`;
}

/** 고슈인 식 일본 연호 날짜. 예: 令和八年十一月二十九日 (2019.5.1 이후만 레이와) */
export function reiwaDate(d: Date): string {
  const y = d.getFullYear() - 2018;
  const year = y === 1 ? '元' : kanjiNum(y);
  return `令和${year}年${kanjiNum(d.getMonth() + 1)}月${kanjiNum(d.getDate())}日`;
}

// 서울의 월별 대략적인 해 뜨는/지는 시각(분). 낮/밤 디자인 판정용 근사값
const SUN: [number, number][] = [
  [465, 1055], [445, 1085], [410, 1115], [365, 1145], [330, 1170], [310, 1195],
  [320, 1195], [345, 1170], [370, 1130], [395, 1085], [425, 1045], [455, 1035],
];

export function isNight(d: Date): boolean {
  const [rise, set] = SUN[d.getMonth()];
  const m = d.getHours() * 60 + d.getMinutes();
  return m < rise || m >= set;
}

export function sunsetLabel(d: Date): string {
  return hmFromMinutes(SUN[d.getMonth()][1]);
}
