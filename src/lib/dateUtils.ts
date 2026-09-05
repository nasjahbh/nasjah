import { format } from 'date-fns';

/**
 * Converts a timestamp (ms or Date string) into standard Arabic formatted date and time.
 */
export function formatDateTime(timestamp: number | string | Date | undefined) {
  if (!timestamp) {
    return { dateStr: '-', timeStr: '-', full: '-' };
  }
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) {
    return { dateStr: '-', timeStr: '-', full: '-' };
  }

  const dateStr = format(dateObj, 'dd/MM/yyyy');
  const rawTime = format(dateObj, 'hh:mm a');
  const timeArabic = rawTime.replace('AM', 'ص').replace('PM', 'م');

  const now = new Date();
  const isToday = dateObj.toDateString() === now.toDateString();

  return {
    dateStr,
    timeStr: timeArabic,
    full: `${dateStr} | ${timeArabic}`,
    isToday,
    iso: dateObj.toISOString(),
  };
}

/**
 * Returns formatted string for datetime-local input: 'YYYY-MM-DDTHH:mm'
 */
export function toDatetimeLocal(timestamp?: number | string | Date): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Parses a datetime-local input string into unix timestamp (ms).
 */
export function fromDatetimeLocal(datetimeStr: string): number {
  if (!datetimeStr) return Date.now();
  const d = new Date(datetimeStr);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}
