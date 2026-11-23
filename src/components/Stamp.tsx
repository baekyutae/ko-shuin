import { useId, type ReactNode, type SVGProps } from 'react';
import { region } from '../regions';
import type { Daypart, Place, StampDef, Theme, Weather } from '../regions/types';
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

type Frame = 'circle' | 'octagon' | 'hexagon';

const NIGHT_INK = '#2f4b7c';
const C = 85;

/** 테마별 테두리 모양 (JR 東日本 역 스탬프의 원·팔각·육각 테두리 참고) */
const FRAME_BY_THEME: Record<Theme, Frame> = {
  궁궐: 'circle',
  문화: 'circle',
  시장: 'octagon',
  거리: 'octagon',
  전망: 'hexagon',
  한강: 'hexagon',
  공원: 'hexagon',
};

/** 정다각형 테두리. inr = 중심에서 변까지 거리 */
function polygon(n: number, inr: number, startDeg: number) {
  const R = inr / Math.cos(Math.PI / n);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    return `${(C + R * Math.cos(a)).toFixed(2)},${(C + R * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

function FrameShape({ frame, inr, ...rest }: { frame: Frame; inr: number } & SVGProps<SVGPathElement>) {
  if (frame === 'circle') {
    const { fill, stroke, strokeWidth, strokeDasharray } = rest;
    return <circle cx={C} cy={C} r={inr} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} />;
  }
  const d = frame === 'octagon' ? polygon(8, inr, 22.5) : polygon(6, inr, 0);
  return <path d={d} strokeLinejoin="round" {...rest} />;
}

// 테두리별 바깥·안쪽 선 위치(육각은 상자 안에 들어가도록 더 작게)
const FRAME_INR: Record<Frame, [number, number]> = {
  circle: [81, 74.5],
  octagon: [80, 73.5],
  hexagon: [73.5, 67.5],
};

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
    if ((x - C) ** 2 + (y - C) ** 2 < 64 ** 2) pts.push([x, y]);
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
          <path d="M114 25 a10 10 0 1 0 8 15.5 a7.8 7.8 0 1 1 -8 -15.5z" fill={color} opacity="0.8" />
          {scatter(seed + 3, 9).map(([x, y], i) =>
            y < 62 && Math.abs(x - C) > 26 ? <circle key={i} cx={x} cy={y} r={1.1} fill={color} opacity="0.6" /> : null,
          )}
        </>
      )}
    </g>
  );
}

/**
 * 인장 SVG. 장소·문구·연호 날짜·발급 번호를 템플릿에 넣어 만든다.
 * - 픽토그램이 있는 장소: 風景印처럼 가운데에 명소 그림을 넣는다.
 * - 테두리 모양은 장소 테마(궁궐·시장·한강 등)에 따라 원·팔각·육각.
 * - 그날 날씨(맑음·비·눈)와 낮/밤에 따라 무늬와 먹색이 달라진다.
 */
export function Stamp({ def, place, date, serial, size = 170, rotate = -5, weather = 'sunny', daypart = 'day', ghost, className }: Props) {
  const fid = useId().replace(/:/g, '');
  // 기본 인장은 밤이면 남색 먹으로, 시즌·이벤트 인장은 고유 색을 유지한다.
  const ink = !def.limited && daypart === 'night' ? NIGHT_INK : def.color;
  const color = ghost ? '#a59a8a' : ink;
  const frame = FRAME_BY_THEME[place.themes[0]] ?? 'circle';
  const [outer, inner] = FRAME_INR[frame];
  const picto: ReactNode | undefined = region.pictograms[place.id];
  const ko = place.nameKo;
  const ja = place.nameJa;
  const seed = ko.length * 31 + ko.charCodeAt(0);

  const label = (y: number, fs: number) => (
    <text x={C} y={y} fontSize={fs} fill={color} letterSpacing="2" fontWeight="600">
      {def.label}
    </text>
  );

  const bottom = (dateY: number, noY: number, dateW: number) =>
    ghost ? (
      <text x={C} y={dateY + 2} fontSize="10.5" fill="#6f6658" fontFamily="Pretendard Variable, sans-serif" fontWeight="700">
        {def.hint ?? '한정'}
      </text>
    ) : (
      <>
        {date && (
          <text
            x={C}
            y={dateY}
            fontSize="8.8"
            fill={color}
            fontWeight="600"
            fontFamily="'Noto Serif JP',serif"
            textLength={dateW}
            lengthAdjust="spacingAndGlyphs"
          >
            {reiwaDate(date)}
          </text>
        )}
        {serial != null && (
          <text x={C} y={noY} fontSize="8.8" fill={color}>
            No.{serial.toLocaleString('en-US')}
          </text>
        )}
      </>
    );

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
        {ghost && <FrameShape frame={frame} inr={outer} fill="#efe9de" />}
        {!ghost && <WeatherLayer weather={weather} daypart={daypart} color={color} seed={seed} />}
        <FrameShape frame={frame} inr={outer} fill="none" stroke={color} strokeWidth="3.4" strokeDasharray={ghost ? '6 5' : undefined} />
        <FrameShape frame={frame} inr={inner} fill="none" stroke={color} strokeWidth="1" />

        {picto ? (
          <>
            {label(34.5, 10.5)}
            <g
              transform="translate(44.7 38.6) scale(1.06)"
              style={{ color }}
              stroke="currentColor"
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={ghost ? 0.7 : 1}
            >
              {picto}
            </g>
            <text x={C} y="105.5" fontSize={nameSize(ko, 17, 100)} fill={color} fontWeight="700">
              {ko}
            </text>
            <text x={C} y="118.5" fontSize={nameSize(ja, 10, 90)} fill={color} fontWeight="600" fontFamily="'Noto Serif JP',serif">
              {ja}
            </text>
            {bottom(132, 145.5, 84)}
          </>
        ) : (
          <>
            {label(50, 12)}
            <line x1="52" y1="58" x2="118" y2="58" stroke={color} strokeWidth="0.8" />
            <text x={C} y={88 + nameSize(ko, 26, 118) * 0.1} fontSize={nameSize(ko, 26, 118)} fill={color} fontWeight="700">
              {ko}
            </text>
            <text x={C} y="109" fontSize={nameSize(ja, 12.5, 104)} fill={color} fontWeight="600" fontFamily="'Noto Serif JP',serif">
              {ja}
            </text>
            {bottom(130, 147, 90)}
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
