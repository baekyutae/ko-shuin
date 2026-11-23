import type { Daypart, Weather } from '../regions/types';

export const WEATHER_LABEL: Record<Weather, string> = { sunny: '맑음', rain: '비', snow: '눈' };
export const DAYPART_LABEL: Record<Daypart, string> = { day: '낮', night: '밤' };
