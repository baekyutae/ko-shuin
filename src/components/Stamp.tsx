import { useId } from 'react';
import type { Daypart, Place, StampDef, Weather } from '../regions/types';
import { dotDate, reiwaDate } from '../lib/time';

interface Props {
  def: StampDef;
  place: Place;
  date?: Date;
  serial?: number;
  size?: number;
  rotate?: number;
  /** 그날의 기록: 날씨와 낮/밤에 따라 디자인이 달라진다(한정 조건 아님). */
  weather?: Weather;
  daypart?: Daypart;
  /** 아직 못 받은 한정 인장(실루엣) */
  ghost?: boolean;
  className?: string;
}

const NIGHT_INK = '#2f4b7c';

function nameSize(text: string, max: number, width: number) {
  return Math.min(max, width / Math.max(1, text.length));
}

// 원 안에 고르게 흩어진 점들(같은 인장은 늘 같은 배치)
function scatter(seed: number, n: number): [number, number][] {
  const pts: [number, number][] = [];
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  while (pts.length < n) {
    const x = 14 + rnd() * 142;
    const y = 14 + rnd() * 142;
    if ((x - 85) ** 2 + (y - 85) ** 2 < 70 ** 2) pts.push([x, y]);
  }
  return pts;
}

function WeatherLayer({ weather, daypart, color, seed }: { weather: Weather; daypart: Daypart; color: string; seed: number }) {
  return (
    <g pointerEvents="none">
      {weather === 'rain' &&
        scatter(seed, 26).map(([x, y], i) => (
          <line key={i} x1={x} y1={y} x2={x - 3.2} y2={y + 8} stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.32" />
        ))}
      {weather === 'snow' &&
        scatter(seed + 7, 20).map(([x, y], i) => (
          <g key={i} opacity="0.42" stroke={color} strokeWidth="1" strokeLinecap="round">
            <line x1={x - 2.6} y1={y} x2={x + 2.6} y2={y} />
            <line x1={x - 1.3} y1={y - 2.3} x2={x + 1.3} y2={y + 2.3} />
            <line x1={x + 1.3} y1={y - 2.3} x2={x - 1.3} y2={y + 2.3} />
          </g>
        ))}
      {daypart === 'night' && (
        <>
          <path d="M120 30 a11 11 0 1 0 9 17 a8.5 8.5 0 1 1 -9 -17z" fill={color} opacity="0.8" />
          {scatter(seed + 3, 9).map(([x, y], i) =>
            y < 70 && Math.abs(x - 85) > 26 ? <circle key={i} cx={x} cy={y} r={1.1} fill={color} opacity="0.6" /> : null,
          )}
        </>
      )}
    </g>
  );
}

/**
 * 인장 SVG. 장소·문구·연호 날짜·발급 번호를 템플릿에 넣어 만든다.
 * 같은 장소라도 그날 날씨(맑음·비·눈)와 낮/밤에 따라 무늬와 먹색이 달라진다.
 */
export function Stamp({ def, place, date, serial, size = 170, rotate = -5, weather = 'sunny', daypart = 'day', ghost, className }: Props) {
  const fid = useId().replace(/:/g, '');
  // 기본 인장은 밤이면 남색 먹으로, 시즌·이벤트 인장은 고유 색을 유지한다.
  const ink = !def.limited && daypart === 'night' ? NIGHT_INK : def.color;
  const color = ghost ? '#a59a8a' : ink;
  const ko = place.nameKo;
  const ja = place.nameJa;
  const koSize = nameSize(ko, 26, 118);
  const jaSize = nameSize(ja, 12.5, 104);
  const seed = ko.length * 31 + ko.charCodeAt(0);

  return (
    <svg
      className={className}
      viewBox="0 0 170 170"
      width={size}
      height={size}
      style={{ transform: `rotate(${rotate}deg)` }}
      role="img"
      aria-label={`${def.title}${date ? ` ${dotDate(date)}` : ''}${weather !== 'sunny' ? (weather === 'rain' ? ' 비' : ' 눈') : ''}${daypart === 'night' ? ' 밤' : ''}`}
    >
      <defs>
        <filter id={`ink-${fid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={(ko.length * 7) % 13} />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </defs>
      <g
        filter={ghost ? undefined : `url(#ink-${fid})`}
        opacity={ghost ? 0.55 : 0.94}
        fontFamily="'Noto Serif KR','Noto Serif JP',serif"
        textAnchor="middle"
      >
        {ghost && <circle cx="85" cy="85" r="81" fill="#efe9de" />}
        {!ghost && <WeatherLayer weather={weather} daypart={daypart} color={color} seed={seed} />}
        <circle cx="85" cy="85" r="81" fill="none" stroke={color} strokeWidth="3.4" strokeDasharray={ghost ? '6 5' : undefined} />
        <circle cx="85" cy="85" r="74.5" fill="none" stroke={color} strokeWidth="1" />
        <text x="85" y="50" fontSize="12" fill={color} letterSpacing="2" fontWeight="600">
          {def.label}
        </text>
        <line x1="52" y1="58" x2="118" y2="58" stroke={color} strokeWidth="0.8" />
        <text x="85" y={88 + koSize * 0.1} fontSize={koSize} fill={color} fontWeight="700">
          {ko}
        </text>
        <text x="85" y="109" fontSize={jaSize} fill={color} fontWeight="600" fontFamily="'Noto Serif JP',serif">
          {ja}
        </text>
        {ghost ? (
          <text x="85" y="134" fontSize="11" fill="#6f6658" fontFamily="Pretendard Variable, sans-serif" fontWeight="700">
            {def.hint ?? '한정'}
          </text>
        ) : (
          <>
            {date && (
              <text x="85" y="130" fontSize="9.2" fill={color} fontWeight="600" fontFamily="'Noto Serif JP',serif" textLength="92" lengthAdjust="spacingAndGlyphs">
                {reiwaDate(date)}
              </text>
            )}
            {serial != null && (
              <text x="85" y="147" fontSize="9.5" fill={color}>
                No.{serial.toLocaleString('en-US')}
              </text>
            )}
          </>
        )}
      </g>
      {def.official && !ghost && (
        <g transform="translate(136,134) rotate(8)">
          <rect width="27" height="27" rx="3" fill={color} />
          <text x="13.5" y="11.8" fontSize="9" fill="#fff8ee" textAnchor="middle" fontWeight="700" fontFamily="'Noto Serif KR',serif">
            공
          </text>
          <text x="13.5" y="23" fontSize="9" fill="#fff8ee" textAnchor="middle" fontWeight="700" fontFamily="'Noto Serif KR',serif">
            식
          </text>
        </g>
      )}
    </svg>
  );
}
