// reportingPeriods.ts - Client-side reporting periods & month rollover engine in IST

export const IST_OFFSET_MINUTES = 330;
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface ReportingMonth {
  key: string;       // e.g. "2026-11"
  name: string;      // e.g. "November"
  year: number;      // e.g. 2026
  month: number;     // 1 to 12
  label: string;     // e.g. "November 2026"
  isCurrent: boolean;
}

export interface ReportingPeriods {
  current: ReportingMonth;
  previous: ReportingMonth;
}

export type DayFilter = 'all' | 'today' | 'yesterday' | 'day-before-yesterday';

export const DAY_FILTER_OPTIONS: { label: string; value: DayFilter }[] = [
  { label: 'All Month', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Day Before Yesterday', value: 'day-before-yesterday' }
];

/**
 * Calculates current and previous reporting months dynamically in IST (UTC+5:30).
 * Handles year transitions (e.g. Jan -> Dec) and leap years automatically.
 */
export function getClientReportingPeriods(referenceDate = new Date()): ReportingPeriods {
  const d = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const istShifted = new Date(d.getTime() + IST_OFFSET_MS);

  const currYear = istShifted.getUTCFullYear();
  const currMonth = istShifted.getUTCMonth(); // 0 to 11

  const currentKey = `${currYear}-${String(currMonth + 1).padStart(2, '0')}`;

  const prevDate = new Date(Date.UTC(currYear, currMonth - 1, 1, 0, 0, 0, 0));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = prevDate.getUTCMonth();
  const prevKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

  return {
    current: {
      key: currentKey,
      name: MONTH_NAMES[currMonth],
      year: currYear,
      month: currMonth + 1,
      label: `${MONTH_NAMES[currMonth]} ${currYear}`,
      isCurrent: true
    },
    previous: {
      key: prevKey,
      name: MONTH_NAMES[prevMonth],
      year: prevYear,
      month: prevMonth + 1,
      label: `${MONTH_NAMES[prevMonth]} ${prevYear}`,
      isCurrent: false
    }
  };
}

/**
 * Check if the calendar month has changed compared to a previously stored current month key.
 */
export function hasMonthRolledOver(lastKnownCurrentKey: string, referenceDate = new Date()): boolean {
  const periods = getClientReportingPeriods(referenceDate);
  return periods.current.key !== lastKnownCurrentKey;
}
