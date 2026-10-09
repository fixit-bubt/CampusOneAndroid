// Transit & prayer calculations with strict Dhaka time (UTC+6) support.

export function dhakaParts(date: Date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  f.formatToParts(date).forEach((p) => {
    parts[p.type] = p.value;
  });
  return parts;
}

export function nowDhakaMinutes(): number {
  const p = dhakaParts();
  const hour = parseInt(p.hour ?? '0', 10);
  const minute = parseInt(p.minute ?? '0', 10);
  return (hour % 24) * 60 + minute;
}

export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return (h % 24) * 60 + m;
}

export function minutesToHHMM(mins: number): string {
  const total = Math.max(0, mins);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12(hhmm: string): string {
  if (!hhmm) return '--:--';
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function fmtCountdown(mins: number): string {
  const safeMins = Math.max(0, mins);
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export interface NextDepartureResult {
  mins: number;
  wait: number;
  tomorrow: boolean;
}

export function nextDeparture(times: string[]): NextDepartureResult | null {
  if (!times || times.length === 0) return null;
  const now = nowDhakaMinutes();
  const sorted = [...times].map(toMinutes).sort((a, b) => a - b);
  for (const t of sorted) {
    if (t >= now) {
      return { mins: t, wait: t - now, tomorrow: false };
    }
  }
  const first = sorted[0];
  return { mins: first, wait: 24 * 60 - now + first, tomorrow: true };
}

export function busCycleProgress(wait: number): number {
  return Math.max(8, Math.min(100, Math.round(((120 - Math.min(wait, 120)) / 120) * 100)));
}

export interface PrayerItem {
  en: string;
  azan: string;
  key?: string;
  [key: string]: any;
}

export interface PrayerStateResult {
  currentIdx: number;
  next: PrayerItem | null;
  tomorrow: boolean;
  wait: number;
}

export function prayerState(list: PrayerItem[]): PrayerStateResult | null {
  if (!list || list.length === 0) return null;
  const now = nowDhakaMinutes();
  let currentIdx = -1;
  list.forEach((p, i) => {
    if (toMinutes(p.azan) <= now) currentIdx = i;
  });

  let next = list.find((p) => toMinutes(p.azan) > now) || null;
  let tomorrow = false;
  if (!next) {
    next = list[0];
    tomorrow = true;
  }
  const wait = tomorrow
    ? 24 * 60 - now + toMinutes(next.azan)
    : toMinutes(next.azan) - now;

  return { currentIdx, next, tomorrow, wait };
}

export function prayerIntervalProgress(
  list: PrayerItem[],
  currentIdx: number,
  next: PrayerItem | null,
  wait: number
): number {
  if (!list.length || !next) return 25;
  try {
    const prevPrayer = currentIdx >= 0 ? list[currentIdx] : list[list.length - 1];
    if (!prevPrayer) return 25;
    const curAzan = toMinutes(prevPrayer.azan);
    const nextAzan = toMinutes(next.azan);
    const span = nextAzan > curAzan ? nextAzan - curAzan : 24 * 60 - curAzan + nextAzan;
    if (span <= 0) return 50;
    const elapsed = span - Math.max(0, wait);
    return Math.max(8, Math.min(100, Math.round((elapsed / span) * 100)));
  } catch {
    return 50;
  }
}
