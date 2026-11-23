import type { ReactNode } from 'react';

/**
 * 장소 픽토그램(76×44 상자 안의 선화). 색은 인장 먹색(currentColor)을 따른다.
 * 참고: 일본 風景印(명소를 그린 날짜 도장), JR 東日本 역 스탬프(지역 상징 + 테두리 모양).
 * 실서비스에서는 AI가 초안을 만들고 사람이 검수한 뒤 등록한다(로고·상표 미사용).
 */
const waves = (y: number) => <path d={`M0 ${y} q4 -2.6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0`} strokeWidth="1.1" />;

export const seoulPictograms: Record<string, ReactNode> = {
  // 경복궁 근정전: 이층 팔작지붕, 월대, 뒤의 북악산
  gyeongbokgung: (
    <>
      <path d="M1 31 Q12 12 26 17 Q37 5 50 14 Q62 9 75 31" strokeWidth="0.9" opacity="0.55" />
      <path d="M19 19.5 Q24 18.5 27 13 L49 13 Q52 18.5 57 19.5 Q38 16.8 19 19.5Z" fill="currentColor" />
      <path d="M27 19.8 H49 V23 H27Z" strokeWidth="1" />
      <path d="M31 19.8 V23 M38 19.8 V23 M45 19.8 V23" strokeWidth="0.8" />
      <path d="M6 28.5 Q13 27.6 19 22.6 L57 22.6 Q63 27.6 70 28.5 Q38 25.2 6 28.5Z" fill="currentColor" />
      <path d="M17 28 V35.5 M25 28 V35.5 M33 28 V35.5 M43 28 V35.5 M51 28 V35.5 M59 28 V35.5" />
      <path d="M11 35.5 H65 M7 39 H69 M3 42.5 H73" />
      <path d="M34 35.5 V42.5 M42 35.5 V42.5" strokeWidth="0.8" />
    </>
  ),
  // N서울타워: 남산 능선, 타워, 케이블카
  namsan: (
    <>
      <path d="M0 43 Q18 27 38 31 Q57 26 76 43Z" fill="currentColor" opacity="0.16" stroke="none" />
      <path d="M0 43 Q18 27 38 31 Q57 26 76 43" />
      <path d="M36.2 31 L37 13.5 M39.8 31 L39 13.5" />
      <ellipse cx="38" cy="12.2" rx="6.5" ry="2.3" fill="currentColor" />
      <path d="M33.5 9.6 H42.5 L41.4 7 H34.6Z" />
      <path d="M38 7 V0.6" />
      <path d="M2 21 L31 32" strokeWidth="0.7" />
      <rect x="11" y="22.6" width="5.6" height="4.2" rx="1" fill="currentColor" transform="rotate(21 13.8 24.7)" />
      <path d="M13.6 22.4 L14.4 20.6" strokeWidth="0.7" />
    </>
  ),
  // 광장시장: 줄무늬 차양 노점과 빈대떡
  gwangjang: (
    <>
      <path d="M5 11 H71" />
      <path d="M5 11 V16 Q9 20.5 13 16 Q17 20.5 21 16 Q25 20.5 29 16 Q33 20.5 37 16 Q41 20.5 45 16 Q49 20.5 53 16 Q57 20.5 61 16 Q65 20.5 71 16 V11" />
      <path d="M13 11 V16 M29 11 V16 M45 11 V16 M61 11 V16" strokeWidth="3.2" opacity="0.55" />
      <path d="M8 18 V40 M68 18 V40" />
      <path d="M4 40 H72" />
      <path d="M12 31 H64" strokeWidth="1" />
      <ellipse cx="38" cy="34" rx="12" ry="5" fill="currentColor" opacity="0.18" />
      <ellipse cx="38" cy="34" rx="12" ry="5" />
      <circle cx="33" cy="33" r="1.1" fill="currentColor" />
      <circle cx="40" cy="35.5" r="1.1" fill="currentColor" />
      <circle cx="43" cy="32.4" r="1.1" fill="currentColor" />
      <path d="M31 27 q2.2 -2.6 0 -5.2 M38 26 q2.2 -2.6 0 -5.2 M45 27 q2.2 -2.6 0 -5.2" strokeWidth="1" />
    </>
  ),
  // 북촌한옥마을: 비탈을 따라 겹친 한옥 지붕
  bukchon: (
    <>
      <path d="M13 13 Q18 12.4 21 8 L43 8 Q46 12.4 51 13 Q32 10.6 13 13Z" fill="currentColor" />
      <path d="M20 13 V20 M44 13 V20" strokeWidth="0.9" />
      <path d="M29 22 Q34 21.4 37 17 L59 17 Q62 21.4 67 22 Q48 19.6 29 22Z" fill="currentColor" />
      <path d="M36 22 H60 V30 H36Z" strokeWidth="1" />
      <path d="M44 22 V30 M52 22 V30" strokeWidth="0.8" />
      <path d="M1 31 Q6 30.4 9 26 L31 26 Q34 30.4 39 31 Q20 28.6 1 31Z" fill="currentColor" />
      <path d="M8 31 H32 V40 H8Z" strokeWidth="1" />
      <path d="M17 31 V40 M23 31 V40 M17 35.5 H23" strokeWidth="0.8" />
      <path d="M40 43 L46 37 H52 L56 33 H62 L66 29 H76" strokeWidth="1" />
      <path d="M0 43 H76" />
    </>
  ),
  // 동대문디자인플라자: 흐르는 곡면 건물과 LED 장미
  ddp: (
    <>
      <path d="M3 35 C3 19 21 11 37 15 C51 18 57 8 70 14 C77 18 75 35 66 36.5 L7 36.5 C4.5 36.5 3 36 3 35Z" />
      <path d="M8 30 C13 21 26 17 37 20 C51 23 57 15 69 19" strokeWidth="0.8" />
      <path d="M6 25.5 C12 17.5 25 14 36 17 C50 20.5 57 11.5 68 15.6" strokeWidth="0.7" opacity="0.7" />
      <path d="M0 40 H76" />
      {[6, 14, 22, 30, 38, 46, 54, 62, 70].map((x) => (
        <circle key={x} cx={x} cy="42.6" r="1.3" fill="currentColor" />
      ))}
    </>
  ),
  // 롯데월드타워와 석촌호수
  lotteworld: (
    <>
      <path d="M33 40 L35.4 6 Q38 1 40.6 6 L43 40Z" fill="currentColor" opacity="0.18" />
      <path d="M33 40 L35.4 6 Q38 1 40.6 6 L43 40" />
      <path d="M38 3.5 V13" strokeWidth="0.8" />
      <path d="M34.2 22 H41.8 M33.7 30 H42.3" strokeWidth="0.6" opacity="0.7" />
      <path d="M8 38 V30 L11 26.5 L14 30 V38 M11 26.5 V22 L14 23.5 L11 25" strokeWidth="1" />
      <path d="M60 38 C58 30 66 26 66 33 C66 26 74 30 72 38" strokeWidth="1" />
      {waves(41)}
    </>
  ),
  // 명동: 명동성당 첨탑
  myeongdong: (
    <>
      <path d="M38 0.5 V5 M36 2.3 H40" />
      <path d="M38 5 L32.5 21 H43.5Z" fill="currentColor" opacity="0.2" />
      <path d="M38 5 L32.5 21 H43.5Z" />
      <path d="M32 21 H44 V42 H32Z" />
      <circle cx="38" cy="26.5" r="3" />
      <path d="M35 42 V36.5 Q38 32.5 41 36.5 V42" />
      <path d="M18 42 V30 L25 25 L32 29 M44 29 L51 25 L58 30 V42" />
      <path d="M22 37 V33.5 Q24 31.5 26 33.5 V37 M50 37 V33.5 Q52 31.5 54 33.5 V37" strokeWidth="0.8" />
      <path d="M10 42.5 H66" />
    </>
  ),
  // 덕수궁 돌담길과 은행나무
  deoksugung: (
    <>
      <path d="M18 3.5 C8.5 9.5 6.5 19 18 21 C29.5 19 27.5 9.5 18 3.5Z" fill="currentColor" opacity="0.22" />
      <path d="M18 3.5 C8.5 9.5 6.5 19 18 21 C29.5 19 27.5 9.5 18 3.5Z" />
      <path d="M18 21 V31" />
      <path d="M57 10 C50 14.5 48.6 21.5 57 23 C65.4 21.5 64 14.5 57 10Z" fill="currentColor" opacity="0.22" />
      <path d="M57 10 C50 14.5 48.6 21.5 57 23 C65.4 21.5 64 14.5 57 10Z" />
      <path d="M57 23 V31" />
      <path d="M0 31.5 Q38 27.5 76 33.5" strokeWidth="2.4" />
      <path d="M0 33.5 Q38 29.5 76 35.5 V43 H0Z" />
      <path d="M0 38 Q38 34.5 76 40" strokeWidth="0.7" />
      <path d="M10 33 V37.6 M24 32 V36.6 M38 31.6 V36 M52 32.2 V36.8 M66 33.4 V38.4 M17 37.4 V42.6 M31 36.5 V42.6 M45 36.6 V42.6 M59 37.6 V42.6" strokeWidth="0.6" />
      <path d="M36 12 l2.4 -2 l1 2.6Z M44 19 l2.4 -2 l1 2.6Z" fill="currentColor" stroke="none" />
    </>
  ),
  // 반포대교 달빛무지개분수
  banpo: (
    <>
      <path d="M0 21 H76 M0 24.5 H76" />
      <path d="M12 24.5 V35 M38 24.5 V35 M64 24.5 V35" strokeWidth="1.8" />
      {[6, 14, 22, 30, 46, 54, 62, 70].map((x) => (
        <path key={x} d={`M${x} 24.8 Q${x - 1.5} 31 ${x - 6.5} 37.5`} strokeWidth="0.8" />
      ))}
      <path d="M68 4 a5.5 5.5 0 1 0 5 7.8 a4.3 4.3 0 1 1 -5 -7.8z" fill="currentColor" />
      {waves(41)}
    </>
  ),
  // 여의도한강공원: 63빌딩과 유람선
  yeouido: (
    <>
      <path d="M46 37 L48.2 5.5 Q51 2.5 53.8 5.5 L56 37Z" fill="currentColor" opacity="0.18" />
      <path d="M46 37 L48.2 5.5 Q51 2.5 53.8 5.5 L56 37" />
      <path d="M47.3 14 H54.7 M46.9 22 H55.1 M46.5 30 H55.5" strokeWidth="0.6" opacity="0.7" />
      <path d="M6 33 H34 L31 37.5 H9.5Z" fill="currentColor" />
      <path d="M12 33 V28.5 H27 V33 M15 30.6 H17 M20 30.6 H22" strokeWidth="1" />
      <path d="M19 28.5 V25 L24 26.6 L19 27.6" strokeWidth="0.8" />
      {waves(41)}
    </>
  ),
  // 홍대 거리: 버스킹 기타와 음표
  hongdae: (
    <>
      <g transform="rotate(-32 30 26)">
        <circle cx="30" cy="34" r="8.2" />
        <circle cx="30" cy="23.5" r="6" />
        <circle cx="30" cy="30" r="2.3" fill="currentColor" />
        <path d="M28.6 18 V1.5 H31.4 V18" />
        <path d="M27.4 1.5 H32.6 V-3 H27.4Z" fill="currentColor" />
        <path d="M27 38 H33" strokeWidth="1.6" />
      </g>
      <ellipse cx="55" cy="18" rx="3" ry="2.1" fill="currentColor" transform="rotate(-20 55 18)" />
      <path d="M57.7 17.2 V5 Q61.5 6.5 63 10" />
      <ellipse cx="66" cy="31" rx="3" ry="2.1" fill="currentColor" transform="rotate(-20 66 31)" />
      <ellipse cx="74" cy="28.6" rx="3" ry="2.1" fill="currentColor" transform="rotate(-20 74 28.6)" />
      <path d="M68.7 30.2 V19.6 L76.7 17.2 V27.8" />
      <path d="M0 43 H76" />
    </>
  ),
  // KOREC 신촌: 일본 취업 카페 — 커피와 한일 대화
  korec: (
    <>
      <path d="M24 21 H48 L45 40 H27Z" />
      <path d="M48 25 Q56 25 54.5 31.5 Q53 36 46 35" />
      <path d="M19 42.5 H53" />
      <path d="M31 17.5 q2.6 -3.4 0 -6.8 M39 17.5 q2.6 -3.4 0 -6.8" strokeWidth="1" />
      <path d="M2 3 H18 Q20.5 3 20.5 5.5 V12.5 Q20.5 15 18 15 H9 L5 18.5 V15 H2 Q0 15 0 12.5 V5.5 Q0 3 2 3Z" strokeWidth="1" />
      <text x="10.2" y="12.6" fontSize="9" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="'Noto Serif JP',serif" fontWeight="700">
        あ
      </text>
      <path d="M58 9 H74 Q76 9 76 11.5 V18.5 Q76 21 74 21 H71 V24.5 L67 21 H58 Q55.5 21 55.5 18.5 V11.5 Q55.5 9 58 9Z" strokeWidth="1" />
      <text x="65.8" y="18.6" fontSize="9" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="'Noto Serif KR',serif" fontWeight="700">
        가
      </text>
    </>
  ),
  // 별마당도서관: 높은 서가와 별
  coex: (
    <>
      <path d="M38 1.5 l1.4 3 l3.2 0.3 l-2.4 2.1 l0.8 3.2 l-3 -1.7 l-3 1.7 l0.8 -3.2 l-2.4 -2.1 l3.2 -0.3z" fill="currentColor" />
      {[
        [8, 18, 14],
        [27, 12, 22],
        [52, 18, 14],
      ].map(([x, top, w]) => (
        <g key={x}>
          <path d={`M${x} 43 V${top} H${x + w} V43`} />
          {Array.from({ length: Math.floor((43 - top) / 5) }, (_, i) => (
            <path key={i} d={`M${x} ${top + 5 * (i + 1)} H${x + w}`} strokeWidth="0.7" />
          ))}
          {Array.from({ length: Math.floor((43 - top) / 5) }, (_, i) => (
            <path
              key={`b${i}`}
              d={`M${x + 2.5} ${top + 5 * (i + 1) - 0.6} V${top + 5 * i + 1.6} M${x + 4.5} ${top + 5 * (i + 1) - 0.6} V${top + 5 * i + 2.2} M${x + w - 3} ${top + 5 * (i + 1) - 0.6} V${top + 5 * i + 1.8}`}
              strokeWidth="1.1"
            />
          ))}
        </g>
      ))}
      <path d="M2 43 H74" />
    </>
  ),
  // 인사동: 붓과 벼루, 먹 획
  insadong: (
    <>
      <path d="M48 3 L26 27" strokeWidth="2.6" />
      <path d="M26 27 Q20 31 21 36 Q25 33.5 28.6 29.6Z" fill="currentColor" />
      <path d="M46.2 5 L49.8 1.4" strokeWidth="1" />
      <path d="M8 40 Q24 33 38 38.5 Q50 43 70 35" strokeWidth="3" opacity="0.85" />
      <rect x="52" y="14" width="20" height="14" rx="3" />
      <ellipse cx="62" cy="19.5" rx="6" ry="3" fill="currentColor" opacity="0.35" />
    </>
  ),
};
