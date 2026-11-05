// reportingPeriods.js - Dynamic Two-Month Rolling Reporting Engine in IST
const { IST_OFFSET_MS, startOfIstDay, istDateLabel } = require('./istTime');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculates reporting periods (Current Month and Previous Month) dynamically
 * using the given reference date (defaults to system date) shifted into IST (UTC+5:30).
 *
 * Handles:
 * - Ordinary month transitions
 * - Year boundary transitions (e.g. Jan 2027 -> Dec 2026)
 * - Leap years (e.g. Feb 2024 / 2028 with 29 days)
 *
 * Range rule:
 * timestamp >= monthStart AND timestamp < nextMonthStart
 */
function getReportingPeriods(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const istShifted = new Date(d.getTime() + IST_OFFSET_MS);

  const currYear = istShifted.getUTCFullYear();
  const currMonth = istShifted.getUTCMonth(); // 0 to 11

  // Current Month: [currMonth 1st 00:00:00 IST, currMonth + 1 1st 00:00:00 IST)
  const currentStart = new Date(Date.UTC(currYear, currMonth, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const currentEnd = new Date(Date.UTC(currYear, currMonth + 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const currentKey = `${currYear}-${String(currMonth + 1).padStart(2, '0')}`;

  // Previous Month: [prevMonth 1st 00:00:00 IST, currMonth 1st 00:00:00 IST)
  const prevDate = new Date(Date.UTC(currYear, currMonth - 1, 1, 0, 0, 0, 0));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = prevDate.getUTCMonth(); // 0 to 11
  const prevStart = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const prevEnd = currentStart;
  const prevKey = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

  return {
    current: {
      key: currentKey,
      name: MONTH_NAMES[currMonth],
      year: currYear,
      month: currMonth + 1,
      label: `${MONTH_NAMES[currMonth]} ${currYear}`,
      start: currentStart,
      end: currentEnd,
      isCurrent: true
    },
    previous: {
      key: prevKey,
      name: MONTH_NAMES[prevMonth],
      year: prevYear,
      month: prevMonth + 1,
      label: `${MONTH_NAMES[prevMonth]} ${prevYear}`,
      start: prevStart,
      end: prevEnd,
      isCurrent: false
    }
  };
}

/**
 * Resolves and validates a requested month query against the allowed 2-month reporting window,
 * with optional day-level sub-filter support (Today, Yesterday, Day Before Yesterday) for Current Month ONLY.
 *
 * Accepts:
 * - queryMonth: 'current' | 'previous' | 'YYYY-MM' | month name
 * - dayFilter: 'all' | 'today' | 'yesterday' | 'day-before-yesterday'
 */
function resolveReportingPeriod(queryMonth, dayFilter = null, referenceDate = new Date()) {
  const periods = getReportingPeriods(referenceDate);

  let basePeriod = periods.current;
  let activeSubFilter = dayFilter;

  if (queryMonth) {
    const normalized = String(queryMonth).trim().toLowerCase().replace(/[\s_]+/g, '-');

    // Handle legacy or shortcut day-filter ranges passed as queryMonth (e.g. range=today)
    if (normalized === 'today' || normalized === 'yesterday' || normalized === 'day-before-yesterday' || normalized === 'daybeforeyesterday') {
      basePeriod = periods.current;
      activeSubFilter = normalized;
    } else if (normalized === 'all' || normalized === 'allmonth' || normalized === 'all-month') {
      basePeriod = periods.current;
      activeSubFilter = 'all';
    } else if (normalized === 'previous' || normalized === 'lastmonth' || normalized === 'last-month' || normalized === periods.previous.key) {
      basePeriod = periods.previous;
    } else if (normalized === 'current' || normalized === 'thismonth' || normalized === 'this-month' || normalized === periods.current.key) {
      basePeriod = periods.current;
    } else {
      const currentFormatted = `${periods.current.name.toLowerCase()}-${periods.current.year}`;
      const previousFormatted = `${periods.previous.name.toLowerCase()}-${periods.previous.year}`;
      if (normalized === currentFormatted || normalized === periods.current.name.toLowerCase()) {
        basePeriod = periods.current;
      } else if (normalized === previousFormatted || normalized === periods.previous.name.toLowerCase()) {
        basePeriod = periods.previous;
      } else {
        // Disallow access to older historical months or future dates
        return {
          error: 'UNAUTHORIZED_PERIOD',
          message: 'Access restricted to Current Month and Previous Month only.'
        };
      }
    }
  }

  // Daily sub-filters are active ONLY for the Current Month
  if (basePeriod.isCurrent && activeSubFilter && activeSubFilter !== 'all') {
    const normFilter = String(activeSubFilter).trim().toLowerCase().replace(/[\s_]+/g, '-');

    if (normFilter === 'today') {
      const start = startOfIstDay(referenceDate);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return {
        ...basePeriod,
        subFilter: 'today',
        name: 'Today',
        label: `Today (${istDateLabel(start)})`,
        title: 'TODAY',
        dateLabel: istDateLabel(start),
        groupBy: 'hour',
        start,
        end
      };
    }

    if (normFilter === 'yesterday') {
      const todayStart = startOfIstDay(referenceDate);
      const start = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const end = todayStart;
      return {
        ...basePeriod,
        subFilter: 'yesterday',
        name: 'Yesterday',
        label: `Yesterday (${istDateLabel(start)})`,
        title: 'YESTERDAY',
        dateLabel: istDateLabel(start),
        groupBy: 'hour',
        start,
        end
      };
    }

    if (normFilter === 'day-before-yesterday' || normFilter === 'daybeforeyesterday' || normFilter === 'day-after-yesterday') {
      const todayStart = startOfIstDay(referenceDate);
      const start = new Date(todayStart.getTime() - 48 * 60 * 60 * 1000);
      const end = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return {
        ...basePeriod,
        subFilter: 'day-before-yesterday',
        name: 'Day Before Yesterday',
        label: `Day Before Yesterday (${istDateLabel(start)})`,
        title: 'DAY BEFORE YESTERDAY',
        dateLabel: istDateLabel(start),
        groupBy: 'hour',
        start,
        end
      };
    }
  }

  // Default: Full month view
  return {
    ...basePeriod,
    subFilter: 'all',
    title: basePeriod.name.toUpperCase(),
    dateLabel: '',
    groupBy: 'day'
  };
}

module.exports = {
  MONTH_NAMES,
  getReportingPeriods,
  resolveReportingPeriod
};
