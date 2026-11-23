import type { StampCondition, StampDef } from '../regions/types';
import { ymd } from './time';

/** 'MM-DD'(매년) 또는 'YYYY-MM-DD'(그해만) 기간 안인지 */
export function inPeriod(period: { from: string; to: string }, now: Date): boolean {
  const day = ymd(now);
  if (period.from.length === 10) return day >= period.from && day <= period.to;
  const md = day.slice(5);
  return period.from <= period.to ? md >= period.from && md <= period.to : md >= period.from || md <= period.to;
}

/** 한정 인장 조건이 지금 열려 있는지 판정한다. 실서비스에서는 서버 시간으로 검증한다. */
export function isOpen(c: StampCondition | undefined, now: Date, manualFlags: string[] = []): boolean {
  if (!c) return true;
  const h = now.getHours();
  if (c.period && !inPeriod(c.period, now)) return false;
  if (c.hours && !(h >= c.hours[0] && h < c.hours[1])) return false;
  if (c.manual && !manualFlags.includes(c.manual)) return false;
  return true;
}

const fmtDay = (d: string) => (d.length === 10 ? d.replaceAll('-', '.') : d.replace('-', '.'));

export function describeCondition(c: StampCondition | undefined): string {
  if (!c) return '상시';
  const parts: string[] = [];
  if (c.period) {
    const { from, to } = c.period;
    const range = from === to ? fmtDay(from) : `${fmtDay(from)}~${fmtDay(to)}`;
    parts.push(from.length === 10 ? range : `매년 ${range}`);
  }
  if (c.hours) parts.push(`${c.hours[0]}:00~${c.hours[1] === 24 ? '24:00' : `${c.hours[1]}:00`}`);
  if (c.manual === 'first-snow') parts.push('첫눈 오는 날');
  if (c.limit) parts.push(`선착순 ${c.limit}명`);
  return parts.join(' · ') || '상시';
}

export function isLimitedFull(def: StampDef, issuedLocal: number): boolean {
  const limit = def.condition?.limit;
  return limit != null && (def.baseIssued ?? 0) + issuedLocal >= limit;
}
