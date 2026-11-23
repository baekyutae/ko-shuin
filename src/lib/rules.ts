import type { StampCondition, StampDef } from '../regions/types';
import { ymd, WEEKDAYS } from './time';

/** 한정 인장 조건이 지금 열려 있는지 판정한다. 실서비스에서는 서버 시간으로 검증한다. */
export function isOpen(c: StampCondition | undefined, now: Date, manualFlags: string[] = []): boolean {
  if (!c) return true;
  const h = now.getHours();
  if (c.hours && !(h >= c.hours[0] && h < c.hours[1])) return false;
  if (c.dates && !c.dates.includes(ymd(now))) return false;
  if (c.months && !c.months.includes(now.getMonth() + 1)) return false;
  if (c.weekdays && !c.weekdays.includes(now.getDay())) return false;
  if (c.manual && !manualFlags.includes(c.manual)) return false;
  return true;
}

export function describeCondition(c: StampCondition | undefined): string {
  if (!c) return '상시';
  const parts: string[] = [];
  if (c.dates) parts.push(c.dates.map((d) => d.replaceAll('-', '.')).join(', '));
  if (c.months) parts.push(`${c.months.join('·')}월`);
  if (c.weekdays) parts.push(`${c.weekdays.map((w) => WEEKDAYS[w]).join('·')}요일`);
  if (c.hours) parts.push(`${c.hours[0]}:00~${c.hours[1] === 24 ? '24:00' : `${c.hours[1]}:00`}`);
  if (c.manual === 'first-snow') parts.push('첫눈 오는 날');
  if (c.limit) parts.push(`선착순 ${c.limit}명`);
  return parts.join(' · ') || '상시';
}

export function isLimitedFull(def: StampDef, issuedLocal: number): boolean {
  const limit = def.condition?.limit;
  return limit != null && (def.baseIssued ?? 0) + issuedLocal >= limit;
}
