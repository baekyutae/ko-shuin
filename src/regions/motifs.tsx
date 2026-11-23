import type { ReactNode } from 'react';

/**
 * ⑨ 인장 제작 에이전트가 고르는 모티프 아이콘 세트(76×44 선화).
 * LLM이 그림을 직접 그리지 않고, 검수된 아이콘 세트와 템플릿을 조합해 품질을 안정시킨다.
 */
export interface Motif {
  id: string;
  name: string;
  /** 이 모티프를 고르는 키워드 */
  keywords: string[];
  art: ReactNode;
}

const ground = <path d="M2 43 H74" />;

export const MOTIFS: Motif[] = [
  {
    id: 'xmas-tree',
    name: '트리',
    keywords: ['크리스마스', '성탄', '트리', '일루미네이션', '연말'],
    art: (
      <>
        <path d="M38 2 l1.6 3.3 l3.6 0.4 l-2.7 2.4 l0.8 3.5 l-3.3 -1.9 l-3.3 1.9 l0.8 -3.5 l-2.7 -2.4 l3.6 -0.4z" fill="currentColor" />
        <path d="M38 11 L28 22 H33 L24 32 H30 L20 40 H56 L46 32 H52 L43 22 H48Z" fill="currentColor" opacity="0.2" />
        <path d="M38 11 L28 22 H33 L24 32 H30 L20 40 H56 L46 32 H52 L43 22 H48Z" />
        <path d="M35 40 V43.5 H41 V40" />
        {[
          [34, 21],
          [42, 27],
          [31, 31],
          [45, 36],
          [36, 36],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
        ))}
        <path d="M8 10 v6 M5 13 h6 M66 6 v5 M63.5 8.5 h5 M68 24 v4 M66 26 h4" strokeWidth="1" />
      </>
    ),
  },
  {
    id: 'gift',
    name: '선물 상자',
    keywords: ['크리스마스', '성탄', '선물', '연말'],
    art: (
      <>
        <rect x="22" y="20" width="32" height="22" rx="1.5" fill="currentColor" opacity="0.18" />
        <rect x="22" y="20" width="32" height="22" rx="1.5" />
        <rect x="19" y="14" width="38" height="7" rx="1.5" />
        <path d="M38 14 V42" strokeWidth="2.4" />
        <path d="M38 14 C31 4 22 9 30 14 M38 14 C45 4 54 9 46 14" />
        <path d="M6 30 l2 -2 l2 2 l-2 2z M68 18 l2 -2 l2 2 l-2 2z M64 38 l1.5 -1.5 l1.5 1.5 l-1.5 1.5z" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'star-snow',
    name: '별과 눈',
    keywords: ['크리스마스', '겨울', '첫눈', '눈', '연말'],
    art: (
      <>
        <path d="M38 4 l4.4 9 l9.8 1.2 l-7.2 6.6 l2 9.6 l-9 -5 l-9 5 l2 -9.6 l-7.2 -6.6 l9.8 -1.2z" fill="currentColor" opacity="0.22" />
        <path d="M38 4 l4.4 9 l9.8 1.2 l-7.2 6.6 l2 9.6 l-9 -5 l-9 5 l2 -9.6 l-7.2 -6.6 l9.8 -1.2z" />
        {[
          [10, 14],
          [64, 12],
          [14, 34],
          [62, 34],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} strokeWidth="1">
            <path d={`M${x - 4} ${y} H${x + 4} M${x - 2} ${y - 3.5} L${x + 2} ${y + 3.5} M${x + 2} ${y - 3.5} L${x - 2} ${y + 3.5}`} />
          </g>
        ))}
        {ground}
      </>
    ),
  },
  {
    id: 'sakura',
    name: '벚꽃',
    keywords: ['벚꽃', '봄', '꽃'],
    art: (
      <>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="38" cy="14" rx="5.4" ry="9" transform={`rotate(${a} 38 22)`} fill="currentColor" opacity="0.2" />
        ))}
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={`o${a}`} cx="38" cy="14" rx="5.4" ry="9" transform={`rotate(${a} 38 22)`} />
        ))}
        <circle cx="38" cy="22" r="2.4" fill="currentColor" />
        <path d="M8 38 q4 -4 8 0 M58 10 q3 -3 6 0 M62 36 q3 -3 6 0" strokeWidth="1" />
      </>
    ),
  },
  {
    id: 'maple',
    name: '단풍잎',
    keywords: ['단풍', '가을', '은행'],
    art: (
      <>
        <path d="M38 4 L41 14 L49 9 L46 19 L56 18 L49 25 L54 30 L42 29 L40 40 H36 L34 29 L22 30 L27 25 L20 18 L30 19 L27 9 L35 14Z" fill="currentColor" opacity="0.2" />
        <path d="M38 4 L41 14 L49 9 L46 19 L56 18 L49 25 L54 30 L42 29 L40 40 H36 L34 29 L22 30 L27 25 L20 18 L30 19 L27 9 L35 14Z" />
        <path d="M38 40 V44" />
        {ground}
      </>
    ),
  },
  {
    id: 'firework',
    name: '불꽃',
    keywords: ['축제', '불꽃', '행사', '공연'],
    art: (
      <>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return <path key={i} d={`M${38 + Math.cos(a) * 5} ${18 + Math.sin(a) * 5} L${38 + Math.cos(a) * 14} ${18 + Math.sin(a) * 14}`} />;
        })}
        <circle cx="38" cy="18" r="2" fill="currentColor" />
        <path d="M10 14 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1z M64 8 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1z" fill="currentColor" />
        <path d="M0 42 q4 -2.6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" strokeWidth="1.1" />
      </>
    ),
  },
  {
    id: 'ribbon',
    name: '기념 리본',
    keywords: ['기념', '본선', '행사', '해커톤'],
    art: (
      <>
        <circle cx="38" cy="16" r="11" fill="currentColor" opacity="0.18" />
        <circle cx="38" cy="16" r="11" />
        <circle cx="38" cy="16" r="7" strokeWidth="1" />
        <path d="M31 25 L27 41 L33 37 L36 42 L37 27 M45 25 L49 41 L43 37 L40 42 L39 27" />
      </>
    ),
  },
];

export const MOTIF_BY_ID = new Map(MOTIFS.map((m) => [m.id, m]));

/** 입력 키워드로 모티프 후보를 고른다(⑨ 에이전트 시연용 규칙). */
export function pickMotifs(text: string): Motif[] {
  const scored = MOTIFS.map((m) => ({ m, s: m.keywords.filter((k) => text.includes(k)).length })).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}
