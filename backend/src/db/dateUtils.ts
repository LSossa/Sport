export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getToday(timezone = 'UTC'): string {
  const { DateTime } = require('luxon') as typeof import('luxon');
  return DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd');
}
