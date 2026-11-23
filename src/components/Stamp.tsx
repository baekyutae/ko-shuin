import { useId } from 'react';
import type { Place, StampDef } from '../regions/types';
import { dotDate } from '../lib/time';

interface Props {
  def: StampDef;
  place: Place;
  date?: Date;
  serial?: number;
  size?: number;
  rotate?: number;
  /** 아직 못 받은 한정 인장(실루엣) */
  ghost?: boolean;
  className?: string;
}

function nameSize(text: string, max: number, width: number) {
  return Math.min(max, width / Math.max(1, text.length));
}

/**
 * 인장 SVG. 장소·문구·날짜·발급 번호를 템플릿에 넣어 만든다.
 * 같은 템플릿을 공유 카드와 관리자 미리보기에서도 쓴다.
 */
export function Stamp({ def, place, date, serial, size = 170, rotate = -5, ghost, className }: Props) {
  const fid = useId().replace(/:/g, '');
  const color = ghost ? '#a59a8a' : def.color;
  const ko = place.nameKo;
  const ja = place.nameJa;
  const koSize = nameSize(ko, 26, 118);
  const jaSize = nameSize(ja, 12.5, 104);

  return (
    <svg
      className={className}
      viewBox="0 0 170 170"
      width={size}
      height={size}
      style={{ transform: `rotate(${rotate}deg)` }}
      role="img"
      aria-label={`${def.title}${date ? ` ${dotDate(date)}` : ''}`}
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
              <text x="85" y="131" fontSize="11" fill={color} letterSpacing="1" fontWeight="600">
                {dotDate(date)}
              </text>
            )}
            {serial != null && (
              <text x="85" y="148" fontSize="9.5" fill={color}>
                No.{serial.toLocaleString('en-US')}
              </text>
            )}
          </>
        )}
      </g>
      {def.official && !ghost && (
        <g transform="translate(128,124) rotate(8)">
          <rect width="30" height="30" rx="3" fill={color} />
          <text x="15" y="13" fontSize="10" fill="#fff8ee" textAnchor="middle" fontWeight="700" fontFamily="'Noto Serif KR',serif">
            공
          </text>
          <text x="15" y="25.5" fontSize="10" fill="#fff8ee" textAnchor="middle" fontWeight="700" fontFamily="'Noto Serif KR',serif">
            식
          </text>
        </g>
      )}
    </svg>
  );
}
